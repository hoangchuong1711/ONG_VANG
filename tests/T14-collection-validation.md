# Thu cước đúng mốc — kết quả kiểm thử 2026-10-14

- Maven/SQL Server cách ly: **83 tests, 0 failures, 0 errors, 0 skipped**; trong đó `DesignV1IntegrationTest` có 61 ca.
- HTTP smoke trên Tomcat với WAR mới và SQL Server cách ly: **36 checks passed**. Bao gồm session/CSRF, quyền ở filter, tạo payment bằng tài xế, từ chối người xác nhận không hợp lệ, khóa đi giao trước thu, xác nhận đúng tổng cước và idempotency.
- Frontend: TypeScript, ESLint và Next.js production build thành công.
- `git diff --check`: không có lỗi whitespace.

Ma trận tích hợp gồm người gửi/người nhận × tiền mặt/VNPay, mốc tạo yêu cầu, chuyển trạng thái trước thu, khóa chờ IPN, Return không tất toán, callback lặp/đồng thời/đến muộn, thất bại/hủy, chữ ký sai, sai/trùng tiền, QueryDr, timeout, rollback, miễn cước và khoản đã thu khi người nhận từ chối nhận hàng.

VNPay trong test sử dụng secret giả và phản hồi ký tại test. Chưa thực hiện thanh toán qua tài khoản merchant Sandbox thật hoặc kiểm tra callback public do VNPay gửi. Để chạy thử trực tiếp, cấu hình merchant và IPN theo [T15](../docs/T15-vnpay.md).

Các container backend/SQL Server dùng kiểm thử đã được dừng. Không thay đổi DB ứng dụng.
