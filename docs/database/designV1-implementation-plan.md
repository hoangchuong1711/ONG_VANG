# Kế hoạch chuyển dự án sang mô hình dữ liệu designV1

Ngày lập: 10/10/2026. Cập nhật triển khai: 11/10/2026. Trạng thái: **đang triển khai; M1 đã chạy được trên database đích, còn rà tài liệu và độ phủ kiểm thử. M2 (T13–T20) chưa thực hiện**.

Nguồn thiết kế: [designV1.md](designV1.md). Database SQL Server riêng `mini_ong_vang_design_v1` đã được tạo và áp dụng Flyway V1; database cũ `mini_ong_vang` chưa bị xóa.

## 1. Mục tiêu và phạm vi

Chuyển mô hình dữ liệu của dự án từ schema cũ đang chạy trên SQL Server sang designV1, đồng bộ cả persistence, nghiệp vụ, API, fixture, kiểm thử và tài liệu.

- Giữ nền Java Servlet, Hibernate/JPA, SQL Server và Next.js; không làm lại việc chuyển hệ quản trị.
- Dùng `XacNhanThanhToanDonHang` / `xac_nhan_thanh_toan_don_hang` làm tên đích. Không tạo thêm bảng `tat_toan_don_hang`.
- Đích gồm 19 bảng trong designV1. Bảng lịch sử Flyway và marker seed là bảng kỹ thuật bổ sung, không tính vào 19 bảng.
- Không tiếp tục mang cột/bảng cũ sang chỉ để tránh sửa code. Những hành vi còn đúng như replay tạo đơn, kiểm tra quyền, rollback và chống gán trùng phải được bảo toàn.
- Có thể xóa tài liệu, entity và migration cũ sau khi phần thay thế cùng các tham chiếu đã hoàn chỉnh. Quyền xóa file không được hiểu là đã chọn bỏ dữ liệu trên mọi máy hoặc xóa volume.
- Việc triển khai chuyển DB đã bắt đầu theo kế hoạch; trạng thái từng bước được cập nhật ở cuối tài liệu. Chỉ chuyển ứng dụng sang schema mới sau khi entity/service/seed được đồng bộ.

### Hai mốc hoàn thành riêng

| Mốc | Phạm vi | Điều kiện |
| --- | --- | --- |
| M1 — Hoàn thành chuyển đổi phần đang có | Schema đủ 19 bảng, mapping/DAO, fixture; T06–T12 chạy trên mô hình mới; API/tài liệu/CI tương ứng đã cập nhật | DB mới khởi tạo được; kiểm thử bắt buộc không skip; HTTP tạo đơn → gán → giao → hoàn tất chạy được |
| M2 — Hoàn thành nghiệp vụ còn lại | T13–T20: hủy, tiền mặt, VNPay, lịch sử, báo cáo, tích hợp và nghiệm thu BE | Toàn bộ phạm vi 12 UC có kiểm thử và bằng chứng thực thi |

**Không đánh dấu T14/T15 hoàn thành chỉ vì đã tạo bảng thanh toán.** M1 phải có persistence và kiểm thử ràng buộc của các bảng này, nhưng chưa yêu cầu endpoint thanh toán thực tế. Các rule của luồng chưa triển khai được ghi rõ là chờ M2.

## 2. Hiện trạng đã xác minh trong repository

| Thành phần | Hiện trạng | Tác động |
| --- | --- | --- |
| `src/backend/pom.xml` | Đã có JDBC Microsoft và `flyway-sqlserver` | Giữ nền tảng; không nâng dependency ngoài nhu cầu chuyển schema |
| `config/PersistenceContext.java` | Flyway chạy `classpath:db/sqlserver`, schema `dbo`, trước khi mở JPA | Phải thay tuyến migration nếu chọn baseline mới |
| `META-INF/persistence.xml` | SQLServerDialect, Unicode, UTC, `hbm2ddl.auto=validate`; danh sách class vẫn cũ | Thay đăng ký entity, giữ validate |
| `db/sqlserver/V1` đến `V7` | Là bản SQL Server của mô hình cũ | Không phải DDL của designV1 |
| `db/migration/V1` đến `V7` | Migration PostgreSQL cũ vẫn nằm trong resources | Có thể bỏ khỏi bản build mới sau khi chọn chiến lược và rà tham chiếu |
| Auth/tổng đài | `AuthService.User` còn `maNv`; truy vấn `DieuPhoiVien`; `OrderService` yêu cầu hồ sơ tổng đài | Thay bằng tài khoản và role, cập nhật DTO/session/test |
| Thành viên | `KhachHangVip`, `HangThanhVien`, `findWithVip`, `MembershipPolicyService` dùng mô hình cũ | Gộp vào khách, thêm enum và chính sách phiên bản |
| Cước/đơn | `SnapshotCuocDonHang`, phụ thu snapshot; đơn còn association tài xế/điều phối/biểu phí cũ | Thay nguồn dữ liệu, không chỉ đổi tên bảng |
| Điều phối | `DispatchDAO` có fallback đọc `DonHang.taiXe`; `completedBy` suy ra từ timestamp bằng nhau và `tuChoi=false` | Loại fallback, dùng phân công và `AssignmentOutcome` |
| Báo giá | `QuoteService` có lựa chọn biểu phí bằng `findFirst`; chính sách hiện tại theo ngày | Chọn duy nhất theo thời điểm và khoảng km, phát hiện cấu hình chồng lấn |
| Reset/fixture | SQL và helper test xóa theo FK cũ; `DemoSeeder` tạo dữ liệu cũ | Viết lại theo schema mới, cùng lúc với persistence |
| API/tooling | OpenAPI nằm ở `src/backend/src/main/webapp/openapi.json`; có công cụ sinh Postman và HTTP smoke | Cập nhật nguồn OpenAPI rồi sinh lại artifact |
| CI | Đã chạy SQL Server test riêng, Maven, seed rồi HTTP smoke | Giữ thứ tự cô lập; thay migration/fixture/expectation |
| Tài liệu | `design.md`, README DB, T03–T12 còn mô tả cũ; `project_brief.md` T19 còn ghi PostgreSQL | Cần một nguồn thiết kế duy nhất và hướng dẫn SQL Server nhất quán |
| Frontend | File được theo dõi hiện chủ yếu là skeleton Next.js | Rà consumer thực tế trước khi sửa; không mở rộng thành xây FE trong đợt đổi DB |

Đường dẫn Java trong bảng trên nằm dưới `src/backend/src/main/java/com/miniongvang/`; resources dưới `src/backend/src/main/resources/`.

