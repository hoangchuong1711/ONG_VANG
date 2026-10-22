# Mini Ong Vang

Bộ migration ứng dụng đã gom theo thành phần tại
[db/designV2/sqlserver](src/backend/src/main/resources/db/designV2/sqlserver/README.md).
DB demo mới chạy 11 file migration; DB đã dùng V1–V26 được tự nhận diện và tiếp tục dùng lịch sử
nguyên trạng trong `db/designV2Legacy/sqlserver/`, không xóa dữ liệu hay sửa checksum.
Các file trong [design-v2-complete](docs/database/design-v2-complete/README.md) là bản xuất để báo cáo.

Ứng dụng giao hàng dùng Next.js, Java Servlet và SQL Server 2022. Luồng đang chạy dùng
[thiết kế CSDL](docs/database/csdl.md): khách trả cước trực tiếp cho tài xế; tài xế xác nhận
đã giao và thu đủ; hệ thống ghi phần tài xế 80% và phần công ty 20%; tài xế nộp phần công ty qua VNPay Sandbox.

## Chạy ứng dụng local

1. Tạo `.env` từ [.env.example](.env.example) nếu chưa có. Đặt `MSSQL_SA_PASSWORD` và
   `MSSQL_DATABASE=mini_ong_vang_design_v2_demo`.
2. Để `DESIGN_V2_DEMO=true` ngay lần cài đầu nếu muốn Flyway nạp 9 tài khoản demo (V9 tạo 8, V11 thêm một tổng đài), hồ sơ khách/tài xế, cấu hình và 9 đơn `CHO_GAN` bằng file V9 gộp. Với database
   không phải demo/test, đặt `DESIGN_V2_DEMO=false`; Flyway chỉ chạy phần schema.
3. Chạy `docker compose up --build` trong thư mục gốc.
4. Mở [http://localhost:3001](http://localhost:3001) và đăng nhập. Ứng dụng đưa mỗi vai trò
   về giao diện riêng: `/customer`, `/driver`, `/dispatcher` hoặc `/admin`.

Backend health: [http://localhost:8081/api/health](http://localhost:8081/api/health).
Trong SSMS, dùng lại kết nối SQL Server `127.0.0.1,1433`, rồi chọn database
`mini_ong_vang_design_v2_demo`.
`docker compose down` giữ dữ liệu SQL Server trong volume; không thêm `--volumes` nếu muốn giữ DB.

### Tài khoản demo SQL

Mật khẩu của 9 tài khoản demo SQL: `12345678`. Tài khoản khách: `0900000001`, `0900000002`, `0900000003`;
tổng đài: `demo_dispatcher`, `demo_dispatcher_2`; chủ đội xe: `demo_admin`; tài xế: `0800000001`,
`0800000002`, `0800000003`. DB mới dùng V9 gộp, tạo 9 đơn chờ chưa có phân công hay giao dịch nộp tiền; quãng đường/thời gian là dữ liệu mô phỏng. DB cũ tiếp tục chuỗi V1–V26 nguyên trạng trong `designV2Legacy`, gồm các lần sửa seed và dọn fixture. DB đang dùng không cần tạo lại; giữ nguyên lựa chọn `DESIGN_V2_DEMO` rồi để Flyway chạy tiếp.

Trang `/admin/customers` cho chủ đội xe gán hạng khách hàng. Hạng ưu đãi có hiệu lực ngay, không tự hết hạn và cần một chính sách đang hiệu lực; chuyển về `THUONG` sẽ xóa thời hạn ưu đãi. Ngày “Thành viên từ” là ngày tạo tài khoản.

`ROUTE_PROVIDER=fake` dùng tuyến cố định cho demo. Muốn dùng Goong, đặt `ROUTE_PROVIDER=goong`
và `GOONG_API_KEY`; báo giá/tạo đơn cần quota Goong còn hiệu lực.

VNPay Sandbox chỉ dành cho giao dịch tài xế nộp tiền công ty. Cấu hình `VNPAY_TMN_CODE`,
`VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` trong `.env`; IPN công khai cần trỏ đến
`/api/v2/payments/vnpay/ipn` (URL cũ `/api/payments/vnpay/ipn` cũng được tiếp nhận). Return đưa tài xế về màn thu nhập; IPN hoặc kết quả tra cứu có
chữ ký hợp lệ mới quyết toán. Giao dịch chưa rõ kết quả vẫn giữ các khoản liên kết.
Đặt `DESIGN_V2_RECONCILE_JOB=true` để backend tự tra cứu giao dịch quá 15 phút mỗi 5 phút;
demo hiện bật tác vụ này để tự xử lý các giao dịch quá hạn nếu IPN bị lỡ.

## Cấu trúc và kiểm tra

- Migration schema: `src/backend/src/main/resources/db/designV2/sqlserver/schema/`.
- Tài khoản và đơn demo gộp: `src/backend/src/main/resources/db/designV2/sqlserver/demo/`.
- [ERD 16 bảng designV2](docs/database/design-v2-erd.md).
- API designV2: `src/backend/src/main/java/com/miniongvang/controller/DesignV2Servlet.java`.
- Giao diện hiện tại theo từng vai trò dùng chung dữ liệu designV2 qua lớp adapter,
  nhưng giữ khung điều hướng khách hàng, tài xế, tổng đài và chủ đội xe riêng.

Backend tự chạy Flyway trước khi phục vụ API. Các endpoint cũ không còn được phục vụ.

Kiểm tra bản hiện tại bằng việc chạy ứng dụng với DB demo/test riêng, build backend bằng
`mvn.cmd -f src/backend/pom.xml -DskipTests clean compile`, frontend bằng `npm.cmd run build`
trong `src/frontend`, rồi thao tác đăng nhập, báo giá, tạo/gán/hoàn tất đơn và đối chiếu
công nợ trên giao diện từng vai trò.

**Giới hạn môi trường demo:** Compose mặc định dùng SQL login `sa` cho backend và migration.
`MIGRATION_DB_USER`/`MIGRATION_DB_PASSWORD` cho phép tách tài khoản migration; `APP_DB_USER`/
`APP_DB_PASSWORD` dành cho runtime nếu đã cấp đủ quyền trên DB. Cần hoàn thiện quyền runtime
theo mục 9 của thiết kế trước khi dùng với dữ liệu thật. Database demo/test nên được tách riêng với dữ liệu vận hành.
Chế độ không demo từ chối khởi động nếu `APP_DB_USER=sa`.
