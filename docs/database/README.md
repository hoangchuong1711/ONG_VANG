# CSDL, Hibernate và dữ liệu T03

Backend dùng Microsoft SQL Server 2022 Developer, Hibernate 6.6.58.Final, Flyway 12.11.0, HikariCP 7.1.0. Migration là nguồn schema chạy thực tế: `src/backend/src/main/resources/db/sqlserver`. Có 19 bảng nghiệp vụ, bảng `demo_seed_manifest` và lịch sử Flyway.

## Khởi động và migration

```powershell
docker compose up --build backend
```

Listener khởi tạo pool → chạy Flyway → tạo EntityManagerFactory với `hibernate.hbm2ddl.auto=validate` → seed nếu bật → Tomcat phục vụ ứng dụng. Migration/mapping lỗi sẽ làm khởi tạo webapp thất bại. Khi undeploy, listener đóng EMF và pool. `/api/health` vẫn giữ hợp đồng JSON hạ tầng T04.

- V1: 15 bảng từ SQL tham chiếu, bỏ header MySQL và transaction thủ công.
- V2: tài khoản/role, timestamp có timezone, snapshot, assignment, nhiều payment attempt, constraint và index.
- SQL tham chiếu `docs/api/schema-v0.mysql.sql` không phải script khởi tạo. Không chạy DROP DATABASE trong file đó.
- Không dùng Hibernate `update/create`, Flyway clean hoặc baseline tự động để bỏ qua DB đã có bảng thủ công.
- V1 có hồ sơ hợp lệ có thể nâng V2; tên tài khoản được lấy từ hồ sơ, timestamp V1 được hiểu theo Asia/Ho_Chi_Minh. Nếu tài khoản không có nguồn tên hoặc đã có đơn V1, migration dừng và rollback. Cần kế hoạch chuyển đổi lịch sử riêng; không suy ra giá lịch sử từ cấu hình hiện tại.
- Migration đã phát hành lên DB dùng chung phải được giữ nguyên; thay đổi tiếp theo thêm version mới.

## Quyết định dữ liệu

| Vấn đề | Cách triển khai |
| --- | --- |
| ID | String tối đa 36 ký tự; User.maNguoiDung là ma_tk, maKh/maTx/maNv là ID hồ sơ |
| Tên người dùng | tai_khoan.ho_ten dùng cho User; hồ sơ giữ tên giao hàng. T06 cập nhật đồng bộ cùng transaction khi cho sửa hồ sơ |
| Vai trò hồ sơ | Composite FK (ma_tk, vai_tro) và cột role cố định ở hồ sơ ngăn gắn sai role/cross-profile. Không cần trigger |
| Trạng thái | Khóa ở tài khoản; ONLINE/OFFLINE/NGHI ở tài xế; bận từ assignment chưa kết thúc |
| Cước | Snapshot là nguồn chuẩn, gồm số tiền và tên biểu phí/hạng/tỷ lệ; bỏ cột giảm giá trùng ở don_hang. T09 có thể bổ sung tham số chính sách chi tiết bằng migration mới |
| Phụ thu | Số tiền/tên snapshot; chuỗi trạng thái legacy '0' không có vai trò trong phép tính |
| Kiện hàng | Khối lượng bắt buộc >0. API 0.2.0 đã đồng bộ required; giới hạn tối đa nghiệp vụ chờ T01/T09 |
| Thời gian/tiền | Instant/DATETIME2(6) lưu UTC, LocalDate/DATE, BigDecimal/NUMERIC(15,2). API giữ UTC/VND theo conventions |
| Payment | Nhiều attempt, một success và một online pending tối đa/đơn; callback/tất toán cuối cùng thuộc T14–T15 |
| Xóa dữ liệu | Không có API xóa lịch sử. Assignment/payment giữ FK chống xóa đơn/tài xế đã có lịch sử; cascade chỉ dùng ở các quan hệ sở hữu theo ERD |

ERD Page-1 ngoài repo chưa được đối chiếu trực tiếp. [Thiết kế persistence](design.md) và [mapping API](../api/schema-mapping.md) mô tả chính xác phần đã triển khai; các quyết định trên là baseline T03 cho nhóm review.

## Dùng DAO và transaction

Package giữ đúng `com.miniongvang.entity` và `com.miniongvang.DAO`. Entity có trường private/getter/setter và map theo field; quan hệ dùng LAZY. Không serialize Entity trực tiếp; service dựng DTO khi EntityManager còn mở.

