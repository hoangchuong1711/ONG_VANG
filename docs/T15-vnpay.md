# T15 — VNPay Sandbox (UC-10)

T15 đã có implementation và hướng dẫn chạy local/ngrok. Giữ tài liệu này để tham khảo; đợt T18 hiện tại chỉ đồng bộ tài liệu, không chạy thêm kiểm thử thanh toán hoặc yêu cầu mọi thành viên dùng Sandbox. Môi trường thanh toán dùng chung sẽ được cấu hình/kiểm tra sau khi dự án hoàn thiện và deploy; xem [phạm vi T18](T18-sandbox-api.md).

## Cấu hình local

Sao chép `.env.example` thành `.env` (không commit) và đặt `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`. Ví dụ với tunnel hiện tại:

```dotenv
VNPAY_RETURN_URL=https://panorama-rippling-strongbox.ngrok-free.dev/api/payments/vnpay/return
```

IPN để đăng ký với VNPay là `https://panorama-rippling-strongbox.ngrok-free.dev/api/payments/vnpay/ipn`. Hai URL là hai đường dẫn khác nhau. Tunnel phải trỏ tới backend port `8081`, đang chạy khi thử sandbox; nếu domain ngrok đổi, cập nhật `.env` và địa chỉ IPN đã đăng ký. Khởi động lại backend sau khi đổi biến môi trường. Không đưa secret vào source, Postman hoặc URL.

## Luồng

1. Đơn đã `HOAN_TAT`, khách gọi `POST /api/orders/{maDon}/payments` với `{ "phuongThuc": "VNPAY_QR" }` và `Idempotency-Key`. BE tạo một lần thử `CHO_XU_LY`, ký `paymentUrl` và lưu URL đó. Gọi lại cùng key nhận cùng lần thử và URL. Đơn miễn cước không tạo lần thử.
2. Khách mở `paymentUrl` trong trình duyệt. Return chỉ hiển thị lời nhắc kiểm tra trạng thái, đồng thời lưu sự kiện để tra cứu; không đánh dấu đã thu.
3. VNPay gửi IPN server-to-server. BE kiểm tra chữ ký HMAC-SHA512 và mã merchant, mã tham chiếu, đơn, số tiền, trạng thái. Sự kiện được lưu trong `su_kien_thanh_toan`; callback lặp chỉ có một bản ghi. Trong cùng transaction và dưới khóa đơn, khoản thu hợp lệ cập nhật `thanh_toan`, rồi tạo liên kết `xac_nhan_thanh_toan_don_hang` nếu đủ cước và chưa có khoản thu nào được xác nhận.
4. Sự kiện sai chữ ký/không khớp và khoản thu sai tiền được giữ để đối soát. Thu đủ lần thứ hai không ghi đè liên kết đã có. Khách hoặc tổng đài gọi `POST /api/payments/{maGiaoDich}/reconcile` để QueryDr; nếu không liên lạc được hoặc trạng thái còn chờ, lần thử thành `CHUA_RO_KET_QUA`, không được tự tạo lần thử mới. Phải đối soát trước khi quyết định thu lại.

Thử với thẻ Sandbox do VNPay cấp, sau đó xem `GET /api/payments/{maGiaoDich}` và chi tiết đơn. IPN public chỉ nhận GET, không cần session/CSRF. Không mở IPN bằng tay để giả lập thành công: thiếu chữ ký sẽ bị từ chối và được ghi làm bằng chứng. Test tự động dùng secret giả, không đòi kết nối mạng VNPay. Chỉ xem luồng sandbox trực tiếp là đã kiểm tra khi IPN đã được VNPay cấu hình và callback thực sự tới backend.

Tài liệu VNPay: [PAY/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [QueryDr](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

## Thử Sandbox thật từ local

1. Trong `.env` đặt `DEMO_SEED=true`, `DEMO_PASSWORD` là mật khẩu tự chọn cho tài khoản demo, cùng `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` từ email và `VNPAY_RETURN_URL` là URL HTTPS ngrok kết thúc bằng `/api/payments/vnpay/return`. Khởi động `docker compose up --build -d backend`; kiểm tra `http://localhost:8081/api/health`.
2. Chạy `ngrok http 8081`. Gửi URL HTTPS kết thúc bằng `/api/payments/vnpay/ipn` cho VNPay để họ cấu hình IPN và chờ xác nhận. Nếu URL tunnel đổi, sửa cả return URL trong `.env`, khởi động lại backend và cập nhật IPN với VNPay.
3. Import collection và environment ở `tests/postman`. Dùng khách demo `0900000001`, tổng đài `demo_dispatcher`, tài xế `0800000001`; tất cả dùng `DEMO_PASSWORD`. Mỗi lần đổi tài khoản cần đăng xuất, lấy CSRF mới và đăng nhập lại. Tạo báo giá, tạo đơn mới, tổng đài gán `TX-DEMO-1`, tài xế chuyển lần lượt `DA_LAY_HANG` → `DANG_GIAO` → `HOAN_TAT`. Seed không có đơn dựng sẵn.
4. Đăng nhập lại bằng khách chủ đơn. Gọi `createPayment` với `{"phuongThuc":"VNPAY_QR"}` và một `Idempotency-Key` mới; lưu `maGiaoDich`, mở `paymentUrl` trả về trong trình duyệt. Dùng thẻ test trong email VNPay để hoàn tất giao dịch.
5. Xem `http://127.0.0.1:4040` để xác nhận tunnel nhận request `GET /api/payments/vnpay/ipn`. Gọi `getPayment` bằng `maGiaoDich`; kết quả mong đợi là `trangThai=THANH_CONG`, `daXacNhanDu=true`, `canDoiSoat=false`. Chi tiết đơn phải báo `DA_THANH_TOAN`. Nếu chỉ thấy Return mà chưa thấy IPN, đừng kết luận đã thu; có thể gọi `reconcilePayment` bằng phiên khách/tổng đài để truy vấn lại.
