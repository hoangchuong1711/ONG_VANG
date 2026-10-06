# T03 — Kế hoạch CSDL, Hibernate và seed

Ngày rà soát: 05/10/2026. Trạng thái: kế hoạch đề xuất, chưa triển khai migration, chưa chạy SQL hoặc kiểm thử runtime.

## 1. Cơ sở và kết luận rà soát

Đã đối chiếu bản đang sửa của [schema-v0.mysql.sql](api/schema-v0.mysql.sql), [project brief](project_brief.md), [schema mapping](api/schema-mapping.md), [API conventions](api/conventions.md), [coverage](api/coverage.md), [OpenAPI](../src/backend/src/main/webapp/openapi.json), Maven, HealthServlet, test PostgreSQL, Compose dev/CI và workflow CI.

- Stack hiện tại: Java 21, Servlet/Tomcat 10.1, JPA 3.1, Hibernate 6.6.58.Final, PostgreSQL 17. Có dependency ORM nhưng chưa có Entity, DAO, persistence unit, migration hoặc seed trong mã nguồn được kiểm tra.
- Test hiện có chỉ kiểm tra JDBC và commit/rollback trên bảng tạm; chưa chứng minh Hibernate mapping hoặc transaction nhiều bảng nghiệp vụ.
- SQL mới có 15 bảng, thêm tài khoản dùng chung, FK tài khoản cho hồ sơ, CHECK trạng thái đơn/tài xế/thanh toán, và thời điểm thanh toán nullable. Đây là nền tốt hơn bản cũ.
- Sáu dòng đầu vẫn là DROP/CREATE DATABASE, CHARACTER SET/COLLATE và USE theo MySQL, mâu thuẫn với comment PostgreSQL ngay sau đó. Không dùng nguyên file này làm migration.
- Không tìm thấy ERD riêng trong repo để xác minh “completed ERD (Page-1)”. Kế hoạch lấy SQL mới làm đầu vào thiết kế; không coi việc đối chiếu ERD hình là đã hoàn tất.
- Chưa xác minh trạng thái merge/Done của T01/T02 trên remote hoặc Plane. Theo CONTRIBUTING, phần phụ thuộc cần merge vào develop trước khi triển khai; việc lập kế hoạch có thể thực hiện ngay.

## 2. Sai lệch cần giải quyết

