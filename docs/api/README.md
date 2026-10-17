# API Mini Ong Vang

Nguồn chuẩn duy nhất của endpoint, DTO, ví dụ, mã lỗi và trạng thái triển khai là [OpenAPI 3.1](../../src/backend/src/main/webapp/openapi.json). Swagger UI chạy tại `http://localhost:8081/swagger-ui/` khi backend khởi động; Postman collection được sinh từ OpenAPI. Contract cũ hoặc task plan không thay thế API đang chạy.

## Gọi API có đăng nhập

1. Gọi `GET /api/auth/csrf` để nhận token.
2. Gọi đăng nhập/đăng ký; sau khi đăng nhập lấy CSRF token mới.
3. Trình duyệt giữ cookie session HttpOnly. Với request ghi, gửi token trong `X-CSRF-Token`; không tự đưa cookie vào JavaScript.
4. Khi đổi tài khoản, đăng xuất rồi đăng nhập lại. API kiểm tra vai trò và quyền sở hữu ở backend.

API dùng JSON camelCase; tiền, km và khối lượng truyền dưới dạng chuỗi thập phân, thời gian theo ISO 8601. Lỗi theo envelope được mô tả trong OpenAPI. Request ghi cần CSRF; các thao tác hỗ trợ retry cần giữ cùng `Idempotency-Key`. Không gửi key bí mật, mật khẩu, OTP hoặc thông tin Sandbox vào repo.

## Kiểm tra tài liệu

Từ thư mục gốc chạy `npm.cmd ci --prefix tools/api`, rồi `npm.cmd run check --prefix tools/api`. Dùng `npm.cmd run generate --prefix tools/api` sau khi sửa OpenAPI để đồng bộ Postman. Test HTTP cần backend/DB test riêng; xem [hướng dẫn Postman](../../tests/postman/README.md), [T20 acceptance](../../tests/T20-acceptance.md) và [T19 validation](../../tests/T19-validation.md). Không dùng dữ liệu trong ví dụ làm bằng chứng endpoint đã chạy thành công.