## 3. Việc phải chốt trước khi viết DDL

### P00 — Làm rõ và đóng phiên bản thiết kế

**Trạng thái:** hoàn tất phần chốt tên thanh toán và tạo ma trận thực thi; các bất biến còn thiếu được làm rõ trước khi hoàn thiện DDL.

**Đầu vào:** designV1 và phạm vi 12 UC hiện tại. **Phụ thuộc:** không.

- [x] Sửa tên cũ ở R19/R20 và phần đối chiếu schema trong designV1: `tat_toan_don_hang` → `xac_nhan_thanh_toan_don_hang`. Giữ mã rule ST01–ST03 để không mất truy vết; từ “tất toán” trong diễn giải có thể đổi thành “xác nhận đã thanh toán đủ”.
- [ ] Bổ sung ma trận trạng thái đơn ↔ phân công: CHO_GAN không có phân công hoạt động/hoàn tất; DA_GAN/DA_LAY_HANG/DANG_GIAO có đúng một phân công hoạt động; HOAN_TAT có đúng một phân công HOAN_TAT và không còn hoạt động; DA_HUY không có hoạt động/hoàn tất.
- [ ] Chốt cho cả ba loại chính sách: mốc kết thúc NULL hoặc lớn hơn bắt đầu; bản công bố bất biến về nội dung; không sửa hồi tố khoảng hiệu lực. Viết rõ quy tắc công bố bản bắt đầu trong quá khứ để tránh tạo chồng lấn với lịch sử.
- [ ] Chốt actor cho các thao tác quản trị hồ sơ/phương tiện/chính sách và nơi gọi audit. Không tự thêm bộ CRUD công khai nếu chưa có UC; có thể dùng thao tác quản trị nội bộ được kiểm soát.
- [ ] Chốt cách kiểm tra role/profile mà không đưa lại cột `vai_tro` dư vào hồ sơ. FK chỉ kiểm tra tài khoản tồn tại; service phải tạo account + profile cùng transaction và chặn đổi role. Kiểm thử bằng truy vấn kiểm tra tính nhất quán; nếu môn học cần bảo vệ cả thao tác SQL trực tiếp thì bổ sung cơ chế DB riêng, ghi rõ phạm vi.
- [ ] Chốt cách bắt lỗi hai request cùng công bố chính sách, cùng gán hoặc cùng nhận thanh toán: thứ tự khóa, tái kiểm tra sau chờ và ánh xạ lỗi xung đột sang API.
- [ ] Chốt giới hạn nghiệp vụ còn chưa rõ như trọng lượng kiện; không tự coi sức chứa của DECIMAL là giới hạn vận hành hợp lý. Nếu chưa đặt giới hạn nghiệp vụ, ghi rõ chỉ kiểm tra miền dữ liệu của designV1.
- [ ] Ghi trạng thái cho mọi rule: DB cưỡng chế / service cưỡng chế / kiểm tra đối chiếu; gắn test và mốc M1 hoặc M2. Không tuyên bố “đủ FK là đủ nghiệp vụ”.

**Đầu ra dự kiến:** designV1 thống nhất tên và bất biến; ma trận thực thi rule trong `docs/database/designV1-constraint-matrix.md`.

**Hoàn thành khi:** không có hai tên bảng cho cùng một thực thể; mọi rule có nơi thực thi và điều kiện kiểm thử; bất kỳ quyết định bổ sung nào thay đổi nghiệp vụ được ghi vào designV1 trước code.

## 4. Chiến lược migration và dữ liệu

### P01 — Chọn cách chuyển schema

**Đã chọn:** tạo database SQL Server mới `mini_ong_vang_design_v1` theo designV1 và nạp fixture mới. Đây là thay đổi cấu trúc lớn, dự án còn ở giai đoạn đồ án và không có yêu cầu giữ schema cũ. Không nên chạy V1–V7 cũ rồi tháo gần hết cấu trúc chỉ để tạo DB mới.

Tuy nhiên, báo cáo trước ghi DB local trống không đủ để kết luận DB hiện tại hoặc DB của thành viên khác cũng trống. Khi bắt đầu triển khai:

1. Kiểm kê chỉ đọc tên database, server, migration version, số dòng và các nguồn ghi; phân biệt dev, test và máy thành viên.
2. Lưu mốc Git/commit của code cũ; bảo đảm `designV1.md` được đưa vào phiên bản bàn giao vì hiện là file chưa được theo dõi. Không dùng thao tác reset để “dọn” thay đổi của người khác.
3. Ghi quyết định dữ liệu: **tạo mới + seed** hoặc **phải chuyển dữ liệu cũ**. Đây là điều kiện trước thao tác loại bỏ DB, không chặn việc viết DDL/mapping trên môi trường mới.
4. Tạo DB dev đích riêng, `mini_ong_vang_design_v1`; database cũ được giữ tạm để đối chiếu/rollback, không xóa volume trong gói này. Dùng database test riêng với whitelist trong script/test, không tái sử dụng dev làm test.
5. Chạy migration mới ở đích; giữ DB cũ để đối chiếu/rollback đến khi M1 đạt. Không tự chạy `DROP DATABASE`, xóa volume hay `down --volumes` trên stack dev.

### Tuyến migration đề xuất

Tạo thư mục migration mới riêng, không trộn với `db/sqlserver` cũ. Baseline hiện được soạn tại `src/backend/src/main/resources/db/designV1/sqlserver/`; sau khi mapping/entity được thay đồng bộ, cập nhật `PersistenceContext` để chỉ trỏ tuyến mới trên DB đích:

| File dự kiến | Nội dung |
| --- | --- |
| `V1__design_v1_baseline.sql` | Baseline gộp: 19 bảng, marker seeder, PK/FK/CHECK/UQ/index; chỉ chạy một lần trên database mới |

Tên file là tuyến riêng, không phải yêu cầu đổi nội dung V1–V7 đã chạy. Migration mới chỉ được dùng với DB rỗng và lịch sử Flyway mới. Không trỏ vào DB V7 rồi gọi `repair`, xóa history hoặc baseline tự động để ép chạy.

Sau khi M1 đạt và không còn consumer dùng tuyến cũ, có thể xóa hai thư mục migration cũ khỏi nhánh hiện hành; bản trước vẫn truy xuất bằng Git. Nếu còn môi trường cần nâng cấp tại chỗ, giữ tuyến SQL Server V1–V7 và lập nhánh migration tiến tới V8+ riêng; không trộn hai chiến lược vào cùng runtime.

### Nếu phải giữ dữ liệu cũ

