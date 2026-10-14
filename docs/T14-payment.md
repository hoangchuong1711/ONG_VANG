# T14 — Thu cước đúng mốc

Tài xế đang được gán mở yêu cầu theo lựa chọn đã lưu trên đơn:

| Bên trả | Mốc mở yêu cầu | Bước bị khóa khi chưa thu đủ |
| --- | --- | --- |
| NGUOI_DAT (người gửi) | DA_LAY_HANG | Bắt đầu DANG_GIAO |
| NGUOI_NHAN | DANG_GIAO và sự kiện DEN_DIEM_NHAN | HOAN_TAT |

BE kiểm tra lại trước chuyển trạng thái. Đơn miễn cước đi tiếp không tạo payment. Thu tiền không tự hoàn tất giao hàng.

## API

1. Tài xế gọi `POST /api/orders/{id}/payments`, header `Idempotency-Key`, body `phuongThuc` là `TIEN_MAT` hoặc `VNPAY_QR`, phải khớp đơn. BE khóa đơn, lấy cước chốt và kiểm tra tài xế/mốc. Cùng actor/key trả payment cũ; dùng lại key cho đơn/phương thức khác bị từ chối. Yêu cầu mới bị chặn khi đã thu đủ hoặc còn khoản chờ/cần đối soát.
2. Tiền mặt: tài xế được gán gọi `POST /api/payments/{id}/confirm-cash` với `soTienDaThu` bằng đúng tổng cước. Sai số tiền trả `409 PAYMENT_AMOUNT_MISMATCH` và không ghi khoản thu. Khách, tổng đài, tài xế khác không có quyền xác nhận.
3. Cùng transaction ghi `THANH_CONG`, số tiền thực nhận, người thu, thời điểm và liên kết xác nhận đủ. Xác nhận lặp bởi chính người thu với cùng số tiền trả kết quả cũ, kể cả sau hoàn tất; không tạo khoản mới.
4. `GET /api/orders/{id}/payments` và `GET /api/payments/{id}` trả trạng thái BE, `daXacNhanDu`, `canDoiSoat`, `maTkThu`, `thoiGianThanhToan`, `soTienGiuHo`. Khoản tiền mặt giữ hộ suy ra từ khoản thu đã lưu; hệ thống chưa có nghiệp vụ nộp tiền/giải ngân để giảm khoản này.

Các thao tác ghi khóa cùng hàng `don_hang`, kể cả IPN và chuyển trạng thái. Khoản đã thu giữ nguyên khi phát sinh sự cố giao hàng.

## Kiểm thử

`DesignV1IntegrationTest` kiểm tra 4 tổ hợp người gửi/người nhận × tiền mặt/VNPay, quyền tài xế, mốc thu, khóa bước trước thu, miễn cước, idempotency, yêu cầu/xác nhận đồng thời, rollback, Return, IPN lặp/đến muộn, hủy/thất bại, timeout, sai/trùng tiền và thu trước giao nhưng không hoàn tất.

Chạy Maven với `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `REQUIRE_TEST_DB=true` trên DB `mini_ong_vang_test` cách ly. HTTP smoke tiền mặt: `npm --prefix tools/api run smoke:payment` với backend-test đã seed và `DEMO_PASSWORD` tương ứng.

Xem [T15 — VNPay Sandbox](T15-vnpay.md).
