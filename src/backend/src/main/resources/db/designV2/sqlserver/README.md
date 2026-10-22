# Migration DesignV2 đang dùng cho DB mới

Đây là nguồn SQL chính của ứng dụng, đã gộp toàn bộ thay đổi đến V26 cũ thành:

| File | Thành phần |
|---|---|
| schema/V1__tables.sql | 16 bảng và ràng buộc |
| schema/V2__indexes.sql | 14 index bổ sung |
| schema/V3__functions_fare.sql | 4 hàm tính cước |
| schema/V4__views.sql | 6 view |
| schema/V5__functions_income.sql | Hàm thu nhập, phụ thuộc view |
| schema/V6__triggers.sql | 6 trigger |
| schema/V7__procedures.sql | 19 thủ tục, mỗi thủ tục chỉ có định nghĩa cuối |
| schema/V8__roles_permissions.sql | Role/user và quyền |
| demo/V9__demo_data.sql | 8 tài khoản, cấu hình và 9 đơn chờ |
| schema/V10__default_pricing.sql | Giá mặc định khi không nạp demo |

Backend tự chạy Flyway. Chọn `DESIGN_V2_DEMO=true` ngay lần cài đầu để nạp demo, hoặc `false` nếu chỉ cần schema và giá mặc định. Giữ nguyên lựa chọn này cho DB đã cài; không bật demo muộn trên DB đã chạy V10. Seed demo chỉ chấp nhận tên DB demo/test có trong script.

Quyền phân công hiện tại: chỉ `TONG_DAI` được gọi `usp_phan_cong` và API phân công. Chủ đội xe vẫn xem đơn/lịch sử và hủy đơn theo quyền hiện có, nhưng không phân công. V7/V8 được sửa trực tiếp trước lần triển khai đầu tiên. Bộ Legacy giữ nguyên chính sách lịch sử; nếu sau này cần dùng DB Legacy, phải thêm migration thu hồi quyền SQL tương ứng, không sửa các file Legacy đã áp dụng.

## Database đã dùng V1–V26 cũ

`PersistenceContext` đọc tên script V1 trong `dbo.flyway_schema_history` trước khi chọn bộ migration:

- Không có history: dùng bộ gộp ở đây; Flyway vẫn từ chối schema có bảng nhưng thiếu history.
- V1 là `V1__tables.sql`: tiếp tục bộ gộp.
- V1 là `V1__create_business_tables.sql`: dùng `db/designV2Legacy/sqlserver/`, các file cũ giữ nguyên byte/checksum. Flyway kiểm tra và chạy tiếp các phiên bản cũ còn thiếu đến V26.
- History không nhận diện được: dừng, không repair/reset/baseline tự động.

Không xóa history, không sửa checksum, không xóa DB đang sử dụng. DB cũ không tự chuyển sang lịch sử đánh số mới; dữ liệu người dùng vẫn được giữ theo hành vi migration cũ. Không bỏ thư mục Legacy khỏi bản đóng gói khi còn DB cũ.

## Cập nhật sau này

Đây là thao tác gộp một lần cho DB mới. Sau khi một file được Flyway áp dụng, không sửa nội dung file đó. Khi thay đổi nghiệp vụ tiếp theo, cần migration mới cho các nhánh lịch sử được hỗ trợ, đồng thời chạy kiểm thử DB mới/DB cũ; không sinh ngược bộ chính từ thư mục Legacy.

Các bản trong `docs/database/design-v2-complete/` là bản xuất để đọc/báo cáo. Chạy `node scripts/build-design-v2-baseline.mjs` để đồng bộ chúng từ bộ chính; `--check` kiểm tra đồng bộ.

Kiểm thử đầy đủ ở thư mục gốc: `powershell -NoProfile -File scripts/verify-design-v2-baseline.ps1 -WithFlyway`. Cần Docker, image SQL Server/Maven và Maven cache đã tải thư viện. Script dùng container riêng, không mở cổng và tự xóa sau khi chạy.
