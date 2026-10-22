# Bộ SQL hoàn chỉnh DesignV2 — đến V26

Bộ cài đặt CSDL mới phục vụ học, báo cáo và chạy thử trong SSMS. Mỗi đối tượng chỉ giữ định nghĩa cuối cùng sau V26; không cần chạy lần lượt các bản sửa V12–V26.

Đã chạy và đối chiếu trên SQL Server 2022: xem [kết quả kiểm thử](VERIFICATION.md).

Bộ migration chính hiện nằm trong `src/backend/src/main/resources/db/designV2/sqlserver/` và được ứng dụng chạy bằng Flyway trên DB mới. Các SQL ở đây là bản xuất từ bộ chính để đọc/báo cáo. DB có lịch sử V1–V26 cũ tự dùng thư mục tương thích `designV2Legacy`; không sửa/xóa lịch sử. Xem [hướng dẫn migration ứng dụng](../../../src/backend/src/main/resources/db/designV2/sqlserver/README.md).

## Các thành phần và thứ tự chạy

| Thứ tự | File | Nội dung hiện tại |
|---|---|---|
| 1 | `01_tables.sql` | 16 bảng và PK/FK/UNIQUE/CHECK/DEFAULT; ngày hết hạn GPLX cho phép NULL theo V24 |
| 2 | `02_indexes.sql` | 14 index bổ sung ngoài index do khóa tạo |
| 3 | `03_functions_fare.sql` | 4 hàm tính cước và chia tiền |
| 4 | `04_views.sql` | 6 view còn sử dụng |
| 5 | `05_functions_income.sql` | Hàm thu nhập tài xế; đặt sau view vì phụ thuộc `v_chia_cuoc` |
| 6 | `06_triggers.sql` | 6 trigger còn sử dụng |
| 7 | `07_procedures.sql` | 19 stored procedure, gồm các bản cập nhật tài xế, thành viên, VNPay và phân trang |
| 8 | `08_roles_permissions.sql` | 6 role, user minh họa, quyền trên các đối tượng còn tồn tại |
| 9 | `09_demo_data.sql` | Tùy chọn: 8 tài khoản, 3 khách, 3 tài xế, 3 xe, chính sách và 9 đơn chờ |
| 10 | `10_default_pricing.sql` | Cấu hình cước/thành viên/phụ thu mặc định cả khi không nạp demo |

Function được tách riêng thành hai file để giữ đúng thứ tự phụ thuộc, không trộn với view/procedure.

## Chạy trong SSMS

1. Dùng SQL Server 2022 trên môi trường thử riêng. Tạo **database mới, rỗng**. Nếu nạp demo, tên phải là `mini_ong_vang_design_v2_test` hoặc `mini_ong_vang_design_v2_demo` vì script có kiểm tra tên. Không dùng lại DB đang chứa dữ liệu của ứng dụng. Nếu tên đã tồn tại, dùng một SQL Server thử riêng; không xóa DB cũ để lấy tên.
2. Chọn đúng database ở mỗi cửa sổ query. Chạy từng file 01–08 theo thứ tự; khi gặp lỗi phải dừng và xử lý trước khi chạy file tiếp theo.
3. Muốn có demo: chạy 09 rồi 10. Không muốn demo: bỏ 09, chạy 10.
4. Tài khoản demo dùng mật khẩu `12345678`: khách `0900000001`–`0900000003`, tài xế `0800000001`–`0800000003`, tổng đài `demo_dispatcher`, chủ đội xe `demo_admin`. Đây là tài khoản ứng dụng trong bảng, khác user/role SQL minh họa.

Không chạy lại toàn bộ bộ cài trên DB có dữ liệu. File 01 tạo bảng mới; file 09 từ chối nạp lại khi đã có dữ liệu. Không bọc cả bộ bằng một transaction vì procedure và seed tự quản transaction. Với sqlcmd, dùng `-b -I -C` để dừng khi lỗi và bật QUOTED_IDENTIFIER; chọn database bằng `-d`.

Bộ demo giữ nội dung nghiệp vụ cuối cùng: 9 đơn `CHO_GAN`, không có giao dịch nộp tiền. Không tạo rồi xóa 30 fixture lịch sử; không chạy các lần sửa mật khẩu cũ. Thời điểm tạo, số phiên xác thực và nhật ký của các thao tác nâng cấp lịch sử không được tái tạo như dữ liệu nghiệp vụ.

## Cập nhật và kiểm tra

Chạy từ thư mục gốc dự án:

```powershell
node scripts/build-design-v2-baseline.mjs
node scripts/build-design-v2-baseline.mjs --check
powershell -NoProfile -File scripts/verify-design-v2-baseline.ps1
```

Script xuất SQL sao chép từ migration ứng dụng sang tài liệu. Sửa ở bộ chính rồi xuất lại; không sửa bản tài liệu độc lập. Không sửa migration đã áp dụng vào DB.

Script kiểm thử cần Docker Desktop và image `mcr.microsoft.com/mssql/server:2022-latest`. Nó tạo container riêng với mật khẩu ngẫu nhiên, không mở cổng, mount mã nguồn chỉ đọc và tự xóa container sau khi chạy. Nó cài chuỗi SQL gốc vào một DB, bộ gộp vào DB khác, so sánh metadata/quyền/dữ liệu và thử thêm chế độ không demo. Không khởi động backend hay thay đổi DB hiện có. Đây là kiểm thử SQL, không thay cho kiểm thử Flyway hoặc toàn bộ API/giao diện.
