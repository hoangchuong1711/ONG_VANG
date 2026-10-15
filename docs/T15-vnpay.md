# T15 — VNPay Sandbox tại mốc thu cước

Tài xế được gán mở yêu cầu `VNPAY_QR` tại [mốc thu của T14](T14-payment.md). Người trả không cần tài khoản ứng dụng. Màn hình tài xế cung cấp URL và QR của URL cổng Sandbox cho người gửi/người nhận thao tác. QR được tạo cục bộ, không gửi URL sang dịch vụ bên ngoài. Đây là mô phỏng thanh toán qua cổng, không phải QR tài khoản ngân hàng cá nhân tài xế.

## Cấu hình và chạy thử

Đặt `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` và `DRIVER_RETURN_URL` trong môi trường backend; không commit secret. Return URL là HTTPS kết thúc `/api/payments/vnpay/return`. `DRIVER_RETURN_URL` là URL frontend kết thúc `/driver/orders` (mặc định `http://localhost:3001/driver/orders` khi thử trên cùng máy). Nếu thanh toán bằng trình duyệt trên thiết bị khác, dùng URL frontend mà thiết bị đó truy cập được. Đăng ký URL public riêng `/api/payments/vnpay/ipn` với VNPay. Nếu dùng ngrok, tunnel trỏ tới backend; cập nhật cả hai URL VNPay khi đổi domain.

Tạo đơn `VNPAY_QR`, gán tài xế và chuyển tới mốc nhận kiện (người gửi trả) hoặc đến điểm giao (người nhận trả). Trong `/driver/orders/{id}`, mở yêu cầu rồi mở cổng Sandbox. Dùng phương tiện test do VNPay cấp. Chỉ xem Sandbox trực tiếp đã đạt khi callback thực sự tới BE hoặc QueryDr xác minh thành công.

## Xác nhận và xử lý lỗi

- Return có chữ ký hợp lệ và khớp đơn sẽ chuyển trình duyệt về `/driver/orders/{id}`. Return sai hoặc không khớp chỉ hiển thị lời nhắc chung. Giao diện tài xế làm mới trạng thái từ backend trước khi cho đi tiếp.
- Chỉ IPN hoặc QueryDr đã xác minh chữ ký/merchant, tham chiếu, nội dung đơn, số tiền và trạng thái mới xác nhận thu đủ. Query phải khớp tham chiếu đã yêu cầu.
- Callback lưu trong `su_kien_thanh_toan` và xử lý dưới khóa đơn. Callback giống nhau không tạo thêm khoản thu/xác nhận đủ.
- Chưa có IPN, chữ ký sai hoặc không khớp thì không mở khóa. Query timeout/chưa rõ chuyển `CHUA_RO_KET_QUA`.
- Thất bại/hủy giữ trạng thái provider và `canDoiSoat=true`; không cho mở yêu cầu mới. IPN thành công hợp lệ đến muộn có thể xác nhận chính lần thử đó.
- Thu sai tiền, mã giao dịch thành công thứ hai hoặc bằng chứng mâu thuẫn giữ cờ cần đối soát, chặn giao tiếp và yêu cầu mới. Tài xế không thể tự xóa cờ hay tự đánh dấu VNPay thành công. Xử lý thủ công khoản sai/trùng và hoàn tiền chưa nằm trong API này.
- Tài xế đang được gán, khách chủ đơn hoặc tổng đài gọi `POST /api/payments/{id}/reconcile`. Giao diện đọc trạng thái BE định kỳ và có nút đối soát/làm mới.

Test tự động dùng secret giả và callback ký tại test, không giao dịch tiền thật; bao gồm Return, chữ ký sai, sai tiền/nội dung, IPN lặp/đồng thời/đến muộn, QueryDr, timeout và ma trận mốc thu.

Tham khảo: [VNPay PAY/IPN/Return](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [QueryDr](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).
