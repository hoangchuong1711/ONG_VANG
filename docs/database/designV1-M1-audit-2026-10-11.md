# Kiểm tra tiếp đợt chuyển DB designV1 — 11/10/2026

Nguồn chuẩn: [designV1.md](designV1.md); công việc và gate: [designV1-implementation-plan.md](designV1-implementation-plan.md). Nhánh làm việc: `feat/t0.1-database-sqlserver-migration`. Đây là kết quả trên DB test cô lập `mini_ong_vang_test`, không phải chứng nhận toàn bộ M1/M2.

| Phạm vi | Kết quả kiểm tra |
| --- | --- |
| Schema | Flyway V1 và V2 đã áp dụng trên DB test và DB dev `mini_ong_vang_design_v1`; 19 bảng nghiệp vụ, 26 FK, 117 CHECK bật/trusted; ba trigger policy V2 bật; JPA validate đạt. DB cũ `mini_ong_vang` còn nguyên. Health backend dev trả `databaseName=mini_ong_vang_design_v1`. |
| Java | `clean verify` với `REQUIRE_TEST_DB=true`: 32 test, 0 fail, 0 error, 0 skip. Có test mốc báo giá 299.999/300 giây, replay khi route provider lỗi, công bố policy đồng thời, trigger chặn sửa bản đã công bố, biên thành viên và giảm 0%/100%, rollback khi ghi idempotency hoặc audit policy thất bại, tranh chấp khóa account/ngừng xe khi gán. |
| API | OpenAPI 0.5.0: 29 operation, 12 UC, 287 example qua validator; Postman sinh lại và đồng bộ. `User` bỏ `maNv`, `Order` thêm `maTkTao`, Event trả thứ tự/loại/trạng thái trước-sau/account actor. |
| HTTP | Sau build WAR V2 và reset/seed DB test, smoke chung đạt; T10 đạt 24, T11 đạt 85, T12 đạt 93 kiểm tra. Sau khi bổ sung khóa xe lúc gán, smoke T11/T12 được chạy lại và vẫn đạt 85/93. |
| Đối chiếu dữ liệu | `scripts/check-design-v1-invariants.sql` chạy đạt trên DB test sau HTTP smoke và trên DB dev: role/profile, thành phần đơn, đơn/phân công/event, ba loại policy không chồng và V2 trigger bật. CI đã thêm bước đối chiếu này. |
| FE và tài liệu | FE hiện chỉ gọi health, không dùng DTO User/Order/Event; nhãn PostgreSQL trên trang health đã sửa thành SQL Server. Import Google font không dùng đã bỏ; FE lint/build đạt. Báo cáo PostgreSQL cũ được đánh dấu lịch sử. Đã thay T08–T12 và xóa tài liệu T03, thiết kế persistence cũ, SQL v0 khỏi nhánh hiện hành. ERD/Class Diagram do người dùng đã vẽ, không thuộc đợt việc này. |

## Việc chưa được chứng minh

1. Chạy GitHub Actions CI trên commit/PR của nhánh này để có bằng chứng ngoài máy local. Các kiểm tra ở bảng trên chỉ chứng minh local.
2. `PolicyPublicationService` là đường quản trị nội bộ, chưa có endpoint quản trị vì UC hiện tại không yêu cầu. DB account có quyền DDL vẫn có thể tắt trigger; cần giới hạn quyền vận hành nếu triển khai thực tế.
3. Báo cáo kiểm thử PostgreSQL cũ đã được đánh dấu là lịch sử; không dùng kết quả đó làm bằng chứng đợt này. T13–T20, bao gồm service thanh toán, vẫn thuộc M2.

Các bất biến chính của M1 đã có test/truy vấn và kết quả local. Gate CI từ xa chưa có bằng chứng; không gọi M2 hoàn thành.
