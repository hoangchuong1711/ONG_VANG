# T16 — Lịch sử và chi tiết đơn (UC-19)

`GET /api/orders` tái sử dụng bộ lọc `tuNgay`, `denNgay`, `trangThai`, phân trang `page` (từ 0) và `size` (1–100). Ngày theo Asia/Ho_Chi_Minh; khoảng `[tuNgay, denNgay)`. Tổng số đơn và tổng cước tính trên toàn bộ kết quả lọc, không chỉ trang hiện tại. Kỳ rỗng trả danh sách rỗng và tổng 0. Khách chỉ thấy đơn thuộc hồ sơ khách của mình, kể cả đơn do tổng đài tạo thay.

`GET /api/orders/{maDon}` giữ các trường Order hiện tại, thêm:
- `phienBanChinhSach`: biểu phí, giảm thành viên (có thể null) và phụ thu đúng phiên bản đã lưu cùng đơn; không tính lại bằng chính sách hiện hành.
- `phanCong`: toàn bộ phân công, gồm kết quả từ chối/hủy/hoàn tất và lý do; sắp theo thời điểm bắt đầu rồi mã.
- `xacNhanThanhToan`: giao dịch trong bảng xác nhận, số tiền thực nhận, thời điểm thu và người xác nhận; null nếu chưa xác nhận. Không coi mọi lần thử thanh toán là đã trả tiền.
- `nhatKy`: sự kiện theo `thuTu`, kể cả khi thời điểm bằng nhau.

Giữ quyền của API đọc đơn hiện hành: khách của đơn, tổng đài và tài xế được phép. Đơn không tồn tại hoặc không thuộc quyền xem đều trả 404. Endpoint sự kiện có phân trang vẫn được giữ để đọc từng trang nhật ký.

DAO đọc các quan hệ con bằng truy vấn riêng; tổng cước dùng tổng cước gốc trừ giảm giá và tổng phụ thu riêng, không join nhiều kiện/phân công/payment event để cộng tiền.

## Kiểm thử

Các test `t16*` trong DesignV1IntegrationTest chạy trên SQL Server test riêng. HTTP: `npm run smoke:history --prefix tools/api`, sau khi dựng/seed môi trường docker-compose.ci.yml. Smoke xác minh database là mini_ong_vang_test trước khi tạo dữ liệu. Test kiểm tra quyền, ngày sai, kỳ rỗng, phân trang/tổng toàn kỳ, nhiều kiện/phân công, xác nhận tiền mặt và sự kiện cùng thời điểm.

Kết quả local ngày 12/10/2026: build WAR bằng Java 21 đạt; 55 test backend (gồm 6 ca T16) pass, không skip; HTTP T16 27 kiểm tra pass. OpenAPI/Postman và 2 test Swagger/CSRF đạt.
Regression HTTP liên quan: T11 85, T12 93, T13 34 và T14 32 kiểm tra đều pass.