```java
TransactionRunner tx = new TransactionRunner(persistence.entityManagerFactory());
tx.run(em -> {
    DonHangDAO orders = new DonHangDAO(em);
    DonHang order = orders.findForUpdate(orderId);
    // Service kiểm tra quyền/precondition và gọi các DAO khác bằng cùng em.
    return null;
});
```

DAO không tự mở EntityManager/commit. Runner flush/commit hoặc rollback và luôn đóng EntityManager; từ chối nested transaction độc lập trên cùng thread. Không mang EntityManager qua thread, không giữ transaction trong lúc gọi route/VNPay.

`DonHangDAO.persistAggregate` lưu đơn/snapshot/kiện/phụ thu/nhật ký trong transaction do caller quản lý, kiểm tra có kiện/snapshot/event và tổng phụ thu. Service T10 còn phải kiểm tra quyền, báo giá, tổng tiền và trạng thái. `findDetails` lấy từng tập con riêng để tránh nhân bản đơn do join nhiều collection. Query tài xế rảnh loại khóa/offline/nghỉ/bận, sắp theo ranh_tu rồi ID.

## Bật seed demo

Trong `.env` cục bộ:

```dotenv
DEMO_SEED=true
DEMO_PASSWORD=<mat-khau-demo-cua-ban>
```

Sau đó rebuild/recreate backend. Seed chạy một transaction, có marker `t03-v1` và ID cố định. Chạy lại không nhân đôi hoặc ghi đè đơn đã sửa; trạng thái cài dở bị báo lỗi. Mật khẩu không được ghi vào SQL/log; chỉ lưu bcrypt. `PasswordHasher` dùng cost 10, giới hạn 72 byte UTF-8; T06 dùng cùng helper để verify. Mặc định seed tắt.

Ngày VIP/tạo đơn lấy theo thời điểm seed. Fixture đơn CHO_GAN ban đầu có tuổi 60 giây; muốn demo hủy trước 300 giây vào lần khác cần môi trường test đã reset. Giá/địa chỉ dưới đây chỉ là fixture demo, chưa thay cấu hình nghiệp vụ/RouteProvider T01/T07–T09.

| Nhóm | ID / login | Ý nghĩa |
| --- | --- | --- |
| Khách | KH-DEMO-1 / 0900000001 | Khách thường |
| VIP | KH-DEMO-2 / 0900000002 | VIP hết hạn sau 30 ngày, giảm mẫu 10% |
| VIP hết hạn | KH-DEMO-3 / 0900000003 | Hết hạn hôm trước |
| Tài xế rảnh | TX-DEMO-1, TX-DEMO-2 / 0800000001, 0800000002 | ONLINE; TX-DEMO-2 rảnh lâu hơn |
| Tài xế bận | TX-DEMO-3..5 / 0800000003..5 | Mỗi người có một assignment hoạt động |
| Tài xế khóa | TX-DEMO-6 / 0800000006 | ONLINE nhưng tài khoản KHOA |
| Tài xế offline/nghỉ | TX-DEMO-7..8 / 0800000007..8 | OFFLINE/NGHI |
| Tổng đài | NV-DEMO-1 / demo_dispatcher | TONG_DAI |
| Chủ đội xe | TK-DEMO-ADMIN / demo_admin | CHU_DOI_XE, không cần hồ sơ nhân viên |

Tổng: 13 tài khoản, 3 khách, 2 hồ sơ VIP, 8 tài xế, 7 xe, 1 điều phối viên, 1 hạng, 2 biểu phí (một hiệu lực, một miễn cước lịch sử đã tắt), 2 phụ thu (bật/tắt), 10 đơn, 10 snapshot, 12 kiện, 1 phụ thu theo đơn, 10 assignment (3 đang hoạt động), 4 payment attempt. Có đủ sáu trạng thái đơn. Mọi tài khoản dùng mật khẩu được cung cấp qua DEMO_PASSWORD.

Đơn mẫu: `DH-DEMO-WAIT`, `DH-DEMO-ASSIGNED`, `DH-DEMO-PICKED`, `DH-DEMO-DELIVERING`, `DH-DEMO-PAID-CASH`, `DH-DEMO-PAID-ONLINE` (thất bại rồi thành công), `DH-DEMO-PENDING`, `DH-DEMO-UNPAID`, `DH-DEMO-FREE`, `DH-DEMO-CANCELLED`. Lịch sử assignment của đơn tiền mặt có tài xế từ chối trước khi gán lại. Đơn miễn cước không có attempt.