Lập phụ lục chuyển dữ liệu riêng trước cutover, không tự suy đoán để lấp dữ liệu thiếu:

- Họ tên/SĐT trùng giữa tài khoản và hồ sơ: lập danh sách lệch và quy tắc chọn nguồn.
- Hạng VIP → enum và thời hạn; không tạo tỷ lệ lịch sử từ cấu hình hiện tại. Mỗi tổ hợp chính sách lịch sử được phục dựng phải có bằng chứng đủ và quy tắc phiên bản.
- `ma_nv` → `ma_tk_tao`: join hồ sơ tổng đài; với đơn khách tự tạo dùng chủ đơn khi bằng chứng xác định đúng. Trường hợp không xác định người tạo phải được xử lý riêng.
- Không suy ra HOAN_TAT chỉ vì timestamp trùng. Dùng trạng thái đơn, lịch sử phân công và sự kiện; đưa trường hợp mâu thuẫn ra danh sách đối chiếu.
- Số thứ tự kiện/sự kiện cần quy tắc ổn định; cùng timestamp không chứng minh được thứ tự thực tế. Không bịa thứ tự lịch sử đã mất.
- `nguon_lo_trinh`, thời gian dự kiến, giấy phép, thời hạn GPLX, xe hoạt động có thể thiếu ở dữ liệu cũ; không gán mặc định giả như thể đã được xác minh.
- Giao dịch thành công cũ chỉ được tạo xác nhận thanh toán nếu thuộc đúng đơn HOAN_TAT và khớp cước; khoản sai/thiếu bằng chứng giữ để đối soát.
- Cache báo giá và chống lặp có thể chờ hết hạn trước cutover; không bỏ replay còn hiệu lực trong khi API vẫn nhận retry. Dừng ghi hoặc có phương án đọc phiên bản cũ được kiểm thử.
- Đối chiếu số dòng theo nhóm, khóa, tiền, UTC và dữ liệu loại trừ; không nhập lịch sử Flyway cũ vào baseline mới.

**Hoàn thành P01:** DB mới `mini_ong_vang_design_v1` đã tạo, không nhập dữ liệu cũ; Flyway chạy tuyến riêng; DB cũ/volume chưa bị xóa.

## 5. Thứ tự triển khai chi tiết

Các mã Pxx là công việc của đợt chuyển đổi, không thay tên T01–T20. Mỗi gói gồm code, test và tài liệu liên quan; không để toàn bộ test đến cuối.

### P02 — DDL SQL Server và ràng buộc vật lý

**Phụ thuộc:** P00, chiến lược P01. **Liên quan:** T01/T03.

- [x] Tạo đủ 19 bảng theo thứ tự FK hợp lệ; marker seeder được giải thích là bảng kỹ thuật.
- [x] Dùng chuỗi ID tối đa 36 ký tự theo designV1, không chuyển sang UNIQUEIDENTIFIER. Dùng binary collation cho ID/enum/hash và CHECK chống ID rỗng/khoảng trắng cuối.
- [x] Ánh xạ Unicode → NVARCHAR; Document → NVARCHAR(MAX) + kiểm tra JSON; tiền → DECIMAL(15,2); phần trăm → DECIMAL(5,2); khoảng cách/khối lượng → DECIMAL(10,2); Boolean → BIT; Date → DATE.
- [x] Dùng DATETIME2(3) theo designV1; đồng bộ Clock/serialization/JDBC và test biên TTL vẫn thuộc P03–P08.
- [x] Tạo CHECK enum, chuỗi bắt buộc, miền tiền nguyên đồng, bộ trạng thái/mốc thời gian và điều kiện NULL trong phạm vi một hàng; không dùng ordinal enum.
- [x] Tạo FK/UQ; số 26 trong designV1 là quan hệ logic, không bắt buộc bằng số object FK vật lý sau khi thêm cặp ST01.
- [x] ST01: unique `(ma_don, ma_giao_dich)` trên `thanh_toan`, FK ghép và unique riêng `ma_giao_dich` ở bảng xác nhận.
- [x] Tạo unique có điều kiện cho SĐT, mã giao dịch đối tác, assignment hoạt động/hoàn tất/từ chối lặp và payment pending riêng từng trạng thái.
- [x] Predicate index theo cú pháp SQL Server; không dùng cú pháp PostgreSQL hoặc `IN` trong filtered index.
- [x] Không giới hạn mọi payment thành công theo đơn; chỉ một khoản được xác nhận đầy đủ qua bảng riêng.
- [x] FK dùng hành vi chặn xóa mặc định; không cascade xóa lịch sử.
- [x] Tạo index phục vụ các truy vấn được nêu trong designV1, không index mọi cột.
- [x] Chạy migration trên DB test mới, chạy lại không phát sinh thay đổi; kiểm tra metadata FK/CHECK được bật và đáng tin cậy. Hibernate validate và test constraint đều đã chạy.

**Trạng thái:** DDL đã áp dụng trên DB đích và test; 19 bảng nghiệp vụ, 26 FK, 117 CHECK; các FK/CHECK bật và trusted. Flyway chạy lại không thêm migration, JPA validate đạt.

### P03 — Entity, DAO nền và khởi động persistence

**Phụ thuộc:** P02. P02–P04 nên tích hợp thành một đợt nền trên nhánh triển khai; không triển khai app khi schema và mapping lệch nhau.

| Hiện tại | Đích / hành động |
| --- | --- |
| `TaiKhoan`, `KhachHang`, `TaiXe`, `PhuongTien` | Sửa đúng cột designV1; tên/SĐT chỉ ở account; thêm thành viên/GPLX/xe hoạt động |
| `HangThanhVien`, `KhachHangVip`, `HangThanhVienDAO` | Loại bỏ sau khi consumer được thay; thêm `MembershipTier`, `ChinhSachThanhVien` và DAO chính sách |
| `DieuPhoiVien` | Loại bỏ; actor tổng đài là `TaiKhoan` |
| `CauHinhCuoc`, `CauHinhPhuThu` | Đổi class sang `BieuPhi`, `ChinhSachPhuThu`; bảng theo designV1; hiệu lực theo Moment |
| `SnapshotCuocDonHang` | Thay bằng `CuocDonHang`; FK chính sách, cước gốc, tiền giảm; bỏ tổng/tên/tỷ lệ lặp |
| `PhuThuDonHang`, `PhuThuDonHangId` | Giữ khóa ghép, chỉ hai FK; sửa equals/hashCode và mapping khóa |
| `ChiTietKienHang` | Đổi thành `KienHang`; bổ sung `thu_tu` |
| `PhanCongDonHang` | Actor account; kết quả enum; bỏ boolean `tuChoi` |
| `NhatKyTrangThai` | Thay bằng `SuKienDonHang`: thứ tự, loại, trạng thái trước/sau, actor FK |
| `ThanhToan`, `PaymentStatus` cũ | Thay bằng `LanThanhToan` và enum đích thống nhất package `entity.enums` |
| Chưa có | Thêm `XacNhanThanhToanDonHang`, `SuKienThanhToan`, `NhatKyKiemToan` |
| `BaoGia` | Đúng FK khách/biểu phí, JSON có phiên bản, TTL |
| `OrderCreationRequest`, DAO tương ứng | Đổi thành `YeuCauTaoDon` và DAO tương ứng; giữ semantics replay |
| `DanhGiaChuyenDi` | Xóa khỏi mapping/code/fixture vì không thuộc phạm vi |

