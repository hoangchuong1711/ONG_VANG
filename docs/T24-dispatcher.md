# T24 — Frontend điều phối (DP-01 / DP-02)

Nhánh: `feat/t24-dispatcher-integration`, nền `develop` `0f98c06`. Nhóm cho phép bắt đầu T24 song song với các phần T20–T22 còn chờ. Nguồn yêu cầu: [project_brief.md](project_brief.md), dòng T24; hợp đồng: [OpenAPI](../src/backend/src/main/webapp/openapi.json).

## Phạm vi và chức năng

| Yêu cầu T24 | Thực hiện |
| --- | --- |
| Đơn chờ | `/dispatcher` mặc định lọc `CHO_GAN`, lọc trạng thái/ngày, phân trang phía BE, tổng số/tổng cước từ BE; có tải/lỗi/rỗng/thử lại/làm mới |
| Tài xế | `/dispatcher/fleet` mặc định ONLINE và rảnh; lọc hoạt động/bận, phân trang, số điện thoại và phương tiện từ BE |
| Chi tiết DP-02 | `/dispatcher/orders/[id]`: tuyến, người nhận, khách/người tạo, kiện hàng, cước đã chốt, phân công và nhật ký theo `thuTu` |
| Gợi ý/gán | Gọi `driver-suggestions` và giữ thứ tự BE; chọn rõ một tài xế, POST assignments, chặn gửi lặp; chỉ cập nhật từ lần đọc BE sau thao tác |
| Không có tài xế / tài xế vừa bận | Gợi ý rỗng khóa xác nhận; `DRIVER_UNAVAILABLE` xóa lựa chọn và tải lại gợi ý/đơn; không dùng tài xế demo hoặc fallback tự chọn |
| Tranh chấp trạng thái đơn | `ORDER_STATE_CONFLICT` hiển thị lỗi, khóa xác nhận cũ và tải lại; không tự đổi trạng thái hoặc gửi lại POST |
| Hủy theo quyền | POST cancel có lý do trim 1–500 ký tự; UI chỉ cho CHO_GAN/DA_GAN dưới 300 giây, cập nhật thời hạn mỗi giây; BE quyết định cuối cùng, xử lý hết hạn/tranh chấp |
| Tài xế hiện tại | Danh sách dùng `maTx` BE suy từ phân công; chi tiết ưu tiên phân công đang mở trong `phanCong`, có lịch sử từ chối/kết thúc. Không dùng cột DB hoặc localStorage để suy phân công |
| Form hotline T23 → hàng đợi T24 | `/dispatcher/create-order` tìm/chọn khách bằng API, lấy báo giá, tạo đơn qua backend với CSRF và Idempotency-Key; chỉ báo thành công với mã đơn backend rồi đọc lại hàng đợi. Không dùng demo-store/cước cố định |
| Quyền/session/CSRF | `/dispatcher/sign-in` dùng login/me/logout thật; gate TONG_DAI, xử lý 401/403, cookie HttpOnly qua proxy; mỗi POST lấy CSRF hiện tại, không lưu token/mật khẩu trong localStorage |

Không thay đổi schema, ERD, Entity, migration, SQL, API backend hoặc seed. `docker-compose.yml` chỉ thêm biến `API_PROXY_TARGET` cho service frontend. CI thêm kiểm thử FE, sử dụng DB test hiện có.

## API được dùng

- `GET /api/auth/me`, `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`.
- `GET /api/customers?q&page&size`, `POST /api/quotes`, `POST /api/orders` (kèm `Idempotency-Key`).
- `GET /api/orders?page&size&trangThai&tuNgay&denNgay` (`denNgay` không gồm ngày cuối).
- `GET /api/orders/{maDon}` (OrderDetail: gồm phanCong và nhatKy).
- `GET /api/drivers?page&size&trangThaiHoatDong&dangBanChuyen`.
- `GET /api/orders/{maDon}/driver-suggestions?page&size`.
- `POST /api/orders/{maDon}/assignments` với `{ "maTx": "..." }`.
- `POST /api/orders/{maDon}/cancel` với `{ "lyDo": "..." }`.

AbortController và khóa kết quả theo bộ lọc/người dùng bảo đảm phản hồi cũ không ghi đè request mới. Khi đang làm mới, dữ liệu trước đó có nhãn đang tải và khóa nút mở hành động. Hộp xác nhận hỗ trợ focus, Tab/Shift+Tab, Escape và trả focus về nút mở. Lỗi mạng sau POST có thể là kết quả chưa rõ: FE yêu cầu đọc lại BE, không tự gửi POST lần hai.

## Chạy trên VS Code / Git Bash

### 1. Khởi động BE / SQL Server từ gốc repo

Mở Docker Desktop. Trong terminal Git Bash của VS Code, đứng tại thư mục có `docker-compose.yml` (chưa `cd src/frontend`). Nếu chưa có `.env`, tạo từ mẫu; lệnh sau giữ file đã có:

