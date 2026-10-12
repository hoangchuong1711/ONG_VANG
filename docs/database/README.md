# Cơ sở dữ liệu designV1

Nguồn thiết kế là [designV1.md](designV1.md); danh sách ràng buộc và trách nhiệm DB/service nằm ở [designV1-constraint-matrix.md](designV1-constraint-matrix.md). Flyway tạo schema từ `src/backend/src/main/resources/db/designV1/sqlserver/V1__design_v1_baseline.sql` và thêm trigger bảo vệ chính sách đã công bố ở `V2__published_policy_immutability.sql`. Có **19 bảng nghiệp vụ**, thêm `demo_seed_manifest` và `flyway_schema_history` phục vụ vận hành. Không chạy các migration V1–V7 của mô hình cũ trên DB này.

## Khởi động local

Điền mật khẩu riêng vào `.env`; đặt `MSSQL_DATABASE=mini_ong_vang_design_v1`. Sau đó chạy:

```powershell
docker compose up -d --build backend
```

`db-init` chỉ tạo database khi chưa có; ứng dụng chạy Flyway, JPA `validate`, rồi seed nếu `DEMO_SEED=true`. Mỗi thay đổi schema đã áp dụng phải thêm migration V2+; không sửa V1 sau khi đã chạy. Database cũ `mini_ong_vang` được giữ để đối chiếu, không phải nguồn dữ liệu của backend mới. Không dùng `down --volumes` nếu còn muốn giữ dữ liệu local.

Kiểm tra `http://localhost:8081/api/health`: trường `databaseName` phải là `mini_ong_vang_design_v1`. Trong SSMS, kết nối SQL Server ở `localhost,1433` bằng tài khoản local trong `.env`, rồi chọn DB mới.

## Mô hình dữ liệu và transaction

`tai_khoan` chứa tên, số điện thoại, vai trò và trạng thái. `khach_hang` chứa hạng enum cùng khoảng hiệu lực; hạng không còn là bảng riêng. Chính sách giảm giá, biểu phí, phụ thu được giữ theo phiên bản và tham chiếu từ đơn để giá cũ không đổi theo chính sách mới. Tài xế của đơn suy từ `phan_cong_don_hang`, không lưu thêm `don_hang.ma_tx`. Cước gốc và giảm giá ở `cuoc_don_hang`; tổng cước được tính từ cước, phụ thu đã chọn và giảm giá, không lưu một cột tổng dư.

Tạo đơn ghi `don_hang`, `cuoc_don_hang`, `chi_tiet_kien_hang`, `phu_thu_don_hang`, `nhat_ky_don_hang` và `yeu_cau_tao_don` trong cùng transaction. Điều phối khóa đơn/tài xế và dùng unique index có điều kiện để chống hai phân công hoạt động. `PolicyPublicationService` là đường quản trị nội bộ: xác thực `CHU_DOI_XE`, khóa phạm vi bằng SQL Server application lock kể cả khi chưa có policy công bố, kiểm tra chồng hiệu lực và ghi audit cùng transaction. Trigger V2 chặn sửa/xóa nội dung đã công bố; chỉ cho đóng mốc kết thúc tương lai một lần. Luồng này chưa có endpoint công khai. Các bất biến liên bảng như một đơn có đủ kiện, giá đúng phiên bản và trạng thái khớp phân công được kiểm tra thêm bằng `scripts/check-design-v1-invariants.sql`. T14–T15 đã có service/endpoint tiền mặt, VNPay/IPN/Return/query; T16 có lịch sử và T17 có báo cáo/Excel.

## Seed và DB test

Muốn nạp tài khoản demo, đặt `DEMO_SEED=true` và `DEMO_PASSWORD` trong `.env` rồi recreate backend. Seed `DesignV1DemoSeeder` ghi marker `design-v1`, chạy lại không nhân đôi và không ghi đè đơn mới. Fixture hiện có: KH-DEMO-1 (thường), KH-DEMO-2 (VÀNG), TX-DEMO-1/2 (ONLINE và có xe), `demo_dispatcher`, `demo_admin`, một phiên bản cho mỗi loại chính sách. Không có đơn demo dựng sẵn; smoke tạo đơn qua API. Mật khẩu chỉ lưu dạng hash.

DB test là `mini_ong_vang_test` ở cổng 15433, độc lập DB dev. `scripts/reset-test-db.sql` từ chối mọi DB khác và xóa dữ liệu theo thứ tự FK; chỉ trong transaction reset nó tạm tắt ba trigger policy rồi bật lại, không xóa schema hay Flyway history. `SeedCommand test` xác minh URL, tên DB thực và `REQUIRE_TEST_DB=true` trước khi nạp lại fixture. CI chạy `clean verify`, reset/seed, rồi HTTP smoke. Trước smoke tiến trình giao hàng, CI reset/seed lần nữa vì smoke điều phối làm tài xế bận.

```powershell
$env:TEST_DB_URL='jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true'
$env:TEST_DB_USER='sa'
$env:TEST_DB_PASSWORD='<mật khẩu DB test>'
$env:REQUIRE_TEST_DB='true'
docker compose -f docker-compose.ci.yml up --wait db-test
docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test
mvn.cmd -f src/backend/pom.xml clean verify
```

Để reset và seed test sau khi set thêm `DEMO_PASSWORD`, chạy `scripts/reset-test-db.ps1`. Script dừng backend-test trước khi xóa. Không dùng script này cho DB dev. Sau test, chạy `scripts/check-design-v1-invariants.sql` bằng `sqlcmd -b -d mini_ong_vang_test`; script chỉ đọc, trả lỗi khi V2/trigger thiếu, policy chồng hoặc dữ liệu liên bảng sai.

## Giới hạn đang theo dõi

M1 đã chạy các luồng T06–T12 trên schema mới và HTTP smoke đạt. Đã có đường quản trị policy nội bộ, trigger bất biến và truy vấn đối chiếu; vẫn cần rà các ca lỗi/rollback còn thiếu trước khi đóng gate M1. T13–T17 đã có implementation; T18 hiện đồng bộ tài liệu, chưa bổ sung seed đơn/thanh toán. Hồi quy và nghiệm thu M2 chưa được coi là hoàn tất; xem [phạm vi T18](../T18-sandbox-api.md). Trạng thái chi tiết nằm trong [kế hoạch triển khai](designV1-implementation-plan.md).
