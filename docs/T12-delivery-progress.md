# T12 — Tiến trình và sự cố giao hàng trên designV1

Tài xế hiện được gán chuyển tuần tự `DA_GAN → DA_LAY_HANG → DANG_GIAO → HOAN_TAT`. Sai cạnh trả `ORDER_STATE_CONFLICT`; retry trạng thái hiện tại không thêm event. Tại `HOAN_TAT`, phân công được đóng với outcome `HOAN_TAT`, tài xế có `ranhTu` mới. Retry hoàn tất đơn cũ không được động tới phân công mới của tài xế.

Trong `DANG_GIAO`, tài xế có thể ghi sự cố. `SuKienDonHang` lưu thứ tự `thuTu` theo đơn, loại event, trạng thái trước/sau, tài khoản thực hiện, mốc thời gian, loại sự cố và ghi chú. Lịch sử phân trang theo `thuTu`, không suy thứ tự từ timestamp. Khách chủ đơn, tổng đài và tài xế có quan hệ phân công hợp lệ được xem; tài xế chỉ từng từ chối không được đọc lại. Hoàn tất chưa đồng nghĩa đã thanh toán.

Event API trả `maSuKien`, `maDon`, `thuTu`, `loaiSuKien`, `trangThaiTruoc`, `trangThaiSau`, `thoiGian`, `maTkThucHien`, `ghiChu`, `loaiSuCo`. `nguoiThucHien` là tên hiển thị hiện tại, không phải snapshot lịch sử; dùng `maTkThucHien` để xác định actor. HTTP smoke kiểm tra quyền, validation, chuyển trạng thái, sự cố, thứ tự/phân trang và retry sau khi tài xế nhận đơn khác.
