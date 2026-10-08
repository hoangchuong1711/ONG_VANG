# Kiểm thử BE không phụ thuộc FE

Import `mini-ong-vang.postman_collection.json` và `local.postman_environment.json` vào Postman Desktop, chọn environment local. File environment chỉ là template, không chứa tài khoản thật. Giữ giá trị credential/session trên máy; không export giá trị thật vào Git.

## Chạy được ngay sau T04

1. Cấu hình `.env`, chạy `docker compose up --build backend` từ gốc repo.
2. Giữ `baseUrl=http://localhost:8081`, không có slash cuối. Không bật `runPlanned`.
3. Chạy folder `01 - Implemented smoke`: kiểm tra spec, trang Swagger, health 200/database connected.
4. Health 503 khi DB lỗi là response đã đặc tả, nhưng smoke môi trường khỏe phải FAIL. Không chấp nhận mọi status để làm test xanh.

Các request chưa có BE mặc định **skip** bằng `pm.execution.skipRequest()`, không phải PASS. Dùng Postman phiên bản hỗ trợ API này. Không chạy toàn bộ collection như một kịch bản liên tục: các request cần vai trò/fixture khác nhau.

## Sau khi từng task BE hoàn thành

Đặt `runPlanned=true` để chạy riêng request/folder đã hiện thực. T03 cung cấp [manifest seed](../../docs/database/README.md); điền username/password, driverId/customerId theo manifest và địa chỉ fixture T07. Sau khi operation đổi sang implemented, generator chuyển nó vào folder implemented; các API nghiệp vụ vẫn cần được gọi theo luồng/role thích hợp, không xem folder đó là một scenario tự động.

Session được Postman cookie jar giữ qua Set-Cookie. Không đặt Cookie/JSESSIONID thủ công. Đăng nhập mỗi vai trò theo thứ tự:

1. `getCsrf` lưu csrfToken vào environment.
2. `login` dùng username/password đã điền; xóa token cũ sau thành công.
3. `getCsrf` lần nữa lấy token mới, rồi `getCurrentUser` kiểm tra vai trò.
4. Khi đổi người: `logout`, đổi credential rồi làm lại 1–3. Cookie jar theo host; không chạy song song nhiều vai trò với cùng jar/environment.

## Main Flow thủ công có lưu biến

Luồng register của T06: dùng cookie jar riêng cho khách mới → `getCsrf` → `register` với SĐT chưa tồn tại → kiểm tra 201 và role KHACH_HANG → `getCurrentUser` phải báo chưa đăng nhập → `getCsrf` → `login` bằng SĐT/mật khẩu vừa đăng ký → `getCsrf` → `getCurrentUser` → `logout` → xác nhận phiên không còn dùng được. Register không cấp VIP, nên không dùng khách mới thay fixture VIP ở Main Flow bên dưới. Chạy thêm nhánh thiếu/sai dữ liệu, SĐT trùng sau chuẩn hóa, CSRF thiếu/sai và gửi field role trái phép; kiểm thử đồng thời/rollback nằm ở bộ integration T06.

| Bước | Vai trò / thao tác | Biến/kết quả |
| --- | --- | --- |
| 1 | Khách VIP: getCsrf/login/getCsrf/getCurrentUser | Cookie jar, csrfToken |
| 2 | estimateRoute, createQuote | Điền địa chỉ thật; lưu quoteId, amount |
| 3 | createOrder | Lưu orderId; dùng cùng địa chỉ/kiện hàng đã báo giá; trạng thái CHO_GAN |
| 4 | Tổng đài đăng nhập: listOrders, suggestDrivers; chọn driverId, assignDriver | DA_GAN |
| 5 | Tài xế tương ứng đăng nhập: getOrder, transitionOrder lần lượt DA_LAY_HANG, DANG_GIAO, HOAN_TAT | Đổi body trangThai mỗi lần, không chạy lại cùng body ba lần |
| 6 | Khách chủ đơn đăng nhập: createPayment | Mặc định VNPAY_QR; lưu paymentId/paymentUrl; mở paymentUrl trong trình duyệt sandbox |
| 7 | Chờ IPN thật, getPayment/reconcilePayment | Chỉ xác nhận thành công từ BE; timeout không đồng nghĩa thất bại |
| 8 | Khách: listOrders/getOrder; quản trị đăng nhập: getRevenueReport/exportRevenueReport | Điền fromDate/toDate đúng kỳ dữ liệu |

Nhánh tiền mặt: bước 6 chọn TIEN_MAT; tài xế đã thực hiện hoặc tổng đài đăng nhập và gọi confirmCash với amount đúng. Không gọi confirmCash vào giao dịch VNPay. Đơn miễn cước không tạo payment.

Generator tự lưu maBaoGia/maDon/maGiaoDich và amount từ response thành công. `orderIdempotencyKey`/`paymentIdempotencyKey` tạo lần đầu và giữ nguyên khi retry. Khi tạo **đơn/lần thanh toán mới**, xóa key tương ứng để sinh khóa mới. Không đổi payload rồi tái dùng key cũ trừ khi đang test 409 IDEMPOTENCY_CONFLICT.

## Negative và boundary fixtures

Folder `03 - Negative fixtures` có assertion HTTP + code cụ thể:

- Sai password: lấy CSRF trước; không để lẫn với lỗi thiếu token.
- Thiếu CSRF: không gửi X-CSRF-Token; server phải trả 403.
- page=-1: đăng nhập hợp lệ trước, mong đợi 400.
- otherOrderId: phải là đơn của một khách khác đã seed, đăng nhập khách hiện tại; mong đợi 404.
- expiredOrderId: đơn CHO_GAN/DA_GAN của khách hiện tại; dùng clock fixture đúng 300 giây cho boundary, hoặc seed đơn quá hạn để test expired nói chung. Không lấy thời gian thao tác tay làm bằng chứng biên chính xác.

Các case 299/301 giây, số tiền sai, callback lặp/muộn, gán đồng thời, rollback và toàn bộ Alternative Flow được theo dõi tại [coverage](../../docs/api/coverage.md), triển khai JUnit/integration trong task BE tương ứng. Postman đơn lẻ không chứng minh an toàn đồng thời.

IPN/return trong folder VNPay là mẫu hợp đồng, không tự tạo chữ ký hợp lệ. Điền query **nguyên bản** của callback sandbox đã ký; không sửa amount/reference sau ký. Trường optional từ callback nếu có phải bật lại query tương ứng. Không đặt secret ký VNPay trong collection/environment. Request mẫu không thay bằng chứng IPN thực từ cổng.

## Cập nhật collection

Sửa `src/backend/src/main/webapp/openapi.json`, rồi từ gốc repo chạy:

```powershell
npm.cmd run generate --prefix tools/api
npm.cmd run check --prefix tools/api
```

Không chỉnh tay file JSON sinh tự động. Đổi cách sinh/assertion ở `tools/api/generate-postman.mjs`. Lưu Actual/PASS/FAIL/Not Run, bản build và bằng chứng trong báo cáo test; T04 chưa ghi kết quả nghiệp vụ.