- [ ] Cập nhật toàn bộ `<class>` trong `persistence.xml`; không để cả entity cũ và mới map cùng bảng.
- [ ] Quy định shared PK cho cước theo đơn; composite key phụ thu; quan hệ LAZY; hạn chế cascade/orphanRemoval để không xóa lịch sử khi sửa collection.
- [ ] Không thêm getter/setter trạng thái tùy tiện để service bỏ qua bất biến; phương thức chuyển trạng thái có điều kiện rõ.
- [ ] DAO dùng EntityManager của caller; giữ `TransactionRunner` làm chủ transaction. Không tạo EntityManager hoặc commit độc lập trong DAO.
- [ ] Giữ DTO tách entity, materialize dữ liệu cần thiết trước khi đóng EntityManager.
- [ ] Khi xóa/đổi class, sửa toàn bộ import, JPQL dùng tên class và field, seed, test, servlet. Nếu chưa sửa xong consumer, chưa coi commit nền là có thể phát hành.

**Gate:** clean compile; boot JPA validate trên schema mới; test lưu/đọc đủ 19 entity, enum, decimal, Unicode, NULL, khóa ghép và UTC.

### P04 — Fixture, reset, bootstrap test

**Phụ thuộc:** P02/P03.

- [ ] Viết lại `DemoSeeder`, đổi marker từ mô hình T03 cũ sang marker designV1. Seed hai lần không nhân đôi; gặp dữ liệu dở dang phải báo lỗi, không tự ghi đè.
- [ ] Fixture có đủ vai trò, hạng/hạn, xe hoạt động/GPLX, chính sách cũ/mới không chồng, đủ trạng thái đơn, lịch sử từ chối, sự cố, payment và xác nhận hợp lệ.
- [ ] Mỗi đơn fixture phải có cước, ít nhất một kiện và sự kiện TAO_DON; đơn tiến trình có phân công khớp. Không seed trạng thái cuối mà thiếu lịch sử cần thiết.
- [ ] Dùng Clock cố định cho test; demo giờ thực dùng mốc tương đối. Tách scenario khỏi assumption “đơn seed vẫn hủy được sau nhiều giờ”.
- [ ] Sửa `scripts/reset-test-db.sql`, `.ps1`, `SeedCommand` và các helper cleanup của integration test cùng lúc. Xóa con trước cha, giữ FK bật và whitelist DB test.
- [ ] Không cho backend nhận HTTP trong khi suite DB đang reset fixture. Test chạy nối tiếp hoặc tách DB riêng cho từng suite.
- [ ] Tách scenario sai phục vụ test khỏi bộ demo hợp lệ; không nạp dữ liệu vi phạm rồi tắt constraint để chạy ứng dụng.

**Gate:** reset → migrate → seed → seed lại → test có kết quả ổn định; guard từ chối reset ngoài DB test.

### P05 — Auth, tài khoản và thành viên

**Phụ thuộc:** P03/P04. **Liên quan:** T06/T08.

- [ ] `AuthService.register`: account và khách THUONG cùng transaction; tên/SĐT không lặp ở hồ sơ; unique đã chuẩn hóa xử lý được race đăng ký.
- [x] `AuthService.current` và `User`: bỏ `maNv`; tổng đài xác định bằng `maNguoiDung` + role. Giữ `maKh`/`maTx` theo thiết kế.
- [ ] Rà `ApiSecurityFilter`, servlet và session: không còn kiểm tra hồ sơ điều phối; kiểm tra account đang hoạt động và actor lấy từ session. Session cũ phải bị hết hiệu lực tại cutover hoặc có cơ chế chuyển tương thích được test.
- [ ] `MembershipPolicyService`, `KhachHangDAO`, DTO giảm giá: đọc hạng/thời hạn ở khách và chính sách phiên bản có hiệu lực; THUONG/hết hạn/thiếu policy giảm 0; không tích điểm.
- [ ] Test 0%, 100%, trước/đúng/sau thời hạn; trùng policy là lỗi dữ liệu, không chọn một bản tùy ý. Kiểm tra username giữ nguyên khi thay SĐT liên hệ nếu có luồng cập nhật.

**Gate:** Auth integration và membership unit/integration đạt; không còn phụ thuộc `DieuPhoiVien`, `KhachHangVip`, `HangThanhVien`.

### P06 — Chính sách giá và báo giá

**Phụ thuộc:** P05. **Liên quan:** T07/T09.

- [ ] DAO biểu phí/phụ thu dùng mốc Instant; chọn đúng một biểu phí khớp thời điểm + km. Không có bản → lỗi cấu hình; nhiều bản → lỗi cấu hình, không `findFirst` để che dữ liệu sai.
- [ ] `FareCalculator` giữ HALF_UP nguyên đồng, giảm trên cước gốc + phụ thu, kiểm tra tràn/âm; `km_toi_thieu` chỉ là điều kiện phạm vi.
- [x] Luồng công bố/đóng policy kiểm tra overlap trong transaction có application lock theo phạm vi kể cả khi chưa có bản nào; test hai request công bố đồng thời. Trigger V2 chặn sửa/xóa nội dung đã công bố.
- [ ] `QuoteService` lưu payload có version, đúng FK, TTL 300 giây; kết quả chứa phiên bản policy cần so khớp.
- [ ] Giữ `RouteProvider`, Fake/Goong và lỗi lộ trình hiện có nếu không phụ thuộc schema. Bổ sung truyền nguồn và thời gian dự kiến vào dữ liệu đơn.
- [ ] Test giá đổi, phụ thu đổi, hạng hết hạn sau báo giá; không áp giá mới âm thầm khi tạo đơn.

**Gate:** unit tính tiền và quote integration đạt; policy đã công bố không bị sửa làm đổi lịch sử.

