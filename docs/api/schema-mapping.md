# Ánh xạ designV1 → API

Schema nguồn: [designV1](../database/designV1.md). OpenAPI nguồn chạy thực tế: `src/backend/src/main/webapp/openapi.json` (v0.5.0). User không có `maNv`; Order trả `maTkTao` từ `don_hang.ma_tk_tao`. Tổng đài được nhận diện bằng tài khoản và vai trò.

| Bảng designV1 | Entity | API và quy tắc |
| --- | --- | --- |
| `tai_khoan`, `khach_hang` | `TaiKhoan`, `KhachHang` | Auth/Customer; tên và SĐT ở tài khoản, hạng `THUONG`/`VANG`/... cùng khoảng hiệu lực ở khách. Đăng ký tạo cả hai trong một transaction. |
| `tai_xe`, `phuong_tien` | `TaiXe`, `PhuongTien` | DriverPage; đủ tài khoản hoạt động, ONLINE, GPLX còn hạn và một xe active mới được đề xuất. |
| `chinh_sach_thanh_vien`, `cau_hinh_cuoc`, `cau_hinh_phu_thu` | `ChinhSachThanhVien`, `BieuPhi`, `ChinhSachPhuThu` | Quote tính từ đúng một biểu phí khớp km/thời điểm, phụ thu áp dụng và mức giảm của khách. Chính sách chồng lấn bị phát hiện khi báo giá; luồng công bố quản trị còn thuộc M2. |
| `bao_gia` | `BaoGia` | Quote lưu yêu cầu/kết quả JSON, mã biểu phí và hạn 300 giây. Tạo đơn tính lại và trả `QUOTE_CHANGED` nếu dữ liệu đã đổi. |
| `don_hang`, `cuoc_don_hang`, `phu_thu_don_hang`, `chi_tiet_kien_hang` | `DonHang`, `CuocDonHang`, `PhuThuDonHang`, `KienHang` | Order gồm tuyến, trạng thái, kiện và cước. Tổng/tiền còn phải thu là giá trị tính, không là cột dư. `maTx` được suy từ phân công đang/đã hoàn thành. |
| `yeu_cau_tao_don` | `YeuCauTaoDon` | Idempotency-Key theo tài khoản + thao tác; replay trả response gốc trong TTL và từ chối payload khác. |
| `phan_cong_don_hang`, `nhat_ky_don_hang` | `PhanCongDonHang`, `SuKienDonHang` | Assign/reject/transition/incident và EventPage. Lịch sử phân công giữ `TU_CHOI`/`HOAN_TAT`, event có thứ tự riêng trong đơn. |
| `thanh_toan`, `xac_nhan_thanh_toan_don_hang`, `su_kien_thanh_toan` | `LanThanhToan`, `XacNhanThanhToanDonHang`, `SuKienThanhToan` | T14 tạo/đọc attempt tiền mặt, xác nhận thu và suy ra trạng thái đã thanh toán từ liên kết. VNPay và callback thuộc T15. |
| `nhat_ky_kiem_toan` | `NhatKyKiemToan` | Dành cho audit thao tác quản trị/nhạy cảm ở M2; chưa coi là đã triển khai chỉ vì mapping tồn tại. |

Ràng buộc DB và những điều service phải bảo vệ được phân rõ trong [ma trận constraint](../database/designV1-constraint-matrix.md). Mọi thay đổi cột/enum phải cập nhật migration, entity, API và test trong cùng thay đổi.
