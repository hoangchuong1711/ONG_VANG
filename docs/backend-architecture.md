# Cấu trúc backend sau đợt tái thiết kế DTO

## Luồng xử lý

`HTTP → Servlet/Endpoint → JsonRequests → Request DTO → Service → dao → Entity/DB`

`Entity/DB → Service → Response DTO → WebResponses → JSON`

`controller` khai báo URL và nhận request. Các URL dùng chung handler nằm ở `web/DispatchEndpoint` và `web/PaymentEndpoint`; servlet không gọi servlet khác. `web/JsonRequests` kiểm tra cú pháp JSON, còn từng endpoint kiểm tra trường và giá trị theo hợp đồng OpenAPI. `web/WebResponses` tạo JSON và lỗi cùng một cấu trúc `ApiErrorResponse`.

`dto/{auth,customer,route,quote,order,dispatch,payment,report}` chứa record của hợp đồng HTTP. Request DTO và response DTO đều được tạo và dùng trong luồng thật. DTO không tham chiếu service, DAO hay Entity; enum trạng thái dùng chung hiện nằm trong `entity.enums`. Khi thay đổi tên hoặc kiểu trường DTO cần đối chiếu `src/backend/src/main/webapp/openapi.json` và Postman được sinh từ đó.

`security/ActorContext` chứa danh tính và vai trò dùng cho nghiệp vụ. `AuthService` trả `AuthDtos.User` cho API; servlet không nhận `TaiKhoan` Entity. Service kiểm tra lại tài khoản và hồ sơ trước khi thao tác DB.

`service` giữ quy tắc nghiệp vụ và ranh giới giao dịch. `DispatchQueryService` đọc đơn, tài xế, event và chiếu dữ liệu ra DTO. `DispatchService` điều phối các thao tác ghi (gán, từ chối, hủy, chuyển trạng thái, sự cố); thứ tự khóa trong các thao tác này được giữ nguyên. `dao` quản lý truy vấn và ánh xạ Entity; DAO dùng `EntityManager` do service truyền vào, không tự mở giao dịch.

## Quy tắc thêm API

1. Khai báo schema request/response và mã lỗi trong OpenAPI.
2. Tạo hoặc cập nhật DTO ở nhóm nghiệp vụ tương ứng. Không trả Entity ra JSON.
3. Parse JSON qua `JsonRequests`, kiểm tra giá trị ở biên HTTP, chuyển DTO vào service.
4. Giữ truy vấn trong `dao`; service sở hữu giao dịch và quy tắc nghiệp vụ.
5. Trả JSON/lỗi qua `WebResponses`. Cập nhật smoke test khi thêm hành vi hoặc thay hợp đồng.

`npm.cmd run check --prefix tools/api` kiểm tra OpenAPI, Postman và ranh giới package. `scripts/t20-local-verify.ps1` kiểm tra Java, API HTTP, SQL Server và bất biến DB trên stack riêng. VNPay Sandbox thật là bước nghiệm thu riêng được hoãn theo quyết định của người dùng; bài kiểm tra cục bộ chỉ bao gồm cổng giả lập.
