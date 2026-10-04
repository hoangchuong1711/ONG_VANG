# Mini Ong Vang

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

**macOS / Linux / Git Bash:**

```bash
cp .env.example .env
```

Mở `.env` và kiểm tra có đủ ba dòng sau. Đây là thông tin mẫu dùng cho máy phát triển; không dùng mật khẩu mẫu trên hệ thống thật và không đưa `.env` lên GitHub.

```dotenv
POSTGRES_DB=mini_ong_vang
POSTGRES_USER=mini_ong_vang_app
POSTGRES_PASSWORD=doi_mat_khau_mau_khi_can
```

## Chạy toàn bộ hệ thống bằng Docker

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

Trang trạng thái tự kiểm tra mỗi 10 giây. Khi mọi thứ chạy đúng, backend trả HTTP `200` với `"database":"connected"`. Nếu database chưa kết nối, xem log bằng:

```bash
docker compose logs -f db backend frontend
```

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

```bash
docker compose up --build -d backend
```

Xem log backend:

```bash
docker compose logs -f backend
```

## Chỉ chạy frontend

### Chạy FE trực tiếp trên máy
tại thư mục gốc:
```bash
cd src/frontend
npm i
npm rundev
```
Mở [http://localhost:3000]
### Chạy FE bằng Docker Compose

```bash
docker compose up --build frontend
```

Compose sẽ chạy thêm backend và database vì frontend cần các dịch vụ đó để kiểm tra trạng thái. Mở [http://localhost:3001](http://localhost:3001).

## Chỉ chạy database

```bash
docker compose up -d db
```

PostgreSQL có thể được truy cập từ máy host tại `localhost:5433`. Backend trong Docker kết nối tới tên dịch vụ `db` ở cổng `5432`; không đổi URL này thành `localhost` trong cấu hình backend.

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
│           │   │   ├── repository/  # Đọc và ghi dữ liệu
│           │   │   ├── domain/      # Entity và mô hình nghiệp vụ
│           │   │   ├── dto/         # Dữ liệu trao đổi với API
│           │   │   ├── integration/ # Kết nối dịch vụ bên ngoài
│           │   │   └── config/      # Cấu hình ứng dụng
│           │   ├── resources/       # Cấu hình và tài nguyên backend
│           │   └── webapp/          # Tài nguyên web của ứng dụng Java
│           └── test/java/           # Kiểm thử Java
└── tests/                    # Kiểm thử tích hợp/toàn hệ thống
```

Luồng xử lý nghiệp vụ dự kiến là:

```text
Controller → Service → Repository → Hibernate/JPA → PostgreSQL
```

Controller nhận yêu cầu, Service xử lý quy tắc nghiệp vụ, Repository làm việc với dữ liệu qua Hibernate/JPA. Controller không gọi Repository trực tiếp. Các package nghiệp vụ hiện mới là khung; endpoint `/api/health` là công cụ kiểm tra hạ tầng, chưa đại diện cho chức năng giao hàng hoàn chỉnh.

