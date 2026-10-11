# T08 — Chính sách thành viên trên designV1

`KhachHang.maHang` là enum; `THUONG` không có khoảng thành viên và không được giảm. Hạng khác chỉ có hiệu lực trong khoảng `[thanhVienTu, thanhVienDen)`, với `thanhVienDen = NULL` nghĩa là chưa định ngày kết thúc. Số điện thoại và tên khách nằm ở `TaiKhoan`, không lặp trong hồ sơ khách.

`MembershipPolicyService.evaluate` lấy đúng chính sách `ChinhSachThanhVien` đã công bố cho hạng tại thời điểm báo giá. Không có chính sách hoặc khách hết hạn thì giảm 0; có hơn một chính sách khớp là lỗi cấu hình, không chọn tùy tiện. Khoản giảm = `HALF_UP((cước gốc + phụ thu) × tỷ lệ / 100)` tới đồng, tối đa bằng tổng trước giảm. Chính sách được gắn vào `CuocDonHang` khi tạo đơn để đối chiếu về sau.

Fixture có KH-DEMO-1 thường và KH-DEMO-2 hạng VÀNG còn hạn; chính sách mẫu 10%. `PolicyPublicationService` cho quản trị nội bộ công bố/đóng phiên bản bằng khóa phạm vi, kiểm tra chồng hiệu lực và audit cùng transaction. Trigger Flyway V2 chặn sửa/xóa nội dung đã công bố. Test SQL Server đã kiểm tra hai lần công bố đồng thời trong một hạng trống, việc sửa trực tiếp bản đã công bố bị từ chối, biên `[bắt đầu, kết thúc)` tới mili giây và tỷ lệ 0%/100%.
