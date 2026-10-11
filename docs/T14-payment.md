# T14 — Nghiệp vụ thanh toán UC-08

T14 triển khai yêu cầu và xác nhận thu tiền mặt sau khi đơn `HOAN_TAT`. VNPay Sandbox, chữ ký, IPN và truy vấn đối soát đã được triển khai ở [T15](T15-vnpay.md).

## Luồng API

1. Chủ đơn gọi `POST /api/orders/{maDon}/payments` với `Idempotency-Key` và `{"phuongThuc":"TIEN_MAT"}`. Dịch vụ khóa đơn, lấy cước đã chốt từ `cuoc_don_hang` và phụ thu, kiểm tra chưa thanh toán đủ/chưa có yêu cầu chưa giải quyết, rồi tạo một hàng `thanh_toan` ở `CHO_XU_LY`. Cùng actor/key/đơn trả payment cũ; dùng lại key cho đơn khác trả `IDEMPOTENCY_CONFLICT`.
2. Tài xế có phân công kết thúc `HOAN_TAT` của đơn hoặc tổng đài gọi `POST /api/payments/{maGiaoDich}/confirm-cash` với `{"soTienDaThu":"45000.00"}`. Khách không được xác nhận. Cùng giao dịch và số tiền xác nhận lặp trả kết quả cũ, không ghi lần hai.
3. Nếu thực nhận bằng cước và chưa có xác nhận đủ, payment chuyển `THANH_CONG` và tạo một hàng `xac_nhan_thanh_toan_don_hang` trong cùng transaction. Sai tiền vẫn lưu khoản thực nhận nhưng không tạo liên kết; API trả `422 PAYMENT_AMOUNT_MISMATCH`. Đọc lại payment qua `GET /api/payments/{maGiaoDich}` để xem `soTienThucNhan` và `canDoiSoat`.
4. `GET /api/orders/{maDon}/payments?page=0&size=20` trả lịch sử theo `taoLuc DESC,maGiaoDich ASC`. Quyền xem giống chi tiết đơn. Chi tiết đơn suy ra `DA_THANH_TOAN` từ liên kết xác nhận đủ, và `canDoiSoat` cho khoản thành công chưa phân bổ.

Đơn miễn cước trả `422 PAYMENT_NOT_REQUIRED`, không tạo `thanh_toan` hay liên kết xác nhận. Khoản thu sai tiền không làm giảm `soTienConPhaiThu`. Một khoản thu thành công thứ hai nếu thực sự phát sinh vẫn có thể lưu bằng chứng, nhưng không được xác nhận đủ lần hai; T15 dùng quy tắc này cho callback đến muộn.

Mọi thao tác ghi khóa `don_hang` trước khi kiểm tra trạng thái payment. Hai unique index theo trạng thái chờ là lớp bảo vệ bổ sung; kiểm tra kết hợp `CHO_XU_LY`/`CHUA_RO_KET_QUA` nằm trong transaction. `ma_tham_chieu` của yêu cầu tiền mặt là hash ổn định theo actor và `Idempotency-Key`, tránh lưu khóa gốc. Hiện key được giữ cùng payment lâu hơn cửa sổ 24 giờ ghi trong OpenAPI; cần thống nhất vòng đời key nếu yêu cầu tái sử dụng sau 24 giờ.

Kiểm thử `DesignV1IntegrationTest` dùng SQL Server cách ly: trước hoàn tất, miễn cước, sai người, sai đơn, retry, sai tiền, hai yêu cầu đồng thời, hai xác nhận đồng thời, rollback và khoản thu thứ hai cần đối soát. Chạy với `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `REQUIRE_TEST_DB=true` như hướng dẫn [DB test](database/README.md).

Sau khi build/chạy `backend-test` trên DB test đã seed, đặt `DEMO_PASSWORD` đúng với fixture rồi chạy `npm.cmd --prefix tools/api run smoke:payment`. Smoke kiểm tra luồng tiền mặt qua HTTP, gồm session/CSRF, tạo yêu cầu, quyền xác nhận, retry và trạng thái thanh toán của đơn.
