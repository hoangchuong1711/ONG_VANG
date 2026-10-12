# T19 — Hồi quy tích hợp backend trên designV1

## Kết quả thực thi trên Windows — 12/10/2026

Người chạy: Le Nguyen Thanh Hien; nhánh `feat/t19-backend-integration`. Bằng chứng là ba log terminal người dùng cung cấp trong phiên làm việc, ghi thời gian Maven 15:17 và reset/seed 15:23 ngày 12/10/2026 (+07:00). Lượt retest 15:31 ngày 12/10/2026 cung cấp `git rev-parse HEAD`: `d00db8c07c456c43b15ed3b8f4b5c6dcb2d14cee`. DB là SQL Server 16.0 (`mini_ong_vang_test`, cổng 15433), migration designV1; không dùng kết quả PostgreSQL cũ.

| Bước | Expected | Actual | Kết quả |
| --- | --- | --- | --- |
| SQL Server test + initializer | DB test cô lập sẵn sàng | Docker DB healthy, initializer hoàn tất; JDBC/Flyway kết nối SQL Server 16.0, databaseName=mini_ong_vang_test | PASS |
| Maven clean verify | Test DB thực sự chạy; không failure/error/skip | 63 tests: Auth 5, SQL Server 2, DesignV1 44, unit khác 12; 0 failure/error/skipped; BUILD SUCCESS | PASS |
| OpenAPI/Postman/CSRF | Contract và artifacts đồng bộ | npm check đạt: 29 operations, 12 UCs, 287 examples; 2 CSRF tests đạt | PASS |
| Smoke chung | WAR/spec/assets và BE/DB hoạt động | Spec khớp source; Swagger assets được phục vụ; health=200 connected | PASS |
| T10 tạo đơn | Validation, replay và concurrent create đạt | 24 HTTP checks passed | PASS |
| T16 lịch sử | Ownership, pagination, filters, totals, schema đạt | 27 HTTP checks passed | PASS |
| T13 hủy | Quyền, lý do, hủy đơn chờ/đã gán và giải phóng tài xế đạt | 34 HTTP checks passed | PASS |
| T17 báo cáo/Excel | Quyền quản trị, receipts, unallocated receipts và XLSX khớp API | 53 HTTP checks passed | PASS |
| T14 tiền mặt | Đúng trạng thái/người xác nhận, replay và chặn thanh toán trùng | 32 HTTP checks passed | PASS |
| T11 điều phối | Quyền/CSRF, gán/từ chối và hai race 8 request đạt | 85 HTTP checks passed | PASS |
| Reset/seed rồi T12 tiến trình | Fixture mới; state machine và completion đạt | Reset/seed BUILD SUCCESS; 93 HTTP checks passed | PASS |
| Đối chiếu designV1 sau progress | Các invariant được script kiểm tra không có vi phạm | sqlcmd -b: `designV1 invariant reconciliation passed` | PASS |

Tổng: **63 Java tests và 348 HTTP checks nghiệp vụ đạt**, cộng smoke chung và API contract check. Các log ERROR do test cố ý inject lỗi/vi phạm constraint có suite kết thúc với 0 failure/error. VNPay callback được kiểm tra bằng gateway giả lập trong DesignV1IntegrationTest; chưa có bằng chứng thanh toán VNPay Sandbox thật.

## Bổ sung hồi quy và đối chiếu — chờ chạy lại bản mới

Lượt người dùng chạy lại lúc 15:31 (+07:00) tại `d00db8c` đạt 53 HTTP checks báo cáo, 32 tiền mặt và invariant trước reset. Script của commit đó chưa có truy vấn kiểm tra số tiền xác nhận thanh toán, nên kết quả chỉ chứng minh các invariant cũ.

T19 hiện bổ sung migration V4: trigger chặn hồ sơ khách/tài xế gắn sai role và chặn thay đổi vai trò tài khoản. FK trước đó chỉ chứng minh tài khoản tồn tại, chưa bảo vệ role/profile. Ghi nhận `T19-BUG-01`, phát hiện qua rà DDL; sửa đã biên dịch nhưng kiểm chứng SQL Server còn PENDING, chưa ghi PASS.

Script invariant được bổ sung đối chiếu khoản xác nhận với đúng đơn HOAN_TAT, payment thành công và đúng tổng cước; chặn nhiều payment chưa giải quyết trên một đơn, payment trước hoàn tất/đơn miễn cước và callback DA_AP_DUNG thiếu chữ ký hợp lệ/liên kết payment. CI và README chạy invariant cả trước reset lẫn sau progress.

