# T20 — Rà soát BE sau tái cấu trúc

Ngày: 13/10/2026. Nhánh: `refactor/backend-architecture`; rà soát trên nền commit `492108d` và các sửa đổi kèm biên bản này.

## Phạm vi và phát hiện đã sửa

| Phát hiện | Xử lý |
| --- | --- |
| `DispatchQueryService` tham chiếu ngược `DispatchService` để kiểm tra quyền và tạo lỗi | Tách `DispatchAccess` và `DispatchErrors` dùng chung; phần query không còn phụ thuộc facade ghi |
| SQL/JPQL trong `PolicyPublicationService` và `VnpayPaymentService` | Chuyển về `PolicyPublicationDAO` và `LanThanhToanDAO`; giữ ranh giới transaction và thứ tự khóa |
| JSON phụ thuộc gián tiếp vào dependency của Flyway | Khai báo trực tiếp Jackson databind/annotations trong POM, giữ phiên bản đang dùng |
| `PhanCongDonHangDAO` không được gọi trong main/test và không có cấu hình đăng ký | Xóa lớp; truy vấn phân công đang được thực hiện ở `DispatchDAO`/`OrderHistoryDAO` |
| Ba `.gitkeep` trong thư mục đã có nội dung, một số import không dùng | Xóa placeholder và import không cần thiết |

Đã đối chiếu lớp không có tham chiếu Java với điểm vào framework/CLI: servlet/filter được đăng ký bằng annotation; migration, seed và smoke có lệnh hoặc caller. Giữ các file này. Giữ migration V1–V4, FakeRouteProvider, Swagger vendor và giấy phép, OpenAPI/Postman sinh tự động, tài liệu lịch sử. Chúng phục vụ runtime, kiểm thử, tái lập DB hoặc truy vết. Không phát hiện thêm lớp Java rõ ràng là thừa trong phạm vi rà soát tham chiếu này. Thư mục `target` và các artifact build được Git ignore.

## Đánh giá cấu trúc

DTO request/response được dùng trong luồng thực tế; HTTP handler không nhận JPA Entity hoặc truy cập DAO. Service xử lý nghiệp vụ và quản lý transaction/JPA; DAO chứa SQL/JPQL. `ActorContext` không phụ thuộc DTO HTTP. `web` chứa adapter HTTP dùng chung cho các servlet có URL liên quan.

Đây là kiến trúc Controller/HTTP adapter → Service → DAO phù hợp dự án Servlet/JPA hiện tại. Không cần thêm interface, mapper hoặc repository cho mọi lớp chỉ để tăng số tầng. Enum trong `entity.enums` được dùng chung; Service vẫn làm việc với Entity và EntityManager theo thiết kế đã chọn. Kiểm tra tĩnh không thay thế việc review nghiệp vụ và kiểm thử runtime.

`tools/api/check-backend-boundaries.mjs` kiểm tra thêm Service không tự tạo SQL/JPQL, DAO không phụ thuộc tầng HTTP/Service/DTO và query Dispatch không tham chiếu facade ghi. Kiểm tra này nằm trong `npm run check`, được CI gọi.

## Xác nhận lại trong phiên rà soát này

- `mvn clean test` từ thư mục gốc backend: **BUILD SUCCESS**, biên dịch sạch 109 source; 12 unit tests chạy đạt, 0 lỗi/skip.
- Ba nhóm integration test SQL Server được Maven phát hiện nhưng không chạy ca nào vì phiên rà soát này không cấu hình `TEST_DB_URL`. Không dùng lượt này để thay thế bằng chứng 74 test/357 HTTP đã ghi trong [T20-acceptance](T20-acceptance.md).
- `npm.cmd run check --prefix tools/api`: OpenAPI hợp lệ, Postman đồng bộ, boundary check PASS, 2 test cấu hình Swagger đạt.
- `git diff --check`: không phát hiện lỗi whitespace; không còn tham chiếu Java tới `PhanCongDonHangDAO`.

## Điều kiện đóng task

VNPay Sandbox thật: **NOT RUN — hoãn theo người dùng**. Không suy diễn kết quả gateway giả lập thành Sandbox PASS.

T20 chỉ được Done sau khi có bằng chứng Postman Main Flow, CI của PR đạt, một thành viên khác review và merge vào `develop` theo `CONTRIBUTING.md`. Nếu nghiệm thu với phạm vi đã loại Sandbox, nhóm phải ghi rõ ngoại lệ đó trong kết luận. Biên bản rà soát của trợ lý không được tính là approval của thành viên khác.
