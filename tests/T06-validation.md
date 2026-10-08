# T06 — kiểm thử xác thực và đăng ký khách hàng

Ngày kiểm tra: 08/10/2026. Môi trường: Java 21, Maven, PostgreSQL 17 qua `docker-compose.ci.yml` (`mini_ong_vang_test`, tmpfs, cổng 15433), Tomcat backend-test cổng 18081. Không dùng database phát triển.

| Trường hợp | Kết quả quan sát | Trạng thái |
| --- | --- | --- |
| Register số `+84…` | 201, trả `User` role `KHACH_HANG`, `maKh` có giá trị; DB lưu username/SĐT dạng `0…`, mật khẩu bcrypt, không có VIP | PASS |
| `me` trước login; login; `me`; logout; `me` lại | 401 → 200 → 200 → 204 → 401; CSRF đổi sau login | PASS |
| Register thiếu CSRF | 403 `CSRF_INVALID` | PASS |
| Register mật khẩu ngắn hoặc gửi `vaiTro` | 400 `VALIDATION_ERROR` | PASS |
| Register trùng SĐT, kể cả `0…`/`+84…` | 409 `ACCOUNT_ALREADY_EXISTS`; test đồng thời chỉ tạo một tài khoản/hồ sơ | PASS |
| Lỗi khi tạo hồ sơ | Transaction rollback, không để lại tài khoản | PASS |
| Sai mật khẩu | 401 `INVALID_CREDENTIALS` | PASS |
| Khách chưa đăng nhập / sai role vào API báo cáo | 401 / 403 | PASS |
| Tài khoản chuyển sang `KHOA` | Service không trả current user; HTTP `me` và login đều trả 403 | PASS |
| Preflight từ `http://localhost:3001` | 204, origin cụ thể, credentials=true, cho phép CSRF header | PASS |
| Cookie phiên | `JSESSIONID` host-only, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Cache-Control: no-store` trên local HTTP | PASS |
| OpenAPI, Postman, Swagger, health | Contract validator PASS; Postman sinh từ spec đồng bộ; smoke HTTP PASS | PASS |

Lệnh kiểm tra: `mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify` với `TEST_DB_URL/USER/PASSWORD` trỏ tới DB test và `REQUIRE_TEST_DB=true`; `npm.cmd run check --prefix tools/api`; `npm.cmd run smoke --prefix tools/api` với `API_BASE_URL=http://127.0.0.1:18081`. Bộ Maven gồm 25 test khi DB được cấu hình. Luồng HTTP và nhánh lỗi chạy trực tiếp bằng PowerShell trên stack test.

Giới hạn: chưa kiểm tra cookie `Secure` qua HTTPS thật hoặc giao diện trình duyệt; Tomcat trên stack test chạy HTTP. Các route nghiệp vụ T07–T18 vẫn planned. Filter T06 chặn theo vai trò và CSRF cho các route này; quyền sở hữu từng đơn/thanh toán phải được service tương ứng kiểm tra khi triển khai.
