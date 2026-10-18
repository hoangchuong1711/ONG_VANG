# Database designV1

Phần chạy local bên dưới ghi lại cấu hình DesignV1 cũ. Ứng dụng hiện tại dùng DesignV2 như mô tả trong [README gốc](../../README.md) và [csdl.md](csdl.md). Không trộn migration hai thiết kế vào cùng database hoặc cùng Flyway locations.

## Chạy local

Tạo `.env` từ `.env.example`, đặt mật khẩu SQL Server riêng và `MSSQL_DATABASE=mini_ong_vang_design_v1`, rồi chạy từ repo:

```powershell
docker compose up -d --build backend
```

Kiểm tra `http://localhost:8081/api/health`; `databaseName` phải là `mini_ong_vang_design_v1`. Kết nối SSMS qua `tcp:127.0.0.1,1433` và tài khoản local trong `.env`.

`db-init` chỉ tạo DB khi chưa có. Backend chạy Flyway, JPA `validate`, rồi seed khi `DEMO_SEED=true`. DB cũ `mini_ong_vang` được giữ riêng để đối chiếu. `docker compose down` giữ volume; không thêm `-v` nếu muốn giữ dữ liệu.

## Test DB

DB CI DesignV2 `mini_ong_vang_design_v2_test` chạy riêng qua `docker-compose.ci.yml`, cổng 15433; backend test dùng 18081. Đặt `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `REQUIRE_TEST_DB=true`, sau đó dùng workflow [CI](../../.github/workflows/ci.yml) hoặc script [t20-local-verify.ps1](../../scripts/t20-local-verify.ps1). Các smoke DesignV2 chỉ chạy trên DB này. Công cụ reset DesignV1 cũ vẫn nhắm `mini_ong_vang_test`, không dùng với stack CI DesignV2.

Seed demo cuối cùng giữ tài khoản, hồ sơ, xe và policy; V20 dọn các đơn/giao dịch fixture cũ theo ID cố định. Mật khẩu tài khoản demo được đặt bởi migration V19. Không chạy cleanup trên DB khác demo/test.
