# Mini Ong Vang

## Tài liệu và kiểm thử API (T04)

Hiện `/api/health`, các API T06, T07 (`POST /api/routes/estimate`) và T09 (`POST /api/quotes`, dùng chính sách T08) đã triển khai; T10 (`POST /api/orders`), T11 (danh sách/chi tiết đơn, tài xế, gợi ý, gán/từ chối) và T12 (tiến trình, sự cố, nhật ký) đã triển khai; các API còn lại vẫn là hợp đồng chờ triển khai.

Xem [hướng dẫn T04](docs/api/README.md), [ánh xạ SQL v0 và phần cần bổ sung](docs/api/schema-mapping.md)
và [Postman collection/hướng dẫn chạy](tests/postman/README.md).

T10: [thiết kế và cách tạo đơn](docs/T10-order-creation.md), [kết quả và lệnh kiểm thử](tests/T10-validation.md).

T11: [thiết kế điều phối/gán/từ chối](docs/T11-driver-dispatch.md), [kết quả và lệnh kiểm thử](tests/T11-validation.md).

T12: [thiết kế tiến trình/sự cố/hoàn tất](docs/T12-delivery-progress.md), [kết quả và lệnh kiểm thử](tests/T12-validation.md).
SQL v0 là tài liệu tham chiếu có header MySQL, không được chạy trực tiếp vào SQL Server.
T03 đã có migration Flyway, Entity/DAO Hibernate, transaction và seed. Xem [hướng dẫn CSDL/seed/reset](docs/database/README.md) và [kết quả kiểm thử T03](tests/database/T03-validation.md).

Mini Ong Vang là dự án môn Công nghệ Phần mềm về hệ thống đặt xe và giao hàng. Hệ thống được định hướng xây theo ba phần: giao diện web, backend Java xử lý nghiệp vụ và cơ sở dữ liệu SQL Server. Hiện tại repo đã có khung Docker cho FE/BE/DB và một trang trạng thái để kiểm tra kết nối; các chức năng giao hàng sẽ được phát triển tiếp theo kế hoạch của nhóm.

## Công nghệ và phiên bản

| Thành phần | Phiên bản hiện cấu hình | Dùng để |
| --- | --- | --- |
| Docker Desktop và Docker Compose | Docker Compose v2 trở lên | Chạy FE, BE và database bằng một lệnh |
| Node.js | 22 (image `node:22-alpine`) | Chạy frontend trực tiếp trên máy |
| Next.js | 16.3.8 | Framework frontend |
| React / React DOM | 19.2.8 | Giao diện frontend |
| Java | 21 (Eclipse Temurin) | Chạy và build backend |
| Maven | 3.9 (image `maven:3.9-eclipse-temurin-21`) | Build backend thành file WAR |
| Apache Tomcat | 10.1 | Chạy backend Java |
| Jakarta Servlet API | 6.0.0 | Tạo HTTP endpoint cho backend |
| Jakarta Persistence API (JPA) | 3.1.0 | Chuẩn truy cập dữ liệu |
| Hibernate ORM | 6.6.58.Final | ORM cho JPA |
| Microsoft SQL Server JDBC Driver | 12.10.2.jre11 | Kết nối Java với SQL Server |
| SQL Server | 2022 Developer | Cơ sở dữ liệu |

Nếu chạy toàn bộ bằng Docker, không cần cài Java, Maven hay Node.js trên máy. Bạn cần Docker Desktop đang mở và có quyền chạy Docker.

## Development workflow

Quy tắc branch, commit, Pull Request và merge:
xem [CONTRIBUTING.md](./CONTRIBUTING.md)

## Lấy mã nguồn nhánh `develop`

```bash
git clone <LINK_REPOSITORY>
cd mini-ong-vang
```
chuyển qua nhánh develop và pull code mới nhất về:

```bash
git checkout develop
git pull origin develop
```

## Tạo file `.env`

