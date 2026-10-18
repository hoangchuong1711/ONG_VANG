# API Mini Ong Vang

`openapi.json` mô tả API designV1 đang có và các endpoint designV2 đã triển khai cho cổng admin. Hợp đồng designV2 được thêm dưới `/api/v2`; một số API V2 ngoài phạm vi admin vẫn có thể chưa được đặc tả. Xem [hợp đồng API admin designV2](design-v2-admin.md) và [báo cáo kiểm thử cổng admin](../admin_live_design_v2_test_report.md) để biết phạm vi đã đối chiếu.

Swagger UI chạy tại `http://localhost:8081/swagger-ui/` khi backend khởi động. Postman được sinh từ `openapi.json`; các request V2 nằm trong nhóm có kiểm soát và bị bỏ qua mặc định.

## Gọi API có đăng nhập

1. Gọi `GET /api/v2/auth/csrf` cho luồng designV2 (`/api/auth/csrf` là designV1).
2. Gọi `POST /api/v2/auth/login` hoặc đăng ký; sau khi đăng nhập lấy CSRF token mới từ `/api/v2/auth/csrf`.
3. Trình duyệt giữ cookie session HttpOnly. Với request ghi, gửi token trong `X-CSRF-Token`; không tự đưa cookie vào JavaScript.
4. Khi đổi tài khoản, đăng xuất rồi đăng nhập lại. API kiểm tra vai trò và quyền sở hữu ở backend.

API V2 dùng JSON theo hợp đồng từng endpoint; một số trường DB giữ tên snake_case. Tiền trả về từ API là giá trị VND nguyên; thời gian là ISO 8601. Request ghi cần CSRF; các thao tác hỗ trợ retry cần giữ cùng `Idempotency-Key`. Không gửi key bí mật, mật khẩu, OTP hoặc thông tin Sandbox vào repo.

Trong Postman, `runPlanned=false` là mặc định. Các request V2 trong nhóm **Admin V2 (manual; isolated test DB only)** luôn có guard; chỉ bật chạy sau khi `baseUrl`, vai trò, CSRF và fixture đã trỏ đúng DB test riêng. Không bật nhóm ghi trên cổng đang dùng DB demo. VNPay IPN cần query nguyên bản có chữ ký; request return chỉ chuyển hướng và không quyết toán.

## Kiểm tra tài liệu

Từ thư mục gốc chạy `npm.cmd ci --prefix tools/api`, rồi `npm.cmd run check --prefix tools/api`. Dùng `npm.cmd run generate --prefix tools/api` sau khi sửa OpenAPI để đồng bộ Postman. Test HTTP cần backend/DB test riêng; xem [hướng dẫn Postman](../../tests/postman/README.md), [T20 acceptance](../../tests/T20-acceptance.md) và [T19 validation](../../tests/T19-validation.md). Không dùng dữ liệu trong ví dụ làm bằng chứng endpoint đã chạy thành công.