### P07 — Tạo đơn, cước và chống tạo lặp

**Phụ thuộc:** P05/P06. **Liên quan:** T10.

- [ ] Sửa `OrderService`/`DonHangDAO.persistAggregate`: account tạo, khách, route, kiện có thứ tự, `CuocDonHang`, liên kết policy phụ thu, sự kiện thứ tự 1 và `YeuCauTaoDon` cùng transaction.
- [ ] Bỏ ghi `don_hang.ma_tx`, `ma_nv`, biểu phí trực tiếp ở đơn, snapshot tên/tỷ lệ/tổng và số tiền phụ thu ở bảng nối.
- [ ] Nguồn `tongCuoc` thống nhất: cước gốc + tổng phiên bản phụ thu đã gắn − tiền giảm. Dùng cùng assembler/query helper ở tạo/đọc/điều phối; không sao chép công thức thành nhiều biến thể.
- [ ] Replay trả response gốc trước gọi bản đồ; kiểm tra lại key sau khóa actor; payload khác trả conflict; key hết 24 giờ mới được tái sử dụng theo designV1.
- [ ] Kiểm tra TTL báo giá bằng giờ sau khi chờ khóa. So giá/phiên bản hiện tại với quote; mọi thay đổi có ý nghĩa trả QUOTE_CHANGED.
- [ ] Version payload cache và cập nhật DTO; cùng quote + key khác nhau vẫn tạo được hai ý định riêng.
- [ ] Test rollback ở giữa quá trình ghi; không được còn đơn thiếu kiện/cước/event hoặc thiếu cache sau commit. Test đồng thời cùng key và replay sau khi đơn đổi trạng thái.

**Gate:** `OrderServiceIntegrationTest` và `tools/api/order-smoke.mjs` đạt trên schema mới.

### P08 — Điều phối, quyền tài xế, tiến trình và sự cố

**Phụ thuộc:** P07. **Liên quan:** T11/T12.

- [ ] Sửa `DispatchDAO`, `TaiXeDAO`, `PhanCongDonHangDAO`, `DispatchService`: nguồn bận duy nhất là phân công chưa kết thúc; bỏ fallback `DonHang.taiXe`.
- [ ] Gợi ý và thao tác gán dùng cùng điều kiện: account hoạt động, ONLINE, GPLX hợp lệ theo ngày Việt Nam, xe hoạt động, chưa bận, chưa từ chối đơn.
- [ ] Gán cập nhật `ranh_tu`, đơn, phân công và event cùng transaction. Khóa theo thứ tự thống nhất, đọc lại điều kiện sau chờ; unique index là lớp chặn cuối.
- [ ] Từ chối ghi outcome TU_CHOI + lý do; hoàn tất ghi HOAN_TAT; không suy người thực hiện từ timestamp bằng nhau.
- [ ] Quyền xem lịch sử/tiến trình dựa trên loại phân công hợp lệ; tài xế chỉ từng từ chối không được đọc đơn nếu không có quan hệ hợp lệ khác.
- [ ] Retry hoàn tất đơn cũ không chạm phân công mới hoặc `ranh_tu` của tài xế đang chạy đơn khác.
- [ ] Event có thứ tự liên tiếp theo đơn, trạng thái trước/sau và actor FK; sự cố chỉ thêm event theo rule, không tự hoàn tất/hủy.
- [ ] Query danh sách và summary không cộng tiền theo join nhân bản nhiều kiện/phụ thu/event. Tên tài xế lấy từ account, `maTx` của response là giá trị suy ra.
- [ ] Test tranh chấp cùng đơn, cùng tài xế, từ chối rồi gán lại, khóa account/đổi xe đồng thời, GPLX hết hạn, event cùng timestamp và retry.

**Gate:** dispatch/progress integration và hai HTTP smoke tương ứng đạt; không còn `tuChoi`, `order.taiXe` hoặc so timestamp để xác định tài xế hoàn tất.

### P09 — Hợp đồng API, tài liệu và nghiệm thu M1

**Phụ thuộc:** P05–P08; cập nhật từng phần ngay khi thay DTO, không chờ đến cuối.

- [x] Sửa `openapi.json`: User bỏ `maNv`; Order bỏ `maNv`, thêm `maTkTao`; event có thứ tự/loại/trạng thái trước-sau/actor; membership có enum/policy; giữ breakdown tiền và thuộc tính dẫn xuất cần cho FE.
- [x] Đổi phiên bản API contract phù hợp vì có breaking fields, cập nhật examples/error cases và phân biệt operation đã triển khai với operation T13+ còn chờ.
- [ ] Sinh lại Postman bằng `tools/api/generate-postman.mjs`; cập nhật smoke, `schema-mapping.md`, `coverage.md`, conventions và README API.
- [ ] Rà consumer trong frontend bằng nguồn được theo dõi, không sửa thư viện hoặc output build. Nếu chưa có consumer thì ghi không có tác động code FE, chỉ chuẩn bị contract T21+.
- [ ] Cập nhật các tài liệu và kết quả test theo danh mục mục 8. ERD/Class Diagram đã được người dùng vẽ lại, ngoài phạm vi triển khai này; không lấy sơ đồ cũ làm nguồn schema.
- [ ] Chạy clean build và toàn bộ kiểm tra M1 theo mục 7. Đóng gói WAR mới, kiểm tra không chứa entity/resource migration cũ do artifact tồn dư.

**Gate M1:** schema mới tái tạo được; T06–T12 chạy xuyên luồng; mapping/API/docs nhất quán; kết quả test mới có commit/schema version và không dùng báo cáo cũ để chứng minh.

### P10 — Tiếp tục T13–T17 trên mô hình mới

**Phụ thuộc:** M1. Đây là triển khai chức năng tiếp theo, không phải yêu cầu giả định đã tồn tại ở T12.

| Task | Việc cụ thể theo designV1 | Kiểm thử trọng tâm |
| --- | --- | --- |
| T13 | Hủy đúng chủ/tổng đài; tuổi <300 giây, CHO_GAN/DA_GAN; đóng HUY_DON, giải phóng tài xế, ghi lý do và event nguyên tử | 299.999/300 giây, tranh chấp hủy với gán/lấy hàng, rollback |
| T14 | `LanThanhToan`, xác nhận tiền mặt đúng người, `XacNhanThanhToanDonHang`, trạng thái thanh toán dẫn xuất | Miễn cước; trả trước hoàn tất; sai tiền/sai đơn; hai yêu cầu đồng thời; một xác nhận/đơn |
| T15 | Adapter VNPay, reference, IPN/query xác thực, event dedup, timeout chưa rõ, kết quả đến muộn | Return không xác nhận tiền; chữ ký sai; unmatched event; thu trùng; cập nhật event/payment/xác nhận cùng transaction |
| T16 | Lịch sử/chi tiết từ association mới, ownership, pagination, sự kiện có thứ tự | Sai chủ; khoảng ngày; không nhân bản đơn/tiền |
| T17 | Giá trị hoàn tất theo mốc hoàn tất; tiền nhận theo thu_luc; khoản chưa phân bổ và công nợ tại mốc thời gian; xuất Excel cùng query | Thu kỳ sau không xóa công nợ kỳ trước; join nhiều chiều; kỳ rỗng; quyền quản trị |

