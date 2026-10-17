# Database designV1

Schema đang chạy do Flyway tạo từ V1–V12 trong `src/backend/src/main/resources/db/designV1/sqlserver/`. [csdl.md](csdl.md) là bản đề xuất thiết kế mới, chưa áp dụng vào DB. Chỉ dùng script trong đó khi thiết kế được duyệt và trên database mới; không chạy trên DB đã migrate. Khi phát triển schema hiện tại, thêm migration Flyway mới, không sửa migration đã áp dụng.

## Chạy local

Tạo `.env` từ `.env.example`, đặt mật khẩu SQL Server riêng và `MSSQL_DATABASE=mini_ong_vang_design_v1`, rồi chạy từ repo:

```powershell
docker compose up -d --build backend
```

Kiểm tra `http://localhost:8081/api/health`; `databaseName` phải là `mini_ong_vang_design_v1`. Kết nối SSMS qua `tcp:127.0.0.1,1433` và tài khoản local trong `.env`.

`db-init` chỉ tạo DB khi chưa có. Backend chạy Flyway, JPA `validate`, rồi seed khi `DEMO_SEED=true`. DB cũ `mini_ong_vang` được giữ riêng để đối chiếu. `docker compose down` giữ volume; không thêm `-v` nếu muốn giữ dữ liệu.

## Test DB

DB CI `mini_ong_vang_test` chạy riêng qua `docker-compose.ci.yml`, cổng 15433; backend test dùng 18081. Đặt `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `REQUIRE_TEST_DB=true`, sau đó khởi động `db-test` và `db-init-test` theo lệnh trong [README](../../README.md#ci-và-môi-trường-kiểm-thử-t05). Script reset từ chối DB không đúng tên và chỉ dùng cho test. Không chạy smoke ghi dữ liệu trên DB phát triển.

Seed demo tạo tài khoản, hồ sơ, xe và policy; mật khẩu lấy từ `DEMO_PASSWORD` và lưu dạng bcrypt hash. Không có sẵn đơn/thanh toán demo. Mọi thông tin đăng nhập do nhóm tự cấu hình, không ghi mật khẩu vào tài liệu/commit.
