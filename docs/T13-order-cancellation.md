# T13 — Hủy đơn (UC-14)

`POST /api/orders/{maDon}/cancel` dùng session của khách sở hữu đơn hoặc tổng đài và header `X-CSRF-Token`. Body chỉ có `lyDo` (1–500 ký tự sau trim). Endpoint trả Order mới khi thành công.

## Quy tắc

- Chỉ `CHO_GAN` hoặc `DA_GAN` được hủy. Tính tuổi đơn từ `thoiGianTao` bằng clock server: từ 0 đến dưới 300 giây. Đúng 300 giây trả `409 CANCELLATION_WINDOW_EXPIRED`.
- Khách không sở hữu đơn nhận 404 giống đơn không tồn tại; vai trò khác nhận 403. Kiểm tra quyền sở hữu trước trạng thái và thời hạn.
- Lý do bắt buộc, được trim và lưu ở đơn, lịch sử phân công (nếu có) và nhật ký. Gửi lại yêu cầu hủy sau khi đã hủy trả `409 ORDER_STATE_CONFLICT`; không tạo thêm nhật ký.

## Transaction và cạnh tranh

`DispatchServlet → DispatchService.cancel → DonHangDAO/DispatchDAO` dùng một `TransactionRunner` và một EntityManager. Khóa đơn trước; nếu đơn đã gán thì khóa tài xế, sau đó tài khoản tài xế như T11/T12. Kiểm tra lại phân công hiện hành dưới khóa.

Trong cùng transaction, chuyển đơn thành `DA_HUY`, ghi `thoi_gian_huy`, `ly_do_huy`; nếu đã gán, kết thúc phân công với kết quả `HUY_DON` và đặt `ranh_tu` cho tài xế; thêm sự kiện đơn hàng mang danh tính người hủy. Tài xế hiện hành được suy ra từ phân công còn hiệu lực, không lưu trực tiếp trên đơn. Lỗi ở bất kỳ bước nào rollback toàn bộ. Cước chốt, kiện hàng và thanh toán không đổi. Không xóa lịch sử phân công.

Gán và hủy cùng đơn phải tuần tự qua khóa đơn: gán trước thì hủy giải phóng tài xế; hủy trước thì gán trả 409. Hủy cạnh tranh với cập nhật tiến trình cũng dùng cùng khóa; nếu tài xế đã lấy hàng, hủy trả 409.

## Bàn giao

OpenAPI đánh dấu `cancelOrder` là implemented, Postman sinh từ spec. Test T13 nằm trong `DesignV1IntegrationTest` trên SQL Server, kiểm tra quyền, trạng thái, mốc 299.999/300/301 giây, lịch sử phân công, cạnh tranh gán–hủy và rollback. HTTP smoke T13 cần chạy trên DB test riêng sau reset/seed. PR vào `develop` chỉ merge sau CI và review theo CONTRIBUTING.