| Mức                    | Hiện trạng                                                                                                  | Xử lý đề xuất và nơi bàn giao                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chặn migration         | Header MySQL, thân hướng PostgreSQL; có BEGIN/COMMIT thủ công                                               | Tạo migration PostgreSQL thuần riêng; bỏ lệnh tạo/xóa/chọn DB và để migration runner quản lý transaction. Giữ file người dùng sửa làm tham chiếu trong đợt lập kế hoạch này.                             |
| Chặn mapping auth      | Mapping nói chỉ nhân viên có credential, nhưng nay đã có tai_khoan                                          | Sửa tài liệu: credential/role/status/email thuộc tai_khoan; hồ sơ liên kết qua ma_tk. T06 dùng kho này.                                                                                                  |
| Cần chốt T01/T06       | tai_khoan.trang_thai không có miền giá trị; chưa có chỗ rõ ràng cho tên chủ đội xe                          | Đề xuất HOAT_DONG/KHOA và CHECK. Bổ sung ho_ten cho tài khoản để mọi vai trò có User.hoTen; hồ sơ KH/TX/NV vẫn giữ tên nghiệp vụ, seed đồng nhất. Chốt nguồn tên hiển thị và quy tắc đồng bộ trước code. |
| Cần chốt định danh     | User.maNguoiDung ví dụ đang bằng maKh; nay có ma_tk riêng                                                   | Đề xuất maNguoiDung = ma_tk; maKh/maTx/maNv là ID hồ sơ theo vai trò. Cập nhật mô tả/examples trước T06, không âm thầm đổi ý nghĩa field.                                                                |
| Thiếu toàn vẹn vai trò | UNIQUE ma_tk trong từng hồ sơ không ngăn một tài khoản gắn nhiều loại hồ sơ, không kiểm tra role khớp hồ sơ | Transaction tạo hồ sơ và test bắt buộc kiểm tra role/cross-profile; ghi rõ FK hiện tại không bảo đảm điều này. Không thêm trigger nếu nhóm chưa chọn cưỡng chế ở DB. Chủ đội xe có thể chỉ có tài khoản. |
| Chặn seed bận/khóa     | tai_xe chỉ có ONLINE/OFFLINE/NGHI; dang_ban_chuyen đã bị bỏ                                                 | Khóa lấy từ tai_khoan; bận suy ra assignment đang hoạt động. Không thêm BAN/KHOA vào enum làm việc. Lưu thời điểm bắt đầu rảnh phục vụ T11.                                                              |
| Thiếu snapshot         | don_hang không còn cuoc_goc/tien_phu_thu; chỉ có ma_bieu_phi và tien_giam_gia                               | Thêm snapshot cước gốc/tổng, chính sách VIP và tên/số tiền phụ thu theo đơn. Không tính lịch sử bằng cấu hình đang thay đổi.                                                                             |
| Lệch contract payment  | thanh_toan.ma_don vẫn UNIQUE                                                                                | Đổi thành nhiều attempt/đơn, thêm tao_luc, người xác nhận và trường phục vụ đối soát; có ràng buộc tránh thu hai lần.                                                                                    |
| Thiếu dấu thời gian    | Đã có thoi_gian_huy/ly_do_huy nhưng chưa có thời điểm hoàn tất                                              | Map thoi_gian_huy → huyLuc, bổ sung thoi_gian_hoan_tat → hoanTatLuc; cập nhật mapping vốn nói cả hai đều thiếu.                                                                                          |
| Thiếu audit định danh  | nguoi_thuc_hien là chuỗi; don_hang.ma_tx/ma_nv có ON DELETE SET NULL                                        | Thêm ID tài khoản/role và lịch sử assignment bền vững; hạn chế xóa cứng hồ sơ đã có lịch sử. Không dùng FK tài xế hiện tại làm bằng chứng duy nhất về người đã giao.                                     |
| Lệch tên nội bộ        | nhat_ky_trang_thai.trang_thai thay ten_trang_thai                                                           | Map sang Event.tenTrangThai trong DTO, giữ contract bên ngoài. Thêm CHECK trạng thái nhật ký phù hợp enum đơn.                                                                                           |
| Mơ hồ                  | phu_thu_don_hang.trang_thai mặc định chuỗi '0', chưa có ý nghĩa nghiệp vụ                                   | Cần xác minh T01/ERD. Không tự gán enum nghiệp vụ hoặc dùng '0' để suy ra phụ thu hiệu lực. Có thể giữ String cho baseline, nhưng cách tính chỉ dùng snapshot đã chốt.                                   |
| Tiền/thời gian         | Tiền NUMERIC(15,2) và (12,2) lẫn nhau; thời điểm TIMESTAMP không timezone                                   | Thống nhất tiền NUMERIC(15,2)/BigDecimal; thời điểm dùng timestamptz/Instant, ngày dùng DATE/LocalDate. Giới hạn tiền API/provider vẫn cần kiểm tra riêng.                                               |
| Tài liệu cũ            | Còn nhắc khach_hang.email, credential dieu_phoi_vien, thong_ke_thu_nhap, MySQL ENGINE/ENUM                  | Email lấy qua tài khoản; bảng thống kê không còn trong SQL. Báo cáo tổng hợp từ đơn/snapshot/payment, không tự tạo lại bảng thống kê.                                                                    |

Các quyết định chưa chốt được ghi trong mục 10; có thể chuẩn bị hạ tầng trước, nhưng phải chốt trước khi đóng băng migration liên quan.

## 3. Phạm vi và thứ tự thực hiện

| Bước  | Công việc                                                                            | Đầu ra và tiêu chí xong                                                                                     | Ước lượng công |
| ----- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------- |
| T03.1 | Chốt delta SQL–ERD–API, trạng thái tài khoản, ID, snapshot, bận/khóa, tiền/thời gian | Mapping cập nhật; quyết định thiết kế có người review; không còn điểm chặn migration                        | 0,5–1 ngày     |
| T03.2 | Migration versioned, constraint/index và cấu hình dev/test                           | DB PostgreSQL 17 trống migrate được; chạy lại không đổi dữ liệu; lỗi migration làm startup thất bại rõ ràng | 1–1,5 ngày     |
| T03.3 | Bootstrap Hibernate, vòng đời connection pool/EMF/EntityManager, transaction runner  | WAR khởi tạo/đóng tài nguyên đúng; schema validate; rollback nhiều DAO cùng unit of work             | 0,5–1 ngày     |
| T03.4 | Entity và DAO cho schema đã chốt                                              | Lưu/đọc quan hệ, composite key, nullability, precision, lock và query nền đúng                              | 1,5–2 ngày     |
| T03.5 | Seed demo/test, manifest ID, lệnh reset riêng                                        | Đủ ma trận mục 7; seed lần hai không nhân đôi; reset–reseed tái lập                                         | 0,5–1 ngày     |
| T03.6 | Integration test, CI, tài liệu và bàn giao                                           | Ma trận mục 8 đạt, không skip DB test trong CI; review/merge theo CONTRIBUTING                              | 1–1,5 ngày     |

