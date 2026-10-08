# T09 — Tính cước và báo giá

`POST /api/quotes` dùng session/CSRF T06. Khách hàng không truyền `maKh` hoặc chỉ truyền chính ID của mình; tổng đài bắt buộc truyền `maKh`. Request có hai địa chỉ và ít nhất một kiện hàng đúng schema OpenAPI. Backend lấy lộ trình T07 trước khi mở transaction DB.

Biểu phí được chọn trong các dòng bật, còn hiệu lực ở ngày hiện tại tại `Asia/Ho_Chi_Minh`, có `kmToiThieu <= km <= kmToiDa` (nếu có). Khi nhiều dòng khớp, ưu tiên ngày bắt đầu mới nhất rồi ID. `kmToiThieu` là giới hạn áp dụng, không trừ khỏi số km tính tiền. Phụ thu demo đang bật và không gắn khu vực được cộng; dòng phụ thu theo khu vực chờ quy tắc vùng cụ thể.

`cuocGoc = cuocCoBan + km × donGiaKm`. T08 tính giảm VIP trên `cuocGoc + tienPhuThu`. Các phần tiền hiển thị làm tròn `HALF_UP` đến nguyên VND và trả chuỗi có `.00`; giảm không vượt tổng trước giảm và tổng không âm. Chi tiết phụ thu cộng đúng bằng `tienPhuThu`.

Mỗi báo giá được lưu vào bảng `bao_gia` với mã UUID, chủ sở hữu, mã biểu phí, thời điểm tạo/hết hạn, request đã chuẩn hóa (gồm kiện hàng và lộ trình) và toàn bộ response giá. Thời hạn là 300 giây; từ đúng `hetHanLuc` báo giá đã hết hạn. T10 dùng dữ liệu này để so khớp chủ/đầu vào và tính lại trước khi tạo đơn và snapshot. T09 chưa tạo đơn hoặc ghi `snapshot_cuoc_don_hang`.

Thiếu biểu phí phù hợp hoặc dữ liệu biểu phí/tiền sai trả `503 FARE_CONFIG_MISSING`; địa chỉ/km/phạm vi và timeout theo T07. Khách chọn ID người khác trả `403 FORBIDDEN`; tổng đài chọn khách không tồn tại trả `404 RESOURCE_NOT_FOUND`.
