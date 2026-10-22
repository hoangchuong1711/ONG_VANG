# Kết quả kiểm thử bộ SQL gộp

Ngày kiểm tra: 22/10/2026 (Asia/Saigon).

Thay đổi nghiệp vụ sau khi gộp: bộ mới chỉ cho Tổng đài phân công. Kiểm thử hiện loại trừ đúng quyền `EXECUTE usp_phan_cong` của chủ đội xe khỏi phép so sánh với Legacy, đồng thời kiểm tra bộ mới không cấp quyền đó và procedure từ chối actor chủ đội xe mà không ghi dữ liệu. Các mục “quyền khớp” bên dưới là kết quả trước thay đổi này; các quyền còn lại tiếp tục được đối chiếu.

Môi trường: SQL Server 2022 Developer trong container tạm từ image `mcr.microsoft.com/mssql/server:2022-latest`, không mở cổng, không dùng volume dữ liệu của dự án. Container được xóa trong bước kết thúc của script, kể cả khi kiểm thử lỗi.

## Kết quả lượt cuối

| Kiểm tra | Kết quả |
|---|---|
| Chạy SQL gốc V1–V26 theo thứ tự phiên bản, gộp cả schema/demo | Đạt |
| Cài 10 file SQL gộp trên DB mới có demo | Đạt |
| Cài 01–08 và 10 trên DB mới không demo | Đạt |
| So sánh bảng, cột, kiểu dữ liệu, NULL, DEFAULT, CHECK, FK và index | Khớp |
| So sánh danh sách view/function/trigger/procedure | Khớp |
| So sánh quyền SQL và thành viên role | Khớp |
| 8 tài khoản: username, hash mật khẩu, vai trò và trạng thái | Khớp |
| 9 đơn chờ: mã đơn/khách, địa chỉ, cước km/kg, giảm giá, trạng thái và tổng cước qua view | Khớp |
| Không có giao dịch nộp tiền giả trong bộ demo | Đạt |
| Không demo: 1 biểu phí, 3 chính sách thành viên, 2 phụ thu, không có tài khoản mẫu | Đạt |
| Gán đơn, từ chối gán tiếp cho tài xế bận và giữ nguyên đơn bị từ chối | Đạt |
| Lấy hàng, bắt đầu giao, đến điểm nhận, hoàn tất | Đạt |
| Gọi hoàn tất lần hai chỉ giữ một khoản chia; tổng tiền tài xế + công ty bằng tổng cước | Đạt |
| DBCC CHECKCONSTRAINTS | Không trả vi phạm |
| Script sinh SQL chạy `--check` | Đạt |

Tên PK/UQ/FK do SQL Server tự sinh có hậu tố khác nhau giữa hai DB; kiểm thử chuẩn hóa phần tên tự sinh và đối chiếu cấu trúc khóa/index. Không sửa schema để ép các tên này giống nhau.

Các mốc thời gian, nhật ký nâng cấp cũ và `auth_version` không được yêu cầu bằng nhau: DB cài gộp mới không mô phỏng các lần đổi mật khẩu/xóa fixture của lịch sử. Giá trị nghiệp vụ được so sánh như bảng trên. Kiểm thử không so sánh toàn bộ từng dòng của mọi bảng hoặc chạy đồng thời nhiều kết nối.

## Chạy lại

Tại thư mục gốc, chạy `node scripts/build-design-v2-baseline.mjs --check`, sau đó `powershell -NoProfile -File scripts/verify-design-v2-baseline.ps1`.

Nguồn kiểm thử: `scripts/verify-design-v2-baseline.ps1` và `tests/design-v2-baseline-compare.sql`. Script SQL đối chiếu có thao tác ghi để thử nghiệp vụ; chỉ dùng qua môi trường tạm của script PowerShell, không chạy trực tiếp trên DB đang sử dụng.

## Kiểm thử tích hợp sau khi chuyển bộ gộp vào ứng dụng

Ngày 22/10/2026 đã chạy thêm `powershell -NoProfile -File scripts/verify-design-v2-baseline.ps1 -WithFlyway` với mã nguồn Java trong container Maven riêng:

- Flyway cài đủ 10 migration gộp trên DB mới và validate thành công khi khởi động lại.
- Cài chuỗi Legacy V1–V26, sửa một tên tài khoản làm dữ liệu kiểm chứng rồi khởi động backend persistence hai lần: giữ nguyên dữ liệu, 9 đơn và 26 bản ghi migration; không chạy lại seed.
- 26 file Legacy được kiểm tra với Git, giữ nguyên nội dung bản gốc.
- Maven: **86 test được ghi nhận, 27 chạy đạt, 59 test DesignV1 cũ được bỏ qua; không có lỗi/thất bại**.
- Kiểm tra hợp đồng API: 80 operation, 302 ví dụ hợp lệ; Postman đồng bộ, ranh giới backend và 2 test Swagger đạt.

Ứng dụng hiện dùng bộ gộp trong `db/designV2/sqlserver/` cho DB mới; nhận diện lịch sử cũ để dùng `db/designV2Legacy/sqlserver/`. Lượt này không kiểm thử trình duyệt, HTTP server end-to-end hay VNPay thật. Không kết nối hoặc sửa DB đang vận hành.
