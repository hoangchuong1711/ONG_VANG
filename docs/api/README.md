# T04 — Hợp đồng API Mini Ong Vàng

Phiên bản hợp đồng: **0.1.0**, ngày 05/10/2026. Cơ sở: [kế hoạch dự án](../project_brief.md) và [SQL v0 do nhóm cung cấp](schema-v0.mysql.sql).

## Trạng thái thực tế

- Đã có implementation: `GET /api/health`.
- Đã đặc tả, **chưa có implementation**: đăng nhập/session/CSRF và toàn bộ nghiệp vụ T06–T18. Gọi các đường dẫn này hiện tại có thể trả 404/405 hoặc HTML lỗi Tomcat; đó không phải API nghiệp vụ đã đạt contract.
- T04 không chạy SQL v0, không tạo/migrate bảng, không tạo tài khoản seed, không hiện thực thanh toán.
- Swagger UI là công cụ tài liệu/test BE, không phải FE nghiệp vụ T21–T28.

## Các tài liệu

| Tệp | Vai trò |
| --- | --- |
| [openapi.json](../../src/backend/src/main/webapp/openapi.json) | Nguồn chuẩn duy nhất của endpoint/DTO/examples/security; OpenAPI 3.1.0, định dạng JSON |
| [conventions.md](conventions.md) | Quy ước dữ liệu, lỗi, session/CSRF, proxy, retry |
| [schema-mapping.md](schema-mapping.md) | Ánh xạ SQL → DTO và khoảng trống cần xử lý ở T01/T03/T06–T18 |
| [coverage.md](coverage.md) | Truy vết UC, operation và kiểm thử |
| [Hướng dẫn Postman](../../tests/postman/README.md) | Chạy BE độc lập FE; phân biệt smoke và nghiệp vụ chưa triển khai |
| [Kết quả kiểm tra T04](../../tests/postman/T04-validation.md) | Phân biệt những kiểm tra đã đạt và phần chưa chạy |

JSON được chọn để kiểm tra/sinh Postman bằng Node và phục vụ trực tiếp trong WAR; ý nghĩa hợp đồng tương đương YAML. Không có bản đặc tả thứ hai cần sửa đồng thời.

## Mở Swagger UI

Tại gốc repo, sau khi cấu hình `.env` theo README:

```powershell
docker compose up --build backend
```

Mở `http://localhost:8081/swagger-ui/`. Spec: `http://localhost:8081/openapi.json`. Swagger assets được đóng gói trong WAR, không cần CDN lúc sử dụng. Build lần đầu cần tải dependencies. Có thể lọc theo tag hoặc operationId. Hộp thông báo đầu trang luôn nhắc trạng thái implementation.

Chọn `Infrastructure → getHealth → Try it out → Execute`. Khi DB khỏe, trả 200; khi mất kết nối/cấu hình DB, trả 503 với schema Health riêng. Không tự đổi response health hiện có sang envelope lỗi nghiệp vụ.

Sau khi T06 hiện thực: Execute `getCsrf`, `login`, `getCsrf` lần nữa rồi `getCurrentUser`. Trang Swagger tự giữ CSRF **trong bộ nhớ trang**, thêm header vào request cùng origin và xóa khi logout/401. Cookie HttpOnly do trình duyệt nhận từ server, không dán JSESSIONID vào Authorize. Reload trang thì lấy lại CSRF. Các endpoint nghiệp vụ và flow này chưa chạy được chỉ bằng T04.

Swagger cùng BE origin nên không cần mở thêm CORS cho tài liệu. Các đường dẫn tương đối hoạt động khi deploy WAR ở context khác ROOT.

## Cập nhật và kiểm tra

```powershell
npm.cmd ci --prefix tools/api
npm.cmd run check --prefix tools/api
npm.cmd run generate --prefix tools/api
npm.cmd run check --prefix tools/api
mvn.cmd -f src/backend/pom.xml verify
npm.cmd run smoke --prefix tools/api
```

`check` kiểm tra OpenAPI, schema của examples, liên kết lỗi/security/truy vết và độ đồng bộ Postman. `generate` sinh lại collection từ spec, không thực thi request hay thay đổi DB. Nếu cố ý sửa spec, lần check trước generate có thể báo collection cũ; generate rồi check lại.

`smoke` cần BE/DB đang chạy; kiểm tra spec phục vụ khớp file nguồn, HTML và JS/CSS tải được, health thực trả 200/connected. Đổi địa chỉ bằng biến môi trường `API_BASE_URL` khi cần. Đây là kiểm tra HTTP, không phải xác minh hiển thị bằng trình duyệt.

Khi BE hoàn thành một operation: đổi `x-implementation-status` từ `planned` thành `implemented`, cập nhật examples/coverage, sinh lại collection và chạy integration tương ứng. Không suy luận implementation từ việc Swagger hiển thị endpoint.

## Ranh giới nghiệm thu

T04 bàn giao hợp đồng, Swagger UI, collection và hướng dẫn. Nhóm còn phải review quy ước demo và các mục schema thiếu. Nghiệp vụ chỉ được đánh dấu PASS sau test runtime ở T06–T20; T04 không chứng minh transaction, quyền, chống gán trùng hoặc sandbox thanh toán đã hoạt động.

Tham khảo chính thức: [Swagger UI configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/), [cookie authentication](https://swagger.io/docs/specification/v3_0/authentication/cookie-authentication/), [Postman OpenAPI](https://learning.postman.com/docs/integrations/available-integrations/working-with-openAPI/), [VNPay Sandbox](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
