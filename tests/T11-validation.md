# T11 — Kết quả kiểm thử điều phối

Ngày chạy: 09/10/2026. Nhánh `feature/T11-driver-dispatch`, nền T10 `b67da3c`. Java 21, Maven 3.9.11, PostgreSQL 17, Tomcat 10.1. Chỉ sử dụng database riêng `mini_ong_vang_test` (cổng 15433), HTTP cổng 18081; không reset database phát triển.

## Kết quả đã chạy

- Maven verify: **89 test, 0 failure, 0 error, 0 skipped**, WAR build thành công. Trong đó **14 test DispatchServiceIntegrationTest**.
- API check: OpenAPI hợp lệ, 29 operation / 12 UC / 287 example; Postman đồng bộ; **2 test Swagger CSRF đạt**.
- Smoke chung: spec được deploy khớp source, Swagger/assets phục vụ đúng, health có database connected.
- Smoke T10: **24 kiểm tra HTTP đạt**, gồm chống gửi lặp và tạo đơn đồng thời.
- Smoke T11: **83 kiểm tra HTTP đạt**, gồm session/role/CSRF, schema, bộ lọc, gán/từ chối và hai lượt 8 request đồng thời.

Các báo cáo hiện tại nằm ở `src/backend/target/surefire-reports/`. Đây là kết quả local; không thay thế CI GitHub hay review của thành viên khác.

| Nhóm kiểm tra | Bằng chứng |
| --- | --- |
| Gợi ý đúng thứ tự, phân trang và trường hợp không có tài xế | JUnit + HTTP |
| Loại tài khoản khóa, offline/nghỉ, tài xế bận; kiểm tra lại khi gán | JUnit + HTTP |
| Đơn/tài xế không tồn tại, trạng thái không được gán | JUnit |
| Lưu phân công, liên kết đơn, audit và bảo toàn snapshot | JUnit + HTTP |
| Từ chối cần lý do 1–500 ký tự, đúng người, trước lấy hàng | JUnit + HTTP |
| Giải phóng tài xế, không gán lại người đã từ chối cùng đơn | JUnit + HTTP |
| Khách/tài xế không truy cập dữ liệu người khác; không trả CCCD | JUnit + HTTP |
| Tổng summary trên toàn bộ tập lọc, ngày Việt Nam, phân trang và payment summary | JUnit; schema/bộ lọc HTTP |
| 8 request gán cùng một đơn | Chính xác 1 thành công, 7 ORDER_STATE_CONFLICT; 1 phân công/audit mới |
| 8 đơn tranh một tài xế | Chính xác 1 thành công, 7 DRIVER_UNAVAILABLE; tài xế chỉ liên kết 1 đơn hoạt động |
| Gán và từ chối cùng đơn đồng thời | JUnit: không trùng phân công, tài xế cũ được giải phóng |
| Lỗi DB ở bước audit gán/từ chối | Trigger lỗi có chủ đích, rollback mọi thay đổi; sau bỏ trigger hoạt động lại |

## Chạy lại trong Git Bash / Linux

Cần Java 21, Maven, Node và Docker Compose. Chạy từ gốc repo; dừng backend test trước Maven vì test reset dữ liệu riêng.

```bash
docker compose -f docker-compose.ci.yml stop backend-test
docker compose -f docker-compose.ci.yml up -d --wait db-test
export TEST_DB_URL=jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test
export TEST_DB_USER=mini_ong_vang_test TEST_DB_PASSWORD=ci-only-password REQUIRE_TEST_DB=true
mvn -B -f src/backend/pom.xml verify
npm ci --ignore-scripts --prefix tools/api
npm run check --prefix tools/api

# Chỉ reset fixture DB TEST sau JUnit, trước khởi động backend-test.
docker compose -f docker-compose.ci.yml exec -T db-test psql -U mini_ong_vang_test -d mini_ong_vang_test -v ON_ERROR_STOP=1 -c 'TRUNCATE tai_khoan,cau_hinh_cuoc,cau_hinh_phu_thu,hang_thanh_vien,demo_seed_manifest CASCADE'
export DEMO_PASSWORD=ci-only-demo-password
mvn -B -f src/backend/pom.xml exec:java -Dexec.mainClass=com.miniongvang.seed.SeedCommand -Dexec.args=test
docker compose -f docker-compose.ci.yml up --build --wait backend-test
export API_BASE_URL=http://127.0.0.1:18081 API_EXPECTED_DATABASE=mini_ong_vang_test
npm run smoke --prefix tools/api
npm run smoke:orders --prefix tools/api
npm run smoke:dispatch --prefix tools/api
docker compose -f docker-compose.ci.yml down --volumes --remove-orphans
unset TEST_DB_URL TEST_DB_USER TEST_DB_PASSWORD REQUIRE_TEST_DB DEMO_PASSWORD API_BASE_URL API_EXPECTED_DATABASE
```

Smoke T11 cần fixture mới: hai tài xế demo rảnh. Script tạo đơn riêng và cố ý giữ phân công để kiểm tra tranh chấp; reset lại DB TEST như trên trước lần chạy kế tiếp. Credential trong ví dụ chỉ dùng cho fixture CI/test tạm thời.

Trong cloud hiện tại Docker build không truy cập được Maven Central; đã build WAR bằng Maven trên host qua proxy được cung cấp, rồi mount WAR vào Tomcat trên network của Compose test. HTTP dùng cùng PostgreSQL/test settings như CI. Không tắt TLS hoặc checksum verification.
