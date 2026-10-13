# T24 — Khởi động frontend và đăng nhập điều phối viên

Hướng dẫn dùng VS Code và terminal **Git Bash** trên Windows. Cần cài Node.js/npm, Docker Desktop và mở Docker Desktop trước khi chạy.

## 1. Mở đúng nhánh

Mở thư mục dự án trong VS Code. Terminal đứng tại **gốc repo**, nơi có `docker-compose.yml`:

```bash
git checkout feat/t24-dispatcher-integration
git pull origin feat/t24-dispatcher-integration
```

Nếu terminal đang ở `src/frontend`, chạy `cd ../..` để về gốc repo. Nếu Git báo có thay đổi chưa lưu, giữ lại các thay đổi đó trước khi chuyển nhánh.

## 2. Cấu hình SQL Server và tài khoản tổng đài

Tạo `.env` ở **gốc repo** nếu chưa có:

```bash
[ -f .env ] || cp .env.example .env
```

Mở `.env` và đặt các dòng sau:

```dotenv
MSSQL_DATABASE=mini_ong_vang_design_v1
MSSQL_SA_PASSWORD=<mật khẩu SQL Server của bạn>
DEMO_SEED=true
DEMO_PASSWORD=<mật khẩu đăng nhập tài khoản demo do bạn chọn>
ROUTE_PROVIDER=fake
```

Thay toàn bộ phần `<...>` bằng mật khẩu thực tế. Mật khẩu SQL Server cần có chữ hoa, chữ thường, số và ký tự đặc biệt. Nếu SQL Server đã có volume trên máy, giữ mật khẩu SQL Server đã dùng cho volume đó.

Nhấn **Ctrl+S** để lưu `.env`; dấu chấm trên tab phải biến mất. Không chỉnh `.env.example` thay cho `.env` và không đưa `.env` lên Git.

**Mật khẩu điều phối viên là giá trị `DEMO_PASSWORD` đã dùng khi seed lần đầu.** Không nhập chữ `DEMO_PASSWORD` vào ô mật khẩu. Mật khẩu SQL Server và mật khẩu điều phối viên có mục đích riêng. Nếu database đã được seed trước đó, sửa `DEMO_PASSWORD` trong `.env` không đổi mật khẩu tài khoản đã tồn tại; dùng mật khẩu demo ban đầu.

## 3. Khởi động SQL Server và backend

Chạy tại gốc repo:

```bash
docker compose --env-file .env up -d --wait --wait-timeout 180 sqlserver
docker compose --env-file .env up --no-deps --exit-code-from db-init db-init
docker compose --env-file .env up --build -d --force-recreate backend
docker compose exec -T backend printenv DEMO_SEED
docker compose logs --tail 80 backend
```

`DEMO_SEED` phải hiện `true`. Chờ backend khởi động xong rồi kiểm tra:

```bash
curl --fail http://127.0.0.1:8081/api/health
```

Kết quả mong đợi: `status: ok`, `database: connected`, `databaseName: mini_ong_vang_design_v1`. Khi database chưa seed, backend sẽ tạo tài khoản `demo_dispatcher` với mật khẩu bạn đã đặt.

## 4. Chạy frontend

Mở **terminal Git Bash thứ hai** tại gốc repo:

```bash
cd src/frontend
npm ci
export API_PROXY_TARGET=http://127.0.0.1:8081
npm run dev
```

Giữ terminal này chạy. Mở địa chỉ frontend mà terminal hiển thị, thường là `http://localhost:3000`. Nếu frontend đã chạy trước khi đặt `API_PROXY_TARGET`, dừng bằng **Ctrl+C** rồi chạy lại `npm run dev`.

## 5. Đăng nhập điều phối viên

Từ trang chủ chọn **Đăng nhập → Điều Phối Viên**, hoặc mở:

```text
http://localhost:3000/login?role=dispatcher
```

Nếu frontend chạy ở cổng khác, thay `3000` bằng cổng thực tế.

| Trường | Giá trị |
| --- | --- |
| Tên đăng nhập tổng đài | `demo_dispatcher` |
| Mật khẩu | Giá trị thực tế của `DEMO_PASSWORD` đã dùng khi seed database |

Bấm **Đăng nhập vào hệ thống**. Thành công sẽ mở `/dispatcher`, hiển thị bàn điều phối kết nối backend và SQL Server. Nếu chưa tạo đơn thật, hàng đợi trống là bình thường.

Nếu đăng nhập thất bại, kiểm tra `.env` đã lưu, `DEMO_SEED=true`, health đúng database và mật khẩu đúng giá trị seed ban đầu. Mật khẩu trong DB được lưu dưới dạng hash nên không thể đọc lại thành mật khẩu gốc bằng truy vấn SQL.

Hướng dẫn kiểm thử được đặt riêng tại [T24-testing.md](T24-testing.md); kết quả và các ca còn cần chạy ở [T24-validation.md](../tests/T24-validation.md).