Tổng dự kiến: 5,5–8 ngày công cho một người, chưa gồm thời gian chờ review hoặc thay đổi ERD. Đây là ước lượng kế hoạch, không phải cam kết lịch.

Thứ tự chính: T03.1 → T03.2 → T03.3 → T03.4 → T03.5 → T03.6. Viết test liên quan cùng từng bước, không dồn toàn bộ vào cuối.

T03 cung cấp persistence và bằng chứng toàn vẹn dữ liệu. Session/CSRF và endpoint auth thuộc T06; thuật toán route/VIP/cước/báo giá thuộc T07–T09; nghiệp vụ tạo/gán/hủy/hoàn tất đơn thuộc T10–T13; payment gateway/callback thuộc T14–T15. Không xây thêm CRUD hay endpoint ngoài task chỉ vì có bảng.

## 4. Migration và mô hình dữ liệu mục tiêu

### 4.1. Cách quản lý migration

Đề xuất Flyway: chọn và pin một phiên bản hỗ trợ Java 21/PostgreSQL 17 khi triển khai, thêm core và module PostgreSQL tương ứng. Không nâng Hibernate trong T03 nếu không có lỗi tương thích cần xử lý. Flyway có Java API cho startup và PostgreSQL cần module riêng: [Java API](https://documentation.red-gate.com/flyway/reference/usage/api-java), [PostgreSQL support](https://documentation.red-gate.com/flyway/reference/database-driver-reference/postgresql-database).

Các file dự kiến trong `src/backend/src/main/resources/db/migration/`:

| Migration                         | Nội dung                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| V1\_\_baseline_erd.sql            | 15 bảng từ SQL mới, chuẩn PostgreSQL, PK/FK/UNIQUE/CHECK; không tạo/drop database                       |
| V2\_\_persistence_contract.sql    | Các delta đã chốt: tài khoản, snapshot, assignment, nhiều payment attempt, audit/time/precision         |
| V3\_\_constraints_and_indexes.sql | Ràng buộc liên quan schema mở rộng và index cho truy vấn nền; có thể gộp vào V2 trước lần phát hành đầu |

Không đưa seed demo vào migration bắt buộc. Không sửa migration đã áp dụng lên DB dùng chung; sửa tiếp bằng version mới. Không dùng `hbm2ddl.auto=update/create/create-drop` cho môi trường ứng dụng. Hibernate dùng `validate`. DB rỗng là đường khởi tạo mặc định; DB đã có bảng thủ công phải kiểm kê và có phương án chuyển đổi, không tự bật baseline/clean để bỏ qua lệch schema.

### 4.2. Các phần bổ sung cần làm trong T03

1. **Tài khoản:** trạng thái có CHECK, tên hiển thị theo quyết định T03.1; username duy nhất. Với KH/TX, seed username là SĐT đã normalize theo conventions. Chọn và dùng cùng password encoder với T06; seed nhận mật khẩu demo từ biến môi trường, chỉ lưu hash, không log/commit mật khẩu thật.
2. **Snapshot cước:** đề xuất bảng `snapshot_cuoc_don_hang` có PK/FK ma_don, cước gốc, tổng phụ thu, tiền giảm, tổng phải thu, tiền tệ, tên/thông số biểu phí và thông tin hạng/tỷ lệ áp dụng. Giữ `don_hang.tien_giam_gia` của ERD thì phải quy định một nguồn chuẩn và kiểm tra hai giá trị bằng nhau trong transaction; ưu tiên tránh nhân bản trường khi chốt thiết kế. `phu_thu_don_hang` giữ số tiền đã tính và thêm tên snapshot. Cấu hình thay đổi không làm đổi số tiền hoặc nhãn lịch sử.
3. **Assignment:** đề xuất `phan_cong_don_hang` gồm ID, ma_don, ma_tx, tài khoản điều phối, bắt đầu/kết thúc, lý do kết thúc. Assignment đang hoạt động có ket_thuc_luc IS NULL; partial unique theo ma_tx và ma_don ngăn một tài xế/đơn có hai assignment hoạt động. Giữ ma_tx trên don_hang để đọc nhanh nhưng cập nhật đồng bộ cùng transaction. Tài xế hoàn tất vẫn được truy vết từ lịch sử.
4. **Tài xế:** thêm `ranh_tu`; `dangBanChuyen` trong DTO lấy từ tồn tại assignment hoạt động. Chỉ gợi ý tài khoản HOAT_DONG, trạng thái ONLINE và không có assignment hoạt động. Khoá tài khoản, trạng thái làm việc và bận là ba khái niệm độc lập.
5. **Thanh toán:** bỏ UNIQUE ma_don, thêm thời điểm tạo, tham chiếu, người xác nhận tiền mặt; paid timestamp chỉ khi thành công. Partial unique ma_don cho trạng thái THANH_CONG và cho online CHO_XU_LY; reference duy nhất, online reference bắt buộc. Kết hợp lock đơn để chống cạnh tranh giữa tiền mặt/online; index riêng không đủ xử lý callback muộn hoặc trạng thái hoàn tiền. T14 thiết kế lifecycle đối soát/settlement bền vững trước khi triển khai callback; T03 không tuyên bố đã bảo đảm mọi tình huống gateway.
6. **Miễn cước:** tổng snapshot = 0; PaymentSummary trả MIEN_CUOC theo quy ước, không tạo payment giả hoặc tự thêm MIEN_CUOC vào enum attempt.
7. **Nhật ký:** thêm ID/role người thực hiện, giữ chuỗi hiển thị nếu cần snapshot; bổ sung loại sự kiện khi cần phân biệt chuyển trạng thái/sự cố. Nhật ký có thứ tự ổn định theo thời điểm + ID. Không giả định thay đổi trạng thái hiện tại là đủ cho audit.
8. **Constraints:** tiền/phụ thu/điểm tích lũy không âm; khối lượng >0; km không âm và giới hạn theo T01; khoảng ngày cấu hình hợp lệ; thời điểm hủy/hoàn tất phù hợp trạng thái. CHECK không thay thế NOT NULL: chốt các cột DEFAULT nhưng hiện vẫn nullable. Điều kiện liên bảng như một đơn có ít nhất một kiện/snapshot phải được service transaction + test bảo đảm nếu chưa có trigger.

Index khởi điểm: don_hang(ma_kh, thoi_gian_tao, ma_don), don_hang(trang_thai, thoi_gian_tao), don_hang(ma_tx), các FK chưa có index phù hợp; nhật ký(ma_don, thoi_gian_ghi_nhan, ma_nhat_ky); thanh_toan(ma_don, tao_luc, ma_giao_dich); trường thời điểm hoàn tất/đã trả phục vụ báo cáo. Không tạo lại index đã được PK/UNIQUE bao phủ; đánh giá truy vấn thực tế trước thêm index khác.

Quote 300 giây và idempotency tối thiểu 24 giờ: ghi nhận nhu cầu trong thiết kế, để T09/T10/T14 bổ sung persistence cùng logic tương ứng. Không coi hai chức năng này là đã có chỉ vì schema nền hoàn tất.

## 5. Hibernate, Entity và DAO

### 5.1. Bootstrap và kiểu dữ liệu

- Thêm `META-INF/persistence.xml`, persistence unit RESOURCE_LOCAL; đọc DB_URL/DB_USER/DB_PASSWORD từ môi trường và cấu hình qua code, không hardcode credential.
- `ServletContextListener`: tạo DataSource/pool → migrate → tạo EntityManagerFactory và validate → seed khi chế độ demo được bật rõ ràng → đánh dấu sẵn sàng. Thất bại ở bước nào thì đóng tài nguyên đã mở, không phục vụ như thể ORM sẵn sàng.
- Một EntityManagerFactory dùng chung cho ứng dụng; EntityManager riêng cho từng unit of work, luôn đóng trong finally/try-with-resources phù hợp. Pool có giới hạn và đóng khi undeploy. Không dùng EntityManager static hoặc chia sẻ giữa request.
- Chuỗi ID tối đa 36 ký tự giữ theo contract; Java có thể sinh UUID dạng chuỗi cho bản ghi mới nhưng không ép tất cả dữ liệu thành UUID, vì fixture/API có ID như KH-DEMO-001.
- Tiền dùng BigDecimal, trạng thái dùng EnumType.STRING, thời điểm dùng Instant và timestamptz, ngày lịch dùng LocalDate. Múi giờ nghiệp vụ Asia/Ho_Chi_Minh; xuất timestamp UTC theo T04.
- Hibernate mapping rõ tên bảng/cột, length/precision/scale/nullability. Không serialize Entity trực tiếp ra JSON; DTO được dựng khi persistence context còn mở. Không mở session kéo dài chỉ để tránh lỗi lazy loading.

Vòng đời và transaction trên được chọn theo [Hibernate 6.6 Introduction](https://docs.hibernate.org/orm/6.6/introduction/html_single/) và [User Guide](https://docs.hibernate.org/orm/6.6/userguide/html_single/); không giả định Spring hoặc container tự cấp transaction cho Servlet thuần.

### 5.2. Quan hệ cần map và kiểm tra

| Bảng               | Entity đề xuất                       | Mapping trọng tâm                                                                                                        |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| tai_khoan          | TaiKhoan                             | Unique username; role/status enum; không cascade xóa hồ sơ/lịch sử tùy tiện                                              |
| hang_thanh_vien    | HangThanhVien                        | Mã hạng String; tỷ lệ BigDecimal                                                                                         |
| khach_hang         | KhachHang                            | OneToOne tài khoản qua ma_tk UNIQUE; OneToMany đơn nếu cần chiều ngược                                                   |
| khach_hang_vip     | KhachHangVip                         | Shared PK ma_kh, OneToOne + MapsId; ManyToOne hạng; khách có 0 hoặc 1 hồ sơ VIP                                          |
| tai_xe             | TaiXe                                | OneToOne tài khoản; trạng thái làm việc riêng trạng thái khóa                                                            |
| phuong_tien        | PhuongTien                           | OneToOne tài xế; tài xế có 0 hoặc 1 xe theo unique ma_tx                                                                 |
| dieu_phoi_vien     | DieuPhoiVien                         | OneToOne tài khoản; role/credential không còn nằm ở hồ sơ                                                                |
| cau_hinh_cuoc      | CauHinhCuoc                          | Giá trị decimal, ngày hiệu lực; không cascade từ đơn sang cấu hình                                                       |
| cau_hinh_phu_thu   | CauHinhPhuThu                        | Cấu hình độc lập snapshot                                                                                                |
| don_hang           | DonHang                              | ManyToOne khách/biểu phí, tài xế/điều phối nullable; version để phát hiện sửa đồng thời                                  |
| phu_thu_don_hang   | PhuThuDonHang                        | Entity liên kết có dữ liệu; EmbeddedId(maDon, maPhuThu), MapsId và equals/hashCode cho khóa; không dùng ManyToMany thuần |
| chi_tiet_kien_hang | ChiTietKienHang                      | ManyToOne đơn; cascade persist theo aggregate tạo đơn                                                                    |
| nhat_ky_trang_thai | NhatKyTrangThai                      | ManyToOne đơn/người thực hiện; tránh cascade remove lịch sử trong luồng thông thường                                     |
| thanh_toan         | ThanhToan                            | ManyToOne đơn sau V2, không OneToOne; giữ lịch sử attempt                                                                |
| danh_gia_chuyen_di | DanhGiaChuyenDi                      | OneToOne đơn, CHECK sao; map để khớp ERD, chưa làm API đánh giá                                                          |
| Bảng mở rộng V2    | SnapshotCuocDonHang, PhanCongDonHang | Shared PK snapshot; ManyToOne assignment đến đơn/tài xế/người phân công                                                  |

Đặt quan hệ LAZY nơi phù hợp và xác minh hành vi thực tế; fetch join/entity graph cho truy vấn chi tiết cụ thể, không bật EAGER tất cả. Không đặt CascadeType.ALL/REMOVE lên ManyToOne đến tài khoản/khách/tài xế/cấu hình. Kiểm tra cả cascade DB và cascade ORM, vì chúng là hai cơ chế khác nhau.

DAO là lớp Java dùng EntityManager/HQL/Criteria, không phải Spring Data. Các DAO gốc: TaiKhoanDAO, KhachHangDAO, TaiXeDAO, HangThanhVienDAO, CauHinhCuocDAO, CauHinhPhuThuDAO, DonHangDAO, ThanhToanDAO, PhanCongDonHangDAO. Entity con có thể persist qua aggregate/DAO đơn, không bắt buộc tạo CRUD DAO riêng cho từng bảng.

Query nền cần có: tìm tài khoản theo login đã normalize; khách kèm VIP/hạng; tài xế rảnh theo ranh_tu rồi maTx; đơn theo khách/trạng thái/thời gian có phân trang ổn định; chi tiết đơn với kiện/snapshot/phụ thu; nhật ký và payment attempt theo đơn; lấy đơn/tài xế với lock. DAO không tự commit hoặc tự mở một EntityManager khác khi đang tham gia transaction của service.

## 6. Transaction và cạnh tranh

Thêm `TransactionRunner` nhận một callback có EntityManager: begin → callback → flush/commit; exception → rollback nếu còn active → đóng EntityManager → ném lại lỗi có nguyên nhân. Mọi DAO trong callback dùng đúng EntityManager đó. Quy định không hỗ trợ nested transaction độc lập ở bản đầu.

| Đơn vị công việc cần hỗ trợ | Các thay đổi phải nguyên tử                           | Phạm vi nghiệm thu T03                                                           |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tạo hồ sơ                   | tài khoản + hồ sơ tương ứng                           | DAO/transaction integration test; không có nửa tài khoản khi hồ sơ lỗi    |
| Tạo đơn                     | đơn + kiện + snapshot + phụ thu + nhật ký             | Test lưu nhiều bảng và rollback khi lỗi ở bước cuối; endpoint thuộc T10          |
| Gán/kết thúc phân công      | đơn + assignment + thời điểm rảnh + nhật ký           | Kiểm tra unique/lock và rollback ở tầng persistence; state machine thuộc T11–T13 |
| Ghi nhận thanh toán         | attempt + paid timestamp + audit/settlement liên quan | Test nhiều attempt, một thành công, rollback; callback thực thuộc T14–T15        |

Đề xuất khóa bi quan cho thao tác phân công: khóa đơn rồi tài xế theo thứ tự nhất quán, đọc lại precondition trong transaction; kết hợp unique assignment. Dùng version trên đơn cho cập nhật phát hiện stale state. Không trông chờ version đơn để ngăn hai đơn khác nhau cùng chiếm một tài xế. Sau lỗi constraint/optimistic lock phải rollback toàn transaction; không tiếp tục dùng session đã lỗi.

T03 kiểm thử cạnh tranh bằng hai EntityManager/connection thực, đồng bộ bằng latch/barrier; không dùng sleep ngẫu nhiên. Kiểm thử API gán–gán/gán–hủy và mã lỗi 409 đầy đủ bàn giao T11/T13. Không giữ DB transaction mở trong lúc gọi route/VNPay; thiết kế retry/callback chi tiết thuộc task tích hợp.

## 7. Seed và reset dữ liệu

### 7.1. Ma trận seed

| Nhóm           | Dữ liệu tối thiểu                                                                           | Điều kiện phải đúng                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Vai trò        | KHACH_HANG, TAI_XE, TONG_DAI, CHU_DOI_XE                                                    | Có tài khoản đăng nhập cho cả bốn; đúng hồ sơ/role; hash kiểm tra được bằng encoder đã chọn                      |
| Khách          | 1 thường, 1 VIP hiệu lực, 1 VIP hết hạn                                                     | Thường không có hàng khach_hang_vip; VIP có hạng và thẻ unique; ngày hợp lệ rõ ràng                              |
| VIP biên       | Hết hạn hôm nay, không thời hạn                                                             | Fixture test riêng để kiểm tra ngày/hạn; không phá FK để giả lập hạng không tồn tại                              |
| Tài xế         | 2 ONLINE rảnh, 3 ONLINE bận, 1 bị khóa, 1 OFFLINE, 1 NGHI                                   | Mỗi tài xế bận có đúng một assignment hoạt động; rảnh khác ranh_tu để kiểm tra thứ tự; khóa thể hiện ở tài khoản |
| Cấu hình       | Biểu phí hiệu lực, hạng có tỷ lệ, phụ thu bật/tắt                                           | Giá trị demo lấy từ T01 và công bố; chưa coi số/địa chỉ trong Swagger là seed được duyệt                         |
| Đơn đang xử lý | CHO_GAN, DA_GAN, DA_LAY_HANG, DANG_GIAO                                                     | Ba đơn đang có tài xế dùng ba tài xế khác nhau; có kiện, snapshot, nhật ký khớp                                  |
| Đơn cuối       | HOAN_TAT, DA_HUY                                                                            | Có thời điểm hoàn tất/hủy, lý do hủy và assignment đã kết thúc nếu từng gán                                      |
| Thanh toán     | Đơn hoàn tất chưa trả; tiền mặt thành công; online thất bại rồi thành công; online đang chờ | Tổng attempt = snapshot, paid nullable khi chưa thành công; không tạo hai thành công/đơn                         |
| Miễn cước      | Đơn hoàn tất tổng 0                                                                         | Không có payment attempt; đủ snapshot để trả MIEN_CUOC                                                           |
| Lịch sử        | Đơn do tổng đài tạo; đơn đổi tài xế sau từ chối                                             | Actor chính xác, assignment cũ kết thúc, giữ dấu vết quyền/lịch sử                                               |

Manifest seed ghi ID/username không bí mật, trạng thái kỳ vọng, quan hệ và task sử dụng. Đơn có nhiều kiện/phụ thu là fixture cần thiết để test mapping; không sinh dữ liệu ngẫu nhiên khiến test khó tái lập.

### 7.2. Thời gian và tính lặp lại

- Demo dùng thời điểm neo khi chạy seed: VIP hiệu lực/hết hạn tính tương đối ngày đó, đơn mới tạo khi reset để còn demo được hủy trước 300 giây. Ghi rõ các dữ liệu nhạy thời gian phải reset khi demo lại.
- Integration test dùng Clock cố định và fixture riêng; kiểm tra 299/300/301 giây tại task nghiệp vụ, không để test phụ thuộc ngày máy chạy.
- Seed bật bằng chế độ rõ ràng; mặc định không chèn demo khi deploy. Chạy seed hai lần không nhân đôi, không tự ghi đè đơn người dùng đã thay đổi. Có thể dùng manifest/version seed và bộ ID cố định để kiểm tra đã cài; dữ liệu cài dở/lệch phải báo lỗi rõ thay vì im lặng bỏ qua từng dòng.
- Seed trong một transaction và đúng thứ tự FK: tài khoản/hạng/cấu hình → hồ sơ/VIP/xe → đơn/snapshot → kiện/phụ thu/assignment/nhật ký → payment/đánh giá nếu có.

### 7.3. Reset test

Tạo `scripts/reset-test-db.ps1` hoặc entry point Java tương đương. Chỉ nhận cấu hình TEST*DB*\*, bắt buộc chế độ test, kiểm tra URL và `SELECT current_database()` đúng `mini_ong_vang_test` trước mọi thao tác phá dữ liệu. Không fallback sang DB_URL của dev. Tắt/dừng bên ghi dữ liệu trong lúc reset, tránh chạy reset cùng smoke hoặc test song song.

- Reset dữ liệu: truncate danh sách bảng ứng dụng đã biết trong một transaction, không chạm bảng lịch sử Flyway; seed lại fixture. Không tắt FK để nạp dữ liệu sai. Không dùng CASCADE không kiểm soát kéo theo bảng ngoài danh sách.
- Kiểm tra fresh migration riêng: dựng lại stack CI tạm thời rồi migrate từ rỗng. Compose CI hiện dùng tmpfs và DB riêng; không dùng volume dev.
- Kiểm tra lệnh reset từ chối URL dev, thiếu env hoặc database thực không đúng tên; dữ liệu test và số lượng sau reset–seed hai vòng phải giống nhau.
- Không dùng `docker compose down -v` trên stack dev làm hướng dẫn reset test.

## 8. Ma trận kiểm thử và CI

| Mã    | Kiểm tra                        | Bằng chứng/Expected                                                                                                                  |
| ----- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| DB-01 | Fresh migrate + migrate lần hai | Có đủ bảng/ràng buộc/version; lần hai không apply lại hoặc mất dữ liệu                                                               |
| DB-02 | Nâng V1 lên V2/V3               | Dữ liệu V1 hợp lệ được giữ/chuyển đúng; dữ liệu không chuyển được được phát hiện trước, không tạo snapshot lịch sử bằng giá hiện tại |
| DB-03 | Bootstrap/schema validate       | Entity khớp schema; thiếu cột/sai cấu hình làm khởi tạo thất bại rõ                                                                  |
| DB-04 | Round-trip các kiểu/quan hệ     | Unicode, decimal, thời điểm UTC, LocalDate, VIP shared PK, xe 1–1, phụ thu composite key đúng                                        |
| DB-05 | FK/UNIQUE/CHECK/NOT NULL        | Từ chối FK mồ côi, login/biển số/thẻ trùng, enum sai, tiền âm, sao ngoài miền và null bắt buộc                                       |
| DB-06 | Cascade và bảo toàn lịch sử     | Xóa bảng cha có con đúng chính sách đã chốt; không vô tình xóa khách/tài xế/payment qua cascade ORM                                  |
| DB-07 | Transaction commit/rollback     | Thành công lưu đủ aggregate; lỗi ở kiện/phụ thu/nhật ký rollback tất cả thay đổi trước đó                                            |
| DB-08 | Assignment cạnh tranh           | Hai transaction cùng tài xế hoặc cùng đơn: chỉ một assignment hoạt động; transaction thua không để lại nhật ký/đơn cập nhật dở       |
| DB-09 | Payment persistence             | Nhiều attempt được lưu; reference trùng, hai online pending hoặc hai thành công bị chặn theo invariant đã chốt                       |
| DB-10 | Snapshot bất biến               | Sửa giá/tên cấu hình/hạng sau tạo fixture không làm đổi cước/nhãn lịch sử                                                            |
| DB-11 | Seed/reset                      | Đủ mọi vai trò/trạng thái; hash verify được; seed idempotent; reset lặp đúng và từ chối DB sai                                       |
| DB-12 | Query DAO                | Filter/phân trang/sort ổn định; lấy tài xế rảnh loại khóa/bận/offline; không nhân bản đơn vì join nhiều kiện/payment                 |
| DB-13 | WAR lifecycle và smoke          | ORM sẵn sàng trên Tomcat; health/OpenAPI/Swagger tiếp tục đúng contract; đóng EMF/pool khi undeploy                                  |

Dùng PostgreSQL 17 thật của `docker-compose.ci.yml`, không thay bằng H2. Giữ guard `REQUIRE_TEST_DB=true` và quy tắc test DB hiện có. Các test nhiều connection phải cleanup dữ liệu đã commit, không chỉ rollback connection của test chính.

CI hiện khởi động backend-test trước Maven verify trên cùng DB. Khi thêm reset/fixture test, phải sắp thứ tự để không phá dữ liệu ứng dụng đang dùng: đề xuất start db-test → migrate/test/reset có kiểm soát → start backend-test → smoke, hoặc tách schema/DB test riêng. Không để startup seed của WAR chạy đua với test runner. Phải kiểm thử cả đường Java test bootstrap và đường WAR bootstrap.

Kiểm tra liên quan khi triển khai: Maven verify; API `check`, sinh lại Postman nếu examples/contract thay đổi; Compose config; HTTP smoke. Lưu Surefire/container logs trên CI hiện có. Không đánh dấu các UC nghiệp vụ PASS chỉ vì persistence test đạt.

## 9. Cấu trúc đầu ra và tiêu chí nghiệm thu

Các file/package dự kiến:

```text
src/backend/pom.xml                                  # migration/pool/password encoder đã chốt
src/backend/src/main/resources/META-INF/persistence.xml
src/backend/src/main/resources/db/migration/V*.sql
src/backend/src/main/java/com/miniongvang/config/     # lifecycle, DataSource, JPA
src/backend/src/main/java/com/miniongvang/entity/     # Entity, enum, composite key
src/backend/src/main/java/com/miniongvang/DAO/        # DAO dùng Hibernate/JPA
src/backend/src/main/java/com/miniongvang/service/    # transaction boundary/helper
src/backend/src/main/java/com/miniongvang/seed/       # runner + manifest demo
src/backend/src/test/java/com/miniongvang/persistence/
src/backend/src/test/resources/                      # fixtures test
scripts/reset-test-db.ps1
docs/database/README.md                              # migrate/seed/reset, quyết định dữ liệu
tests/database/T03-validation.md                     # expected/actual và bằng chứng
```

Các tài liệu phải cập nhật trong PR triển khai: README gốc, schema-mapping, conventions về tiền/credential/time, API examples nếu ID/seed thay đổi, ERD/Class theo schema thực tế. Không đổi trạng thái operation sang implemented khi mới có DAO. Link migration chính thức từ README để tránh người khác chạy nhầm SQL tham chiếu.

Checklist Done:

- [ ] T01/T02 đủ điều kiện phụ thuộc; các quyết định mục 10 được ghi rõ.
- [ ] Fresh migrate và nâng version chạy được trên PostgreSQL 17; migrate lặp không thay dữ liệu.
- [ ] Hibernate validate thành công; Entity/DAO đúng quan hệ; transaction nhiều bảng có test rollback.
- [ ] Seed đủ vai trò, thường/VIP/hết hạn, rảnh/bận/khóa và đơn mẫu nhất quán.
- [ ] Test constraint/cascade/cạnh tranh/snapshot/reset đạt; không có integration test bị skip trong CI.
- [ ] Cách chạy và reset có thể thực hiện theo README trên máy thành viên khác.
- [ ] Mapping/ERD/API examples đồng bộ; phần deferred gắn task nhận rõ ràng.
- [ ] PR vào develop, CI pass, một thành viên khác review, merge rồi mới đánh dấu Done theo CONTRIBUTING.

## 10. Điểm cần chốt trước triển khai phần liên quan

1. ERD Page-1 chính thức ở đâu và những delta so với ERD có được chấp nhận? Hiện chỉ kiểm chứng được SQL trong repo.
2. Chấp nhận PostgreSQL làm đích như T02/brief; chuẩn hóa tên file tham chiếu ở PR nào để hết hiểu nhầm `.mysql.sql`?
3. Tên hiển thị chủ đội xe, miền trạng thái tài khoản, maNguoiDung = ma_tk và cách đồng bộ tên/SĐT giữa tài khoản/hồ sơ.
4. Ý nghĩa `phu_thu_don_hang.trang_thai='0'`; khối lượng kiện bắt buộc hay nullable giữa SQL/API; miền ngày/giá/km cụ thể theo T01.
5. Chốt snapshot một nguồn chuẩn, assignment làm nguồn xác định bận, chính sách không xóa cứng dữ liệu đã có lịch sử.
6. Giá/địa chỉ/hạng/giới hạn demo và password encoder dùng chung với T06. Không suy ra giá trị kinh doanh từ ví dụ Swagger.

Các phương án trong tài liệu là đề xuất triển khai có căn cứ từ repo; chưa phải quyết định đã được nhóm duyệt. Đợt này chỉ bổ sung kế hoạch, giữ nguyên SQL đang sửa và chưa tác động database.
