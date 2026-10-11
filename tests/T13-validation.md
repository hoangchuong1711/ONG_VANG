# T13 — Kiểm chứng hủy đơn

## Phạm vi kiểm thử đã thêm

- `DesignV1IntegrationTest` trên SQL Server: khách hủy đơn chờ gán; tổng đài hủy đơn đã gán; quyền chủ đơn và vai trò; lý do rỗng/quá dài; mốc 299.999/300/301 giây; trạng thái không cho hủy, lịch sử phân công, gán–hủy đồng thời và rollback khi ghi sự kiện thất bại.
- `tools/api/cancel-smoke.mjs`: session/role/CSRF, JSON/validation, hủy đơn chờ gán, hủy đơn đã gán và tài xế được giải phóng. Script chỉ chạy khi health xác nhận DB `mini_ong_vang_test` và có `DEMO_PASSWORD`.
- `npm run check --prefix tools/api`: hợp đồng OpenAPI, examples, Postman và Swagger CSRF. Script T13 được nối vào CI sau smoke T10, trước smoke T11 để các tài xế demo vẫn rảnh.

## Trạng thái chạy tại thời điểm viết

Sau khi đồng bộ `develop` sang SQL Server designV1, T13 được chỉnh theo mô hình phân công mới. Chưa xác nhận Maven/JUnit và HTTP smoke T13 đạt trong phiên này vì Maven không truy cập được từ môi trường của trợ lý. Không coi các kiểm thử runtime này là PASS cho đến khi chúng chạy thành công trên máy phát triển hoặc CI.

## Chạy lại trên máy có Docker và Java 21

Theo thứ tự CI trong `.github/workflows/ci.yml`: khởi động SQL Server `db-test` và `db-init-test`, chạy Maven verify với `TEST_DB_URL`, reset/seed DB test, khởi động `backend-test`, rồi chạy `npm run smoke:cancel --prefix tools/api`. Chỉ dùng DB `mini_ong_vang_test`; script tạo và hủy đơn thật. Xem `README.md` để cấu hình môi trường và dọn stack test.
