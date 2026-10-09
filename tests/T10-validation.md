# T10 — Kết quả kiểm thử UC-02

Ngày chạy: 09/10/2026. Nhánh: `feat/t10-API-tao-don`, trên nền `ec8967a` (T09 đã merge). Mã nguồn T10 chưa commit tại thời điểm ghi báo cáo.

## Kết quả thực tế

- Maven `verify`: **75 test, 0 failure, 0 error, 0 skipped**, WAR build thành công. Trong đó `OrderServiceIntegrationTest` có **14 test**, chạy PostgreSQL 17 thật qua `docker-compose.ci.yml`.
- `npm run check --prefix tools/api`: OpenAPI hợp lệ (29 operations, 12 UC, 287 examples); Postman đồng bộ; 2 test Swagger CSRF đạt.
- `npm run smoke --prefix tools/api`: spec triển khai khớp source, Swagger/assets và health DB đạt.
- `npm run smoke:orders --prefix tools/api`: **24 kiểm tra HTTP đạt**, bao gồm đăng ký/đăng nhập/session/CSRF, validation, lỗi báo giá, schema Order, retry và 4 request đồng thời.
- Backend chạy Tomcat/Java 21 trong Docker; Maven local chạy JDK 25, target Java 21. `JAVA_TOOL_OPTIONS=-Duser.timezone=UTC` khi chạy test local để tránh alias timezone Windows `Asia/Saigon` không được PostgreSQL test chấp nhận. Quy tắc nghiệp vụ vẫn dùng Asia/Ho_Chi_Minh theo T08/T09.

Bằng chứng máy: `src/backend/target/surefire-reports/TEST-com.miniongvang.order.OrderServiceIntegrationTest.xml`, các report Java khác cùng thư mục; log local `t10-build.log`. CI đã được bổ sung smoke T10 nhưng chưa có kết quả GitHub Actions cho thay đổi chưa push này.

## Truy vết test

| TC | Nội dung / Expected | Actual |
| --- | --- | --- |
| TC-02-01 | Khách thường/VIP/hết hạn: đúng cước, CHO_GAN, kiện/snapshot/phụ thu/nhật ký đầy đủ | PASS |
| TC-02-02 | Tổng đài chọn VIP: lưu đúng khách hưởng ưu đãi, maNv và tài khoản thao tác | PASS |
| TC-02-03 | Khách chọn người khác/báo giá người khác, tài xế tạo đơn: từ chối | PASS |
| TC-02-04 | Thiếu/rỗng/quá dài địa chỉ, SĐT sai, kiện rỗng/khối lượng 0, key thiếu/quá 100: không ghi đơn | PASS |
| TC-02-05 | SĐT +84 chuẩn hóa về 0 | PASS |
| TC-02-06 | Ngoài vùng hoặc route timeout: đúng lỗi, không ghi dữ liệu | PASS |
| TC-02-07 | Báo giá tuổi 299 giây tạo được; đúng 300/301 giây bị từ chối | PASS |
| TC-02-08 | Đổi địa chỉ/kiện/biểu phí sau báo giá: QUOTE_CHANGED, không tạo đơn | PASS |
| TC-02-09 | Retry sau 23 giờ/provider lỗi: body gốc; khác payload: IDEMPOTENCY_CONFLICT | PASS |
| TC-02-10 | 4 request cùng key đồng thời: đúng 1 đơn và 1 bộ dữ liệu liên quan | PASS |
| TC-02-11 | Trigger DB gây lỗi lúc ghi nhật ký: rollback cả đơn/kiện/snapshot/phụ thu/key; retry sau sửa lỗi thành công | PASS |
| TC-02-12 | Miễn cước: snapshot 0, MIEN_CUOC, không tạo payment | PASS |
| TC-02-13 | Cùng key khác tài khoản độc lập; đúng 24 giờ được dùng key lại với báo giá mới, đơn cũ giữ nguyên | PASS |
| TC-02-14 | VIP hết hạn sau báo giá hoặc biểu phí bị tắt: không tạo đơn, đúng lỗi | PASS |
| TC-02-15 | HTTP thiếu session/CSRF, JSON sai, field tiền giả, kiểu khối lượng sai, báo giá không tồn tại | PASS |
| TC-02-16 | HTTP 201 đúng schema, cước khớp quote; retry và request đồng thời trả đúng response gốc | PASS |

Nguồn: [integration test](../src/backend/src/test/java/com/miniongvang/order/OrderServiceIntegrationTest.java), [HTTP smoke](../tools/api/order-smoke.mjs).

## Chạy lại

Dùng DB test riêng theo README; dừng backend-test trước Maven vì bộ persistence test có reset dữ liệu. Các lệnh dưới giả định Maven/Node/Docker có trong PATH.

```powershell
docker compose -f docker-compose.ci.yml stop backend-test
docker compose -f docker-compose.ci.yml up -d --wait db-test
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test'
$env:TEST_DB_USER='mini_ong_vang_test'
$env:TEST_DB_PASSWORD='ci-only-password'
$env:REQUIRE_TEST_DB='true'
$env:JAVA_TOOL_OPTIONS='-Duser.timezone=UTC'
mvn -B -ntp -f src/backend/pom.xml verify
npm ci --ignore-scripts --prefix tools/api
# Nếu checkout Windows đổi newline của vendor: khôi phục bytes từ package đã khóa.
node tools/api/copy-swagger.mjs
npm run check --prefix tools/api
docker compose -f docker-compose.ci.yml up -d --build backend-test
$env:API_BASE_URL='http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE='mini_ong_vang_test'
npm run smoke --prefix tools/api
npm run smoke:orders --prefix tools/api
```

HTTP smoke tự tạo tài khoản/đơn fixture và chỉ cho chạy khi health xác nhận `mini_ong_vang_test`. Không chạy vào DB demo/production. Review của thành viên khác và merge vẫn chờ nhóm; không báo task Done trên Plane khi chưa review/merge.
