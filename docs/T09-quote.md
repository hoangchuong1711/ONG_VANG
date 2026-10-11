# T09 — Báo giá trên designV1

`POST /api/quotes` xác thực khách hoặc tổng đài, chuẩn hóa địa chỉ/kiện và lấy lộ trình trước transaction DB. Backend phải tìm **đúng một** `BieuPhi` công bố khớp thời điểm và khoảng km; nếu không hoặc nhiều hơn một thì báo lỗi cấu hình. Phụ thu được lấy từ `ChinhSachPhuThu` công bố còn hiệu lực; hai phiên bản cùng loại khớp thời điểm là lỗi cấu hình.

Cước gốc = `HALF_UP(cuocCoBan + km × donGiaKm)` tới đồng. Tổng = cước gốc + các phụ thu cố định − giảm thành viên, luôn dưới giới hạn DECIMAL(15,2). Quote lưu request chuẩn hóa, route, kết quả, mã biểu phí và `hetHanLuc = taoLuc + 300 giây` vào `bao_gia`. T10 tính lại trước khi chốt; giá, chính sách, route hoặc kiện đổi thì trả `QUOTE_CHANGED`.

Chi tiết bảng và ràng buộc ở [designV1](database/designV1.md). Công bố/chấm dứt phiên bản biểu phí và phụ thu bằng thao tác quản trị an toàn chưa thuộc luồng HTTP T09 hiện tại; phải xử lý trước khi dùng chính sách động ngoài fixture.