Không áp lại index “một giao dịch thành công/đơn”. Không tự xây hoàn tiền/trả một phần ngoài phạm vi. Việc công bố policy và audit quản trị đã xác định ở P00 phải có đường gọi được kiểm soát; tránh tạo bảng audit rồi không có code sử dụng.

### P11 — T18–T20, dọn legacy và chuyển môi trường

**Phụ thuộc:** P10 cho M2; riêng dọn thành phần legacy không còn consumer có thể làm từ M1.

- [ ] Hoàn thiện sandbox/config và đường IPN; phân biệt test giả lập với bằng chứng gọi sandbox thực.
- [ ] Rà tất cả rule AC…TX và DT01–DT27; mỗi rule gắn test, Actual, PASS/FAIL và bug/retest nếu cần. Ma trận 12 UC vẫn theo yêu cầu môn học; 27 test thiết kế không thay thế toàn bộ ca kiểm thử UC.
- [ ] Xóa file cũ theo mục 8; rà tham chiếu còn sót và link Markdown hỏng; clean package lại sau khi xóa.
- [ ] Ngừng ghi môi trường cũ, chờ/xử lý cache và payment đang chờ; backup và kiểm kê lần cuối nếu giữ dữ liệu.
- [ ] Chạy migration/seed hoặc nhập dữ liệu ở DB đích theo P01; deploy đồng bộ WAR, cấu hình và API contract, làm mới session.
- [ ] Smoke trên môi trường đích; mở lại truy cập khi gate đạt; ghi chính xác những dữ liệu/DB/volume còn giữ để quay lại.
- [ ] Sau khi đích đã nhận ghi, rollback không chỉ đổi connection string: phải đối chiếu các ghi mới và giao dịch cổng thanh toán. Chỉ loại bỏ DB/volume cũ khi không còn nhu cầu và đã xác nhận đúng đối tượng.

**Gate M2:** đủ BE T20 theo phạm vi môn học; không còn lỗi chặn FE; tài liệu, schema, code và test cùng một phiên bản.

## 6. Ma trận trách nhiệm bảo vệ dữ liệu

Ma trận chi tiết ở P00 phải mở rộng từng mã rule. Bảng này xác định hướng triển khai, không khẳng định các constraint đã được cài.

| Bất biến | DB | Service / transaction | Bằng chứng |
| --- | --- | --- | --- |
| Khóa, FK, enum, miền tiền, NULL | PK/FK/UQ/CHECK | Chuẩn hóa input, trả lỗi nghiệp vụ | Thử insert/update sai trực tiếp và qua API |
| Hồ sơ đúng role; account có đúng hồ sơ | FK không đủ | Tạo cùng transaction, role bất biến; quyền ghi có kiểm soát | Account/profile rollback, sai role; kiểm tra đối chiếu |
| Policy không chồng, nội dung công bố bất biến | Index hỗ trợ; cơ chế cưỡng chế bổ sung nếu đã chốt | Khóa phạm vi công bố kể cả tập rỗng, đọc lại sau khóa | Hai request cùng công bố; sửa policy lịch sử bị chặn |
| Một tài xế/một đơn tối đa một phân công hoạt động | Unique có điều kiện | Khóa, điều kiện xe/GPLX/account | Tranh chấp và rollback |
| Trạng thái đơn khớp phân công/event | CHECK nội bộ hàng chưa đủ | Một transaction cho toàn bộ chuyển trạng thái | Truy vấn đối chiếu, lỗi giữa các bước |
| Đơn đủ cước/kiện/event | FK chỉ bảo vệ chiều con → cha | `persistAggregate` và TX02 | Inject lỗi sau từng nhóm ghi, không còn dữ liệu dở |
| Số tiền/phụ thu đúng policy | FK phiên bản, PK bảng nối | Policy bất biến; kiểm tra công thức và trùng loại phụ thu | Biên làm tròn/overflow, đổi policy không đổi đơn cũ |
| Một payment chưa giải quyết | Unique có điều kiện và CHECK tương ứng | Khóa đơn, không mở lần mới khi chưa rõ/đã xác nhận | Hai phương thức chạy đua |
| Xác nhận thuộc đúng đơn, chỉ một lần | PK/UQ và FK ghép | Đơn HOAN_TAT, success, khớp tiền | ST01 sai order; hai xác nhận đồng thời |
| Callback lặp | UQ nguồn + khóa sự kiện | Xác thực, dedup và commit chung | Sai chữ ký, lặp, muộn, không khớp |
| Replay cùng key | PK request hash, FK order | Khóa actor, so payload, TTL, response gốc | Concurrent create, route lỗi khi replay |
| Quyền dữ liệu và audit | FK actor, bảo vệ xóa lịch sử | Actor từ session; audit cùng transaction thành công | Thử đổi ID; rollback không tạo audit thành công giả |

## 7. Kế hoạch kiểm tra và bằng chứng

### Trình tự kiểm tra M1

1. API contract/examples/Postman/Swagger tests.
2. Khởi tạo SQL Server test cô lập và initializer; migration designV1 từ DB rỗng, chạy lại kiểm tra idempotence của migration runner.
3. Persistence metadata và round-trip; constraint trực tiếp; seeder và reset guard.
4. Unit + integration auth, membership, route, quote, order, dispatch, progress. Đặt `REQUIRE_TEST_DB=true`; thiếu DB là fail, không skip.
5. Reset/seed dành riêng HTTP sau khi suite DB hoàn tất; khởi động backend-test.
6. Health/spec/Swagger smoke, order smoke, dispatch smoke, progress smoke.
7. Frontend lint/build nếu contract consumer có thay đổi; kiểm tra packaging và khởi động từ môi trường sạch.

Các lệnh hiện có dùng lại sau khi code/cấu hình đã được cập nhật, không chạy trong bước lập kế hoạch:

