# SQL v0 → hợp đồng API

Nguồn nguyên trạng: [schema-v0.mysql.sql](schema-v0.mysql.sql). File bắt đầu bằng DROP DATABASE; chỉ là tài liệu tham chiếu, **không nằm trong migration hoặc Docker init**. Dự án tiếp tục Java Servlet + Hibernate + PostgreSQL theo brief.

## Ánh xạ

| Bảng/cột SQL | DTO/field API | Ghi chú |
| --- | --- | --- |
| khach_hang.ma_kh, ho_ten, so_dien_thoai, email, dia_chi_mac_dinh | Customer.maKh, hoTen, soDienThoai, email, diaChiMacDinh | Giữ giới hạn 36/100/15/150/255 |
| khach_hang_vip + hang_thanh_vien | Customer/Quote.hangThanhVien | maHang 20, tenHang 50, tỷ lệ decimal; conHieuLuc là giá trị tính |
| tai_xe | Driver | Giữ ONLINE/OFFLINE/NGHI, dangBanChuyen; không trả CCCD |
| phuong_tien | Driver.phuongTien | Mỗi tài xế tối đa một xe theo unique ma_tx; không thêm CRUD xe |
| dieu_phoi_vien | User.maNv/username/vaiTro | TONG_DAI và CHU_DOI_XE giữ nguyên tên; mat_khau phải là hash, không có trong response |
| don_hang.ma_don/ma_kh/ma_tx/ma_nv | Order.maDon/maKh/maTx/maNv | maNv ghi nhân viên tạo thay khách, không dùng làm chủ sở hữu khách |
| don_hang.thoi_gian_tao/diem_lay_hang/diem_giao_hang/sdt_nguoi_nhan | Order.thoiGianTao/diemLayHang/diemGiaoHang/sdtNguoiNhan | Timestamp ISO 8601; địa chỉ 255, SĐT tối đa 15 |
| don_hang.quang_duong_km, ghi_chu_giao_hang, trang_thai | Order.quangDuongKm/ghiChuGiaoHang/trangThai | Decimal string; ghi chú 500; enum theo brief vì SQL chỉ VARCHAR |
| cuoc_goc/tien_phu_thu/tien_giam_gia | Order.cuoc / Quote.cuoc | tongCuoc và donViTien là trường tính, không giả định đã có cột DB |
| cau_hinh_phu_thu + phu_thu_don_hang | Fare.phuThu[] | soTienTinh snapshot theo đơn, không lấy lại giá cấu hình hiện tại khi đọc lịch sử |
| chi_tiet_kien_hang | CreateOrder/Order.kienHang[] | Loại hàng 100, ghi chú 500, khối lượng decimal; ảnh chưa có upload API trong phạm vi |
| nhat_ky_trang_thai | Event | tenTrangThai, thoiGianGhiNhan, nguoiThucHien, ghiChuSuCo; tọa độ không bắt buộc và chưa public vì không làm GPS |
| thanh_toan | Payment | maGiaoDich/maDon/soTien/phuongThuc/trangThai/maGiaoDichDoiTac |
| thong_ke_thu_nhap | Không trực tiếp public CRUD | Báo cáo quản trị là phép tổng hợp có định nghĩa riêng; không lấy cột thu nhập tài xế làm doanh thu toàn hệ thống |
| danh_gia_chuyen_di | Ngoài phạm vi 12 UC | Không thêm endpoint đánh giá chỉ vì SQL có bảng |

## Khoảng trống cần xử lý sau T04

| Vấn đề của v0 | Hợp đồng chọn | Task cần bổ sung trước implementation |
| --- | --- | --- |
| MySQL USE/ENGINE/ENUM/TINYINT/DATETIME | Giữ PostgreSQL; API không phụ thuộc dialect | T03 chuyển migration, boolean, check constraint/enum, timestamp và index |
| Chỉ nhân viên có credential | Có đủ 4 vai trò theo UC-01 | T03/T06 tạo kho tài khoản liên kết khách/tài xế/nhân viên, unique login, password hash, trạng thái khóa |
| Không có session/CSRF storage | Session server, token gắn session | T06 dùng HttpSession; không cần buộc session thành bảng SQL |
| UNIQUE thanh_toan.ma_don chỉ cho 1 payment | Một đơn nhiều attempt | T03/T14 bỏ unique này; thêm unique reference, chống nhiều attempt online hiệu lực và tất toán hai lần |
| thoi_gian_thanh_toan DEFAULT NOW ngay khi tạo | paid timestamp chỉ khi đã xác nhận thành công | T14 thêm taoLuc riêng; paid nullable; lưu người xác nhận tiền mặt và trạng thái đối soát |
| Không có hoanTatLuc/huyLuc | Trả timestamp chính xác, báo cáo theo đúng kỳ | T03/T12/T13 thêm cột hoặc truy xuất nhật ký có ràng buộc rõ; không suy ra từ thoi_gian_tao |
| Nhật ký người thực hiện là chuỗi, gán hiện tại có thể bị xóa | Lưu người tạo/người thực hiện và lịch sử gán | T03/T11 lưu ID/role chuẩn, lịch sử gán/từ chối/giải phóng; bảo toàn quyền thu tiền của tài xế đã thực hiện |
| Không có thời điểm rảnh | Gợi ý rảnh lâu nhất rồi maTx | T11 thêm timestamp hoặc nguồn truy vấn đáng tin cậy |
| Thiếu biểu phí cơ sở/phạm vi/cấu hình giới hạn | RouteProvider và báo giá có cấu hình cố định | T01/T07–T09 chốt fixtures/cước/VIP/phạm vi; chưa coi địa chỉ ví dụ là seed thật |
| Không có maBaoGia/hetHanLuc/idempotency | Quote 300s; khóa idempotency 24h | T09/T10/T14 thêm persistence/cache thích hợp, dùng được qua retry/concurrency; không giả định đã có cột |
| Tiền order DECIMAL(15,2), payment DECIMAL(12,2) | Cùng giá trị VND không mất độ chính xác | T03 thống nhất cột hoặc T01 giới hạn tiền toàn hệ thống trước khi tạo đơn |
| MOMO, HOAN_TIEN tồn tại ở enum SQL | Chỉ tạo TIEN_MAT/VNPAY_QR; giữ HOAN_TIEN khi đọc legacy | Không thêm tích hợp MoMo/hoàn tiền; seed demo không dùng trạng thái hoàn tiền cho báo cáo cơ sở |
| Snapshot thiếu tên phụ thu/hạng/chính sách lịch sử | Response không thay đổi theo cấu hình hiện tại | T03/T09 lưu đủ snapshot hoặc version cấu hình |

Giải phóng tài xế là bỏ bận và kết thúc assignment hoạt động; không xóa dấu vết tài xế đã thực hiện đơn hoàn tất. Quyền lịch sử/thu tiền phải dựa trên dữ liệu bền vững.

Khi đổi DB: sửa bảng mapping, đánh giá field/enum/nullability/status bị ảnh hưởng, sửa OpenAPI, sinh Postman, chạy check; thay đổi phá vỡ contract phải báo cho các task dùng API và tăng version. SQL tham chiếu v0 giữ nguyên để truy vết, không ghi đè bằng migration mới.