Docker Compose đọc thông tin database từ file `.env` ở thư mục gốc. Tạo file này từ mẫu trước khi chạy:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env # Chỉ khi chưa có .env; giữ cấu hình cục bộ hiện tại
```

Đặt `MSSQL_SA_PASSWORD` trong `.env` bằng mật khẩu riêng đủ mạnh; giữ `MSSQL_DATABASE=mini_ong_vang`. SQL Server Developer chỉ dùng cho phát triển/test. Xem [cách kết nối SSMS và xử lý lỗi](#kết-nối-database-bằng-ssms) bên dưới. Hướng dẫn chuyển dữ liệu PostgreSQL và rollback nằm trong [tài liệu database](docs/database/README.md#chuyển-dữ-liệu-postgresql-hiện-có).

T07 mặc định dùng `ROUTE_PROVIDER=fake`: thử `Quận 1, TP.HCM` → `Quận 3, TP.HCM` để nhận 5.00 km, 900 giây. Các địa chỉ mẫu khác là Quận 5, TP.HCM và Hà Nội (ngoài phạm vi). Có thể dùng tên `Điểm mẫu A/B/C`. Khoảng cách tối đa mặc định là `ROUTE_MAX_DISTANCE_KM=30`. Khi có Goong API key, đặt `ROUTE_PROVIDER=goong` và `GOONG_API_KEY` trong `.env`, rồi tạo lại backend bằng `docker compose up --build -d backend`; Goong dùng `GOONG_TIMEOUT_MS=5000`. Thiếu key ở chế độ Goong làm backend từ chối khởi động; lỗi Goong không chuyển sang kết quả mẫu. Xem [hướng dẫn T07](docs/T07-route-provider.md) và [hướng dẫn T09](docs/T09-quote.md).

## Chạy toàn bộ hệ thống bằng Docker

`docker-compose.yml` là môi trường **phát triển**, dùng volume giữ dữ liệu.
Môi trường test T05 nằm riêng trong `docker-compose.ci.yml`; xem phần CI bên dưới.

Mở terminal tại thư mục gốc dự án, nơi có `docker-compose.yml`, rồi chạy:

```bash
docker compose up --build
```

Lần đầu chạy, Docker sẽ tải các image cần thiết, build FE và BE, khởi động SQL Server, rồi lần lượt chạy backend và frontend. Đợi đến khi log có dòng báo Next.js `Ready` và Tomcat `Server startup`.

Mở các địa chỉ sau trong trình duyệt:

| Thành phần | Địa chỉ | Kết quả hiện tại |
| --- | --- | --- |
| Frontend | [http://localhost:3001](http://localhost:3001) | Trang trạng thái FE, BE và database |
| Backend health check | [http://localhost:8081/api/health](http://localhost:8081/api/health) | JSON báo backend có kết nối được database hay không |
| SQL Server từ máy host | `tcp:127.0.0.1,1433` | Nhập trong SSMS, không mở bằng trình duyệt |
| swagger | [http://localhost:8081/swagger-ui/] | trang test API



Để dừng các container, nhấn `Ctrl+C` trong terminal đang chạy Compose. Nếu chạy nền với `-d`, dùng:

```bash
docker compose down
```

Lệnh `docker compose down` giữ dữ liệu database trong Docker volume. Không thêm `-v` nếu bạn chưa muốn xóa dữ liệu database.

## Kết nối database bằng SSMS

Mỗi thành viên mở Docker Desktop và chạy lệnh sau tại thư mục gốc dự án để khởi động backend cùng database:

```powershell
docker compose up --build -d backend
docker compose ps -a
```

Đợi service `sqlserver` báo `healthy`. Service `db-init` kết thúc với `Exited (0)` là bình thường: nó chỉ chạy một lần để chuẩn bị database.

Mở **SQL Server Management Studio (SSMS)** → **Connect → Database Engine**, nhập:

| Mục | Giá trị |
| --- | --- |
| Server type | `Database Engine` |
| Server name | **`tcp:127.0.0.1,1433`** |
| Authentication | `SQL Server Authentication` |
| Login / User name | `sa` |
| Password | Giá trị sau `MSSQL_SA_PASSWORD=` trong file `.env` trên máy của bạn |
| Trust server certificate | Tích chọn cho SQL Server Docker local |

Nhấn **Connect**, mở **Databases → mini_ong_vang → Tables** để xem các bảng. Nếu đã đổi `MSSQL_DATABASE`, chọn tên database tương ứng. Có thể mở **New Query** và chạy:

```sql
SELECT @@VERSION AS server_version, DB_NAME() AS current_database;
```

Mật khẩu nằm trong `.env`, không phải `.env.example`; chỉ sao chép phần giá trị, không sao chép `MSSQL_SA_PASSWORD=`. Mỗi máy có database/volume và mật khẩu riêng. SSMS là công cụ quản lý, còn SQL Server chạy trong Docker; không cần cài thêm SQL Server Engine để dùng cấu hình này.

### Lỗi 1225, connection refused hoặc timeout

Nếu SSMS báo `The remote computer refused the network connection`, `server was not found` hoặc timeout:

1. Đổi **Server name** thành đúng **`tcp:127.0.0.1,1433`**. Dùng **dấu phẩy** trước cổng `1433`, không thêm `\SQLEXPRESS`. Trên máy đã kiểm tra của nhóm, `localhost,1433` bị timeout nhưng `tcp:127.0.0.1,1433` kết nối được. Kết quả này không có nghĩa mọi lỗi 1225 đều cùng một nguyên nhân.
2. Kiểm tra Docker Desktop đang chạy và service SQL Server đã `healthy` bằng các lệnh khởi động phía trên.
3. Nếu vẫn lỗi, chạy trong PowerShell:

   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 1433
   docker compose logs --tail 80 sqlserver db-init
   ```

   `TcpTestSucceeded: True` nghĩa là Windows truy cập được cổng. Nếu `False`, xem trạng thái container, port mapping và log trước khi kiểm tra tài khoản. Mapping mặc định là `127.0.0.1:1433->1433/tcp`.
