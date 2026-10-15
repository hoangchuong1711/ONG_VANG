# Đăng ký và quên mật khẩu qua email

Đăng ký khách hàng vẫn dùng số điện thoại làm tên đăng nhập. Email là trường bắt buộc với tài khoản đăng ký mới, dùng để nhận mail thông báo đăng ký thành công và mã OTP khi quên mật khẩu. Mail chào mừng không yêu cầu bấm link kích hoạt.

Backend gửi mail bằng Brevo HTTPS API. Thêm vào `.env` ở thư mục gốc:

```env
BREVO_API_KEY=<Brevo API key>
MAIL_FROM_EMAIL=<địa chỉ người gửi đã xác minh trên Brevo>
MAIL_FROM_NAME=Mini Ong Vang
```

Sau khi thay `.env`, tạo lại backend bằng `docker compose up --build -d backend`. Giữ API key trong `.env`, không đưa sang biến frontend. Khi chưa cấu hình mail, đăng ký vẫn tạo tài khoản nhưng không gửi mail; API quên mật khẩu trả `MAIL_UNAVAILABLE`. Nếu Brevo từ chối gửi OTP, API cũng trả lỗi này và hoàn lại lượt gửi để có thể thử lại sau khi xử lý cấu hình.

Luồng quên mật khẩu tại `/forgot-password`:

1. `POST /api/auth/forgot-password` với `soDienThoai`, `email`. Kết quả chung không tiết lộ tài khoản có tồn tại hay không.
2. `POST /api/auth/verify-reset-otp` với hai trường trên và `otp`. OTP gồm 6 chữ số, hết hạn sau 5 phút, tối đa 5 lần nhập sai. API trả `resetToken` có hiệu lực 5 phút.
3. `POST /api/auth/reset-password` với `soDienThoai`, `email`, `resetToken`, `newPassword`. Token chỉ dùng một lần. Sau khi đổi mật khẩu, các phiên đăng nhập cũ hết hiệu lực.

Mọi POST cần `X-CSRF-Token` lấy từ `/api/auth/csrf`, giống các API đăng nhập/đăng ký hiện tại. Có giới hạn gửi lại mã theo cặp SĐT/email (60 giây, tối đa 5 lần/giờ) và IP (20 lần/giờ).

Tài khoản cũ chưa có email không thể dùng luồng khôi phục này cho tới khi email được bổ sung. Test gửi mail dùng máy chủ HTTP giả; test đổi mật khẩu với database chỉ chạy khi thiết lập `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD` cho `mini_ong_vang_test`.
