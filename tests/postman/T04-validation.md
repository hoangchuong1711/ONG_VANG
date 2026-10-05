# Kết quả kiểm tra T04 — 05/10/2026

| Kiểm tra | Kết quả | Phạm vi |
| --- | --- | --- |
| `npm.cmd run check --prefix tools/api` | PASS | OpenAPI 3.1 hợp lệ; 28 operation, 12 UC; 272 examples khớp JSON Schema; Postman đồng bộ; vendor khớp package ghim |
| Test interceptor bằng Node test runner | PASS, 2 test | CSRF cùng origin, base context path; không gửi token lưu trong bộ nhớ sang domain khác; xóa token sau login/logout/401 |
| `mvn.cmd -f src/backend/pom.xml verify` | BUILD SUCCESS | Build WAR thành công; repo chưa có Java test nghiệp vụ, không coi kết quả này là unit test BE đã đủ |
| `docker compose up --build -d backend` | PASS | Build WAR/image và chạy backend với PostgreSQL; Dockerfile hiện tại skip Java tests |
| `npm.cmd run smoke --prefix tools/api` | PASS | Spec phục vụ khớp nguồn; Swagger HTML, JS/CSS phục vụ đúng; GET /api/health trả 200, database=connected |
| Kiểm tra Swagger UI bằng trình duyệt | Not Run | Không có browser kết nối trong môi trường công cụ; chưa xác minh thao tác Try it out trực quan |
| Chạy collection bằng Postman/Runner | Not Run | Đã sinh/kiểm tra đồng bộ collection; HTTP smoke chạy bằng Node, không gọi đó là kết quả Postman |
| Auth/CSRF runtime, nghiệp vụ, concurrency, VNPay Sandbox | Not Run | Chờ T06–T18; contract/examples không phải implementation |
| Health khi DB lỗi (503) | Not Run | Đã đặc tả từ HealthServlet; lần này chỉ chạy môi trường DB khỏe |
| Review bởi thành viên khác | Pending | Theo quy trình của nhóm |

Backend và DB được giữ chạy sau kiểm tra để nhóm mở `http://localhost:8081/swagger-ui/`. Không chạy SQL tham chiếu v0 hoặc sửa schema dữ liệu. Khi cần dừng dịch vụ đã chạy: `docker compose stop backend db` (không xóa volume).