## Test và reset

CI chạy DB test trước, Maven verify tiếp theo, cuối cùng mới bật backend-test và HTTP smoke để reset/fixture không chạy đua với webapp. Chạy local theo cùng thứ tự:

```powershell
$env:TEST_DB_URL = 'jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true'
$env:TEST_DB_USER = 'sa'
$env:TEST_DB_PASSWORD = '<mat-khau-test-manh-cua-ban>'
$env:REQUIRE_TEST_DB = 'true'
docker compose -f docker-compose.ci.yml up --wait --wait-timeout 180 db-test
docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test
mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify
docker compose -f docker-compose.ci.yml up --build -d --wait backend-test
$env:API_BASE_URL = 'http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE = 'mini_ong_vang_test'
npm.cmd run smoke --prefix tools/api
```

Integration test xác minh database thực rồi xóa các dòng test theo thứ tự khóa ngoại trước mỗi case và seed bằng Clock cố định. Không chạy đồng thời hai suite lên cùng DB. Thiếu TEST_DB_URL thì test DB skip ở local; CI có REQUIRE_TEST_DB=true sẽ fail.

Reset để demo lại trên DB test đã migrate:

```powershell
$env:DEMO_PASSWORD = '<mat-khau-demo-cua-ban>'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/reset-test-db.ps1
```

Bypass chỉ áp dụng tiến trình chạy script khi PowerShell máy bạn chặn `.ps1`, không thay execution policy toàn máy. Script xác minh env/URL/tên DB thực, dừng riêng backend-test, xóa các dòng trong danh sách bảng test cụ thể trong transaction rồi seed lại. Không xóa lịch sử Flyway, không tắt khóa ngoại, không nhận DB dev. Nếu seed lỗi, sửa nguyên nhân và chạy lại; reset và seed là hai transaction riêng. Chạy lại backend-test sau reset khi cần HTTP.

Dọn môi trường test:

```powershell
docker compose -f docker-compose.ci.yml down --volumes --remove-orphans
```

DB CI dùng tmpfs và cổng 15433; dev dùng volume riêng/cổng 1433. Kết quả thực tế ở [T03-validation](../../tests/database/T03-validation.md). Các API T06–T18 vẫn chưa được triển khai bởi T03.

## SQL Server 2022 và SSMS

File cấu hình cục bộ `.env` cần `MSSQL_DATABASE=mini_ong_vang` và `MSSQL_SA_PASSWORD` riêng đủ mạnh. Nếu đã có `.env`, chỉ thêm hai biến này, không ghi đè các thiết lập khác. `.env.example` không chứa mật khẩu. Compose dùng SQL Server Developer cho phát triển/test, một volume mới `mini_ong_vang_mssqldata`, và service `db-init` tạo database khi chưa tồn tại. Service PostgreSQL cũ/volume cũ không được sử dụng làm volume SQL Server và không bị script migration xóa.

Chạy `docker compose up --build -d backend` (hoặc bỏ `backend` để chạy cả frontend). `db-init` phải kết thúc với mã 0 trước khi backend chạy Flyway. Database mới dùng `Latin1_General_100_BIN2` để phân biệt hoa/thường và dấu, cùng `READ_COMMITTED_SNAPSHOT ON` để đọc dữ liệu đã commit tương tự PostgreSQL. Initializer từ chối database có cấu hình không phù hợp; không tự sửa database đã tồn tại.

SSMS kết nối Database Engine tại **`tcp:127.0.0.1,1433`**, chọn SQL Server Authentication, login `sa`, mật khẩu lấy từ `MSSQL_SA_PASSWORD` trong `.env`; bật Trust server certificate cho chứng chỉ Docker local. Mở Databases → mini_ong_vang → Tables → dbo. SSMS là công cụ quản lý; SQL Server 2022 là hệ quản trị thực sự. Kiểm tra phiên bản bằng `SELECT @@VERSION;`.

