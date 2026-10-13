# T24 — Hướng dẫn chạy kiểm thử

Chuẩn bị và đăng nhập giao diện theo [T24-dispatcher.md](T24-dispatcher.md).

## Kiểm tra trên giao diện

### Tạo đơn hotline → hàng đợi → gán/hủy

1. Đăng nhập tổng đài, chọn **Tạo đơn tổng đài**. Nhập số điện thoại khách đã có hồ sơ, bấm **Tìm khách hàng**, chọn đúng hồ sơ trả về. Với DB đã seed, có thể tìm `0900000001` (khách thường) hoặc `0900000002` (khách Vàng). Hạng/ưu đãi lấy từ backend.
2. Nhập điểm lấy/giao, số điện thoại người nhận và kiện hàng. Với `ROUTE_PROVIDER=fake`, dùng chính xác `Quận 1` → `Quận 3` hoặc `Quận 5`. Provider này không hỗ trợ địa chỉ đường phố tùy ý; muốn dùng địa chỉ đầy đủ cần cấu hình dịch vụ bản đồ thật. Không có quãng đường 4,2 km hoặc cước mặc định tại FE.
3. Bấm **Lấy báo giá**. Expected: thấy quãng đường, cước gốc/phụ thu/giảm giá/tổng cước do backend trả. Khi sửa khách/tuyến/kiện hoặc hết 300 giây, nút tạo đơn khóa và yêu cầu báo giá mới. Ghi chú giao hàng/SĐT người nhận không làm thay đổi cước.
4. Bấm **Tạo đơn & Đưa vào hàng đợi điều phối**. Expected: POST orders có CSRF và Idempotency-Key; chỉ sau backend trả thành công mới thông báo mã đơn thật và chuyển về hàng đợi `CHO_GAN`. Mã `DH-...` do form demo cũ tạo trên trình duyệt không phải đơn SQL Server và không được tự chuyển vào DB.
5. Chọn mã đơn để đối chiếu chi tiết, bấm gán và chọn ứng viên backend. Expected: trạng thái DA_GAN và có phân công đang mở. Hủy trong thời hạn với lý do: DA_HUY, phân công kết thúc và tài xế được giải phóng.

Khi tạo đơn bị mất phản hồi hoặc lỗi 5xx, không báo thành công và không tự gửi lại. FE giữ body/key trong `sessionStorage` theo tài khoản (không lưu mật khẩu/session token), kể cả tải lại trang. Nút **Kiểm tra lại yêu cầu tạo đơn** gửi lại đúng body/key để BE trả đơn đã lưu hoặc tạo đúng một đơn. Thông tin bị khóa trong lúc kết quả chưa rõ; có link mở hàng đợi để đối chiếu. Lỗi CSRF ở lần kiểm tra lại không xóa khóa cũ. Backend báo QUOTE_EXPIRED/QUOTE_CHANGED thì cần lấy báo giá mới.

Form chỉ gửi trường mà API hiện có hỗ trợ; không thêm cột tên người nhận hoặc phương thức thanh toán vào schema. Thanh toán dùng luồng thanh toán riêng của dự án.

## Kiểm thử tự động


[Ma trận và kết quả T24](../tests/T24-validation.md) phân biệt browser fixture với FE/BE/SQL Server thật.

```bash
cd src/frontend
npm ci
npx playwright install chromium
npm run lint
npm run build
npm run test:t24
```

`test:t24` tự khởi động FE tại 3100 và HTTP fixture tại 18082; cần hai cổng rảnh. Có 29 tình huống, chạy ở desktop và viewport mobile 390×844. Đây là test UI xử lý phản hồi, không chứng minh transaction SQL Server.

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

Chạy bốn ca live từ gốc repo:

```bash
export API_BASE_URL=http://127.0.0.1:18081
npm run test:t24:live --prefix src/frontend
```

`DEMO_PASSWORD` phải đã được export đúng giá trị seed. Suite yêu cầu health.databaseName chính xác `mini_ong_vang_test`, fail nếu thiếu cấu hình; tự chạy FE tại 3101. Bốn ca gồm: hotline FE tạo đơn và đọc lại hàng đợi/nhật ký SQL Server; gán/đọc chi tiết/hủy; hai session tranh cùng đơn; hai đơn tranh cùng tài xế. Ba ca gán tạo fixture bằng API customer; ca hotline dùng chính form FE. Cleanup hủy các đơn test còn CHO_GAN/DA_GAN, không đổi schema/reset DB trong test.

CI frontend chạy lint/build/58 browser fixture cases. CI backend chạy thêm 4 live cases sau seed/backend readiness, trước các HTTP smoke, đối chiếu invariant rồi reset/seed DB test để giữ nguyên thứ tự tài xế rảnh mà nhóm smoke cũ kỳ vọng. CI cần được xác nhận trên PR; review/merge là bước đóng task.
