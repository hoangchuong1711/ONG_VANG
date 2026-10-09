# T11 — Kết quả kiểm thử điều phối

Ngày kiểm thử: 09/10/2026. Nhánh `feature/T11-driver-dispatch`, nền T10 `b67da3c`. Môi trường cloud kiểm thử bằng Java 21, Maven 3.9.11, PostgreSQL 17, Tomcat 10.1. Người dùng chạy lại trên Windows 11/Git Bash với Temurin JDK 21.0.12.1, Maven 3.10.0, Node.js 24.16.0, Docker Compose 5.5.1. Chỉ sử dụng database riêng `mini_ong_vang_test` (cổng 15433), HTTP cổng 18081; không reset database phát triển.

## Kết quả đã chạy

- Maven verify trên cloud: **93 test, 0 failure, 0 error, 0 skipped**, WAR build thành công. Trong đó **18 test DispatchServiceIntegrationTest**. Người dùng đã chạy lại `mvn -B -f src/backend/pom.xml verify` trên Windows: log cũng báo **93 test, 0 failure, 0 error, 0 skipped** và `BUILD SUCCESS`; Maven xác nhận chạy bằng Java 21.0.12.1.
- API check: OpenAPI hợp lệ, 29 operation / 12 UC / 287 example; Postman đồng bộ; **2 test Swagger CSRF đạt**.
- Smoke chung: spec được deploy khớp source, Swagger/assets phục vụ đúng, health có database connected.
- Smoke T10: **24 kiểm tra HTTP đạt**, gồm chống gửi lặp và tạo đơn đồng thời.
- Smoke T11 trên cloud: **89 kiểm tra HTTP đạt**. Người dùng đã chạy lại `npm run smoke:dispatch --prefix tools/api` trên Windows sau khi cài dependencies và seed fixture: **89 kiểm tra đạt**, gồm session/role/CSRF, schema, bộ lọc, gán/từ chối và hai lượt 8 request đồng thời.

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
| Lỗi DB ở bước audit gán/từ chối | Xác nhận đúng SQLException P0001 từ trigger; rollback trạng thái, phân công, thời điểm rảnh và audit |
| Gán cạnh tranh transaction hủy | JUnit dùng fixture transaction DB theo thứ tự khóa; không phải API hủy T13 |
| HEAD không được gán/từ chối | HTTP raw có body, không CSRF: 404; trạng thái đơn giữ nguyên |
| Lịch sử hoàn thành và từ chối | Người hoàn thành vẫn xem được; người từ chối không xem được |

## Rà soát bổ sung

Đã sửa hai lỗi: Servlet trước đây coi HEAD là thao tác ghi và fixture PC-DEMO-REJECTED chưa có cờ tuChoi. Chỉ POST được gán/từ chối; seed và migration V6 sửa đúng fixture từ chối đã biết, giữ nguyên checksum V5.

Đã dựng bản sao WAR với routing HEAD cũ để kiểm chứng test hồi quy: request HEAD không CSRF trả 200 và thực sự chuyển đơn sang DA_GAN; test mới thất bại đúng tại kỳ vọng 404. Với WAR đã sửa, toàn bộ 89 kiểm tra HTTP đạt. Các worker JUnit chờ đủ tại barrier trước khi bắt đầu cạnh tranh; kiểm tra cả đơn thua không bị thay đổi hoặc có audit dư.

Postman collection đã kiểm tra đồng bộ và schema; chưa chạy Postman GUI/Newman. Các kết quả HTTP trên do script Node gọi trực tiếp backend thật. API hủy thuộc T13 chưa triển khai; test gán–hủy chỉ kiểm tra hợp đồng transaction DB bằng fixture.

## Chạy lại trong VS Code trên Windows / Git Bash

Cài JDK 21, Maven, Node.js và Docker Desktop. Mở Docker Desktop, chọn Terminal Git Bash trong VS Code, chạy từ thư mục gốc repo. Kiểm tra `mvn -version` hiển thị Java 21; Maven có thể dùng Java khác nếu `JAVA_HOME` trỏ sai. Dependencies của smoke script cài bằng `npm ci`; nếu bỏ bước này, Node báo `Cannot find package ajv`.

```bash
docker compose -f docker-compose.ci.yml stop backend-test
docker compose -f docker-compose.ci.yml up -d --wait db-test
export TEST_DB_URL=jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test
export TEST_DB_USER=mini_ong_vang_test
export TEST_DB_PASSWORD=ci-only-password
export REQUIRE_TEST_DB=true
mvn -B -f src/backend/pom.xml verify
npm ci --ignore-scripts --prefix tools/api
npm run check --prefix tools/api

# Chỉ reset fixture DB TEST sau JUnit, trước khởi động backend-test.
docker compose -f docker-compose.ci.yml exec -T db-test psql -U mini_ong_vang_test -d mini_ong_vang_test -v ON_ERROR_STOP=1 -c 'TRUNCATE tai_khoan,cau_hinh_cuoc,cau_hinh_phu_thu,hang_thanh_vien,demo_seed_manifest CASCADE'
export DEMO_PASSWORD=ci-only-demo-password
mvn -B -f src/backend/pom.xml exec:java -Dexec.mainClass=com.miniongvang.seed.SeedCommand -Dexec.args=test
docker compose -f docker-compose.ci.yml up --build --wait backend-test
export API_BASE_URL=http://127.0.0.1:18081
export API_EXPECTED_DATABASE=mini_ong_vang_test
npm run smoke --prefix tools/api
npm run smoke:orders --prefix tools/api
npm run smoke:dispatch --prefix tools/api
docker compose -f docker-compose.ci.yml down --volumes --remove-orphans
unset TEST_DB_URL TEST_DB_USER TEST_DB_PASSWORD REQUIRE_TEST_DB DEMO_PASSWORD API_BASE_URL API_EXPECTED_DATABASE
```

Smoke T11 cần fixture mới, bao gồm hai tài xế demo rảnh. `DEMO_PASSWORD` phải được export trước lệnh seed và giữ nguyên trong cùng terminal tới khi chạy smoke. Nếu chỉ chạy `smoke:dispatch` sau khi đã cài npm packages nhưng chưa export biến này, script dừng với thông báo `Seed isolated DB with DEMO_PASSWORD before dispatch smoke`. Lệnh TRUNCATE bên trên chỉ dành cho DB test ở cổng 15433; nó xóa fixture để seed lại, không chạy với DB phát triển. Script smoke tạo đơn riêng và cố ý giữ phân công để kiểm tra tranh chấp; reset và seed lại trước lần chạy kế tiếp. Mật khẩu `ci-only-*` chỉ dành cho fixture test tạm thời.

Kết quả local của người dùng được xác nhận cho Java verify và T11 dispatch smoke. Họ chưa gửi kết quả chạy `npm run check`, `smoke`, hoặc `smoke:orders` tại Windows; các con số của những bước này ở phần đầu là kết quả cloud chạy trước đó. Docker stack dùng DB test riêng và cổng backend test 18081.