| DT / nhánh thiếu | Test bổ sung | Expected | Actual / kết quả |
| --- | --- | --- | --- |
| DT01 | dt01WrongProfileRoleAndDuplicateProfileAreRejectedAtomically | Sai role, đổi role hoặc hồ sơ trùng bị SQL Server chặn; không đổi hồ sơ cũ | Biên dịch đạt; runtime PENDING |
| DT09 | dt09IdempotencyExpiresAtExactlyTwentyFourHoursWithoutDeletingOldOrder | Replay trước 24 giờ; đúng 24 giờ cần quote mới; đơn cũ giữ nguyên | Biên dịch đạt; runtime PENDING |
| DT12 | dt12SuggestionsAndAssignmentRejectEveryIneligibleDriver | Cả gợi ý và gán chặn thiếu xe/xe tắt/GPLX hết hạn/account khóa | Biên dịch đạt; runtime PENDING |
| DT15 | dt15CompletedReplayCannotCloseDriversNewAssignment | Retry đơn cũ không đổi timestamp/event hoặc assignment mới | Biên dịch đạt; runtime PENDING |
| DT16 | dt16CancellationRacingPickupLeavesOneConsistentOutcome | Barrier cho hai worker; chỉ hủy hoặc lấy hàng thắng, trạng thái/assignment/tài xế nhất quán | Biên dịch đạt; runtime PENDING |
| DT26 | dt26DeletingReferencedAccountPolicyOrOrderCannotEraseHistory | Xóa lịch sử bị chặn bởi FK/trigger, toàn bộ số dòng giữ nguyên | Biên dịch đạt; runtime PENDING |
| Payment invariant | t19InvariantQueryAcceptsValidPaymentAndDetectsWrongConfirmedAmount | Script chấp nhận khoản thu đúng; sai số tiền xác nhận bị lỗi 51010 | Biên dịch đạt; runtime PENDING |

Cần pull bản mới, chạy `clean verify` với REQUIRE_TEST_DB=true (dự kiến **70 test**, trong đó DesignV1 51), rồi chạy lại nhóm reports/payment và script invariant mới trước reset. 70 là số mong đợi, chưa phải kết quả đã chạy. Gateway VNPay vẫn giả lập; không ghi Sandbox thật đã PASS.

## Bug và retest cập nhật

- `ENV-T19-01`: cloud vẫn không tải được MCR; trên máy Windows người dùng, image SQL Server tải được và toàn suite/HTTP đã chạy. Trở ngại thực thi local đã giải quyết.
- `T19-COV-01`: smoke tiền mặt mới thêm vào workflow đã được chạy local: 32 checks PASS. CI trên PR vẫn cần kết quả riêng.
- Lần đầu người dùng dán cú pháp PowerShell vào Git Bash, nên DB tests không chạy (chỉ 12 unit tests). Sau đổi sang `export`, chạy lại đạt 63 tests, gồm 44 DesignV1 integration tests. Chỉ lần chạy lại được dùng làm bằng chứng DB.

## Phạm vi còn cần xác nhận

Kết quả PASS của suite không tự chứng minh đủ mọi nhánh trong DT01–DT27. Ma trận Expected bên dưới giữ làm checklist; các trạng thái BLOCKED trong đó mô tả lần cloud ban đầu, đã được thay bằng kết quả suite local ở trên. Cần đối chiếu từng assertion với từng nhánh DT, đặc biệt ca chưa có test riêng như key hết hạn đúng 24 giờ, sai role/profile, và bảo vệ xóa lịch sử; không đánh dấu toàn bộ 27 ca PASS chỉ dựa trên tổng số test.

Truy vấn invariant trong log cuối chạy sau reset/seed và smoke progress. Nó xác nhận dữ liệu của lượt progress; không phải đối chiếu dữ liệu tiền mặt/báo cáo từ lượt trước, vì reset đã xóa lượt đó. Cần chạy invariant trước reset giữa hai nhóm để có bằng chứng riêng cho dữ liệu thanh toán/báo cáo/điều phối. T19 chưa được ghi Done cho đến khi hoàn tất đối chiếu độ phủ, phần bằng chứng còn thiếu và PR review/CI/merge.

---

# Lần thử ban đầu trên cloud — lịch sử

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


## Retest V4 — lỗi fixture và bản sửa

Log người dùng ngày 12/10/2026, 15:42:50 (+07:00): 70 tests, 0 failures, **11 errors**, 0 skipped; BUILD FAILURE. Các errors xảy ra ở resetFixture/seed với Hibernate `Unexpected row count: -1; expected: 1`. Ghi `T19-BUG-02`: test invariant chạy batch có SET NOCOUNT ON nhưng không khôi phục session khi trả connection về Hikari pool. Kết nối bị tái sử dụng khiến Hibernate không nhận row count của INSERT. Đã thêm finally SET NOCOUNT OFF cho cả nhánh thành công và lỗi 51010 của test; giữ nguyên assertion rollback/constraint. Bản sửa biên dịch được; kết quả runtime 70 test vẫn PENDING cho tới khi chạy lại clean verify trên SQL Server.