```text
npm run check --prefix tools/api
mvn --batch-mode --no-transfer-progress -f src/backend/pom.xml clean verify
npm run smoke --prefix tools/api
npm run smoke:orders --prefix tools/api
npm run smoke:dispatch --prefix tools/api
npm run smoke:progress --prefix tools/api
npm run lint --prefix src/frontend
npm run build --prefix src/frontend
```

Trên Windows có thể dùng `mvn.cmd`/`npm.cmd`; nếu máy thiếu Maven thì dùng môi trường build Java 21 đã chuẩn bị. Compose/test URL/credential phải được thiết lập trước theo README mới; không đặt secret vào kế hoạch hoặc log. Cập nhật CI để clean build, không tái sử dụng class cũ còn trong `target`.

### Bằng chứng cần lưu

- Migration history, metadata bảng/cột/constraint và kết quả JPA validate của schema mới.
- Báo cáo Surefire có số pass/fail/error/skipped; kết quả HTTP từng nhóm và môi trường chạy.
- Test race thật bằng nhiều transaction/kết nối; test tuần tự không chứng minh chống tranh chấp.
- Test UTC ở timezone máy khác, tiếng Việt, NULL unique, precision tiền, mốc mili giây.
- Report gắn commit, version designV1, mốc M1/M2 và thời điểm chạy. Không chép kết quả 103 test/207 kiểm tra của lần chuyển SQL Server trước thành kết quả đợt này.
- Sửa lỗi xuống dòng CRLF/LF của kiểm tra artifact nếu tái hiện; không ghi `check` PASS khi thực tế phải bỏ qua một bước.

DT01–DT17, DT25–DT27 phần T06–T12 áp dụng được phải đạt tại M1. DT18–DT24 và phần hủy/thanh toán/báo cáo của các DT khác đạt khi các task M2 tương ứng xong. Test persistence cho các bảng payment/xác nhận/sự kiện vẫn phải có từ M1.

## 8. Danh mục giữ, sửa, thay thế và xóa

Không xóa hàng loạt trước khi truy vết consumer. Điều kiện xóa: phần thay thế tồn tại, reference runtime/test/tooling đã đổi, clean build đạt và không cần tuyến nâng cấp cũ theo P01.

| File / nhóm | Hành động dự kiến | Thời điểm / điều kiện |
| --- | --- | --- |
| `docs/database/designV1.md` | Giữ làm nguồn schema; sửa điểm chưa thống nhất tại P00 | Trước DDL |
| `docs/database/design.md` | Xóa hoặc thay bằng chỉ dẫn sang designV1; ưu tiên không duy trì hai bản đầy đủ | Sau khi README/API docs trỏ nguồn mới |
| `docs/api/schema-v0.mysql.sql` | Xóa khỏi tài liệu đang dùng | Không còn link hoặc script đọc; lịch sử ở Git |
| `docs/T03-database-hibernate-seed-plan.md` | Thay nội dung hiện hành hoặc xóa sau khi hướng dẫn mới đủ | Không giữ nó như kế hoạch active cạnh file này |
| `docs/database/README.md` | Viết lại bootstrap/migration/seed/reset/SQL Server mới; tách báo cáo lần chuyển engine thành lịch sử nếu cần | P04–P09 |
| `docs/T08-membership-policy.md`, `T09-quote.md`, `T10-order-creation.md`, `T11-driver-dispatch.md`, `T12-delivery-progress.md` | Cập nhật theo task, giữ giá trị giải thích và test; bỏ phần schema cũ | P05–P08 |
| `docs/T07-route-provider.md` | Giữ, chỉ sửa khi route contract thực sự đổi | P06 |
| `docs/project_brief.md` | Giữ UC/phạm vi; cập nhật SQL Server, source schema, thứ tự công việc và cột ảnh hưởng | P00/P09 |
| `README.md`, `CONTRIBUTING.md`, `.env.example` | Rà hướng dẫn và tên DB; chỉ sửa phần cần thiết | P09/cutover |
| `docs/api/schema-mapping.md`, `conventions.md`, `coverage.md`, `README.md` | Viết lại mapping, sửa contract và trạng thái coverage | P09 |
| Báo cáo T04/T06/T10–T12 trên PostgreSQL | Đã thay bằng báo cáo M1 có ngày/version cho schema mới; bản cũ chỉ còn trong lịch sử Git | M1 |
| `tests/postman/*` | Sinh collection/environment từ nguồn hiện hành; giữ biến môi trường không có secret | P09 |
| Entity/DAO legacy liệt kê ở P03 | Xóa sau khi import, JPQL, mapping, fixture và test đã thay | Theo từng nhóm; xong trước M1 |
| `db/migration/V1–V7` PostgreSQL | Bỏ khỏi resources khi chọn tuyến mới | P11; không ảnh hưởng DB nguồn đang giữ |
| `db/sqlserver/V1–V7` | Bỏ khỏi nhánh active nếu tất cả môi trường theo baseline mới; nếu cần nâng tại chỗ thì giữ bất biến | Quyết định P01, dọn P11 |
| `PostgreSqlIntegrationTest.java` | Đổi tên phản ánh SQL Server; giữ nội dung kiểm tra hữu ích | P03/P04 |
| Test nâng V1 cũ → V7 | Thay bằng test bootstrap tuyến mới nếu chọn fresh baseline; giữ nếu còn hỗ trợ nâng cấp cũ | Theo P01 |
| `scripts/init-sqlserver.sql` | Giữ initializer, rà tên DB/collation/options; không nhét schema nghiệp vụ trùng Flyway | P02/P04 |
| `scripts/reset-test-db.sql`, `.ps1`, test cleanup | Viết lại thứ tự phụ thuộc và guard | P04 |
| `.github/workflows/ci.yml`, Compose dev/test | Cập nhật môi trường/tuyến khởi tạo/test; giữ SQL Server và cô lập test | P04/P09 |
| `src/backend/target`, output build, test log cũ | Dùng clean build; không sửa class/output bằng tay hay coi là source | P09/P11 |
| `.git-migration-backup`, DB/volume cũ, `.env` thật | Không nằm trong danh sách tự động xóa của đợt dọn source | Quyết định riêng theo dữ liệu/rollback; không commit secret |

Không xóa test chỉ vì đang đỏ do đổi schema. Thay fixture/assertion theo quy tắc mới; chỉ loại test khi hành vi đã chính thức bỏ khỏi phạm vi và ghi lý do.

## 9. Thứ tự bàn giao và điểm dừng

