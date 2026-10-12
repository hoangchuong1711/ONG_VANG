# T17 — Báo cáo và xuất Excel (UC-15)

Chỉ tài khoản quản trị CHU_DOI_XE đang hoạt động được dùng `GET /api/reports/revenue` và `GET /api/reports/revenue/export`. Bộ lọc bắt buộc `tuNgay`, `denNgay` theo khoảng `[tuNgay,denNgay)` tại Asia/Ho_Chi_Minh; `nhomTheo` là NGAY (mặc định), TUAN (thứ Hai), THANG. Bucket đầu/cuối cắt đúng theo khoảng lọc, bao gồm bucket rỗng.

- `giaTriDonHoanTat`, `soDonHoanTat`: theo thời điểm hoàn tất; cước chốt là cước gốc trừ giảm giá cộng phụ thu đúng phiên bản của đơn.
- `tienThucThu`: toàn bộ tiền thực nhận của các giao dịch theo thu_luc trong kỳ, không theo thời điểm hoàn tất đơn.
- `tienThuChuaPhanBo`: phần thực thu chưa liên kết trong xac_nhan_thanh_toan_don_hang. Đây là tập con của thực thu, không cộng thêm lần nữa. Khoản thiếu/thừa hoặc thu trùng được giữ riêng để đối soát.
- `cuocConPhaiThuCuoiKy`: cước của mọi đơn đã hoàn tất trước cuối mốc (kể cả trước đầu kỳ), chưa có giao dịch được xác nhận đủ tiền với thu_luc trước mốc. Thu ở kỳ sau không xóa công nợ kỳ trước. Tổng là số dư cuối kỳ, không cộng công nợ của các bucket. Khoản thu chưa phân bổ không tự trừ công nợ.
- `soDonHuy`: theo thời điểm hủy; đơn hủy hoặc chưa hoàn tất không tạo giá trị hoàn tất/công nợ.

DAO tổng hợp cước và phụ thu riêng; các payment và sự kiện không join vào phép cộng cước để tránh nhân tiền. API không ghi dữ liệu.

Excel là file `.xlsx` OOXML, dùng chính DTO báo cáo của API, có bộ lọc/múi giờ, dòng tổng và các nhóm với số tiền dạng ô số. Tạo file hoàn chỉnh trước khi gửi; lỗi tạo file trả EXPORT_FAILED, không thay đổi dữ liệu báo cáo. Dùng Java ZIP/XML có sẵn, không cần thêm thư viện hoặc sửa pom.xml.

## Kiểm thử

Các test t17* trong DesignV1IntegrationTest dùng SQL Server test riêng; RevenueExcelExporterTest kiểm tra cấu trúc workbook/số liệu và giả lập lỗi ghi. HTTP smoke: `npm run smoke:reports --prefix tools/api`, sau reset/seed database mini_ong_vang_test với DEMO_PASSWORD. Không chạy trên database phát triển. Smoke cần fixture quản trị/tổng đài/tài xế rảnh và kiểm tra tên database trước khi tạo dữ liệu.


Kết quả local: Maven verify đạt 57 test (0 lỗi, 0 bỏ qua) trên SQL Server test; HTTP T17 đạt 53 kiểm tra; HTTP T11 chạy tiếp đạt 85 kiểm tra. Cả ba file NGAY/TUAN/THANG mở đọc bằng openpyxl và khớp số liệu API. OpenAPI/Postman và 2 test công cụ tài liệu đạt.
