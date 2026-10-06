# CSDL, Hibernate và dữ liệu T03

Backend dùng PostgreSQL 17, Hibernate 6.6.58.Final, Flyway 12.11.0, HikariCP 7.1.0. Migration là nguồn schema chạy thực tế: `src/backend/src/main/resources/db/migration`. Có 17 bảng nghiệp vụ, bảng `demo_seed_manifest` và lịch sử Flyway.

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
| Thời gian/tiền | Instant/timestamptz, LocalDate/DATE, BigDecimal/NUMERIC(15,2). API giữ UTC/VND theo conventions |
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
docker compose -f docker-compose.ci.yml up -d --wait db-test
$env:TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:15433/mini_ong_vang_test'
$env:TEST_DB_USER = 'mini_ong_vang_test'
$env:TEST_DB_PASSWORD = 'ci-only-password'
$env:REQUIRE_TEST_DB = 'true'
mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify
docker compose -f docker-compose.ci.yml up --build -d --wait backend-test
$env:API_BASE_URL = 'http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE = 'mini_ong_vang_test'
npm.cmd run smoke --prefix tools/api
```

Integration test xác minh database thực rồi truncate các bảng ứng dụng trước mỗi case và seed bằng Clock cố định. Không chạy đồng thời hai suite lên cùng DB. Thiếu TEST_DB_URL thì test DB skip ở local; CI có REQUIRE_TEST_DB=true sẽ fail.

Reset để demo lại trên DB test đã migrate:

```powershell
$env:DEMO_PASSWORD = '<mat-khau-demo-cua-ban>'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/reset-test-db.ps1
```

Bypass chỉ áp dụng tiến trình chạy script khi PowerShell máy bạn chặn `.ps1`, không thay execution policy toàn máy. Script xác minh env/URL/tên DB thực, dừng riêng backend-test, truncate danh sách bảng cụ thể trong transaction rồi seed lại. Không xóa lịch sử Flyway, không dùng TRUNCATE CASCADE, không nhận DB dev. Nếu seed lỗi, sửa nguyên nhân và chạy lại; reset và seed là hai transaction riêng. Chạy lại backend-test sau reset khi cần HTTP.

Dọn môi trường test:

```powershell
docker compose -f docker-compose.ci.yml down --volumes --remove-orphans
```

DB CI dùng tmpfs và cổng 15433; dev dùng volume riêng/cổng 5433. Kết quả thực tế ở [T03-validation](../../tests/database/T03-validation.md). Các API T06–T18 vẫn chưa được triển khai bởi T03.