| Đợt | Công việc | Kết quả kiểm tra trước khi đi tiếp |
| --- | --- | --- |
| 1 | P00–P01 | Tên/rule/chiến lược dữ liệu rõ; đích cô lập |
| 2 | P02–P04 | DDL + mapping + seed/reset nhất quán, persistence test đạt |
| 3 | P05–P07 | Auth → thành viên → báo giá → tạo đơn và replay đạt |
| 4 | P08–P09 | Điều phối/tiến trình, API/docs, toàn bộ gate M1 đạt |
| 5 | P10 | T13–T17 hoàn thiện lần lượt với test và contract đi kèm |
| 6 | P11 | T18–T20, dọn legacy, cutover có đối chiếu, gate M2 đạt |

Các commit trung gian trên nhánh triển khai có thể chưa chạy trọn ứng dụng khi đang thay nhóm entity, nhưng phải ghi trạng thái rõ. Chỉ tích hợp/phát hành đợt nền khi DDL, mapping, seed và consumer đã đồng bộ; không merge bản chỉ đổi schema làm backend cũ mất khả năng khởi động.

Nếu cần chia nhỏ hơn, chia theo luồng nghiệp vụ như bảng trên, không chia kiểu “xóa hết entity trước, sửa hết service sau”. Không cần duy trì tầng tương thích legacy lâu dài cho đồ án nếu đã chọn baseline mới; nhưng phải giữ hành vi đúng của các UC hiện có.

## 10. Checklist kết thúc

- [ ] designV1 là nguồn schema duy nhất; tên xác nhận thanh toán thống nhất.
- [ ] Có đầy đủ 19 bảng đích; bảng kỹ thuật phát sinh được giải thích; không đếm số bảng để thay kiểm tra nội dung.
- [ ] Mọi quan hệ, nullable, unique, kiểu và bất biến có nơi thực thi/test.
- [ ] Không còn snapshot dư, VIP/hạng dạng entity, hồ sơ tổng đài hoặc bảng đánh giá ngoài phạm vi.
- [ ] Không còn nguồn tài xế kép, boolean từ chối hoặc suy người hoàn tất từ timestamp.
- [ ] Có kiểm thử policy bất biến/chồng lấn, replay, rollback và tranh chấp thật.
- [ ] API/Postman, task docs và code cùng mô hình; người dùng tự đối chiếu ERD/Class Diagram đã vẽ với designV1.
- [ ] DB test bắt buộc được chạy; báo cáo mới có bằng chứng, không mượn kết quả cũ.
- [ ] M1 và M2 được đánh dấu độc lập; không ghi hoàn tất chức năng chưa triển khai.
- [ ] Dọn file cũ không làm mất tuyến chuyển dữ liệu/rollback còn cần thiết.
- [ ] Người triển khai tiếp theo có thể dựng môi trường mới và chạy luồng kiểm tra bằng README, không cần dựa vào DB có sẵn trên máy tác giả.

**Trạng thái hiện tại (11/10/2026):** P01–P03 đã chạy trên SQL Server: 19 bảng nghiệp vụ, 26 FK, 117 CHECK đều bật và trusted; Flyway V1 lặp lại không chạy thêm; JPA validate đạt. Runtime và Docker Compose đã trỏ `mini_ong_vang_design_v1`; seed designV1 và reset DB test đã thay thế. Auth, báo giá, tạo đơn/replay, điều phối, từ chối, sự cố và hoàn tất chạy trên mapping mới. Entity/DAO/migration cũ không còn trong nguồn active. `User` bỏ `maNv`, `Order` trả `maTkTao`; Event API trả thứ tự, loại, trạng thái trước/sau và account actor. OpenAPI 0.5.0, Postman và tài liệu T08–T12 đã cập nhật; ba tài liệu/schema T03 cũ được xóa khỏi nhánh hiện hành. Clean verify có 24 test đạt, không fail/skip; OpenAPI kiểm tra 29 operation, 287 example; HTTP smoke đã đạt 24 (tạo đơn), 85 (điều phối), 93 (tiến trình), riêng smoke T12 được chạy lại sau sửa Event API. DB `mini_ong_vang` cũ vẫn được giữ, DB test tách riêng.

**Cập nhật tiếp (11/10/2026):** Migration V2 thêm ba trigger bất biến policy; `PolicyPublicationService` công bố/đóng ba loại policy bằng application lock và audit nguyên tử. SQL đối chiếu role/profile, đơn–phân công–event và policy đã đạt trên DB test. Clean verify có 28 test đạt, gồm TTL 299.999/300 giây, replay khi route lỗi, công bố cùng phạm vi đồng thời và chặn sửa policy đã công bố. FE hiện chỉ gọi health, nhãn SQL Server đã được cập nhật. ERD/Class Diagram người dùng đã vẽ lại nên không thuộc đợt triển khai này.

**Cập nhật nghiệm thu local:** V2 và truy vấn đối chiếu đã đạt trên DB dev/test; WAR V2 sau reset/seed đạt smoke chung, T10 24, T11 85, T12 93. Clean verify có 32 test, thêm biên thành viên 0%/100%, rollback khi ghi đơn/audit thất bại và tranh chấp khóa account/ngừng xe khi gán. FE lint/build đạt. Báo cáo PostgreSQL cũ được đánh dấu lịch sử. ERD/Class Diagram người dùng đã vẽ lại, không thuộc đợt việc này. Chưa có bằng chứng GitHub Actions trên commit/PR; không gộp M1 với T13–T20/M2.


**Cập nhật T19 (12/10/2026):** Nhánh `feat/t19-backend-integration` đối chiếu yêu cầu DT01–DT27 và chạy OpenAPI/Postman check cùng 12 unit test độc lập DB; các kiểm tra này đạt. Maven biên dịch/đóng WAR thành công với test bị skip có chủ ý. Chưa chạy Maven integration, HTTP smoke SQL Server hoặc truy vấn invariant trong đợt T19 này vì Docker không tải được image SQL Server 2022 từ MCR (`Forbidden`). Xem [báo cáo T19](../../tests/T19-validation.md). Không lấy kết quả M1 cũ làm kết quả T19; M2/T19 vẫn Blocked cho đến khi chạy lại trên SQL Server designV1.


**Retest T19 trên Windows (12/10/2026):** Log người dùng cung cấp xác nhận SQL Server designV1: 63 Java tests, 0 fail/error/skip; 348 HTTP checks nghiệp vụ và invariant sau progress đạt. Xem [báo cáo T19](../../tests/T19-validation.md) để phân biệt kết quả local mới với lần cloud bị chặn, phạm vi callback giả lập và bằng chứng/độ phủ DT còn cần bổ sung.