Nếu gặp lỗi **1225 / connection refused / timeout** khi dùng `localhost,1433`, thử đúng địa chỉ `tcp:127.0.0.1,1433`: địa chỉ này đã được xác nhận kết nối thành công từ Windows trên máy của nhóm trong khi `localhost` timeout. Xem [hướng dẫn kết nối và xử lý lỗi trong README gốc](../../README.md#kết-nối-database-bằng-ssms) để kiểm tra container, cổng, chứng chỉ và mật khẩu. Không xóa volume để xử lý lỗi kết nối.

Nếu dùng SQL Server 2022 cài sẵn, tạo database với cùng collation và bật READ_COMMITTED_SNAPSHOT trước khi chạy backend. Cấp login quyền cần thiết cho Flyway tạo/alter schema và ứng dụng đọc/ghi dữ liệu. Cấu hình tiến trình backend:

```dotenv
DB_URL=jdbc:sqlserver://localhost:1433;databaseName=mini_ong_vang;encrypt=true;trustServerCertificate=true
DB_USER=<login-SQL-Server>
DB_PASSWORD=<mat-khau-rieng>
```

Với server có chứng chỉ tin cậy, dùng `trustServerCertificate=false`. Nếu backend chạy trong Docker còn SQL Server ở máy host, dùng `host.docker.internal` thay cho `localhost`. Các biến DB_URL/USER/PASSWORD vẫn được backend dùng như trước; Compose gán chúng từ cấu hình SQL Server.

Flyway vẫn quản lý schema, Hibernate chỉ `validate`. Thư mục `db/migration` chứa nguyên bản PostgreSQL V1–V7 để đối chiếu lịch sử/checksum; runtime chỉ đọc `db/sqlserver`. Không sao chép bảng lịch sử Flyway PostgreSQL vào SQL Server, không chạy repair để che checksum khác nhau. Mỗi hệ có lịch sử áp dụng script của chính nó.

Các bản T-SQL có `GO` và placeholder Flyway `[${flyway:defaultSchema}]`. Để kiểm tra trong SSMS trên database thử riêng, thay placeholder này bằng `[dbo]` rồi chạy V1→V7 đúng thứ tự. Khi dùng ứng dụng, để Flyway chạy; không chạy thủ công rồi bật Flyway trên cùng database. `scripts/init-sqlserver.sql` dùng SQLCMD variable `DatabaseName`; nếu chạy riêng trong SSMS cần SQLCMD Mode và `:setvar DatabaseName mini_ong_vang`.

### Ánh xạ và phạm vi schema

Có 20 bảng, gồm 19 bảng nghiệp vụ và marker seed:

`tai_khoan`, `hang_thanh_vien`, `khach_hang`, `khach_hang_vip`, `tai_xe`, `phuong_tien`, `dieu_phoi_vien`, `cau_hinh_cuoc`, `cau_hinh_phu_thu`, `don_hang`, `phu_thu_don_hang`, `chi_tiet_kien_hang`, `nhat_ky_trang_thai`, `thanh_toan`, `danh_gia_chuyen_di`, `snapshot_cuoc_don_hang`, `phan_cong_don_hang`, `demo_seed_manifest`, `bao_gia`, `order_creation_request`.

- ID vẫn là chuỗi theo mô hình gốc, không tự chuyển thành UNIQUEIDENTIFIER hay IDENTITY. Không có sequence/serial trong migration gốc.
- VARCHAR/TEXT → NVARCHAR/NVARCHAR(MAX); literal tiếng Việt dùng tiền tố N. Hibernate bật nationalized character data. Ba entity có cột TEXT được sửa mapping: BaoGia, OrderCreationRequest, DanhGiaChuyenDi.
- BOOLEAN → BIT; NUMERIC giữ precision/scale, DATE giữ nguyên. Instant lưu UTC trong DATETIME2(6), Hibernate bind/read UTC. V2 vẫn diễn giải thời gian V1 theo Asia/Ho_Chi_Minh trước khi đổi UTC; dữ liệu nguồn đã ở V7 phải nhập trực tiếp UTC, không chạy lại phép dịch múi giờ V2 lên dữ liệu đã nhập.
- PK/FK, CHECK, DEFAULT, hành vi CASCADE/SET NULL, các index có điều kiện được chuyển tương ứng. Unique cho thanh_toan.ma_tham_chieu dùng filtered index WHERE IS NOT NULL để vẫn cho nhiều NULL. Không thêm view/procedure/function/trigger nghiệp vụ vì migration nguồn không có các đối tượng đó. Trigger báo lỗi chỉ nằm trong test rollback.
- AuthService nhận diện lỗi trùng bằng mã SQL Server 2601/2627. TaiXeDAO chỉ bổ sung NULLS LAST để giữ thứ tự PostgreSQL khi ranh_tu NULL; Hibernate dịch HQL cho SQL Server. API, validation và thuật toán nghiệp vụ giữ nguyên.

## Chuyển dữ liệu PostgreSQL hiện có

Kiểm kê chỉ đọc trong môi trường local ngày 10/10/2026: database PostgreSQL `mini_ong_vang` đã ở V7, timezone Etc/UTC; tất cả 20 bảng có 0 dòng, không có view/trigger ở public. Vì vậy lần chuyển local này không có bản ghi nghiệp vụ cần sao chép. Điều này không chứng minh database trên máy thành viên khác cũng trống.

Nếu database nguồn có dữ liệu:

1. Chốt thời điểm ngừng ghi, backup PostgreSQL gồm schema, dữ liệu và flyway_schema_history; giữ nguyên nguồn để rollback. Đối chiếu schema thực tế với V1–V7, kể cả đối tượng được tạo ngoài repo.
2. Tạo SQL Server đích trống, chạy Flyway V1–V7, giữ DEMO_SEED=false và chưa cho ứng dụng nhận ghi. Không trộn seed/demo vào dữ liệu thật.
3. Kiểm tra trước khi nhập: chuỗi/ID khác nhau chỉ bởi khoảng trắng cuối có thể đụng unique trong SQL Server; NVARCHAR(n) giới hạn theo UTF-16 nên ký tự ngoài BMP cần kiểm tra độ dài; DATETIME2 không biểu diễn infinity hoặc năm ngoài 0001–9999. Collation sắp xếp Unicode có thể khác locale nguồn. Không tự cắt chuỗi, trim, làm tròn tiền hay thay dữ liệu để bỏ qua lỗi.
4. Dùng công cụ ETL có mapping Unicode/NULL/decimal/UTC, chép nguyên khóa và mọi cột vào đúng bảng. Thứ tự bảng cha trước bảng con: `demo_seed_manifest`, `tai_khoan`, `hang_thanh_vien`, `cau_hinh_cuoc`, `cau_hinh_phu_thu`, `khach_hang`, `tai_xe`, `dieu_phoi_vien`, `phuong_tien`, `khach_hang_vip`, `don_hang`, `phan_cong_don_hang`, `snapshot_cuoc_don_hang`, `phu_thu_don_hang`, `chi_tiet_kien_hang`, `nhat_ky_trang_thai`, `thanh_toan`, `danh_gia_chuyen_di`, `bao_gia`, `order_creation_request`. Giữ FK/CHECK bật và commit toàn bộ sau đối chiếu; lỗi thì rollback đích, không sửa nguồn. Với bảng marker seed, giữ dữ liệu marker gốc. Không nhập lịch sử Flyway PostgreSQL đè lịch sử SQL Server.
5. So sánh từng bảng theo PK: số dòng, giá trị từng cột, NULL, chuỗi Unicode, số thập phân và thời gian UTC đến microsecond; xác nhận FK/CHECK được tin cậy, không bị disable. Chạy lại test trên DB test riêng, kiểm tra các API đọc bằng dữ liệu đích rồi mới chuyển kết nối ứng dụng.
6. Giữ backup và volume PostgreSQL. Nếu cần rollback sau khi SQL Server đã nhận ghi, phải xử lý các ghi mới trước; không chỉ đổi URL rồi bỏ dữ liệu mới.

SQL Server so sánh chuỗi có quy tắc padding khoảng trắng cuối khác PostgreSQL; collation BIN2 không loại bỏ khác biệt này. Không tuyên bố tương đương tuyệt đối với mọi dữ liệu tùy ý khi chưa thực hiện preflight và đối chiếu dữ liệu thật. Tham khảo [quy tắc so sánh của Microsoft](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/string-comparison-assignment?view=sql-server-ver16), [mapping Hibernate](https://docs.jboss.org/hibernate/orm/6.6/javadocs/org/hibernate/cfg/MappingSettings.html) và [module Flyway SQL Server](https://documentation.red-gate.com/flyway/reference/database-driver-reference/sql-server-database).

## Báo cáo thực hiện migration (10/10/2026)

Backend local đã được build và chuyển sang SQL Server 2022 (16.0.4295.3). Health `http://localhost:8081/api/health` trả status=ok, database=connected, databaseName=mini_ong_vang. Database đích đã áp dụng V1–V7, có 20 bảng và 0 dòng nghiệp vụ, khớp nguồn local trống. PostgreSQL cũ `ong_vang-db-1` và volume vẫn được giữ nguyên; không chạy DROP/TRUNCATE/reset trên nguồn. Compose có thể báo container PostgreSQL là orphan; không dùng --remove-orphans trên stack dev nếu còn cần nguồn rollback.

### File thay đổi

Các đường dẫn Java dưới đây tính từ `src/backend/src/`; mỗi thay đổi phục vụ migration:

| File | Mục đích |
| --- | --- |
| `src/backend/pom.xml` | PostgreSQL JDBC → mssql-jdbc 12.10.2.jre11; module Flyway → flyway-sqlserver, giữ Flyway 12.11.0 và mọi dependency không liên quan |
| `main/java/com/miniongvang/config/PersistenceContext.java` | Driver Microsoft, schema dbo, chỉ đọc classpath:db/sqlserver |
| `main/resources/META-INF/persistence.xml` | SQLServerDialect, Unicode, Instant dùng TIMESTAMP với UTC; giữ validate |
| `main/java/com/miniongvang/controller/HealthServlet.java` | Load driver mới; giữ endpoint và cấu trúc response, đổi tên driver trong thông báo lỗi phụ thuộc DB |
| `main/java/com/miniongvang/entity/BaoGia.java`, `OrderCreationRequest.java`, `DanhGiaChuyenDi.java` | Mapping cột TEXT → nvarchar(max) |
| `main/java/com/miniongvang/service/AuthService.java` | Mã lỗi duplicate SQL Server để giữ lỗi tài khoản đã tồn tại |
| `main/java/com/miniongvang/DAO/TaiXeDAO.java` | Giữ NULLS LAST khi sắp xếp tài xế rảnh |
| `main/java/com/miniongvang/seed/SeedCommand.java` | JDBC URL test và DB_NAME(), giữ chặn seed ngoài DB test |
| `test/java/com/miniongvang/auth/AuthServiceIntegrationTest.java` | Kết nối SQL Server và xác minh DB test |
| `test/java/com/miniongvang/quote/QuoteServiceIntegrationTest.java` | Kết nối SQL Server và xác minh DB test |
| `test/java/com/miniongvang/order/OrderServiceIntegrationTest.java` | SQL Server URL/DB_NAME và trigger báo lỗi để kiểm tra rollback |
| `test/java/com/miniongvang/dispatch/DispatchServiceIntegrationTest.java` | Cleanup test theo FK, trigger T-SQL, mã lỗi 51000; ProgressServiceIntegrationTest dùng chung helper này |
| `test/java/com/miniongvang/persistence/PersistenceIntegrationTest.java` | Migration location, cleanup, schema upgrade, Unicode/NULL/UTC round-trip |
| `test/java/com/miniongvang/infrastructure/PostgreSqlIntegrationTest.java` | Kiểm tra Microsoft SQL Server, bảng tạm #, mã duplicate; giữ tên class/method theo yêu cầu |
| `docker-compose.yml` | SQL Server dev với volume mới, initializer và backend connection |
| `docker-compose.ci.yml` | SQL Server test tmpfs/cổng 15433, initializer, backend test |
| `.env.example` | Biến MSSQL_DATABASE/MSSQL_SA_PASSWORD; không có mật khẩu trong template |
| `.env` (local, Git ignore) | Thêm tên DB và mật khẩu SQL Server sinh riêng; giữ nguyên các thiết lập PostgreSQL cũ cho rollback |
| `.github/workflows/ci.yml` | Sinh credential test, chờ SQL Server, chạy initializer có kiểm tra exit code, cleanup fixture bằng sqlcmd |
| `scripts/init-sqlserver.sql` (mới) | Tạo database khi chưa có; collation và READ_COMMITTED_SNAPSHOT; không tạo thêm bảng nghiệp vụ |
| `scripts/reset-test-db.sql` (mới), `scripts/reset-test-db.ps1` | SQL reset dùng chung CI/local, chỉ chấp nhận DB test; giữ FK bật; SET options phù hợp filtered index |
| `README.md`, `docs/database/README.md` | Cách chạy, SSMS, dữ liệu, rollback và báo cáo này |

Bảy file mới tại `src/backend/src/main/resources/db/sqlserver/`: `V1__baseline_erd.sql`, `V2__persistence_contract.sql`, `V3__quotes.sql`, `V4__order_creation.sql`, `V5__dispatch_rejection.sql`, `V6__demo_rejected_assignment.sql`, `V7__delivery_incidents.sql`. V1 tạo baseline tương đương; V2 giữ contract persistence/nâng cấp timezone; V3 báo giá; V4 idempotency tạo đơn; V5 từ chối gán; V6 chỉ sửa đúng fixture cũ nếu tồn tại; V7 ràng buộc sự cố. Bảy file PostgreSQL gốc giữ nguyên byte nội dung; không thay checksum lịch sử nguồn. DemoSeeder giữ nguyên, không thêm fixture.

### Kết quả kiểm tra thực tế

- Maven verify trong Java 21 container: **103 tests, 0 failures, 0 errors, 0 skipped**, BUILD SUCCESS; WAR được đóng gói thành công.
- Chạy riêng 17 persistence tests với `-Duser.timezone=Asia/Ho_Chi_Minh`: 0 failures/errors/skipped, BUILD SUCCESS. JDBC đọc DATETIME2 trong test nâng cấp dùng Calendar UTC rõ ràng để không lệch theo timezone máy host. Log: `src/backend/target/sqlserver-timezone-test.log`.
- 7 migration chạy thành công trên SQL Server 2022; chạy lại không áp dụng thừa. Test nâng V1→V7 giữ hồ sơ và đổi 10:00 giờ Việt Nam thành 03:00 UTC.
- Đối chiếu metadata nguồn/đích: **20 bảng, 151 cột**, không lệch tên cột/nullable/độ dài chuỗi/precision/scale theo mapping đã mô tả. Cả hai có **20 PK, 28 FK, 38 CHECK, 52 index, 39 unique index**. Số UQ object giảm từ 15 xuống 14 vì unique nullable ma_tham_chieu được biểu diễn bằng filtered unique index tương đương về NULL.
- Test gồm seed chạy lại, Unicode tiếng Việt/emoji và chuỗi >4.000 ký tự, nhiều NULL ở cột unique, thời gian UTC microsecond, decimal, FK/CHECK, CRUD, transaction rollback, lock/concurrency, auth, báo giá, tạo đơn, điều phối, từ chối, hoàn tất/sự cố.
- HTTP test trên database test riêng: health/spec/Swagger đạt; tạo đơn **24**, điều phối **89**, tiến trình **94** kiểm tra đạt (**207** kiểm tra nghiệp vụ HTTP).
- OpenAPI: **29 operations, 12 UCs, 287 examples** hợp lệ. Swagger/CSRF JavaScript: **2 tests đạt**.
- `npm run check --prefix tools/api` trên Windows dừng ở so sánh Postman do CRLF khác LF. Đã sinh artifact vào thư mục target riêng và đối chiếu: cả collection lẫn environment khớp hoàn toàn khi chuẩn hóa xuống dòng; các file API/Postman gốc không thay đổi. Không ghi nhận lệnh này là PASS nguyên trạng trên Windows.
- Hai Compose config hợp lệ; đã chạy thật các lệnh chờ DB, initializer, startup backend. Script reset test đã chạy thành công bằng sqlcmd; SeedCommand chạy thành công. PowerShell reset script đã kiểm tra cú pháp; wrapper đầy đủ chưa chạy vì máy host không cài Maven.
- Log và báo cáo JUnit cục bộ: `src/backend/target/sqlserver-verify.log`, `src/backend/target/surefire-reports/`; đối chiếu metadata: `src/backend/target/schema-comparison.json`. File target bị Git ignore; credential test cũng chỉ nằm ở target, không commit.

### Phần chưa xác minh / phạm vi giữ nguyên

Chưa thao tác GUI SSMS và chưa chạy workflow trên GitHub Actions. Chưa di chuyển một database có dữ liệu thật khác máy này: nguồn local trống, nên không có bằng chứng về dữ liệu của các thành viên khác. Những khác biệt collation/chuỗi/ngày nằm ngoài tập dữ liệu test cần preflight như hướng dẫn trên trước khi chuyển nguồn có dữ liệu.

Không sửa frontend, endpoint, HTTP method, request/response schema, business logic, validation hay cơ chế xác thực/phân quyền. Không đổi tên class/method/entity/bảng/cột. Không nâng framework hoặc dependency không liên quan; không commit/push/merge. Các fixture chỉ được tạo trong database test tách biệt; database local mini_ong_vang vẫn trống.
