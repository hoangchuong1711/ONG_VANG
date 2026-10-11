# T10 — Tạo đơn trên designV1

`POST /api/orders` yêu cầu session khách hoặc tổng đài, CSRF token và `Idempotency-Key` 1–100 ký tự. Tổng đài chọn `maKh`; khách chỉ tạo cho mình. Request không nhận tiền, hạng hay trạng thái từ client. Response `Order` trả `maTkTao` là ID tài khoản tạo đơn; không còn `maNv` vì tổng đài không có hồ sơ riêng.

Service tìm replay cùng actor/key trước khi gọi bản đồ. Payload giống trả response gốc; payload khác trả `IDEMPOTENCY_CONFLICT`. Khi tạo mới, service khóa account, xác minh khách và báo giá còn hạn, so route/kiện/giá với quote, rồi ghi `DonHang`, `CuocDonHang`, `KienHang`, `PhuThuDonHang`, event `TAO_DON` và `YeuCauTaoDon` trong cùng transaction. `don_hang` không lưu tài xế hay tổng cước dư. Đơn miễn cước trả trạng thái thanh toán `MIEN_CUOC`; T14–T15 mới tạo payment thật.

DB test xác minh replay, giá/hạng lưu theo phiên bản, khóa ngoại và rollback; HTTP smoke kiểm tra validation, quyền, quote thay đổi và 4 request đồng thời cùng key. Test biên TTL đúng 300 giây và hết 24 giờ của key còn trong [kế hoạch](database/designV1-implementation-plan.md).
