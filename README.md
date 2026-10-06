# Mini Ong Vang

## Tài liệu và kiểm thử API (T04)

Chạy `docker compose up --build backend`, sau đó mở [Swagger UI](http://localhost:8081/swagger-ui/)
hoặc [OpenAPI JSON](http://localhost:8081/openapi.json). Swagger UI được đóng gói cùng BE, không cần chạy FE.
Hiện chỉ `/api/health` có implementation; các API nghiệp vụ là hợp đồng cho T06–T18.

Xem [hướng dẫn T04](docs/api/README.md), [ánh xạ SQL v0 và phần cần bổ sung](docs/api/schema-mapping.md)
và [Postman collection/hướng dẫn chạy](tests/postman/README.md).
SQL v0 là tài liệu tham chiếu có header MySQL, không được chạy trực tiếp vào PostgreSQL.
T03 đã có migration Flyway, Entity/DAO Hibernate, transaction và seed. Xem [hướng dẫn CSDL/seed/reset](docs/database/README.md) và [kết quả kiểm thử T03](tests/database/T03-validation.md).

Mini Ong Vang là dự án môn Công nghệ Phần mềm về hệ thống đặt xe và giao hàng. Hệ thống được định hướng xây theo ba phần: giao diện web, backend Java xử lý nghiệp vụ và cơ sở dữ liệu PostgreSQL. Hiện tại repo đã có khung Docker cho FE/BE/DB và một trang trạng thái để kiểm tra kết nối; các chức năng giao hàng sẽ được phát triển tiếp theo kế hoạch của nhóm.

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
| PostgreSQL JDBC Driver | 42.7.7 | Kết nối Java với PostgreSQL |
| PostgreSQL | 17 | Cơ sở dữ liệu |

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
Copy-Item .env.example .env
```

## Chạy toàn bộ hệ thống bằng Docker

`docker-compose.yml` là môi trường **phát triển**, dùng volume giữ dữ liệu.
Môi trường test T05 nằm riêng trong `docker-compose.ci.yml`; xem phần CI bên dưới.

Mở terminal tại thư mục gốc dự án, nơi có `docker-compose.yml`, rồi chạy:

```bash
docker compose up --build
```

Lần đầu chạy, Docker sẽ tải các image cần thiết, build FE và BE, khởi động PostgreSQL, rồi lần lượt chạy backend và frontend. Đợi đến khi log có dòng báo Next.js `Ready` và Tomcat `Server startup`.

Mở các địa chỉ sau trong trình duyệt:

| Thành phần | Địa chỉ | Kết quả hiện tại |
| --- | --- | --- |
| Frontend | [http://localhost:3001](http://localhost:3001) | Trang trạng thái FE, BE và database |
| Backend health check | [http://localhost:8081/api/health](http://localhost:8081/api/health) | JSON báo backend có kết nối được database hay không |
| PostgreSQL từ máy host | `localhost:5433` | Cổng database nếu cần kết nối bằng công cụ quản lý DB |

FE và BE hiển thị cổng khác nhau trong log vì ứng dụng lắng nghe bên trong container ở `3000` và `8080`. Docker chuyển cổng máy bạn `3001 → 3000` và `8081 → 8080`; vì vậy hãy mở FE ở cổng `3001` và gọi BE ở cổng `8081`.


Để dừng các container, nhấn `Ctrl+C` trong terminal đang chạy Compose. Nếu chạy nền với `-d`, dùng:

```bash
docker compose down
```

Lệnh `docker compose down` giữ dữ liệu database trong Docker volume. Không thêm `-v` nếu bạn chưa muốn xóa dữ liệu database.

## Chỉ chạy backend và database

Backend cần PostgreSQL nên lệnh này sẽ tự khởi động cả database, nhưng không khởi động frontend:

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
| Backend tests and API smoke | Java 21, kiểm tra OpenAPI/Postman/CSRF, build WAR, JUnit với PostgreSQL test, smoke HTTP BE/Swagger |

Pipeline không cần secret của dự án hoặc VNPay. Database test là `mini_ong_vang_test`,
chạy trên tmpfs, cổng `15433`; backend test dùng cổng `18081`. Nó không dùng `.env`
để cấu hình DB và không mount volume dữ liệu phát triển. Credential trong file CI chỉ dùng cho DB test tạm thời.
Không ghép hai file Compose bằng nhiều cờ `-f`.

Để chạy tương đương job BE trên máy, cần Java 21, Maven 3.9, Node 22 và Docker Compose v2 có `--wait`.
Từ gốc repo, PowerShell:

```powershell
npm.cmd ci --ignore-scripts --prefix tools/api
npm.cmd run check --prefix tools/api
docker compose -f docker-compose.ci.yml up --wait --wait-timeout 120 db-test

$env:TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test'
$env:TEST_DB_USER = 'mini_ong_vang_test'
$env:TEST_DB_PASSWORD = 'ci-only-password'
$env:REQUIRE_TEST_DB = 'true'
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
CI đặt `REQUIRE_TEST_DB=true` để thiếu cấu hình phải fail. Test nghiệp vụ/API T06–T18 tiếp tục bổ sung theo task.

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
├── .env.example             # Mẫu biến môi trường cho PostgreSQL
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
Controller → Service → DAO → Hibernate/JPA → PostgreSQL
```

Controller nhận yêu cầu, Service xử lý quy tắc nghiệp vụ, DAO làm việc với dữ liệu qua Hibernate/JPA. Controller không gọi DAO trực tiếp. T03 đã triển khai lớp persistence; endpoint `/api/health` vẫn là công cụ kiểm tra hạ tầng, các API nghiệp vụ triển khai tiếp ở T06–T18.