4. Nếu Docker báo cổng `1433` đã bị chiếm, kiểm tra tiến trình đang nghe:

   ```powershell
   Get-NetTCPConnection -LocalPort 1433 -State Listen |
       Select-Object LocalAddress, LocalPort, OwningProcess
   ```

   Nếu cần giữ dịch vụ đang dùng cổng đó, đổi riêng port mapping của service `sqlserver` trong `docker-compose.yml` thành `127.0.0.1:14330:1433`, chạy lại `docker compose up -d backend`, rồi kết nối SSMS bằng `tcp:127.0.0.1,14330`. Backend trong Docker vẫn dùng `sqlserver:1433`; không đổi cổng nội bộ trong `DB_URL`.

### Các lỗi kết nối khác

| Hiện tượng | Cách xử lý |
| --- | --- |
| Lỗi chứng chỉ / certificate chain not trusted | Tích **Trust server certificate** trong cửa sổ kết nối SSMS cho môi trường Docker local. |
| `Login failed for user 'sa'` / lỗi 18456 | Chọn **SQL Server Authentication**, kiểm tra login `sa` và mật khẩu đã dùng để khởi tạo SQL Server. Đổi giá trị trong `.env` không tự đổi mật khẩu `sa` đã lưu trong volume; nếu đã đổi nhầm, dùng lại mật khẩu ban đầu hoặc thực hiện đổi mật khẩu trong SQL Server bằng tài khoản có quyền. |
| Kết nối được nhưng không thấy `mini_ong_vang` | Refresh mục **Databases**, kiểm tra `MSSQL_DATABASE` trong `.env`, chạy `docker compose up -d backend` rồi xem `docker compose logs --tail 80 db-init backend`. |

Không dùng `docker compose down -v` hoặc xóa volume để thử sửa lỗi kết nối vì có thể mất dữ liệu. Cổng database hiện chỉ mở trên máy chạy Docker (`127.0.0.1`); thành viên chạy dự án trên máy mình dùng cấu hình local của máy đó.

