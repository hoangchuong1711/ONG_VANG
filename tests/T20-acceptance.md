# T20 — Đối chiếu mốc nghiệm thu backend

Ngày kiểm tra: 13/10/2026 (Asia/Bangkok). Nhánh: `feat/t20-backend-acceptance`, xuất phát từ `develop` tại `589bda5`. Phạm vi gồm backend trên SQL Server designV1 và hợp đồng cho các màn hình. Người dùng cho phép **hoãn kiểm tra VNPay Sandbox thật**; kết quả đó phải giữ `NOT RUN`, không chuyển thành `PASS`.

## Kết luận tại thời điểm lập biên bản

**Phần BE/DB và HTTP tự động đạt trên môi trường test cô lập. T20 chưa thể đánh dấu Done theo tiêu chí gốc mục 7.** Còn thiếu giao dịch Sandbox thật, một lượt Postman Main Flow liên tục có lưu kết quả, CI của chính nhánh/PR T20 và review bởi thành viên khác. Nhóm có thể dùng hợp đồng API hiện tại để tiếp tục chuẩn bị/tích hợp FE theo quyết định hoãn Sandbox của người dùng; việc đó không phải là biên bản nghiệm thu Sandbox hoặc đóng T20.

Không ghi nhận bug Critical/High chưa xử lý trong các ca đã chạy. `listCustomers` là lỗ hổng API cho form tổng đài phát hiện lúc rà; đã bổ sung endpoint, test và Postman trong nhánh này. Cần CI/reviewer xác nhận bản thay đổi trước khi tuyên bố không còn lỗi chặn FE.

## Đối chiếu mục 7 của kế hoạch

| Tiêu chí | Kết quả / bằng chứng | Trạng thái |
| --- | --- | --- |
| T06–T18 và 12 UC kiểm thử độc lập FE | [T19](T19-validation.md) ghi DT01–DT27, 73 Java tests và 348 HTTP checks ở bản trước; commit T19 `242290b` đã vào `develop`. T18 chỉ đồng bộ tài liệu, chưa hoàn tất seed demo và môi trường Sandbox theo [phạm vi T18](../docs/T18-sandbox-api.md). Lượt T20 dưới đây chạy lại 74 tests và 357 HTTP checks, trừ Sandbox thật. | ĐẠT phần BE nội bộ; T18/Sandbox còn hoãn |
| Migration/seed/Hibernate/designV1 | Flyway V1–V4 dựng mới trên `mini_ong_vang_test`, seed lại sau reset; 74 Java tests gồm 55 `DesignV1IntegrationTest` đạt. | PASS local |
| API/DTO đủ cho màn hình | OpenAPI hiện có 29/29 operation `implemented`, 12 UC; bổ sung `GET /api/customers` cho tổng đài chọn `maKh`, tìm tên/SĐT, phân trang và chặn tài khoản khóa. Schema/examples/collection kiểm tra hợp lệ. Bảng ánh xạ bên dưới nêu từng màn hình. | PASS contract và HTTP các luồng đã chạy |
| Main Flow API/DB thật và Postman xuyên suốt | 357 HTTP checks từ các script smoke trên API/SQL Server thật đạt. Collection Postman được sinh từ OpenAPI và `npm run check` đạt, nhưng [Main Flow trong README Postman](postman/README.md) là kịch bản thủ công theo nhiều vai trò; chưa có log một lượt chạy xuyên suốt bằng Postman. | PARTIAL |
| VNPay Sandbox thành công/hủy/thất bại/IPN | T19 có integration với gateway/callback ký giả lập; không có bằng chứng từ cổng Sandbox thật. Người dùng hoãn đến khi deploy. | NOT RUN — hoãn |
| Test quyền, đồng thời, rollback, callback lặp và bất biến DB | 74 Java tests, 357 HTTP checks; script `check-design-v1-invariants.sql` đạt trước reset và sau progress. Callback VNPay trong suite là giả lập. | PASS local trong phạm vi giả lập |
| CI build/test và review | `mvn verify`, `npm run check`, Docker runtime đều đạt local. Workflow CI có đầy đủ bước SQL Server/HTTP/invariant; chưa có kết quả CI cho nhánh/PR T20. Review phải do thành viên khác thực hiện. | CHỜ CI/REVIEW |
| UI tests | Theo mục 7, để T30 sau khi có FE; không tính là test BE PASS. | NOT RUN — chờ FE |

## API cho 12 màn hình theo kế hoạch FE