```bash
[ -f .env ] || cp .env.example .env
```

Mở `.env` trong VS Code và cấu hình:

```dotenv
MSSQL_DATABASE=mini_ong_vang_design_v1
MSSQL_SA_PASSWORD=<mật khẩu SQL Server riêng của máy bạn>
DEMO_SEED=true
DEMO_PASSWORD=<mật khẩu dành cho tài khoản demo>
ROUTE_PROVIDER=fake
```

Thay các giá trị trong `<...>` bằng giá trị thật. SQL Server yêu cầu mật khẩu mạnh có chữ hoa/thường, số và ký tự đặc biệt. Nếu máy đã có volume SQL Server, giữ mật khẩu `sa` đã dùng cho volume đó. Nếu DB đã seed, dùng mật khẩu demo ban đầu: sửa `.env` không tự đổi mật khẩu tài khoản đã có. `.env` không đưa lên Git. Nếu đã có tài khoản TONG_DAI riêng và không cần seed demo, giữ `DEMO_SEED=false`.

Khởi động lần lượt DB, initializer có sẵn và BE:

```bash
docker pull mcr.microsoft.com/mssql/server:2022-latest
docker compose up -d --wait --wait-timeout 180 sqlserver
docker compose up --no-deps --exit-code-from db-init db-init
docker compose up --build -d backend
docker compose ps
docker compose logs --tail 80 backend
```

SQL Server phải `healthy`; `db-init` thoát mã 0. Chờ log backend có `Server startup`, sau đó kiểm tra:

```bash
curl --fail http://127.0.0.1:8081/api/health
```

Expected: HTTP 200, databaseName `mini_ong_vang_design_v1`, database kết nối thành công. Nếu BE chưa sẵn sàng, xem `docker compose logs --tail 100 sqlserver db-init backend` và kiểm tra lại health sau khi startup xong. Các lệnh dùng schema/migration hiện có; T24 không thêm hoặc sửa ERD/schema. Seed chỉ bổ sung khách/tài xế/cấu hình, không có đơn mới sẵn trong hàng đợi. Tạo đơn thực tại form hotline theo hướng dẫn dưới đây.

### 2. Chạy frontend

Mở terminal thứ hai từ gốc repo, rồi chạy FE với backend dev (8081):

```bash
cd src/frontend
npm ci
export API_PROXY_TARGET=http://127.0.0.1:8081
npm run dev
```

Nếu BE test đang chạy tại 18081, đổi `API_PROXY_TARGET=http://127.0.0.1:18081` trước `npm run dev`. Khi đổi biến này cần dừng FE bằng Ctrl+C và chạy lại. Từ trang chủ chọn **Đăng nhập** → **Điều Phối Viên**. Nếu trình duyệt đã có phiên tổng đài, bàn điều phối T24 dữ liệu thật hiển thị ngay. Nếu chưa có phiên, form đăng nhập chung chuyển sang chế độ tổng đài; đăng nhập thành công sẽ mở bàn điều phối T24. Với seed test: username `demo_dispatcher`, mật khẩu là `DEMO_PASSWORD` đã dùng khi seed. Không có bàn điều phối dữ liệu mẫu. Các vai trò demo khác trên `/login` chưa cấp session backend.

Compose dev dùng proxy nội bộ `http://backend:8080`. Browser luôn gọi `/api` cùng origin FE để giữ cookie/session; không cần cấu hình URL backend trong browser.

### 3. Kiểm tra tạo đơn hotline → hàng đợi → gán/hủy

1. Đăng nhập tổng đài, chọn **Tạo đơn tổng đài**. Nhập số điện thoại khách đã có hồ sơ, bấm **Tìm khách hàng**, chọn đúng hồ sơ trả về. Với DB đã seed, có thể tìm `0900000001` (khách thường) hoặc `0900000002` (khách Vàng). Hạng/ưu đãi lấy từ backend.
2. Nhập điểm lấy/giao, số điện thoại người nhận và kiện hàng. Với `ROUTE_PROVIDER=fake`, dùng chính xác `Quận 1` → `Quận 3` hoặc `Quận 5`. Provider này không hỗ trợ địa chỉ đường phố tùy ý; muốn dùng địa chỉ đầy đủ cần cấu hình dịch vụ bản đồ thật. Không có quãng đường 4,2 km hoặc cước mặc định tại FE.
3. Bấm **Lấy báo giá**. Expected: thấy quãng đường, cước gốc/phụ thu/giảm giá/tổng cước do backend trả. Khi sửa khách/tuyến/kiện hoặc hết 300 giây, nút tạo đơn khóa và yêu cầu báo giá mới. Ghi chú giao hàng/SĐT người nhận không làm thay đổi cước.
4. Bấm **Tạo đơn & Đưa vào hàng đợi điều phối**. Expected: POST orders có CSRF và Idempotency-Key; chỉ sau backend trả thành công mới thông báo mã đơn thật và chuyển về hàng đợi `CHO_GAN`. Mã `DH-...` do form demo cũ tạo trên trình duyệt không phải đơn SQL Server và không được tự chuyển vào DB.
5. Chọn mã đơn để đối chiếu chi tiết, bấm gán và chọn ứng viên backend. Expected: trạng thái DA_GAN và có phân công đang mở. Hủy trong thời hạn với lý do: DA_HUY, phân công kết thúc và tài xế được giải phóng.

