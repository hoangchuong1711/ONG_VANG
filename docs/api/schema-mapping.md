# PostgreSQL T03 → hợp đồng API

Schema chạy thực tế nằm trong [migration Flyway](../../src/backend/src/main/resources/db/migration/). [SQL v0](schema-v0.mysql.sql) được giữ làm tham chiếu; header còn lệnh MySQL và DROP DATABASE nên không chạy vào môi trường dự án.

| Bảng/cột | Entity/DAO → DTO | Quyết định T03 |
| --- | --- | --- |
| tai_khoan | TaiKhoanDAO → User | maNguoiDung = ma_tk; username/hash/role/status/email/ho_ten thuộc tài khoản. Không trả hash. |
| khach_hang + tai_khoan | KhachHangDAO → Customer | maKh là ID hồ sơ; email lấy từ tài khoản. Tên tài khoản dùng cho User, tên hồ sơ dùng giao hàng; service cập nhật đồng bộ khi sửa. |
| khach_hang_vip + hang_thanh_vien | KhachHangVip với MapsId → hangThanhVien | Khách thường không có hàng VIP; DATE/null thể hiện hạn ngày/không thời hạn; T08 tính conHieuLuc. |
| tai_xe + tai_khoan + phan_cong_don_hang | TaiXeDAO → Driver | ONLINE/OFFLINE/NGHI là trạng thái làm việc; HOAT_DONG/KHOA ở tài khoản; dangBanChuyen = tồn tại assignment chưa kết thúc. |
| phuong_tien | PhuongTien → Driver.phuongTien | UNIQUE ma_tx, mỗi tài xế tối đa một xe. |
| dieu_phoi_vien | DieuPhoiVien → User.maNv | Hồ sơ TONG_DAI; CHU_DOI_XE chỉ cần tài khoản. Composite FK role ngăn gắn sai loại hồ sơ. |
| don_hang | DonHangDAO → Order | Các FK giữ theo ERD; version hỗ trợ optimistic lock; thời điểm hủy/hoàn tất map huyLuc/hoanTatLuc. |
| snapshot_cuoc_don_hang | SnapshotCuocDonHang → Order.cuoc | Nguồn chuẩn của cước gốc/phụ thu/giảm/tổng và tên biểu phí/hạng/tỷ lệ. V2 bỏ don_hang.tien_giam_gia để tránh trùng dữ liệu. |
| phu_thu_don_hang | PhuThuDonHang với EmbeddedId/MapsId → Fare.phuThu | Lưu số tiền và tên snapshot; trang_thai='0' chỉ là giá trị legacy chưa được ERD định nghĩa, không dùng tính tiền. |
| chi_tiet_kien_hang | ChiTietKienHang → PackageRequest/Order.kienHang | Khối lượng bắt buộc >0 theo SQL nền; API 0.2.0 bổ sung required. |
| nhat_ky_trang_thai | NhatKyTrangThai → Event | trang_thai → tenTrangThai; ID/role người thực hiện và tên hiển thị được lưu cùng nhật ký. |
| phan_cong_don_hang | PhanCongDonHangDAO | Lịch sử gán/từ chối/kết thúc; partial unique giới hạn một assignment hoạt động/đơn và /tài xế. |
| thanh_toan | ThanhToanDAO → Payment | Nhiều attempt/đơn, tao_luc riêng, paid nullable, reference unique, người xác nhận tiền mặt. |
| danh_gia_chuyen_di | DanhGiaChuyenDi | Map theo ERD, chưa có API trong 12 UC. |

Tiền thống nhất NUMERIC(15,2)/BigDecimal. DATE dùng LocalDate, thời điểm dùng Instant/timestamptz và trả UTC. Quy tắc VND nguyên đồng/HALF_UP do T09/T14 thực hiện. Đơn tổng 0 không có attempt; service trả PaymentSummary=MIEN_CUOC.

## Phần còn thuộc task nghiệp vụ

| Phần | Task tiếp nhận |
| --- | --- |
| Register khách hàng, login/SĐT normalize, session, CSRF, quyền và đồng bộ hồ sơ | T06; dùng PasswordHasher bcrypt đã có. Register tạo tai_khoan + khach_hang cùng transaction, tên đồng nhất; username và so_dien_thoai cùng SĐT chuẩn hóa; role KHACH_HANG, trạng thái HOAT_DONG; không tạo khach_hang_vip. ID tài khoản/hồ sơ do server cấp; lỗi rollback cả hai, unique username chặn đăng ký trùng kể cả đồng thời. |
| Route, phạm vi, VIP, thuật toán cước | T07–T09; giá seed chỉ là fixture persistence/demo |
| Quote 300 giây và idempotency 24 giờ | T09/T10/T14; chưa có persistence cho hai chức năng này |
| Tạo đơn đủ aggregate, quyền và state machine | T10–T13; DAO.persistAggregate dùng chung EntityManager do service cấp |
| Gán/hủy/hoàn tất đồng thời, cập nhật ranh_tu | T11–T13; lock đơn rồi tài xế và DB unique |
| Tất toán, callback muộn, đối soát, chuyển phương thức | T14–T15; unique success/pending không thay thế lock và lifecycle thanh toán |
| Báo cáo/lịch sử | T16–T17; đọc snapshot/assignment/payment, không dùng bảng thống kê thu nhập cũ |

T03 kiểm thử toàn vẹn DB/ORM; endpoint nghiệp vụ vẫn planned. Xem [hướng dẫn database](../database/README.md) để migrate, seed, reset và đọc giới hạn chuyển đổi V1.