| Màn hình | Dữ liệu/hành động BE dùng được | Lưu ý hợp đồng |
| --- | --- | --- |
| MH-01, KH-01, QT-01 | `getCsrf`, `register`, `login`, `getCurrentUser`, `logout`, `getHealth` | Dùng `vaiTro`/`maNguoiDung`; không chờ `maNv`. |
| KH-02 | `estimateRoute`, `createQuote`, `createOrder`; tổng đài thêm `listCustomers` | Chọn `maKh` từ BE; FE không tự tính tổng cước. |
| KH-03 | `getOrder`, `createPayment`, `listPayments`, `getPayment`, `reconcilePayment`, `vnpayReturn` | Return không có nghĩa đã thu; chờ IPN/query BE. Sandbox thật chưa xác minh. |
| KH-04, KH-05 | `listOrders`, `getOrder`, `listOrderEvents`, `cancelOrder` | `thuTu` của event và `summary` của lịch sử do BE trả. |
| DP-01, DP-02 | `listOrders`, `getOrder`, `listDrivers`, `suggestDrivers`, `assignDriver`, `cancelOrder`, `listCustomers` | Tài xế hiện tại suy từ phân công; gán có thể conflict. |
| TX-01, TX-02 | `listOrders`, `getOrder`, `rejectOrder`, `transitionOrder`, `recordIncident`, `confirmCash` | Quyền và trạng thái hợp lệ do BE kiểm tra. |
| QT-02 | `getRevenueReport`, `exportRevenueReport` | Bộ lọc API và Excel dùng cùng quy tắc; các khoản thu/công nợ tách riêng. |

Nguồn chi tiết cho operation, DTO và lỗi: [OpenAPI](../src/backend/src/main/webapp/openapi.json), [coverage](../docs/api/coverage.md), [schema mapping](../docs/api/schema-mapping.md).

## Lượt kiểm tra local T20

Lệnh tái lập: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/t20-local-verify.ps1` từ gốc repo. Script sinh mật khẩu SQL Server tạm, dùng `docker-compose.ci.yml`/DB `mini_ong_vang_test`, kiểm tra stack không đang chạy rồi dọn stack sau lượt kiểm tra. Không chạm DB phát triển. Kết quả dưới đây là terminal local ngày 13/10/2026; báo cáo Surefire nằm trong `src/backend/target/surefire-reports/` (artifact build, không commit).

| Bước | Actual | Trạng thái |
| --- | --- | --- |
| `npm.cmd run check --prefix tools/api` | OpenAPI hợp lệ: 29 operations, 12 UCs, 287 examples; Postman đồng bộ; 2 CSRF tests đạt | PASS |
| `mvn verify` với `REQUIRE_TEST_DB=true` | 74 tests, 0 failures/errors/skipped; WAR `BUILD SUCCESS` | PASS |
| SQL Server init + reset/seed | Flyway V1–V4 áp dụng, seed thành công | PASS |
| Runtime health/spec/Swagger | DB connected, spec khớp source, assets trả đúng | PASS |
| HTTP smoke | Orders 24, History 27, Cancel 34, Reports 53, Cash Payment 32, Dispatch 94 (gồm customer picker mới), Progress 93 = **357 checks** | PASS |
| `check-design-v1-invariants.sql` | `designV1 invariant reconciliation passed` trước reset và sau progress | PASS |
| VNPay live Sandbox, Postman Main Flow thủ công | Không chạy trong lượt này | NOT RUN |

Suite mới `t20DispatcherCanFindCustomersForOrderWithoutLeakingLockedAccounts` kiểm tra tìm khách, phân trang, hạng thành viên, danh sách rỗng, quyền, dữ liệu sai và tài khoản khóa trên SQL Server. `smoke:dispatch` kiểm tra endpoint HTTP, schema `CustomerPage`, quyền và validation. Tổng 357 so với 348 của T19 là thêm 9 HTTP checks.

## Việc còn lại để đóng T20

1. Chạy Postman Main Flow theo [hướng dẫn](postman/README.md), lưu environment không có secret, Actual/PASS-FAIL theo từng bước; phần VNPay của kịch bản ghi `NOT RUN` trong giai đoạn hoãn, có thể dùng nhánh tiền mặt để xác nhận luồng đơn hoàn tất → thu → lịch sử/báo cáo.
2. Khi môi trường dùng chung/deploy sẵn sàng, chạy VNPay Sandbox thật: thành công, hủy/thất bại, IPN/Return, callback lặp/muộn, timeout/query; che secret/PII trong bằng chứng. Sau đó cập nhật bảng mục 7 và kết luận gate.
3. Đưa nhánh T20 qua PR, kiểm tra CI, nhờ thành viên khác review; ghi tên reviewer, quyết định và liên kết PR/CI vào đây. Chỉ chuyển T20 sang Done khi quy trình của [CONTRIBUTING](../CONTRIBUTING.md) đạt và nhóm chấp thuận phạm vi nghiệm thu cuối.