## Chỉ chạy backend và database

Backend cần SQL Server nên lệnh này sẽ tự khởi động cả database, nhưng không khởi động frontend:

```bash
docker compose up --build backend
```

Kiểm tra backend tại [http://localhost:8081/api/health](http://localhost:8081/api/health). Nếu muốn chạy nền, thêm `-d`:


## Chỉ chạy frontend

### Chạy FE trực tiếp trên máy
tại thư mục gốc:
```bash
cd src/frontend
npm ci
npm run dev
```
Mở [http://localhost:3000](http://localhost:3000).
### Chạy FE bằng Docker Compose

```bash
docker compose up --build frontend
```

Compose sẽ chạy thêm backend và database vì frontend cần các dịch vụ đó để kiểm tra trạng thái. Mở [http://localhost:3001](http://localhost:3001).


## CI và môi trường kiểm thử (T05)

[GitHub Actions CI](.github/workflows/ci.yml) chạy khi mở/cập nhật PR, push vào
`main`/`develop`, hoặc chạy thủ công qua `workflow_dispatch` khi workflow có trên nhánh mặc định.

| Job | Kiểm tra |
| --- | --- |
| Frontend lint and build | Node 22, `npm ci`, ESLint, Next.js production build và kiểm tra TypeScript trong build |
| Backend tests and API smoke | Java 21, kiểm tra OpenAPI/Postman/CSRF, build WAR, JUnit với SQL Server test, smoke HTTP BE/Swagger |

Pipeline không cần secret của dự án hoặc VNPay. Database test là `mini_ong_vang_test`,
chạy trên tmpfs, cổng `15433`; backend test dùng cổng `18081`. Nó không dùng `.env`
để cấu hình DB và không mount volume dữ liệu phát triển. CI tự sinh mật khẩu riêng cho DB test tạm thời.
Không ghép hai file Compose bằng nhiều cờ `-f`.

Để chạy tương đương job BE trên máy, cần Java 21, Maven 3.9, Node 22 và Docker Compose v2 có `--wait`.
Từ gốc repo, PowerShell:

```powershell
npm.cmd ci --ignore-scripts --prefix tools/api
npm.cmd run check --prefix tools/api

$env:TEST_DB_URL = 'jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true'
$env:TEST_DB_USER = 'sa'
$env:TEST_DB_PASSWORD = '<mat-khau-test-manh-cua-ban>'
$env:REQUIRE_TEST_DB = 'true'
docker compose -f docker-compose.ci.yml up --wait --wait-timeout 180 db-test
docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test
$env:API_BASE_URL = 'http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE = 'mini_ong_vang_test'
mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify
docker compose -f docker-compose.ci.yml up --build --wait --wait-timeout 120 backend-test
npm.cmd run smoke --prefix tools/api
```

Mỗi lệnh phải thành công trước khi tiếp tục. Chạy xong, kể cả khi test lỗi:

```powershell
docker compose -f docker-compose.ci.yml down --volumes --remove-orphans
Remove-Item Env:TEST_DB_URL, Env:TEST_DB_USER, Env:TEST_DB_PASSWORD, Env:REQUIRE_TEST_DB, Env:API_BASE_URL, Env:API_EXPECTED_DATABASE -ErrorAction SilentlyContinue
```

Lệnh dọn trên chỉ dành cho **Compose test**. Dữ liệu test là tạm thời và mất khi container DB dừng.
Nếu chạy nhiều bản test đồng thời trên cùng máy, cần dùng project name và host ports khác nhau.

FE: chạy `npm ci`, `npm run lint`, `npm run build` trong `src/frontend`.
Build hiện tải font Google bằng `next/font`; cần mạng khi cài dependency/build.
FE hiện chưa có bộ test UI, không ghi lint/build là test chức năng đã PASS.

Test Java kiểm tra kết nối, migration, Hibernate mapping, seed, constraint, snapshot,
commit/rollback và cạnh tranh assignment/version. Bộ T03 reset dữ liệu trên DB test riêng trước từng case;
chỉ khởi động backend-test sau khi Maven verify xong. Chạy Maven không có `TEST_DB_URL` thì test DB skip;
CI đặt `REQUIRE_TEST_DB=true` để thiếu cấu hình phải fail. T06–T09 có test tương ứng; T10 có integration test tạo đơn và HTTP smoke; T11 có test SQL Server và HTTP với cạnh tranh gán/từ chối; T12 có kiểm thử tiến trình/sự cố/hoàn tất; test T13–T18 tiếp tục bổ sung theo task.

Trên GitHub, xem tab **Actions → CI** hoặc checks của PR. Job BE lưu Surefire reports và
container logs vào artifact `backend-test-results` trong 7 ngày, kể cả test thất bại;
luôn dọn stack test sau chạy. File workflow ở local chưa phải bằng chứng GitHub run thành công:
cần push/mở PR để có run thực tế.

Khi nhóm muốn chặn merge nếu CI lỗi, quản trị repo cấu hình branch rules cho `main`/`develop`
và yêu cầu hai check tên trong bảng trên. Workflow không tự thay đổi branch protection.
Khi có nghiệp vụ mới, thêm JUnit vào `src/backend/src/test/java`; bổ sung test FE khi có UI nghiệp vụ.
VNPay unit/integration mặc định dùng adapter giả lập; test sandbox thật chạy riêng theo T15/T18,
không thêm credential sandbox hay callback thật vào pipeline PR.

Tham khảo: [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[Docker Compose up/wait](https://docs.docker.com/reference/cli/docker/compose/up/).

## Sơ lược cấu trúc thư mục

```text
.
├── docker-compose.yml       # Cách Docker chạy và nối các dịch vụ
├── .env.example             # Mẫu biến môi trường cho SQL Server
├── docs/                    # Tài liệu và kế hoạch dự án
├── src/
│   ├── frontend/             # Next.js: trang web và giao diện
│   │   └── app/              # Các trang, layout và CSS
│   └── backend/              # Java Servlet, Maven và Dockerfile backend
│       └── src/
│           ├── main/
│           │   ├── java/com/miniongvang/
│           │   │   ├── controller/  # Nhận HTTP request và trả response
│           │   │   ├── service/     # Quy tắc nghiệp vụ
│           │   │   ├── DAO/         # Đọc và ghi dữ liệu
│           │   │   ├── entity/      # Entity và mô hình nghiệp vụ
│           │   │   ├── dto/         # Dữ liệu trao đổi với API
│           │   │   ├── integration/ # Kết nối dịch vụ bên ngoài
│           │   │   └── config/      # Cấu hình ứng dụng
│           │   ├── resources/       # Cấu hình và tài nguyên backend
│           │   └── webapp/          # Tài nguyên web của ứng dụng Java
│           └── test/java/           # Kiểm thử Java
└── tests/                    # Kiểm thử tích hợp/toàn hệ thống
```

Package Entity là `com.miniongvang.entity`; package truy cập dữ liệu là `com.miniongvang.DAO` (giữ đúng chữ hoa theo cấu trúc thư mục). Các lớp truy cập dữ liệu dùng hậu tố `DAO`, ví dụ `DonHangDAO`.

Luồng xử lý nghiệp vụ dự kiến là:

```text
Controller → Service → DAO → Hibernate/JPA → SQL Server
```

Controller nhận yêu cầu, Service xử lý quy tắc nghiệp vụ, DAO làm việc với dữ liệu qua Hibernate/JPA. Controller không gọi DAO trực tiếp. T03 đã triển khai lớp persistence; T06 đã triển khai auth; T07–T09 đã triển khai lộ trình, chính sách thành viên và báo giá. Endpoint `/api/health` vẫn là công cụ kiểm tra hạ tầng, T10 đã có API tạo đơn, T11 có API điều phối/gán/từ chối; T12 có tiến trình, sự cố và nhật ký; các API còn lại triển khai tiếp.
