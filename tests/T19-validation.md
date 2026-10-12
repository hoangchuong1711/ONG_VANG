# T19 — Hồi quy tích hợp backend trên designV1

Ngày: 12/10/2026. Nhánh: `feat/t19-backend-integration`. Commit nền: `a2a5aefaf8fb91e2be8beb4cb6ba50b0a70897ee` (`source/develop`, PR #16 đã merge). Schema yêu cầu: SQL Server 2022, designV1 Flyway V1 + V2, DB kiểm thử cô lập `mini_ong_vang_test`.

## Kết luận lần chạy hiện tại

**T19 chưa đạt; phần kiểm thử SQL Server/API bị BLOCKED do môi trường không tải được image SQL Server.** `docker compose ... up db-test` và `docker pull mcr.microsoft.com/mssql/server:2022-latest` đều kết thúc với `Forbidden` khi Docker tải layer từ MCR. Không có container/DB SQL Server được tạo, vì vậy không chạy Maven integration suite, HTTP smoke trên SQL Server, hoặc truy vấn đối chiếu dữ liệu. Không đánh dấu các ca DB là FAIL hay PASS khi chưa thực thi.

Các kiểm tra độc lập DB đã thực sự chạy:

| Kiểm tra | Expected | Actual | Kết quả |
| --- | --- | --- | --- |
| `npm run check --prefix tools/api` | OpenAPI/Postman hợp lệ; các test Swagger CSRF đạt | 29 operation, 12 UC, 287 example hợp lệ; Postman đồng bộ; 2 test pass, 0 fail/skip | PASS |
| Unit tests không cần DB (FareCalculator, GoongRouteProvider, RouteService, RevenueExcelExporter, PasswordHasher) | Tất cả test được chọn đạt | 12 test, 0 failure, 0 error, 0 skipped | PASS |
| Maven compile/package trên designV1 | Main/test source biên dịch, WAR đóng gói | 87 main source và 8 test source biên dịch; `BUILD SUCCESS` với `-DskipTests` | PASS (chỉ build, không phải kết quả test) |
| Khởi tạo SQL Server test | Image SQL Server 2022 chạy và DB test sẵn sàng | Registry `mcr.microsoft.com` trả `Forbidden`; không có DB test | BLOCKED |
| Maven integration tests, 12 UC, HTTP smoke, đối chiếu SQL | Chạy trên SQL Server designV1; không skip | Chưa chạy vì DB prerequisite không có | BLOCKED / NOT RUN |

Không có bug nghiệp vụ nào được xác nhận trong lần chạy này: kiểm thử tích hợp chưa chạy đến code runtime. Bug môi trường ghi nhận là `ENV-T19-01` — Docker registry từ chối tải image. Re-test cần chạy lại trên máy/runner truy cập được MCR hoặc sau khi registry khả dụng.

## Chuỗi 12 UC và kết quả

Các suite dưới đây đã có trong repo; cột kết quả mô tả lần chạy T19 hiện tại, không phải trạng thái code hay kết quả lịch sử. T19 bổ sung bước HTTP smoke tiền mặt vào workflow CI vì script đã tồn tại nhưng trước đó chưa được gọi trực tiếp trong workflow. Callback VNPay được kiểm tra bằng integration test với gateway giả lập, không gọi Sandbox thật.

| UC | Phạm vi | Bằng chứng dự kiến | Expected | Actual / kết quả T19 |
| --- | --- | --- | --- | --- |
| UC-01 | Đăng ký, đăng nhập, session, role, CSRF | `AuthServiceIntegrationTest`, API check | Tài khoản/profile nguyên tử; phân quyền và CSRF đúng | Integration BLOCKED; API contract check PASS nhưng không thay runtime test |
| UC-02 | Tạo đơn, validate, replay/idempotency | `DesignV1IntegrationTest`, `smoke:orders` | Aggregate đơn/cước/kiện/event/cache cùng transaction; retry không tạo đơn trùng | DB/HTTP BLOCKED |
| UC-03 | Báo giá, tính cước, làm tròn | `FareCalculatorTest`, `DesignV1IntegrationTest`, order smoke | Cước breakdown chính xác; không âm/tràn; báo giá hết hạn bị từ chối | Unit subtests PASS; DB integration BLOCKED |
| UC-04 | Chuẩn hóa tuyến và kiểm tra phạm vi | `RouteServiceTest`, `GoongRouteProviderTest`, order smoke | Tuyến hợp lệ; địa chỉ sai/ngoài vùng/lỗi provider có mã lỗi ổn định | Unit tests PASS; DB/HTTP BLOCKED |
| UC-05 | Chính sách thành viên | `DesignV1IntegrationTest` | Hạng/hiệu lực đúng biên; giảm 0/100%; policy chồng lấn hoặc sửa bản công bố bị chặn | DB integration BLOCKED |
| UC-08 | Thu tiền mặt | `DesignV1IntegrationTest`, `smoke:payment`, `smoke:reports` | Chỉ thu khi hoàn tất; đúng người/tiền; xác nhận nguyên tử và không trùng | DB/HTTP BLOCKED |
| UC-10 | VNPay URL, IPN, Return, query/đối soát | `DesignV1IntegrationTest` | Return không xác nhận tiền; IPN kiểm tra chữ ký/số tiền, dedup và xử lý callback muộn | DB integration BLOCKED; không gọi VNPay Sandbox thật |
| UC-12 | Điều phối, gán/từ chối | `DesignV1IntegrationTest`, `smoke:dispatch` | Không gán trùng; tài xế không đủ điều kiện/từ chối bị xử lý đúng | DB/HTTP BLOCKED |
| UC-13 | Tiến trình, sự cố, hoàn tất | `DesignV1IntegrationTest`, `smoke:progress` | State machine đúng; hoàn tất giải phóng tài xế và ghi event nguyên tử | DB/HTTP BLOCKED |
| UC-14 | Hủy đơn | `DesignV1IntegrationTest`, `smoke:cancel` | Quyền và mốc 300 giây đúng; tranh chấp gán/lấy hàng không để sót assignment | DB/HTTP BLOCKED |
| UC-15 | Báo cáo, Excel, công nợ | `DesignV1IntegrationTest`, `smoke:reports` | Kỳ rỗng bằng 0; tiền thu/công nợ theo đúng thời điểm; Excel khớp API | Unit exporter subtests PASS; DB/HTTP BLOCKED |
| UC-19 | Lịch sử/chi tiết đơn | `DesignV1IntegrationTest`, `smoke:history` | Đúng quyền sở hữu, bộ lọc/phân trang/tổng và thứ tự event | DB/HTTP BLOCKED |

## DT01–DT27 — Expected / Actual / PASS-FAIL

`BLOCKED` nghĩa là chưa có actual runtime vì SQL Server chưa khởi động được; không tương đương FAIL. DT06 có kiểm tra unit số học một phần đã chạy, nhưng toàn case vẫn chưa đạt do phần payment/schema chưa chạy.

| Ca | Expected | Actual lần chạy T19 | PASS/FAIL |
| --- | --- | --- | --- |
| DT01 | Sai role/hồ sơ trùng bị từ chối, không để account/profile dở dang | Chưa chạy trên SQL Server; image DB bị registry từ chối | BLOCKED |
| DT02 | Hai đăng ký cùng SĐT chỉ tạo một account; request còn lại nhận lỗi trùng | Chưa chạy concurrency DB | BLOCKED |
| DT03 | Hai policy cùng phạm vi không thể cùng công bố | Chưa chạy trên SQL Server | BLOCKED |
| DT04 | Không sửa/xóa policy đã công bố; đơn cũ giữ giá đã chốt | Chưa chạy trên SQL Server | BLOCKED |
| DT05 | Mốc hiệu lực thành viên chính xác, không phụ thuộc timezone máy | Chưa chạy trên SQL Server | BLOCKED |
| DT06 | Làm tròn đúng; giảm bằng cước thành miễn cước; không tạo payment; tiền tràn bị chặn | Unit FareCalculator: 2 test PASS gồm làm tròn/overflow; nhánh persistence/payment chưa chạy | PARTIAL — overall BLOCKED |
| DT07 | Quote hết hạn đúng 300 giây hoặc dữ liệu thay đổi trả lỗi, không tự đổi giá | Chưa chạy integration trên SQL Server | BLOCKED |
| DT08 | Retry cùng key/payload khi route lỗi trả response cũ, không tạo đơn khác | Chưa chạy integration trên SQL Server | BLOCKED |
| DT09 | Cùng key khác payload bị conflict; key hết hạn có thể dùng lại mà đơn cũ còn nguyên | Chưa chạy integration trên SQL Server | BLOCKED |
| DT10 | Lỗi giữa ghi aggregate không để lại đơn/cước/kiện/event/cache một phần | Chưa chạy fault-injection trên SQL Server | BLOCKED |
| DT11 | Hai request cùng đơn/hai đơn cùng tài xế tối đa có một assignment hợp lệ | Chưa chạy test cạnh tranh SQL Server hoặc HTTP | BLOCKED |
| DT12 | Thiếu xe, xe tắt, GPLX hết hạn hoặc account khóa đều không được gán | Chưa chạy trên SQL Server | BLOCKED |
| DT13 | Tài xế từ chối không được gán lại cùng đơn; lịch sử từ chối còn nguyên | Chưa chạy trên SQL Server | BLOCKED |
| DT14 | Chuyển trạng thái sai/lùi bị chặn; retry không thêm event | Chưa chạy trên SQL Server | BLOCKED |
| DT15 | Retry hoàn tất đơn cũ không đóng assignment mới, không sửa timestamp cũ | Chưa chạy trên SQL Server | BLOCKED |
| DT16 | Hủy chỉ hợp lệ trước 300 giây; race hủy/lấy hàng không để tài xế bận sót | Chưa chạy test thời gian/race trên SQL Server | BLOCKED |
| DT17 | Event trùng timestamp vẫn sắp xếp/phân trang ổn định theo `thu_tu` | Chưa chạy trên SQL Server | BLOCKED |
| DT18 | Chưa hoàn tất hoặc miễn cước thì không khởi tạo thanh toán/VNPay sai | Chưa chạy trên SQL Server | BLOCKED |
| DT19 | VNPay Return thành công nhưng chưa xác thực IPN không đánh dấu đã thu | Chưa chạy callback integration | BLOCKED |
| DT20 | Callback lặp/sai chữ ký/sai tiền/timeout/đến muộn được lưu và không xác nhận sai/đúp | Chưa chạy callback integration trên SQL Server | BLOCKED |
| DT21 | Không dùng payment của đơn A để xác nhận thanh toán đủ đơn B | Chưa chạy constraint/service test trên SQL Server | BLOCKED |
| DT22 | Khách không tự xác nhận tiền mặt; tài xế phải hoàn tất đơn trước khi xác nhận | Chưa chạy trên SQL Server | BLOCKED |
| DT23 | Hai khoản thu thật có thể lưu bằng chứng nhưng tối đa một xác nhận đủ; khoản dư chờ đối soát | Chưa chạy concurrency/payment test | BLOCKED |
| DT24 | Công nợ được tính theo mốc cuối kỳ; khoản thu nằm ở kỳ thực thu | Chưa chạy report query trên SQL Server | BLOCKED |
| DT25 | Đổi ID không đọc được đơn/event người khác; tài xế từ chối không còn quyền nếu không có quan hệ khác | Chưa chạy authorization integration/HTTP | BLOCKED |
| DT26 | Không xóa mất lịch sử; tài khoản/policy được khóa hoặc hết hiệu lực theo quy tắc | Chưa chạy trên SQL Server | BLOCKED |
| DT27 | Nhiều kiện/phụ thu/payment event không làm nhân tổng cước/tiền trong báo cáo | Chưa chạy trên SQL Server | BLOCKED |

## Bug / retest / đối chiếu dữ liệu

| ID | Mô tả | Loại | Trạng thái | Retest |
| --- | --- | --- | --- | --- |
| ENV-T19-01 | Docker daemon không tải được `mcr.microsoft.com/mssql/server:2022-latest`; registry/layer trả `Forbidden` | Hạ tầng, chưa phải bug ứng dụng | Open / BLOCKED | Chạy lại `docker compose -f docker-compose.ci.yml up --wait --wait-timeout 180 db-test` trên Docker host truy cập được MCR, sau đó chạy toàn bộ pipeline dưới đây |
| T19-COV-01 | Workflow CI chưa gọi HTTP smoke tiền mặt dù script `smoke:payment` có sẵn | Thiếu bước regression | Đã thêm bước sau `smoke:reports`; runtime chưa retest do DB image bị chặn | Chờ CI trên PR hoặc chạy `npm run smoke:payment --prefix tools/api` trên DB test |

Đối chiếu `scripts/check-design-v1-invariants.sql` **chưa chạy**. Chưa có truy vấn DB nào tạo PASS cho lần T19 này. Khi chạy được, cần lưu output của truy vấn invariant, Flyway V1/V2, JPA validate và danh sách bảng/constraint cùng Surefire/HTTP logs trong artifact của PR.

## Re-test trên SQL Server

Chạy theo đúng thứ tự CI trên máy có Docker truy cập được MCR. Dùng PowerShell theo [README CI](../README.md#ci-và-môi-trường-kiểm-thử-t05); đặt `TEST_DB_PASSWORD` mạnh, riêng cho test, không commit hoặc gửi mật khẩu. Bắt buộc `TEST_DB_URL` trỏ `mini_ong_vang_test` và `REQUIRE_TEST_DB=true`.

1. `npm ci --ignore-scripts --prefix tools/api`, sau đó `npm run check --prefix tools/api`.
2. Khởi động SQL Server test và initializer `db-init-test` trong `docker-compose.ci.yml`.
3. Chạy `mvn --batch-mode --no-transfer-progress -f src/backend/pom.xml verify` với DB test.
4. Reset/seed fixture DB test bằng `scripts/reset-test-db.ps1`; khởi động `backend-test`.
5. Chạy lần lượt `smoke`, `smoke:orders`, `smoke:history`, `smoke:cancel`, `smoke:reports`, `smoke:payment`, `smoke:dispatch`; reset/seed rồi restart backend trước `smoke:progress` như CI.
6. Chạy `scripts/check-design-v1-invariants.sql` qua `sqlcmd -b -d mini_ong_vang_test`.
7. Ghi số test/check thực tế, giờ chạy, commit, phiên bản designV1, Actual, PASS/FAIL, bug và retest. Dọn riêng Compose test bằng `docker compose -f docker-compose.ci.yml down --volumes --remove-orphans`.

Cho tới khi bước 2–6 chạy xong, T19 vẫn **In Progress/Blocked**, không phải Done. Tài liệu này không tái sử dụng số liệu kiểm thử schema PostgreSQL cũ hoặc các kết quả M1 lịch sử làm bằng chứng designV1 cho T19.
