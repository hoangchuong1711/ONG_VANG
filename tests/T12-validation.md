# T12 — Kết quả kiểm thử tiến trình và hoàn tất

Ngày kiểm thử: 10/10/2026. Windows, Java 21.0.6, Maven 3.9.11; PostgreSQL 17 và Tomcat 10.1 qua Docker Compose test riêng. Chỉ dùng `mini_ong_vang_test` tại cổng 15433, backend test tại 18081.

## Kết quả thực chạy

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Maven verify | **102 tests, 0 failures, 0 errors, 0 skipped**, WAR build thành công |
| ProgressServiceIntegrationTest mới | **9 tests đạt**, PostgreSQL thật |
| API check | OpenAPI hợp lệ: 29 operations, 12 UC, 287 examples; Postman đồng bộ; 2 Swagger CSRF tests đạt |
| HTTP smoke chung | Spec deploy khớp source, Swagger/assets phục vụ được, health báo DB connected |
| HTTP T10 | **24 checks đạt** |
| HTTP T11 | **89 checks đạt** |
| HTTP T12 | **94 checks đạt** |

JUnit reports: `src/backend/target/surefire-reports/`. Log local (được .gitignore bỏ qua): `tests/t12-maven-local.log`, `tests/t12-seed-local.log`. Các con số HTTP là script Node gọi backend thật, không phải Postman GUI/Newman. Chưa chạy CI từ xa hoặc review của thành viên khác.

## Bằng chứng UC-13

- Luồng lấy hàng → đang giao → hoàn tất; chặn nhảy bước/lùi bước/đích không hợp lệ, thiếu đơn, sai vai trò/tài xế/profile và tài khoản khóa.
- Thiếu phân công hiện hành chặn cả cập nhật và replay trạng thái đang giao.
- Lặp trạng thái hiện tại không thêm nhật ký. Tám request đồng thời cho **mỗi** bước đều trả trạng thái đích, chỉ thêm một event.
- Hoàn tất ghi timestamp, nhật ký, tài khoản/vai trò; kết thúc phân công và đặt thời điểm rảnh. Giữ cước/kiện hàng/trạng thái thu cước; không tạo thanh toán.
- Tài xế nhận được đơn mới sau hoàn tất. Retry hoàn tất đơn cũ không giải phóng tài xế hoặc thay đổi thời điểm hoàn tất. Vẫn đọc/retry qua lịch sử nếu `maTx` đã được xóa.
- Hai loại sự cố được lưu riêng, lý do trim tới 500 ký tự, clock server; giữ DANG_GIAO và tài xế bận. Chặn ghi sự cố trước đang giao hoặc sau hoàn tất.
- Hoàn tất cạnh tranh với sự cố: sự cố có thể ghi trước hoàn tất, hoặc trả 409 sau hoàn tất; không để phân công hoạt động sót lại.
- Trigger PostgreSQL cố ý làm bước ghi audit lỗi P0001: rollback đầy đủ hoàn tất và sự cố, không để timestamp/ranhTu/phân công/audit dở dang.
- Nhật ký đúng quyền, phân trang/sort ổn định và chặn offset tràn số. HTTP kiểm tra JSON/schema, session, CSRF, quyền và HEAD không thực hiện thao tác ghi.

## Chạy lại bằng PowerShell

Mở Docker Desktop; chạy từ thư mục gốc repo. Dùng `npm.cmd` để không phụ thuộc execution policy của npm.ps1. JVM trên máy có timezone mặc định `Asia/Saigon` khiến PostgreSQL từ chối kết nối lần đầu; đặt UTC cho JVM kiểm thử đã giải quyết lỗi môi trường này. Quy tắc ngày nghiệp vụ vẫn dùng `Asia/Ho_Chi_Minh` trong code.

```powershell
docker compose -f docker-compose.ci.yml stop backend-test
docker compose -f docker-compose.ci.yml up -d --wait db-test
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test'
$env:TEST_DB_USER='mini_ong_vang_test'
$env:TEST_DB_PASSWORD='ci-only-password'
$env:REQUIRE_TEST_DB='true'
$env:DEMO_PASSWORD='ci-only-demo-password'
$env:MAVEN_OPTS='-Duser.timezone=UTC'
mvn.cmd -B --no-transfer-progress -f src/backend/pom.xml '-DargLine=-Duser.timezone=UTC' verify
npm.cmd ci --ignore-scripts --prefix tools/api
npm.cmd run check --prefix tools/api

# Reset/seed duy nhất DB test sau JUnit. Script kiểm tra tên DB và dừng backend-test.
powershell -ExecutionPolicy Bypass -File scripts/reset-test-db.ps1
docker compose -f docker-compose.ci.yml up -d --build --wait backend-test
$env:API_BASE_URL='http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE='mini_ong_vang_test'
npm.cmd run smoke --prefix tools/api
npm.cmd run smoke:orders --prefix tools/api
npm.cmd run smoke:dispatch --prefix tools/api
npm.cmd run smoke:progress --prefix tools/api
docker compose -f docker-compose.ci.yml stop backend-test db-test
```

Smoke T12 tạo đơn riêng và dùng tài xế demo 5, có thể chạy sau T11 đang dùng tài xế 1/2. Script hoàn tất đơn demo đang giao của tài xế 5 trước khi bắt đầu, rồi cố ý giữ tài xế ở đơn mới cuối test để kiểm chứng retry đơn cũ. Reset/seed fixture trước mỗi lượt chạy lại. Migration V7 được Flyway áp dụng tự động khi khởi động persistence; không sửa checksum migration cũ.
