# Chức năng Mini Ong Vang

Tài liệu gọn về luồng nghiệp vụ đã có trong backend. Chi tiết endpoint và DTO nằm trong [OpenAPI](../src/backend/src/main/webapp/openapi.json); kết quả kiểm thử xem [T20](../tests/T20-acceptance.md) và [T19](../tests/T19-validation.md).

## Luồng chính

1. Khách đăng ký/đăng nhập hoặc tổng đài đăng nhập; tài khoản có một trong bốn vai trò: khách hàng, tài xế, tổng đài, chủ đội xe.
2. Khách hoặc tổng đài nhập địa chỉ, hệ thống ước tính tuyến rồi tạo báo giá theo biểu phí km/kg, hạng thành viên và phụ thu. Báo giá hết hạn sau 300 giây.
3. Tạo đơn lưu tuyến, kiện hàng, cước đã chốt và sự kiện đầu tiên trong một transaction. Khóa idempotency ngăn request lặp tạo thêm đơn.
4. Tổng đài gợi ý và gán tài xế. Tài xế có thể từ chối trước khi lấy hàng; lịch sử phân công được giữ.
5. Tài xế cập nhật `DA_LAY_HANG → DANG_GIAO → HOAN_TAT`, ghi sự cố hoặc mốc đến điểm nhận. Có thể hủy đơn trong điều kiện nghiệp vụ cho phép.
6. Thu cước bằng tiền mặt hoặc VNPay tại mốc phù hợp với bên trả. IPN/QueryDr được xác minh ở backend; Return của trình duyệt tự nó không xác nhận đã thu.
7. Tổng đài đối soát khoản tiền mặt tài xế nộp. Chủ đội xe xem lịch sử, báo cáo doanh thu và xuất Excel.

## Tích hợp và giới hạn

- Lộ trình mặc định dùng `ROUTE_PROVIDER=fake` với fixture, chỉ phục vụ demo/test. Muốn địa chỉ thật, cấu hình Goong ở backend theo `.env.example` và phần cấu hình trong [README gốc](../README.md). Khoảng cách Goong hiện là ước tính tuyến ô tô, không phải tuyến xe máy.
- VNPay chạy Sandbox; test tự động ký callback giả lập, không phải giao dịch merchant Sandbox thật. IPN công khai và nghiệm thu Sandbox dùng chung còn hoãn tới khi deploy.
- Một số trang quản trị và trang đánh giá vẫn lưu dữ liệu demo phía frontend. Đừng xem các thao tác đó là CRUD đã ghi vào SQL Server. Vị trí tài xế dùng cho gợi ý là vị trí demo cấu hình, không phải GPS trực tiếp.
- Policy có service nội bộ và trigger bảo vệ phiên bản đã công bố; hiện chưa có API quản trị công khai để chỉnh policy.

## Đọc thêm

- [Hướng dẫn API và cách chạy Swagger](api/README.md)
- [Khôi phục tài khoản qua email](auth-email-recovery.md)
- [Kiến trúc backend](backend-architecture.md)
- [Đề xuất thiết kế CSDL và yêu cầu môn DBMS](database/csdl.md) — bản dự thảo chưa áp dụng vào database hiện tại.
- [Khởi động/reset DB và môi trường test](database/README.md)