Khi tạo đơn bị mất phản hồi hoặc lỗi 5xx, không báo thành công và không tự gửi lại. FE giữ body/key trong `sessionStorage` theo tài khoản (không lưu mật khẩu/session token), kể cả tải lại trang. Nút **Kiểm tra lại yêu cầu tạo đơn** gửi lại đúng body/key để BE trả đơn đã lưu hoặc tạo đúng một đơn. Thông tin bị khóa trong lúc kết quả chưa rõ; có link mở hàng đợi để đối chiếu. Lỗi CSRF ở lần kiểm tra lại không xóa khóa cũ. Backend báo QUOTE_EXPIRED/QUOTE_CHANGED thì cần lấy báo giá mới.

Form chỉ gửi trường mà API hiện có hỗ trợ; không thêm cột tên người nhận hoặc phương thức thanh toán vào schema. Thanh toán dùng luồng thanh toán riêng của dự án.

## Kiểm thử

[Ma trận và kết quả T24](../tests/T24-validation.md) phân biệt browser fixture với FE/BE/SQL Server thật.

```bash
cd src/frontend
npm ci
npx playwright install chromium
npm run lint
npm run build
npm run test:t24
```

`test:t24` tự khởi động FE tại 3100 và HTTP fixture tại 18082; cần hai cổng rảnh. Có 28 tình huống, chạy ở desktop và viewport mobile 390×844. Đây là test UI xử lý phản hồi, không chứng minh transaction SQL Server.

### FE + SQL Server thật

Các bước sau chạy từ gốc repo trong Git Bash, dùng DB test riêng. Cần Java 21/Maven khi chạy SeedCommand; kiểm tra `mvn -version` báo Java 21. Nếu test stack đã có dữ liệu cần giữ, không chạy bước reset; live suite cần tài xế đủ điều kiện đang rảnh.

Thiết lập biến trong chính terminal đang chạy test. Thay các giá trị `<...>` bằng mật khẩu bạn đã chọn (nếu stack đang chạy, dùng mật khẩu SQL Server đã khởi tạo):

```bash
export TEST_DB_URL='jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true'
export TEST_DB_USER=sa
export TEST_DB_PASSWORD='<mật khẩu SQL Server test mạnh của bạn>'
export REQUIRE_TEST_DB=true
export DEMO_PASSWORD='<mật khẩu demo dùng khi seed DB test>'
export API_BASE_URL=http://127.0.0.1:18081
docker compose -f docker-compose.ci.yml up -d --wait --wait-timeout 180 db-test
docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test
```

Để chuẩn bị fixture sạch cho suite T24, script sau **xóa/reset dữ liệu trong `mini_ong_vang_test` rồi seed lại**, chỉ chạy trên DB test cô lập; giữ schema designV1:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/reset-test-db.ps1
docker compose -f docker-compose.ci.yml up --build --wait --wait-timeout 120 backend-test
curl --fail http://127.0.0.1:18081/api/health
```

Expected health.databaseName là `mini_ong_vang_test`, HTTP 200. Nếu cần xem T24 bằng browser với stack này, dùng terminal FE ở bước 2 nhưng đặt `API_PROXY_TARGET=http://127.0.0.1:18081`. Đăng nhập `demo_dispatcher` bằng mật khẩu demo vừa dùng khi seed.

Chạy ba ca live từ gốc repo:

```bash
export API_BASE_URL=http://127.0.0.1:18081
npm run test:t24:live --prefix src/frontend
```

`DEMO_PASSWORD` phải đã được export đúng giá trị seed. Suite yêu cầu health.databaseName chính xác `mini_ong_vang_test`, fail nếu thiếu cấu hình; tự chạy FE tại 3101. Bốn ca gồm: hotline FE tạo đơn và đọc lại hàng đợi/nhật ký SQL Server; gán/đọc chi tiết/hủy; hai session tranh cùng đơn; hai đơn tranh cùng tài xế. Ba ca gán tạo fixture bằng API customer; ca hotline dùng chính form FE. Cleanup hủy các đơn test còn CHO_GAN/DA_GAN, không đổi schema/reset DB trong test.

CI frontend chạy lint/build/56 browser fixture cases. CI backend chạy thêm 4 live cases sau seed/backend readiness, trước các HTTP smoke, đối chiếu invariant rồi reset/seed DB test để giữ nguyên thứ tự tài xế rảnh mà nhóm smoke cũ kỳ vọng. CI cần được xác nhận trên PR; review/merge là bước đóng task.
