# Thiết kế CSDL đề xuất — Mini Ong Vang / DBMS330284

Ngày cập nhật: 18/10/2026. **BẢN DỰ THẢO ĐỂ DUYỆT**, thay toàn bộ nội dung tổng hợp schema cũ. Chưa áp dụng vào DB, chưa thay migration, chưa sửa backend/frontend. SQL trong tài liệu là định nghĩa cho mô hình mới trên SQL Server 2022, không phải script nâng cấp V1–V12. Mục 0 chỉ rõ cách tách file V1–V9 cho designV2; mục 13 là dữ liệu demo SQL. Không chạy nguyên tài liệu trên database hiện tại. Các ví dụ kiểm thử/phân quyền ở cuối là các kịch bản riêng, không nối vào khối tạo đối tượng.

## 0. Bố cục file migration để chia việc trong nhóm

Đây là **baseline mới designV2 trên database mới**, không đánh lại số hay ghi đè V1–V12
của designV1. Bảng dưới là tên file đích để thành viên tách từ tài liệu; chưa tạo file .sql
hoặc đổi cấu hình chương trình trong lần sửa tài liệu này.

```text
src/backend/src/main/resources/db/designV2/sqlserver/
├── schema/
│   ├── V1__create_business_tables.sql
│   ├── V2__create_indexes.sql
│   ├── V3__create_fare_functions.sql
│   ├── V4__create_business_views.sql
│   ├── V5__create_driver_income_function.sql
│   ├── V6__create_integrity_triggers.sql
│   ├── V7__create_business_procedures.sql
│   └── V8__create_roles_and_permissions.sql
└── demo/
    └── V9__insert_demo_data.sql
```

| Thứ tự | File | Lấy nội dung tại | Phạm vi và phụ thuộc |
|---|---|---|---|
| 1 | `V1__create_business_tables.sql` | Mục 3 | SET options, 16 bảng, PK/FK/CHECK/DEFAULT và ALTER FK khoản chia → giao dịch; chưa có dữ liệu mẫu |
| 2 | `V2__create_indexes.sql` | Mục 4 | Unique filtered index chống gán/nộp trùng, index tra cứu; cần V1 |
| 3 | `V3__create_fare_functions.sql` | Mục 5.1 | 4 scalar UDF tính cước km/kg, giảm giá và phần công ty |
| 4 | `V4__create_business_views.sql` | Mục 5.2 | 8 view, gồm view tổng hợp phiên bản chính sách; cần bảng và fn_phan_cong_ty |
| 5 | `V5__create_driver_income_function.sql` | Mục 5.3 | TVF fn_thu_nhap_tai_xe; phải sau v_chia_cuoc ở V4 |
| 6 | `V6__create_integrity_triggers.sql` | **Cả hai khối SQL** mục 6 | 9 trigger, gồm ba trigger policy; cần bảng và các view tài chính |
| 7 | `V7__create_business_procedures.sql` | **Tất cả khối SQL** mục 7, từ helper đến 7.11 | 34 SP; giữ thứ tự usp_khoa/usp_actor trước, rồi nghiệp vụ/CRUD/tra cứu |
| 8 | `V8__create_roles_and_permissions.sql` | Mục 9 | 6 role/user demo, GRANT/REVOKE/DENY; chỉ chạy sau khi các SP/view đã tồn tại |
| 9 | `V9__insert_demo_data.sql` | **Chỉ mục 13.2** | 8 tài khoản hiện có, 30 đơn và dữ liệu liên quan; cần V1–V8, DB demo/test mới rỗng |

**Quy tắc tách file:** chỉ sao chép nội dung bên trong hàng rào `sql` có dòng `-- FILE:`
đúng tên file; không sao chép Markdown, truy vấn kiểm tra mục 10/11/13.3 hay cả tài liệu vào
một migration. V6 và V7 có nhiều khối: nối chúng theo thứ tự xuất hiện. Giữ GO và SET options
của định nghĩa. Không thêm BEGIN TRAN chung quanh V7 vì các SP tự quản transaction nghiệp vụ.
Giữ các SET options đầu V1; khi tách file thủ công/khác kết nối, dùng cùng SET options đầu
file tạo function/view/index/trigger để tránh khác tùy chọn phiên. Flyway SQL Server hỗ trợ GO.

**Nạp demo tự động, không bật Java seed:**

- DB schema sạch: cấu hình locations chỉ `classpath:db/designV2/sqlserver/schema` → chạy V1–V8.
- DB demo/test: cấu hình **hai locations**, schema ở trên và
  `classpath:db/designV2/sqlserver/demo` → Flyway sắp số V1 → V9 và tự nạp INSERT.
- Dùng `mini_ong_vang_design_v2_demo` hoặc `mini_ong_vang_design_v2_test` cho V9;
  tắt `DEMO_SEED` và không gọi SeedCommand. Chưa đổi cấu hình Java trong tài liệu này.
- Không đưa designV1 và designV2 vào cùng locations/history, không chạy designV2 lên DB cũ.
  Không chạy V9 ở DB thật hoặc DB chứa dữ liệu cần giữ. Đã chạy file V nào thì giữ checksum;
  các thay đổi sau tạo V tiếp theo. Nếu DB đã áp dụng V9, không bỏ demo location khỏi cấu hình
  các lần validate/migrate tiếp theo của chính DB đó, tránh migration đã áp dụng bị báo thiếu.
- Phân công theo **nhóm bảng/index**, **hàm/view**, **trigger/SP**, **quyền/dữ liệu/test**;
  thống nhất tên trong bảng trên, chỉ một thành viên tích hợp mỗi file để không trùng phiên bản.

## 1. Chức năng thay đổi đã thống nhất

| Phần | Thiết kế mới |
|---|---|
| Khách trả cước | Khách trả trực tiếp cho tài xế bên ngoài hệ thống. Không quản lý tiền mặt hay ngân hàng của khách; không xác minh giao dịch của khách. Người đặt chịu trách nhiệm trả cước; không có lựa chọn người trả/phương thức trên đơn. |
| Hoàn tất giao hàng | Tài xế được phân công xác nhận đã giao và đã thu đủ cước đã chốt. Không gọi VNPay và không đợi VNPay để hoàn tất. Nếu chưa thu đủ thì chưa hoàn tất theo phạm vi này. |
| Chia thu nhập | Theo từng đơn hoàn tất: công ty hưởng 20% cước cuối cùng sau giảm giá và phụ thu; tài xế hưởng phần còn lại. Không xét phí cổng thanh toán. |
| Nộp tiền công ty | Tài xế tự bấm thanh toán bất cứ lúc nào; cộng dồn qua ngày, không hạn nộp, không chặn nhận đơn vì còn phải nộp. VNPay Sandbox chỉ dành cho tài xế → công ty. |
| Nút Thanh toán | Một nút ngay cạnh số Cần nộp công ty. Backend tự tạo giao dịch, gắn các khoản chưa nộp và trả URL mở VNPay trong cùng thao tác người dùng. Không có màn/bước tạo đợt; không nhập số tiền tùy ý hay trả một phần đơn. |
| Thử thanh toán lại | Một tài xế tối đa một giao dịch chưa giải quyết. Nếu đang chờ thì tiếp tục/tra cứu giao dịch cũ. Chỉ sau khi xác minh KHONG_THU mới giải phóng các khoản để lần bấm sau thanh toán toàn bộ khoản chưa nộp lúc đó, kể cả khoản mới. |
| Điều phối | Giữ tạo hộ/gán/từ chối/gán lại/theo dõi; bỏ thu COD và xác nhận tài xế nộp tiền. |
| Tài khoản | Giữ đăng nhập, phân quyền, đổi mật khẩu khi đăng nhập; bỏ quên mật khẩu/OTP/email reset. Giữ hash và auth_version để vô hiệu phiên cũ. |
| Giá/thành viên | Giữ giá theo km/kg, phụ thu, hạng và chính sách thành viên. Không tính lại đơn cũ theo giá mới. |
| Báo giá | Không lưu bảng báo giá tạm; tính xem trước, khi tạo đơn tính lại và yêu cầu người dùng chấp thuận nếu giá thay đổi. |
| Ngoài phạm vi | Tiền hàng thu hộ người bán, trả góp, hoàn tiền, công ty trả lương/chuyển tiền tài xế, ví điện tử, đánh giá khách hàng, GPS trực tiếp. Vị trí demo/bản đồ có thể giữ. |

**Ví dụ chính:** ba đơn tổng cước 300.000đ → thu nhập tài xế 240.000đ, màn hình hiện **Cần nộp công ty: 60.000đ** và nút **Thanh toán**. Chưa trả thì tiếp tục chạy và cộng dồn. Bấm nút → mở VNPay ngay → trả thành công → số cần nộp về **0đ** nếu không có khoản mới phát sinh. Không tạo đợt rồi bấm trả lần hai.

**Trường hợp đồng thời:** nếu đã mở VNPay cho 60.000đ mà phát sinh thêm khoản 20.000đ, thanh toán thành công chỉ giải quyết 60.000đ đã chốt; màn hình còn 20.000đ. Không gán số nợ bằng 0 vô điều kiện. Thu nhập 80% không bị trừ thêm khi nộp phần công ty.

Phân biệt: tiền khách được tài xế **khai báo đã thu**; tiền công ty **được hưởng**; tiền công ty **đã nhận qua VNPay**. Không gọi 20% là lợi nhuận ròng. Thu nhập lọc theo ngày hoàn tất; khoản còn phải nộp tính toàn lịch sử, không reset theo ngày/bộ lọc.

### Quyết định SQL chốt trong lần rà 18/10

- Giảm giá thành viên tính trên **cước km + kg + phụ thu**, đúng cách tính backend hiện tại.
  Ví dụ 50.000đ + phụ thu 5.000đ, giảm 10% → giảm 5.500đ, tổng 49.500đ.
- `bat_buoc=1`: SQL tự chọn phụ thu đang hiệu lực. `bat_buoc=0`: chỉ lấy mã người dùng chọn
  sau khi BE chuẩn hóa; không cho gửi một khoản bắt buộc như khoản tùy chọn, không cộng trùng.
  Không chọn phụ thu tùy chọn (`[]`) vẫn phải trả phụ thu bắt buộc.
- Gợi ý và gán đều loại tài xế đã từ chối chính đơn, yêu cầu `ranh_tu IS NOT NULL`.
- Vị trí demo lưu địa chỉ/tọa độ/thời điểm/nguồn `DEMO_CO_DINH`; backend geocode trước lưu,
  SQL không tự xác minh Goong, không gọi vị trí đó là GPS trực tiếp.
- CRUD/chính sách/quyền dưới đây là SQL đề xuất, không thay Entity/API đang chạy.

### 1.1. Bảng/cột bỏ, gộp, thay

- Bỏ `thanh_toan`, `xac_nhan_thanh_toan_don_hang` và bộ sự kiện thanh toán của khách.
- Bỏ mô hình đợt/chi tiết COD và hai bảng `dot_nop_tien`, `chi_tiet_dot_nop` của bản dự thảo trước. Chỉ giữ `giao_dich_nop_tien` và `su_kien_thanh_toan` cho VNPay tài xế → công ty; bỏ người điều phối nộp tiền.
- Giữ `phan_chia_cuoc`, thêm `ma_giao_dich_nop` nullable trỏ trực tiếp giao dịch nộp. NULL là chưa đưa vào thanh toán; liên kết giao dịch đang chờ là đang xử lý; liên kết giao dịch thành công là đã nộp. KHONG_THU thì xóa liên kết trong cùng transaction xử lý kết quả, không xóa giao dịch.
- Bỏ `password_reset_challenge`, `auth_rate_limit` của luồng reset.
- Gộp `cuoc_don_hang` vào `don_hang`; bỏ cột phiên bản biểu phí lặp lại và không lưu tổng cước độc lập.
- Bỏ `bao_gia`. Chọn phương án gọn: bỏ `yeu_cau_tao_don`, thay bằng khóa yêu cầu + hash nội dung trên đơn. Khóa chỉ duy nhất theo người tạo; cùng khóa nhưng khác nội dung phải từ chối.
- Bỏ `ben_thanh_toan`, `phuong_thuc_thanh_toan`. Giữ lịch sử phân công, kiện, phụ thu, nhật ký đơn và kiểm toán.
- Bảng Flyway/seed/công cụ không tính trong 16 bảng nghiệp vụ và không tạo ở bản này.

## 2. Mô hình quan hệ và lựa chọn thiết kế

16 bảng: `tai_khoan`, `khach_hang`, `tai_xe`, `phuong_tien`, `cau_hinh_cuoc`, `chinh_sach_thanh_vien`, `cau_hinh_phu_thu`, `don_hang`, `chi_tiet_kien_hang`, `phu_thu_don_hang`, `phan_cong_don_hang`, `nhat_ky_don_hang`, `nhat_ky_kiem_toan`, `phan_chia_cuoc`, `giao_dich_nop_tien`, `su_kien_thanh_toan`.

| Quan hệ | Bội số / ý nghĩa |
|---|---|
| Tài khoản → khách/tài xế | 1–0..1 mỗi loại, đúng vai trò; đăng ký phải tạo hồ sơ trong cùng transaction |
| Tài xế → xe | 1–0..1 theo phạm vi cũ; không quản lý đội xe nhiều xe/tài xế |
| Khách → đơn | 1–N; người tạo có thể là khách hoặc tổng đài |
| Đơn → kiện / phân công / nhật ký | 1–N; lịch sử phân công được giữ, tối đa một phân công còn mở |
| Đơn ↔ phụ thu | N–N qua `phu_thu_don_hang` |
| Biểu phí/chính sách → đơn | 1–N; chính sách giảm có thể NULL |
| Đơn → khoản chia | 1–0..1; chỉ phát sinh khi hoàn tất và xác nhận thu đủ |
| Phân công → khoản chia | 1–0..1; FK ghép bảo đảm phân công thuộc đúng đơn |
| Tài xế → giao dịch nộp | 1–N; tối đa một giao dịch chưa giải quyết, có thể nhiều giao dịch thành công cho các khoản khác nhau |
| Giao dịch → khoản chia | 1–N khi đang chờ/thành công; khoản chia trỏ tối đa một giao dịch hiện tại. Sau KHONG_THU giải phóng liên kết, không giữ lịch sử ghép từng đơn của lần thất bại |
| Giao dịch → sự kiện | 1–N; sự kiện không nhận diện được giao dịch có FK NULL |

### 2.1. Chuẩn hóa và dữ liệu chốt

Khóa dùng UNIQUEIDENTIFIER trong **đề xuất mới**; đây là thay đổi kiểu so với NVARCHAR(36) hiện tại, cần đổi mapping Java hoặc giữ kiểu cũ đồng bộ khi triển khai. Tiền dùng DECIMAL(15,0), không FLOAT; thời gian UTC DATETIME2(3), hiển thị UTC+7. Khoảng thời gian lọc là [từ, đến).

Không lưu ma_tx trên đơn; suy từ phân công. Không lưu số dư tài xế độc lập. Không lưu tỷ lệ 20% có thể sửa: công thức cố định trong View/hàm. Khoản chia giữ khóa đơn, phân công, thời điểm và FK giao dịch nộp nullable; số tiền suy từ giá đơn bất biến. Giao dịch lưu số tiền chốt gửi VNPay. Khi đang chờ hoặc thành công, tổng phần công ty của các khoản liên kết phải bằng số tiền đó. Giao dịch KHONG_THU vẫn lưu số tiền/kết quả nhưng không còn liên kết đơn; đây là đánh đổi chủ động để giảm hai bảng, không tuyên bố giữ toàn bộ lịch sử ghép đơn thất bại.

Giảm giá tính cả phụ thu nên CHECK trên don_hang chỉ yêu cầu tien_giam>=0; TX1 kiểm tra tỷ lệ, tự chọn phụ thu bắt buộc, tính lại giảm giá và tổng cuối cùng. Không dùng CHECK tien_giam<=cuoc_km+cuoc_kg vì giảm 100% có thể lớn hơn phần cước chưa gồm phụ thu.

Các cột cuoc_km, cuoc_kg, tien_giam trên đơn là kết quả định giá chốt khi tạo, không phải giá hiện hành. Không lặp tong_khoi_luong, tong_phu_thu, tong_cuoc thành cột vật lý. Phụ thu tham chiếu phiên bản bất biến. Địa chỉ/người nhận là thông tin của lần giao, không phụ thuộc địa chỉ mặc định mới của khách. Các bản ghi kỹ thuật JSON chỉ là chứng cứ trao đổi/audit, không thay dữ liệu quan hệ cốt lõi. Đây là cơ sở phân tích 3NF; snapshot và các cột kỹ thuật cần giải thích riêng, không khẳng định mọi dữ liệu dẫn xuất tự động đạt 3NF.

Đơn giá và kiện/phụ thu không sửa sau khi tạo: muốn thay nội dung đơn thì hủy trước lấy hàng rồi tạo lại. CRUD sửa/xóa áp dụng cho dữ liệu danh mục/hồ sơ và chính sách NHAP; đơn tài chính dùng hủy, không xóa vật lý. Chính sách công bố không sửa nội dung; chỉ đóng hiệu lực tương lai theo thủ tục ở mục 7.9. Khoảng hiệu lực không được chồng trong cùng nhóm chính sách.

## 3. [V1] SQL tạo bảng đề xuất

Khối 3–7 là SQL định nghĩa; không có DROP DATABASE, USE, seed hay thao tác lên DB hiện tại. Thứ tự: bảng → index → hàm/view → trigger → thủ tục. Đã rà tĩnh, **chưa biên dịch/chạy SQL Server**. Những trách nhiệm chưa có thủ tục đầy đủ được đánh dấu ở mục 8, không xem bản thảo là backend hoàn chỉnh.

```sql
-- FILE: V1__create_business_tables.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE TABLE dbo.tai_khoan (
 ma_tk UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 username NVARCHAR(50) NOT NULL UNIQUE,
 mat_khau_hash NVARCHAR(255) NOT NULL,
 ho_ten NVARCHAR(100) NOT NULL,
 so_dien_thoai VARCHAR(10) NULL,
 email NVARCHAR(150) NULL,
 vai_tro VARCHAR(20) NOT NULL,
 trang_thai VARCHAR(15) NOT NULL DEFAULT 'HOAT_DONG',
 auth_version BIGINT NOT NULL DEFAULT 0,
 ngay_tao DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT ck_tk_role CHECK(vai_tro IN ('KHACH_HANG','TAI_XE','TONG_DAI','CHU_DOI_XE')),
 CONSTRAINT ck_tk_status CHECK(trang_thai IN ('HOAT_DONG','KHOA')),
 CONSTRAINT ck_tk_phone CHECK(so_dien_thoai IS NULL OR
   (LEN(so_dien_thoai)=10 AND so_dien_thoai NOT LIKE '%[^0-9]%' AND LEFT(so_dien_thoai,1)='0')),
 CONSTRAINT ck_tk_text CHECK(LEN(LTRIM(RTRIM(username)))>0 AND LEN(LTRIM(RTRIM(ho_ten)))>0 AND LEN(mat_khau_hash)>0),
 CONSTRAINT ck_tk_username CHECK(username COLLATE Latin1_General_100_BIN2=LOWER(username) COLLATE Latin1_General_100_BIN2
  AND DATALENGTH(username)=DATALENGTH(LTRIM(RTRIM(username))) AND username NOT LIKE N'% %'),
 CONSTRAINT ck_tk_version CHECK(auth_version>=0)
);
CREATE TABLE dbo.khach_hang (
 ma_kh UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_khoan(ma_tk),
 dia_chi_mac_dinh NVARCHAR(255) NULL,
 ma_hang VARCHAR(15) NOT NULL DEFAULT 'THUONG',
 thanh_vien_tu DATETIME2(3) NULL, thanh_vien_den DATETIME2(3) NULL,
 CONSTRAINT ck_kh_hang CHECK(ma_hang IN ('THUONG','BAC','VANG','KIM_CUONG')),
 CONSTRAINT ck_kh_dates CHECK(
  (ma_hang='THUONG' AND thanh_vien_tu IS NULL AND thanh_vien_den IS NULL) OR
  (ma_hang<>'THUONG' AND thanh_vien_tu IS NOT NULL AND (thanh_vien_den IS NULL OR thanh_vien_den>thanh_vien_tu)))
);
CREATE TABLE dbo.tai_xe (
 ma_tx UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_khoan(ma_tk),
 cccd VARCHAR(12) NOT NULL UNIQUE, so_giay_phep NVARCHAR(50) NOT NULL UNIQUE,
 ngay_het_han_gplx DATE NOT NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'OFFLINE',
 ranh_tu DATETIME2(3) NULL,
 vi_tri_demo_dia_chi NVARCHAR(255) NULL,
 vi_tri_demo_lat DECIMAL(10,7) NULL, vi_tri_demo_lng DECIMAL(10,7) NULL,
 vi_tri_demo_luc DATETIME2(3) NULL,
 vi_tri_demo_nguon VARCHAR(30) NULL,
 CONSTRAINT ck_tx_status CHECK(trang_thai IN ('ONLINE','OFFLINE','NGHI')),
 CONSTRAINT ck_tx_queue CHECK(trang_thai='ONLINE' OR ranh_tu IS NULL),
 CONSTRAINT ck_tx_cccd CHECK(LEN(cccd)=12 AND cccd NOT LIKE '%[^0-9]%'),
 CONSTRAINT ck_tx_position CHECK(
  (vi_tri_demo_dia_chi IS NULL AND vi_tri_demo_lat IS NULL AND vi_tri_demo_lng IS NULL AND vi_tri_demo_luc IS NULL AND vi_tri_demo_nguon IS NULL) OR
  (vi_tri_demo_dia_chi IS NOT NULL AND vi_tri_demo_lat IS NOT NULL AND vi_tri_demo_lng IS NOT NULL AND vi_tri_demo_luc IS NOT NULL
   AND vi_tri_demo_nguon IS NOT NULL AND vi_tri_demo_nguon='DEMO_CO_DINH'
   AND LEN(LTRIM(RTRIM(vi_tri_demo_dia_chi)))>0
   AND vi_tri_demo_lat BETWEEN -90 AND 90 AND vi_tri_demo_lng BETWEEN -180 AND 180))
);
CREATE TABLE dbo.phuong_tien (
 ma_phuong_tien UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tx UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_xe(ma_tx),
 bien_so NVARCHAR(15) NOT NULL UNIQUE, loai_xe NVARCHAR(50) NOT NULL,
 mau_xe NVARCHAR(30) NULL, dang_hoat_dong BIT NOT NULL DEFAULT 1
);
CREATE TABLE dbo.cau_hinh_cuoc (
 ma_bieu_phi UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ten NVARCHAR(100) NOT NULL,
 cuoc_co_ban DECIMAL(15,0) NOT NULL, don_gia_km DECIMAL(15,0) NOT NULL,
 km_toi_thieu DECIMAL(10,2) NOT NULL, km_toi_da DECIMAL(10,2) NOT NULL,
 kg_bao_gom DECIMAL(10,2) NOT NULL, kg_toi_da DECIMAL(10,2) NOT NULL,
 don_gia_kg DECIMAL(15,0) NOT NULL,
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_cuoc_values CHECK(cuoc_co_ban>=0 AND don_gia_km>=0 AND don_gia_kg>=0
  AND km_toi_thieu>=0 AND km_toi_da>=km_toi_thieu AND kg_bao_gom>=0 AND kg_toi_da>=kg_bao_gom),
 CONSTRAINT ck_cuoc_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_cuoc_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.chinh_sach_thanh_vien (
 ma_chinh_sach UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_hang VARCHAR(15) NOT NULL, ty_le_giam DECIMAL(5,2) NOT NULL,
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_cs_hang CHECK(ma_hang IN ('BAC','VANG','KIM_CUONG')),
 CONSTRAINT ck_cs_rate CHECK(ty_le_giam BETWEEN 0 AND 100),
 CONSTRAINT ck_cs_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_cs_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.cau_hinh_phu_thu (
 ma_phu_thu UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_loai VARCHAR(30) NOT NULL, ten NVARCHAR(100) NOT NULL,
 bat_buoc BIT NOT NULL DEFAULT 1,
 so_tien DECIMAL(15,0) NOT NULL CHECK(so_tien>=0),
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_pt_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_pt_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.don_hang (
 ma_don UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_kh UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.khach_hang(ma_kh),
 ma_tk_tao UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 khoa_yeu_cau VARCHAR(100) NOT NULL, hash_yeu_cau BINARY(32) NOT NULL,
 ma_bieu_phi UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.cau_hinh_cuoc(ma_bieu_phi),
 ma_chinh_sach UNIQUEIDENTIFIER NULL REFERENCES dbo.chinh_sach_thanh_vien(ma_chinh_sach),
 diem_lay NVARCHAR(255) NOT NULL, diem_giao NVARCHAR(255) NOT NULL,
 ten_nguoi_nhan NVARCHAR(100) NOT NULL, sdt_nguoi_nhan VARCHAR(10) NOT NULL,
 quang_duong_km DECIMAL(10,2) NOT NULL CHECK(quang_duong_km>0),
 thoi_gian_du_kien_giay INT NOT NULL CHECK(thoi_gian_du_kien_giay>0),
 nguon_lo_trinh VARCHAR(10) NOT NULL CHECK(nguon_lo_trinh IN ('GOONG','DEMO')),
 cuoc_km DECIMAL(15,0) NOT NULL, cuoc_kg DECIMAL(15,0) NOT NULL, tien_giam DECIMAL(15,0) NOT NULL,
 ghi_chu NVARCHAR(500) NULL,
 trang_thai VARCHAR(20) NOT NULL DEFAULT 'CHO_GAN',
 tao_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 hoan_tat_luc DATETIME2(3) NULL, huy_luc DATETIME2(3) NULL, ly_do_huy NVARCHAR(500) NULL,
 CONSTRAINT uq_don_request UNIQUE(ma_tk_tao,khoa_yeu_cau),
 CONSTRAINT ck_don_phone CHECK(LEN(sdt_nguoi_nhan)=10 AND sdt_nguoi_nhan NOT LIKE '%[^0-9]%' AND LEFT(sdt_nguoi_nhan,1)='0'),
 CONSTRAINT ck_don_money CHECK(cuoc_km>=0 AND cuoc_kg>=0 AND tien_giam>=0),
 CONSTRAINT ck_don_status CHECK(trang_thai IN ('CHO_GAN','DA_GAN','DA_LAY_HANG','DANG_GIAO','HOAN_TAT','DA_HUY')),
 CONSTRAINT ck_don_terminal CHECK(
  (trang_thai='HOAN_TAT' AND hoan_tat_luc IS NOT NULL AND hoan_tat_luc>=tao_luc AND huy_luc IS NULL AND ly_do_huy IS NULL) OR
  (trang_thai='DA_HUY' AND huy_luc IS NOT NULL AND huy_luc>=tao_luc AND ly_do_huy IS NOT NULL AND hoan_tat_luc IS NULL) OR
  (trang_thai NOT IN ('HOAN_TAT','DA_HUY') AND hoan_tat_luc IS NULL AND huy_luc IS NULL AND ly_do_huy IS NULL))
);
CREATE TABLE dbo.chi_tiet_kien_hang (
 ma_kien UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 thu_tu INT NOT NULL CHECK(thu_tu>0), loai_hang NVARCHAR(100) NOT NULL,
 khoi_luong_kg DECIMAL(10,2) NOT NULL CHECK(khoi_luong_kg>0), ghi_chu NVARCHAR(500) NULL,
 CONSTRAINT uq_kien_order UNIQUE(ma_don,thu_tu)
);
CREATE TABLE dbo.phu_thu_don_hang (
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_phu_thu UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.cau_hinh_phu_thu(ma_phu_thu),
 PRIMARY KEY(ma_don,ma_phu_thu)
);
CREATE TABLE dbo.phan_cong_don_hang (
 ma_phan_cong UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_tx UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_xe(ma_tx),
 ma_tk_dieu_phoi UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 bat_dau_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), ket_thuc_luc DATETIME2(3) NULL,
 ket_qua VARCHAR(15) NULL, ly_do NVARCHAR(500) NULL,
 CONSTRAINT uq_pc_pair UNIQUE(ma_don,ma_phan_cong),
 CONSTRAINT ck_pc_end CHECK((ket_thuc_luc IS NULL AND ket_qua IS NULL) OR
  (ket_thuc_luc IS NOT NULL AND ket_qua IS NOT NULL AND ket_thuc_luc>=bat_dau_luc AND ket_qua IN ('TU_CHOI','HOAN_TAT','HUY_DON')))
);
CREATE TABLE dbo.nhat_ky_don_hang (
 ma_su_kien BIGINT IDENTITY PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_tk UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 loai VARCHAR(25) NOT NULL CHECK(loai IN ('TAO_DON','CHUYEN_TRANG_THAI','DEN_DIEM_NHAN','SU_CO')),
 trang_thai_truoc VARCHAR(20) NULL, trang_thai_sau VARCHAR(20) NOT NULL,
 thoi_gian DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), ghi_chu NVARCHAR(500) NULL
);
CREATE TABLE dbo.nhat_ky_kiem_toan (
 ma_audit BIGINT IDENTITY PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NULL REFERENCES dbo.tai_khoan(ma_tk),
 doi_tuong VARCHAR(50) NOT NULL, ma_doi_tuong UNIQUEIDENTIFIER NOT NULL,
 hanh_dong VARCHAR(30) NOT NULL, thoi_gian DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 noi_dung NVARCHAR(MAX) NULL CHECK(noi_dung IS NULL OR ISJSON(noi_dung)=1)
);
CREATE TABLE dbo.phan_chia_cuoc (
 ma_don UNIQUEIDENTIFIER NOT NULL PRIMARY KEY REFERENCES dbo.don_hang(ma_don),
 ma_phan_cong UNIQUEIDENTIFIER NOT NULL UNIQUE,
 ghi_nhan_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT fk_chia_pc FOREIGN KEY(ma_don,ma_phan_cong) REFERENCES dbo.phan_cong_don_hang(ma_don,ma_phan_cong)
);
CREATE TABLE dbo.giao_dich_nop_tien (
 ma_giao_dich UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tx UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_xe(ma_tx),
 khoa_yeu_cau VARCHAR(100) NOT NULL,
 CONSTRAINT uq_gd_request UNIQUE(ma_tx,khoa_yeu_cau),
 ma_tham_chieu VARCHAR(100) NOT NULL UNIQUE,
 so_tien_yeu_cau DECIMAL(15,0) NOT NULL CHECK(so_tien_yeu_cau>0),
 trang_thai VARCHAR(20) NOT NULL DEFAULT 'CHO_XU_LY',
 tao_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), giai_quyet_luc DATETIME2(3) NULL,
 ma_giao_dich_doi_tac VARCHAR(100) NULL, so_tien_thuc_nhan DECIMAL(15,0) NULL,
 payment_url NVARCHAR(2048) NULL,
 CONSTRAINT ck_gd_state CHECK(
  (trang_thai IN ('CHO_XU_LY','CHUA_RO_KET_QUA') AND giai_quyet_luc IS NULL AND ma_giao_dich_doi_tac IS NULL AND so_tien_thuc_nhan IS NULL) OR
  (trang_thai='KHONG_THU' AND giai_quyet_luc IS NOT NULL AND ma_giao_dich_doi_tac IS NULL AND so_tien_thuc_nhan IS NULL) OR
  (trang_thai='THANH_CONG' AND giai_quyet_luc IS NOT NULL AND ma_giao_dich_doi_tac IS NOT NULL AND so_tien_thuc_nhan IS NOT NULL AND so_tien_thuc_nhan=so_tien_yeu_cau)),
 CONSTRAINT ck_gd_time CHECK(giai_quyet_luc IS NULL OR giai_quyet_luc>=tao_luc)
);
ALTER TABLE dbo.phan_chia_cuoc ADD ma_giao_dich_nop UNIQUEIDENTIFIER NULL
 CONSTRAINT fk_chia_gd REFERENCES dbo.giao_dich_nop_tien(ma_giao_dich);
CREATE TABLE dbo.su_kien_thanh_toan (
 ma_su_kien BIGINT IDENTITY PRIMARY KEY,
 ma_giao_dich UNIQUEIDENTIFIER NULL REFERENCES dbo.giao_dich_nop_tien(ma_giao_dich),
 nguon VARCHAR(15) NOT NULL CHECK(nguon IN ('IPN','QUERY','RETURN')),
 khoa_su_kien BINARY(32) NOT NULL,
 chu_ky_hop_le BIT NOT NULL,
 ket_qua VARCHAR(25) NOT NULL CHECK(ket_qua IN ('DA_AP_DUNG','KHONG_THAY_DOI','KHONG_HOP_LE','KHONG_KHOP','CAN_DOI_SOAT')),
 nhan_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 noi_dung_json NVARCHAR(MAX) NOT NULL CHECK(ISJSON(noi_dung_json)=1),
 CONSTRAINT uq_event UNIQUE(nguon,khoa_su_kien)
);
GO
```

## 4. [V2] Index và ràng buộc duy nhất

Index duy nhất bảo vệ bất biến ngay cả khi có hai request. Index thường phục vụ tra cứu cụ thể; không tính tạo nhiều index là đã chứng minh hiệu năng.

```sql
-- FILE: V2__create_indexes.sql
CREATE UNIQUE INDEX ux_tk_phone ON dbo.tai_khoan(so_dien_thoai) WHERE so_dien_thoai IS NOT NULL;
CREATE UNIQUE INDEX ux_pc_open_order ON dbo.phan_cong_don_hang(ma_don) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_open_driver ON dbo.phan_cong_don_hang(ma_tx) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_done ON dbo.phan_cong_don_hang(ma_don) WHERE ket_qua='HOAN_TAT';
-- Một filter IS NULL bao phủ cả hai trạng thái chưa giải quyết, không dùng hai index rời.
CREATE UNIQUE INDEX ux_gd_open ON dbo.giao_dich_nop_tien(ma_tx) WHERE giai_quyet_luc IS NULL;
CREATE UNIQUE INDEX ux_gd_partner ON dbo.giao_dich_nop_tien(ma_giao_dich_doi_tac) WHERE ma_giao_dich_doi_tac IS NOT NULL;
CREATE UNIQUE INDEX ux_arrival ON dbo.nhat_ky_don_hang(ma_don) WHERE loai='DEN_DIEM_NHAN';
CREATE INDEX ix_don_customer_time ON dbo.don_hang(ma_kh,tao_luc DESC) INCLUDE(trang_thai);
CREATE INDEX ix_don_queue ON dbo.don_hang(trang_thai,tao_luc) INCLUDE(ma_kh);
CREATE INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang(ma_tx,bat_dau_luc DESC) INCLUDE(ma_don,ket_qua);
CREATE INDEX ix_log_order_time ON dbo.nhat_ky_don_hang(ma_don,thoi_gian,ma_su_kien);
CREATE INDEX ix_gd_driver_time ON dbo.giao_dich_nop_tien(ma_tx,tao_luc DESC) INCLUDE(trang_thai,so_tien_yeu_cau);
CREATE INDEX ix_chia_payment ON dbo.phan_chia_cuoc(ma_giao_dich_nop) INCLUDE(ma_phan_cong);
CREATE INDEX ix_audit_object ON dbo.nhat_ky_kiem_toan(doi_tuong,ma_doi_tuong,thoi_gian DESC);
GO
```

## 5. Năm Function và các View phục vụ ứng dụng

Công thức giữ cách tính cũ: cước km = cơ bản + km × đơn giá; km_toi_thieu là điều kiện phạm vi, không phải km miễn phí. Giảm giá áp dụng trên cước km + kg + toàn bộ phụ thu đã chọn, giữ hành vi QuoteService hiện tại. Làm tròn giảm giá đến đồng trước khi tính tổng cuối cùng. Các tham số âm/ngoài phạm vi phải bị thủ tục từ chối trước khi gọi hàm.

### 5.1. [V3] Bốn scalar function tính tiền

```sql
-- FILE: V3__create_fare_functions.sql
CREATE OR ALTER FUNCTION dbo.fn_cuoc_km(@co_ban DECIMAL(15,0), @km DECIMAL(10,2), @don_gia DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@co_ban+@km*@don_gia,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_cuoc_kg(@kg DECIMAL(10,2), @bao_gom DECIMAL(10,2), @don_gia DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(CASE WHEN @kg>@bao_gom THEN (@kg-@bao_gom)*@don_gia ELSE 0 END,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_tien_giam(@cuoc DECIMAL(15,0), @ty_le DECIMAL(5,2))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@cuoc*@ty_le/100,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_phan_cong_ty(@tong DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@tong*CAST(0.20 AS DECIMAL(3,2)),0)); END;
GO
```

### 5.2. [V4] Tám view nghiệp vụ

```sql
-- FILE: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_cuoc_don AS
SELECT d.ma_don,d.ma_kh,d.trang_thai,d.tao_luc,d.hoan_tat_luc,
 d.cuoc_km,d.cuoc_kg,d.tien_giam,
 COALESCE(p.phu_thu,0) AS phu_thu,
 CONVERT(DECIMAL(15,0),d.cuoc_km+d.cuoc_kg-d.tien_giam+COALESCE(p.phu_thu,0)) AS tong_cuoc
FROM dbo.don_hang d OUTER APPLY (
 SELECT SUM(c.so_tien) phu_thu FROM dbo.phu_thu_don_hang x
 JOIN dbo.cau_hinh_phu_thu c ON c.ma_phu_thu=x.ma_phu_thu WHERE x.ma_don=d.ma_don
) p;
GO
CREATE OR ALTER VIEW dbo.v_chia_cuoc AS
SELECT c.ma_don,p.ma_tx,c.ghi_nhan_luc,c.ma_giao_dich_nop,v.tong_cuoc,
 dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_cong_ty,
 v.tong_cuoc-dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_tai_xe
FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong
JOIN dbo.v_cuoc_don v ON v.ma_don=c.ma_don;
GO
CREATE OR ALTER VIEW dbo.v_giao_dich_nop AS
SELECT g.ma_giao_dich,g.ma_tx,g.ma_tham_chieu,g.trang_thai,g.tao_luc,g.giai_quyet_luc,
 g.so_tien_yeu_cau,g.so_tien_thuc_nhan,COUNT(c.ma_don) AS so_don_dang_lien_ket,
 COALESCE(SUM(c.tien_cong_ty),0) AS tong_khoan_lien_ket
FROM dbo.giao_dich_nop_tien g LEFT JOIN dbo.v_chia_cuoc c ON c.ma_giao_dich_nop=g.ma_giao_dich
GROUP BY g.ma_giao_dich,g.ma_tx,g.ma_tham_chieu,g.trang_thai,g.tao_luc,g.giai_quyet_luc,g.so_tien_yeu_cau,g.so_tien_thuc_nhan;
GO
CREATE OR ALTER VIEW dbo.v_so_du_tai_xe AS
SELECT t.ma_tx,
 COALESCE(SUM(c.tong_cuoc),0) AS tong_cuoc_da_thu,
 COALESCE(SUM(c.tien_tai_xe),0) AS thu_nhap_tai_xe,
 COALESCE(SUM(c.tien_cong_ty),0) AS cong_ty_duoc_huong,
 COALESCE(SUM(CASE WHEN g.trang_thai='THANH_CONG' THEN c.tien_cong_ty ELSE 0 END),0) AS da_nop,
 COALESCE(SUM(CASE WHEN g.trang_thai='THANH_CONG' THEN 0 ELSE c.tien_cong_ty END),0) AS con_phai_nop,
 COALESCE(SUM(CASE WHEN g.giai_quyet_luc IS NULL AND g.ma_giao_dich IS NOT NULL THEN c.tien_cong_ty ELSE 0 END),0) AS dang_thanh_toan,
 COALESCE(SUM(CASE WHEN c.ma_giao_dich_nop IS NULL THEN c.tien_cong_ty ELSE 0 END),0) AS chua_dua_vao_thanh_toan
FROM dbo.tai_xe t LEFT JOIN dbo.v_chia_cuoc c ON c.ma_tx=t.ma_tx
LEFT JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=c.ma_giao_dich_nop GROUP BY t.ma_tx;
GO
CREATE OR ALTER VIEW dbo.v_don_cho_dieu_phoi AS
SELECT ma_don,ma_kh,diem_lay,diem_giao,tao_luc FROM dbo.don_hang WHERE trang_thai='CHO_GAN';
GO
CREATE OR ALTER VIEW dbo.v_tai_xe_san_sang AS
SELECT t.ma_tx,k.ho_ten,t.ranh_tu,p.bien_so FROM dbo.tai_xe t
JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx
WHERE t.trang_thai='ONLINE' AND t.ranh_tu IS NOT NULL
 AND k.trang_thai='HOAT_DONG' AND p.dang_hoat_dong=1
 AND t.ngay_het_han_gplx>=CONVERT(DATE,DATEADD(HOUR,7,SYSUTCDATETIME()))
 AND NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang a WHERE a.ma_tx=t.ma_tx AND a.ket_thuc_luc IS NULL);
GO
CREATE OR ALTER VIEW dbo.v_cong_ty_thuc_nhan_ngay AS
SELECT CONVERT(DATE,DATEADD(HOUR,7,giai_quyet_luc)) AS ngay_vn,
 SUM(so_tien_thuc_nhan) AS thuc_nhan,COUNT_BIG(*) AS so_giao_dich
FROM dbo.giao_dich_nop_tien WHERE trang_thai='THANH_CONG'
GROUP BY CONVERT(DATE,DATEADD(HOUR,7,giai_quyet_luc));
GO
CREATE OR ALTER VIEW dbo.v_phien_ban_chinh_sach AS
SELECT 'CUOC' AS loai,ma_bieu_phi AS ma,'CUOC' AS nhom,hieu_luc_tu,hieu_luc_den,trang_thai FROM dbo.cau_hinh_cuoc
UNION ALL
SELECT 'THANH_VIEN',ma_chinh_sach,ma_hang,hieu_luc_tu,hieu_luc_den,trang_thai FROM dbo.chinh_sach_thanh_vien
UNION ALL
SELECT 'PHU_THU',ma_phu_thu,ma_loai,hieu_luc_tu,hieu_luc_den,trang_thai FROM dbo.cau_hinh_phu_thu;
GO
```

### 5.3. [V5] Table-valued function thu nhập tài xế

```sql
-- FILE: V5__create_driver_income_function.sql
CREATE OR ALTER FUNCTION dbo.fn_thu_nhap_tai_xe(@ma_tx UNIQUEIDENTIFIER,@tu DATETIME2(3),@den DATETIME2(3))
RETURNS TABLE AS RETURN (
 SELECT COUNT_BIG(*) AS so_don,COALESCE(SUM(tong_cuoc),0) AS tong_cuoc,
 COALESCE(SUM(tien_tai_xe),0) AS thu_nhap,COALESCE(SUM(tien_cong_ty),0) AS phan_cong_ty
 FROM dbo.v_chia_cuoc WHERE ma_tx=@ma_tx AND ghi_nhan_luc>=@tu AND ghi_nhan_luc<@den
);
GO
```

Ứng dụng gọi ba hàm giá khi báo giá/tạo đơn; View chia cước dùng fn_phan_cong_ty; màn thu nhập gọi TVF fn_thu_nhap_tai_xe. Màn công nợ dùng v_so_du_tai_xe không lọc ngày. View công nợ JOIN mỗi khoản chia với tối đa một giao dịch để không nhân số tiền. Giao diện chính chỉ cần số Cần nộp và nút Thanh toán; các cột đang xử lý phục vụ giải thích khi có thanh toán chưa rõ. Không cần màn quản lý đợt.

## 6. [V6] Trigger và ranh giới toàn vẹn

Trigger xử lý theo tập inserted/deleted, không giả định một dòng. Không dùng trigger gọi HTTP/VNPay. Trigger nhật ký là nơi duy nhất ghi sự kiện tạo/chuyển trạng thái; code chỉ ghi đến điểm nhận/sự cố. SESSION_CONTEXT('ma_tk') do backend xác thực thiết lập trên kết nối, không lấy trực tiếp từ body của khách; thiếu ngữ cảnh thì từ chối thao tác đơn. Đây là hợp đồng tích hợp, không phải cơ chế chống giả mạo dành cho người tự có quyền kết nối DB.

```sql
-- FILE: V6__create_integrity_triggers.sql
CREATE OR ALTER TRIGGER dbo.tr_kh_role ON dbo.khach_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'KHACH_HANG')
  THROW 51001,N'Hồ sơ khách sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tx_role ON dbo.tai_xe AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'TAI_XE')
  THROW 51002,N'Hồ sơ tài xế sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tk_role_audit ON dbo.tai_khoan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.vai_tro<>d.vai_tro)
  THROW 51003,N'Không đổi vai trò tài khoản đã tạo',1;
 INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
 SELECT TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),'TAI_KHOAN',i.ma_tk,'DOI_TRANG_THAI',
  (SELECT d.trang_thai AS truoc,i.trang_thai AS sau FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.trang_thai<>d.trang_thai;
 -- Không ghi hash/mật khẩu/token vào audit.
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_don_transition_log ON dbo.don_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 IF @actor IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG')
  THROW 51004,N'Thiếu tài khoản thao tác hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don
  WHERE d.ma_don IS NULL AND i.trang_thai<>'CHO_GAN') THROW 51005,N'Đơn mới phải chờ gán',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don WHERE i.trang_thai<>d.trang_thai AND NOT(
  (d.trang_thai='CHO_GAN' AND i.trang_thai IN ('DA_GAN','DA_HUY')) OR
  (d.trang_thai='DA_GAN' AND i.trang_thai IN ('CHO_GAN','DA_LAY_HANG','DA_HUY')) OR
  (d.trang_thai='DA_LAY_HANG' AND i.trang_thai='DANG_GIAO') OR
  (d.trang_thai='DANG_GIAO' AND i.trang_thai='HOAN_TAT')))
  THROW 51006,N'Chuyển trạng thái không hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don
  WHERE EXISTS(SELECT i.ma_kh,i.ma_tk_tao,i.khoa_yeu_cau,i.hash_yeu_cau,i.ma_bieu_phi,i.ma_chinh_sach,
   i.cuoc_km,i.cuoc_kg,i.tien_giam,i.quang_duong_km,i.diem_lay,i.diem_giao,i.ten_nguoi_nhan,i.sdt_nguoi_nhan
   EXCEPT SELECT d.ma_kh,d.ma_tk_tao,d.khoa_yeu_cau,d.hash_yeu_cau,d.ma_bieu_phi,d.ma_chinh_sach,
   d.cuoc_km,d.cuoc_kg,d.tien_giam,d.quang_duong_km,d.diem_lay,d.diem_giao,d.ten_nguoi_nhan,d.sdt_nguoi_nhan))
  THROW 51007,N'Không sửa nội dung/giá đơn đã tạo',1;
 INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
 SELECT i.ma_don,@actor,CASE WHEN d.ma_don IS NULL THEN 'TAO_DON' ELSE 'CHUYEN_TRANG_THAI' END,d.trang_thai,i.trang_thai
 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don WHERE d.ma_don IS NULL OR d.trang_thai<>i.trang_thai;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_chia_hop_le ON dbo.phan_chia_cuoc AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_don=d.ma_don WHERE i.ma_don IS NULL)
  THROW 51008,N'Không xóa khoản chia',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don
  WHERE i.ma_phan_cong<>d.ma_phan_cong OR i.ghi_nhan_luc<>d.ghi_nhan_luc)
  THROW 51009,N'Không sửa nguồn/thời điểm khoản chia',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.don_hang d ON d.ma_don=i.ma_don
  JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=i.ma_phan_cong
  WHERE d.trang_thai<>'HOAN_TAT' OR p.ket_qua IS NULL OR p.ket_qua<>'HOAN_TAT')
  THROW 51010,N'Chỉ chia cước cho phân công hoàn tất',1;
 -- Không chuyển trực tiếp liên kết giữa hai giao dịch. Chỉ tháo sau KHONG_THU.
 IF EXISTS(SELECT 1 FROM deleted d JOIN inserted i ON i.ma_don=d.ma_don
  JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=d.ma_giao_dich_nop
  WHERE (i.ma_giao_dich_nop IS NULL OR i.ma_giao_dich_nop<>d.ma_giao_dich_nop)
   AND (i.ma_giao_dich_nop IS NOT NULL OR g.trang_thai<>'KHONG_THU'))
  THROW 51011,N'Không tháo khoản đang chờ hoặc đã nộp',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don
  JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=i.ma_giao_dich_nop
  JOIN dbo.v_chia_cuoc c ON c.ma_don=i.ma_don
  WHERE (d.ma_don IS NULL OR d.ma_giao_dich_nop IS NULL)
   AND (g.giai_quyet_luc IS NOT NULL OR g.ma_tx<>c.ma_tx OR c.tien_cong_ty<=0))
  THROW 51012,N'Liên kết giao dịch sai tài xế/trạng thái/số tiền',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_gd_bao_ve ON dbo.giao_dich_nop_tien AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_giao_dich=d.ma_giao_dich WHERE i.ma_giao_dich IS NULL)
  THROW 51013,N'Không xóa giao dịch',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_giao_dich=i.ma_giao_dich
  WHERE d.ma_giao_dich IS NULL AND i.trang_thai<>'CHO_XU_LY')
  THROW 51014,N'Giao dịch mới phải chờ xử lý',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_giao_dich=i.ma_giao_dich
  WHERE i.ma_tx<>d.ma_tx OR i.khoa_yeu_cau<>d.khoa_yeu_cau OR i.ma_tham_chieu<>d.ma_tham_chieu OR i.so_tien_yeu_cau<>d.so_tien_yeu_cau OR i.tao_luc<>d.tao_luc
   OR (d.giai_quyet_luc IS NOT NULL AND EXISTS(SELECT i.trang_thai,i.giai_quyet_luc,i.ma_giao_dich_doi_tac,i.so_tien_thuc_nhan
     EXCEPT SELECT d.trang_thai,d.giai_quyet_luc,d.ma_giao_dich_doi_tac,d.so_tien_thuc_nhan)))
  THROW 51016,N'Không đổi định danh/số tiền/kết quả đã chốt',1;
 -- INSERT giao dịch xảy ra trước khi gắn khoản chia trong cùng TX4.
 -- Khi thành công bắt buộc các khoản đang gắn khớp số tiền đã yêu cầu.
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.v_giao_dich_nop v ON v.ma_giao_dich=i.ma_giao_dich
  WHERE i.trang_thai='THANH_CONG' AND (v.so_don_dang_lien_ket=0 OR v.tong_khoan_lien_ket<>i.so_tien_yeu_cau))
  THROW 51017,N'Số tiền thành công không khớp các khoản chia',1;
END;
GO
```

Ba trigger chính sách bên dưới giữ nội dung phiên bản đã công bố; cho phép đóng hieu_luc_den một lần ở tương lai. Việc kiểm tra chồng thời gian được thủ tục công bố/đóng hiệu lực ở mục 7.9 bảo vệ dưới cùng khóa `chinh-sach` với TX1. Không chỉ dựa vào UNIQUE mốc bắt đầu.

```sql
-- FILE: V6__create_integrity_triggers.sql
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_cuoc ON dbo.cau_hinh_cuoc AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_bieu_phi=d.ma_bieu_phi
 WHERE d.trang_thai='CONG_BO' AND (i.ma_bieu_phi IS NULL
  OR EXISTS(SELECT i.ten,i.cuoc_co_ban,i.don_gia_km,i.km_toi_thieu,i.km_toi_da,i.kg_bao_gom,i.kg_toi_da,i.don_gia_kg,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ten,d.cuoc_co_ban,d.don_gia_km,d.km_toi_thieu,d.km_toi_da,d.kg_bao_gom,d.kg_toi_da,d.don_gia_kg,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_chinh_sach_thanh_vien ON dbo.chinh_sach_thanh_vien AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_chinh_sach=d.ma_chinh_sach
 WHERE d.trang_thai='CONG_BO' AND (i.ma_chinh_sach IS NULL
  OR EXISTS(SELECT i.ma_hang,i.ty_le_giam,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_hang,d.ty_le_giam,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_phu_thu ON dbo.cau_hinh_phu_thu AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_phu_thu=d.ma_phu_thu
 WHERE d.trang_thai='CONG_BO' AND (i.ma_phu_thu IS NULL
  OR EXISTS(SELECT i.ma_loai,i.ten,i.so_tien,i.bat_buoc,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_loai,d.ten,d.so_tien,d.bat_buoc,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
```

Đã có 9 trigger có mã cụ thể. FK/CHECK không thay kiểm tra quyền trên từng dòng. Quy tắc “đơn có ít nhất một kiện”, “đơn hoàn tất có khoản chia”, “giao dịch chưa giải quyết/thành công liên kết đúng tổng tiền”, “KHONG_THU không giữ khoản chia” cần thủ tục transaction và chặn DML trực tiếp. Không có trigger tổng tiền lúc INSERT giao dịch vì các khoản được gắn ngay sau đó trong cùng TX4.

## 7. [V7] Stored Procedure và transaction

Các thủ tục ghi bên dưới tự sở hữu transaction, không gọi bên trong transaction Java đang mở. JDBC gọi ở chế độ phù hợp và không giữ khóa trong lúc người dùng mở VNPay. Cùng tài xế dùng khóa `nop:<ma_tx>` cho bắt đầu thanh toán, ghi nhận hoàn tất và callback. Luồng điều phối dùng khóa `dieu-phoi` trước rồi mới lấy khóa tài chính tài xế; không đảo thứ tự. Đây là phương án ưu tiên dễ chứng minh cho bài học, chấp nhận tuần tự hóa điều phối; sau này có thể thay khóa toàn cục bằng khóa theo đơn/tài xế có thứ tự cố định.

Các tham số được coi là dữ liệu đầu vào; danh tính actor luôn từ kết nối backend đã xác thực. Các thủ tục kiểm tra vai trò và quyền sở hữu bổ sung. Role SQL giới hạn ai được EXECUTE; backend không đưa mật khẩu DB cho trình duyệt.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_khoa @tai_nguyen NVARCHAR(255) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @r INT;
 EXEC @r=sys.sp_getapplock @Resource=@tai_nguyen,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @r<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_actor @ma_tk UNIQUEIDENTIFIER OUTPUT,@vai_tro VARCHAR(20) OUTPUT AS
BEGIN
 SET NOCOUNT ON;
 SET @ma_tk=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 SET @vai_tro=NULL;
 SELECT @vai_tro=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@ma_tk AND trang_thai='HOAT_DONG';
 IF @vai_tro IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
END;
GO
```

### 7.1. Tạo đơn — TX1

Đầu vào kiện JSON: [{"thu_tu":1,"loai_hang":"Sách","kg":2.5}]; phụ thu JSON: mảng chuỗi UUID của phụ thu **tùy chọn** (`bat_buoc=0`); `[]` nghĩa là không chọn thêm. Phụ thu `bat_buoc=1` đang hiệu lực luôn được SQL tự thêm. Thuộc tính bắt buộc/tùy chọn thuộc phiên bản chính sách, không được đổi sau công bố. JSON chỉ là tham số vận chuyển, không lưu thay các dòng kiện/phụ thu. Backend chuẩn hóa nội dung và tự tính SHA-256; không tin hash do trình duyệt cung cấp. Khoảng cách/thời gian do backend lấy từ provider, không tin số km trong request người dùng. Giá xem trước truyền lại để so với giá vừa tính; khác giá thì rollback và yêu cầu xác nhận lại.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_tao_don
 @ma_kh UNIQUEIDENTIFIER,@khoa VARCHAR(100),@hash BINARY(32),
 @diem_lay NVARCHAR(255),@diem_giao NVARCHAR(255),@ten_nhan NVARCHAR(100),@sdt_nhan VARCHAR(10),
 @km DECIMAL(10,2),@giay INT,@nguon VARCHAR(10),@kien_json NVARCHAR(MAX),@phu_thu_json NVARCHAR(MAX),
 @gia_da_dong_y DECIMAL(15,0)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@now DATETIME2(3)=SYSUTCDATETIME(),@id UNIQUEIDENTIFIER,@oldhash BINARY(32);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') THROW 51102,N'Không được tạo đơn',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
   WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG' AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51103,N'Khách hàng không hợp lệ',1;
  DECLARE @lock NVARCHAR(255)=N'tao-don:'+CONVERT(NVARCHAR(36),@actor);
  EXEC dbo.usp_khoa @lock;
  SELECT @id=ma_don,@oldhash=hash_yeu_cau FROM dbo.don_hang WHERE ma_tk_tao=@actor AND khoa_yeu_cau=@khoa;
  IF @id IS NOT NULL
  BEGIN
   IF @oldhash<>@hash THROW 51104,N'Khóa tạo đơn đã dùng cho nội dung khác',1;
   COMMIT; SELECT @id AS ma_don; RETURN;
  END;
  IF @km IS NULL OR @km<=0 OR @giay IS NULL OR @giay<=0 OR @gia_da_dong_y IS NULL
   OR @khoa IS NULL OR LEN(@khoa)=0 OR @hash IS NULL
   OR ISNULL(ISJSON(@kien_json),0)<>1 OR LEFT(LTRIM(@kien_json),1)<>'['
   OR ISNULL(ISJSON(@phu_thu_json),0)<>1 OR LEFT(LTRIM(@phu_thu_json),1)<>'['
   THROW 51105,N'Dữ liệu tạo đơn không hợp lệ',1;
  DECLARE @kien TABLE(thu_tu INT,loai NVARCHAR(100),kg DECIMAL(10,2));
  INSERT @kien SELECT thu_tu,loai,kg FROM OPENJSON(@kien_json)
   WITH(thu_tu INT '$.thu_tu',loai NVARCHAR(100) '$.loai_hang',kg DECIMAL(10,2) '$.kg');
  IF NOT EXISTS(SELECT 1 FROM @kien) OR EXISTS(SELECT 1 FROM @kien WHERE thu_tu IS NULL OR thu_tu<=0 OR kg IS NULL OR kg<=0 OR loai IS NULL OR LEN(LTRIM(RTRIM(loai)))=0)
   OR EXISTS(SELECT thu_tu FROM @kien GROUP BY thu_tu HAVING COUNT(*)>1)
   THROW 51106,N'Kiện hàng không hợp lệ',1;
  DECLARE @pt TABLE(id UNIQUEIDENTIFIER);
  INSERT @pt SELECT TRY_CONVERT(UNIQUEIDENTIFIER,value) FROM OPENJSON(@phu_thu_json);
  IF EXISTS(SELECT 1 FROM @pt WHERE id IS NULL) OR EXISTS(SELECT id FROM @pt GROUP BY id HAVING COUNT(*)>1)
   THROW 51107,N'Phụ thu không hợp lệ hoặc trùng',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  DECLARE @kg DECIMAL(10,2)=(SELECT SUM(kg) FROM @kien),@bp UNIQUEIDENTIFIER,@cs UNIQUEIDENTIFIER,
   @ckm DECIMAL(15,0),@ckg DECIMAL(15,0),@giam DECIMAL(15,0)=0,@phuthu DECIMAL(15,0),@rate DECIMAL(5,2)=0;
  IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
   THROW 51108,N'Phải có đúng một biểu phí đang hiệu lực',1;
  SELECT @bp=ma_bieu_phi,@ckm=dbo.fn_cuoc_km(cuoc_co_ban,@km,don_gia_km),@ckg=dbo.fn_cuoc_kg(@kg,kg_bao_gom,don_gia_kg)
  FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den)
   AND @km BETWEEN km_toi_thieu AND km_toi_da AND @kg<=kg_toi_da;
  IF @bp IS NULL THROW 51109,N'Ngoài phạm vi km/kg',1;
  DECLARE @hang VARCHAR(15)='THUONG';
  SELECT @hang=ma_hang FROM dbo.khach_hang WITH(UPDLOCK,HOLDLOCK)
   WHERE ma_kh=@ma_kh AND thanh_vien_tu<=@now AND (thanh_vien_den IS NULL OR @now<thanh_vien_den);
  IF @hang<>'THUONG'
  BEGIN
   IF (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
    THROW 51110,N'Chính sách thành viên thiếu hoặc chồng',1;
   SELECT @cs=ma_chinh_sach,@rate=ty_le_giam FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den);
  END;
  IF EXISTS(SELECT 1 FROM @pt x LEFT JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id
   WHERE p.ma_phu_thu IS NULL OR p.bat_buoc<>0 OR p.trang_thai<>'CONG_BO' OR p.hieu_luc_tu>@now OR p.hieu_luc_den<=@now)
   OR EXISTS(SELECT p.ma_loai FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id GROUP BY p.ma_loai HAVING COUNT(*)>1)
   THROW 51111,N'Phụ thu tùy chọn không hiệu lực, không đúng loại hoặc bị trùng',1;
  -- Luôn tự thêm phụ thu bắt buộc; không tin FE gửi đủ danh sách.
  INSERT @pt SELECT ma_phu_thu FROM dbo.cau_hinh_phu_thu
   WHERE bat_buoc=1 AND trang_thai='CONG_BO' AND hieu_luc_tu<=@now
    AND (hieu_luc_den IS NULL OR @now<hieu_luc_den);
  IF EXISTS(SELECT p.ma_loai FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id
    GROUP BY p.ma_loai HAVING COUNT(*)>1) THROW 51111,N'Phụ thu bị chồng phiên bản hoặc trùng loại',1;
  SELECT @phuthu=COALESCE(SUM(p.so_tien),0) FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id;
  SET @giam=dbo.fn_tien_giam(@ckm+@ckg+@phuthu,@rate);
  IF @gia_da_dong_y<>@ckm+@ckg-@giam+@phuthu THROW 51112,N'Giá thay đổi; cần khách xác nhận lại',1;
  SET @id=NEWID();
  INSERT dbo.don_hang(ma_don,ma_kh,ma_tk_tao,khoa_yeu_cau,hash_yeu_cau,ma_bieu_phi,ma_chinh_sach,diem_lay,diem_giao,
   ten_nguoi_nhan,sdt_nguoi_nhan,quang_duong_km,thoi_gian_du_kien_giay,nguon_lo_trinh,cuoc_km,cuoc_kg,tien_giam,tao_luc)
  VALUES(@id,@ma_kh,@actor,@khoa,@hash,@bp,@cs,@diem_lay,@diem_giao,@ten_nhan,@sdt_nhan,@km,@giay,@nguon,@ckm,@ckg,@giam,@now);
  INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg) SELECT @id,thu_tu,loai,kg FROM @kien;
  INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) SELECT @id,id FROM @pt;
  COMMIT; SELECT @id AS ma_don;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.2. Phân công — TX2

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_phan_cong @ma_don UNIQUEIDENTIFIER,@ma_tx UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 51201,N'Không có quyền điều phối',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang WITH(UPDLOCK,HOLDLOCK) WHERE ma_don=@ma_don AND trang_thai='CHO_GAN')
   THROW 51202,N'Đơn không chờ gán',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.v_tai_xe_san_sang WHERE ma_tx=@ma_tx) THROW 51203,N'Tài xế không sẵn sàng',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang
    WHERE ma_don=@ma_don AND ma_tx=@ma_tx AND ket_qua='TU_CHOI')
   THROW 51204,N'Tài xế đã từ chối đơn này',1;
  INSERT dbo.phan_cong_don_hang(ma_don,ma_tx,ma_tk_dieu_phoi) VALUES(@ma_don,@ma_tx,@actor);
  UPDATE dbo.don_hang SET trang_thai='DA_GAN' WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=NULL WHERE ma_tx=@ma_tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.3. Hoàn tất và xác nhận thu đủ — TX3

Xác nhận thu đủ là hành động của tài xế, không phải xác nhận ngân hàng. Cước 0 vẫn hoàn tất và có khoản chia 0, không tạo yêu cầu VNPay 0 đồng. Giữ sự kiện đến điểm nhận trước hoàn tất.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_hoan_tat @ma_don UNIQUEIDENTIFIER,@xac_nhan_thu_du BIT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@now DATETIME2(3)=SYSUTCDATETIME();
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' OR ISNULL(@xac_nhan_thu_du,0)<>1 THROW 51301,N'Cần tài xế xác nhận thu đủ',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51302,N'Thiếu hồ sơ tài xế',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  IF EXISTS(SELECT 1 FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong WHERE c.ma_don=@ma_don AND p.ma_tx=@tx)
  BEGIN COMMIT; RETURN; END;
  SELECT @pc=p.ma_phan_cong FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL AND d.trang_thai='DANG_GIAO';
  IF @pc IS NULL THROW 51303,N'Không đúng tài xế hoặc trạng thái',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
   THROW 51304,N'Chưa xác nhận đến điểm nhận',1;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@now,ket_qua='HOAN_TAT' WHERE ma_phan_cong=@pc;
  UPDATE dbo.don_hang SET trang_thai='HOAN_TAT',hoan_tat_luc=@now WHERE ma_don=@ma_don;
  INSERT dbo.phan_chia_cuoc(ma_don,ma_phan_cong,ghi_nhan_luc) VALUES(@ma_don,@pc,@now);
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN @now ELSE NULL END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.4. Bấm Thanh toán → tạo giao dịch và mở VNPay — TX4

Một lần bấm gọi usp_bat_dau_thanh_toan (không có ma_dot). Thủ tục lấy tài xế từ phiên, trả giao dịch chưa giải quyết nếu có; nếu không thì gom toàn bộ khoản chưa nộp vào giao dịch mới. Backend sau COMMIT ký URL và mở VNPay ngay. Không thêm bước xác nhận đợt. Nếu ký URL/HTTP lỗi, retry cùng khoa_yeu_cau trả đúng giao dịch cũ, kể cả kết quả đã giải quyết; lần bấm mới có chủ đích dùng khóa mới. Không tự chuyển sang giao dịch mới chỉ vì mất phản hồi. Backend không được cấp URL mới cho giao dịch đã giải quyết; trả trạng thái và số dư mới thay thế.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_bat_dau_thanh_toan @khoa_yeu_cau VARCHAR(100) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@gd UNIQUEIDENTIFIER,@tien DECIMAL(15,0);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' OR @khoa_yeu_cau IS NULL OR LEN(LTRIM(RTRIM(@khoa_yeu_cau)))=0
   THROW 51401,N'Chỉ tài xế thanh toán; cần khóa yêu cầu',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51402,N'Thiếu hồ sơ tài xế',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  SELECT @gd=ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tx=@tx AND khoa_yeu_cau=@khoa_yeu_cau;
  IF @gd IS NULL
   SELECT @gd=ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tx=@tx AND giai_quyet_luc IS NULL;
  IF @gd IS NULL
  BEGIN
   DECLARE @chon TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY,tien DECIMAL(15,0));
   INSERT @chon SELECT ma_don,tien_cong_ty FROM dbo.v_chia_cuoc
    WHERE ma_tx=@tx AND ma_giao_dich_nop IS NULL AND tien_cong_ty>0;
   SELECT @tien=SUM(tien) FROM @chon;
   IF @tien IS NULL OR @tien<=0 THROW 51403,N'Không có tiền cần nộp',1;
   SET @gd=NEWID();
   INSERT dbo.giao_dich_nop_tien(ma_giao_dich,ma_tx,khoa_yeu_cau,ma_tham_chieu,so_tien_yeu_cau)
    VALUES(@gd,@tx,@khoa_yeu_cau,REPLACE(CONVERT(VARCHAR(36),@gd),'-',''),@tien);
   UPDATE c SET ma_giao_dich_nop=@gd FROM dbo.phan_chia_cuoc c JOIN @chon x ON x.ma_don=c.ma_don;
   IF NOT EXISTS(SELECT 1 FROM dbo.v_giao_dich_nop WHERE ma_giao_dich=@gd AND tong_khoan_lien_ket=@tien AND so_don_dang_lien_ket>0)
    THROW 51404,N'Khoản thanh toán không khớp; rollback',1;
  END;
  COMMIT; SELECT * FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=@gd;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.5. Áp dụng kết quả VNPay đã được backend xác minh — TX5

Thủ tục nội bộ này chỉ cấp EXECUTE cho tài khoản worker thanh toán, không cho bốn role người dùng. Backend trước đó phải kiểm tra chữ ký, merchant, mã tham chiếu, mã phản hồi/trạng thái đối tác, đơn vị tiền và số tiền. Tham số @thanh_cong=0 chỉ dùng khi có bằng chứng chắc chắn KHONG_THU; timeout/Return đóng cửa sổ không được gọi nhánh này. @so_tien là số tiền yêu cầu do đối tác trả về, đã đổi về VND. Return không được dùng để quyết toán.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_ap_dung_ket_qua_nop
 @ma_tham_chieu VARCHAR(100),@nguon VARCHAR(15),@khoa BINARY(32),@json NVARCHAR(MAX),
 @thanh_cong BIT,@so_tien DECIMAL(15,0),@ma_doi_tac VARCHAR(100)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  IF @nguon IS NULL OR @nguon NOT IN ('IPN','QUERY') OR @thanh_cong IS NULL OR @so_tien IS NULL
   OR @khoa IS NULL OR ISNULL(ISJSON(@json),0)<>1 THROW 51601,N'Kết quả xác minh không hợp lệ',1;
  DECLARE @gd UNIQUEIDENTIFIER,@tx UNIQUEIDENTIFIER,@expected DECIMAL(15,0),
   @status VARCHAR(20),@partner VARCHAR(100),@now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @gd=ma_giao_dich,@tx=ma_tx FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=@ma_tham_chieu;
  IF @gd IS NULL THROW 51602,N'Không tìm thấy giao dịch; backend ghi sự kiện không khớp riêng',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  IF EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan WHERE nguon=@nguon AND khoa_su_kien=@khoa)
  BEGIN COMMIT; RETURN; END;
  SELECT @expected=so_tien_yeu_cau,@status=trang_thai,@partner=ma_giao_dich_doi_tac
   FROM dbo.giao_dich_nop_tien WITH(UPDLOCK,HOLDLOCK) WHERE ma_giao_dich=@gd;
  IF @so_tien<>@expected OR (@thanh_cong=1 AND (@ma_doi_tac IS NULL OR LEN(@ma_doi_tac)=0))
  BEGIN
   INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
    VALUES(@gd,@nguon,@khoa,1,'KHONG_KHOP',@json);
   COMMIT; SELECT 'KHONG_KHOP' AS ket_qua; RETURN;
  END;
  IF @status IN ('THANH_CONG','KHONG_THU')
  BEGIN
   DECLARE @result VARCHAR(25)=CASE WHEN (@status='THANH_CONG' AND @thanh_cong=1 AND @partner=@ma_doi_tac)
    OR (@status='KHONG_THU' AND @thanh_cong=0) THEN 'KHONG_THAY_DOI' ELSE 'CAN_DOI_SOAT' END;
   INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
    VALUES(@gd,@nguon,@khoa,1,@result,@json);
   COMMIT; SELECT @result AS ket_qua; RETURN;
  END;
  UPDATE dbo.giao_dich_nop_tien SET trang_thai=CASE WHEN @thanh_cong=1 THEN 'THANH_CONG' ELSE 'KHONG_THU' END,
   giai_quyet_luc=@now,so_tien_thuc_nhan=CASE WHEN @thanh_cong=1 THEN @so_tien END,
   ma_giao_dich_doi_tac=CASE WHEN @thanh_cong=1 THEN @ma_doi_tac END WHERE ma_giao_dich=@gd;
  IF @thanh_cong=0 UPDATE dbo.phan_chia_cuoc SET ma_giao_dich_nop=NULL WHERE ma_giao_dich_nop=@gd;
  -- Thành công giữ liên kết vĩnh viễn; công nợ tự giảm qua View, không SET số dư=0.
  INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
   VALUES(@gd,@nguon,@khoa,1,'DA_AP_DUNG',@json);
  COMMIT; SELECT 'DA_AP_DUNG' AS ket_qua;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

Sự kiện sai chữ ký/không tìm thấy mã tham chiếu phải ghi bằng đường ghi log riêng đã giới hạn quyền; không gọi thủ tục áp dụng kết quả. Hash sự kiện do backend tính từ payload đã chuẩn hóa + nguồn, không nhận khóa chống trùng do người dùng tự đặt. Sự kiện mâu thuẫn cần cảnh báo đối soát, không tự đảo khoản nộp, không tự hoàn tiền. Nếu lỗi UNIQUE mã đối tác giữa hai giao dịch, rollback và ghi sự kiện cảnh báo trong transaction riêng sau rollback.

### 7.6. Tiến trình giao / từ chối — TX6

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_tien_trinh @ma_don UNIQUEIDENTIFIER,@hanh_dong VARCHAR(25),@ghi_chu NVARCHAR(500)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@state VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' THROW 51701,N'Chỉ tài xế cập nhật tiến trình',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  SELECT @pc=p.ma_phan_cong,@state=d.trang_thai FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL;
  IF @pc IS NULL THROW 51702,N'Không có phân công đang hoạt động của tài xế',1;
  IF @hanh_dong='LAY_HANG' AND @state='DA_GAN'
   UPDATE dbo.don_hang SET trang_thai='DA_LAY_HANG' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='BAT_DAU_GIAO' AND @state='DA_LAY_HANG'
   UPDATE dbo.don_hang SET trang_thai='DANG_GIAO' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='TU_CHOI' AND @state='DA_GAN' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
  BEGIN
   UPDATE dbo.phan_cong_don_hang SET ket_qua='TU_CHOI',ket_thuc_luc=SYSUTCDATETIME(),ly_do=@ghi_chu WHERE ma_phan_cong=@pc;
   UPDATE dbo.don_hang SET trang_thai='CHO_GAN' WHERE ma_don=@ma_don;
   UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  END
  ELSE IF @hanh_dong='DEN_DIEM_NHAN' AND @state='DANG_GIAO'
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
    INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
     VALUES(@ma_don,@actor,'DEN_DIEM_NHAN',@state,@state);
  END
  ELSE IF @hanh_dong='SU_CO' AND @state='DANG_GIAO' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
   INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau,ghi_chu)
    VALUES(@ma_don,@actor,'SU_CO',@state,@state,@ghi_chu);
  ELSE THROW 51703,N'Hành động không hợp lệ cho trạng thái hiện tại',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.7. Hủy trước lấy hàng — TX7

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_huy_don @ma_don UNIQUEIDENTIFIER,@ly_do NVARCHAR(500) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') OR @ly_do IS NULL OR LEN(LTRIM(RTRIM(@ly_do)))=0
   THROW 51801,N'Không được hủy hoặc thiếu lý do',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang d JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
   WHERE d.ma_don=@ma_don AND d.trang_thai IN ('CHO_GAN','DA_GAN') AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51802,N'Không đúng chủ đơn hoặc đã lấy hàng',1;
  SELECT @tx=ma_tx FROM dbo.phan_cong_don_hang WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=SYSUTCDATETIME(),ket_qua='HUY_DON',ly_do=@ly_do
   WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.don_hang SET trang_thai='DA_HUY',huy_luc=SYSUTCDATETIME(),ly_do_huy=@ly_do WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.8. Báo cáo của tài xế

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_thu_nhap_cua_toi @tu DATETIME2(3),@den DATETIME2(3) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role<>'TAI_XE' OR @tu IS NULL OR @den IS NULL OR @tu>=@den THROW 51901,N'Không đúng quyền/khoảng thời gian',1;
 SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
 SELECT * FROM dbo.fn_thu_nhap_tai_xe(@tx,@tu,@den);
 SELECT * FROM dbo.v_so_du_tai_xe WHERE ma_tx=@tx; -- Không lọc ngày cho công nợ.
END;
GO
```

### 7.9. CRUD chính sách, công bố và đóng hiệu lực

Chủ đội xe tạo/sửa/xóa **NHAP**; công bố kiểm tra overlap theo nhóm: một biểu phí chung,
mỗi hạng thành viên và mỗi `ma_loai` phụ thu. Dùng cùng khóa `chinh-sach` với TX1 và đổi hạng.
Khoảng hiệu lực là [từ, đến); đóng bản cũ tại T ở tương lai rồi công bố bản mới bắt đầu T.
Hai thao tác riêng có thể retry; không sửa tiền/loại/bắt buộc của phiên bản đã công bố.
JSON dưới là **thay thế đầy đủ** bản nháp, không phải PATCH; thiếu trường bắt buộc sẽ bị từ chối.
Ví dụ phụ thu: `{"ma_loai":"DICH_VU","ten":"Dịch vụ","so_tien":5000,"bat_buoc":true,"hieu_luc_tu":"2026-10-18T00:00:00","hieu_luc_den":null}`.
Biểu phí cần tên, các trường km/kg/đơn giá; thành viên cần ma_hang, ty_le_giam và khoảng hiệu lực.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_luu_chinh_sach_nhap
 @loai VARCHAR(15),@du_lieu NVARCHAR(MAX),@ma UNIQUEIDENTIFIER=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  IF @loai IS NULL OR @loai NOT IN ('CUOC','THANH_VIEN','PHU_THU')
   OR ISNULL(ISJSON(@du_lieu),0)<>1 OR LEFT(LTRIM(@du_lieu),1)<>'{'
   THROW 52002,N'Loại hoặc JSON chính sách không hợp lệ',1;
  DECLARE @moi BIT=CASE WHEN @ma IS NULL THEN 1 ELSE 0 END;
  IF @moi=0 AND NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP')
   THROW 52003,N'Chỉ sửa chính sách nháp tồn tại',1;
  IF @moi=1 SET @ma=NEWID();
  DECLARE @ten NVARCHAR(100)=JSON_VALUE(@du_lieu,'$.ten'),
   @tu DATETIME2(3)=TRY_CONVERT(DATETIME2(3),JSON_VALUE(@du_lieu,'$.hieu_luc_tu'),126),
   @den DATETIME2(3)=TRY_CONVERT(DATETIME2(3),JSON_VALUE(@du_lieu,'$.hieu_luc_den'),126);
  IF @tu IS NULL OR (JSON_VALUE(@du_lieu,'$.hieu_luc_den') IS NOT NULL AND @den IS NULL)
   OR (@den IS NOT NULL AND @den<=@tu) THROW 52004,N'Khoảng hiệu lực không hợp lệ',1;
  IF @loai='CUOC'
  BEGIN
   DECLARE @cb DECIMAL(15,0)=TRY_CONVERT(DECIMAL(15,0),JSON_VALUE(@du_lieu,'$.cuoc_co_ban')),
   @dkm DECIMAL(15,0)=TRY_CONVERT(DECIMAL(15,0),JSON_VALUE(@du_lieu,'$.don_gia_km')),
   @kmin DECIMAL(10,2)=TRY_CONVERT(DECIMAL(10,2),JSON_VALUE(@du_lieu,'$.km_toi_thieu')),
   @kmax DECIMAL(10,2)=TRY_CONVERT(DECIMAL(10,2),JSON_VALUE(@du_lieu,'$.km_toi_da')),
   @kg DECIMAL(10,2)=TRY_CONVERT(DECIMAL(10,2),JSON_VALUE(@du_lieu,'$.kg_bao_gom')),
   @kgmax DECIMAL(10,2)=TRY_CONVERT(DECIMAL(10,2),JSON_VALUE(@du_lieu,'$.kg_toi_da')),
   @dkg DECIMAL(15,0)=TRY_CONVERT(DECIMAL(15,0),JSON_VALUE(@du_lieu,'$.don_gia_kg'));
   IF @ten IS NULL OR LEN(LTRIM(RTRIM(@ten)))=0 THROW 52005,N'Thiếu tên biểu phí',1;
   IF @moi=1 INSERT dbo.cau_hinh_cuoc(ma_bieu_phi,ten,cuoc_co_ban,don_gia_km,km_toi_thieu,km_toi_da,kg_bao_gom,kg_toi_da,don_gia_kg,hieu_luc_tu,hieu_luc_den)
   VALUES(@ma,@ten,@cb,@dkm,@kmin,@kmax,@kg,@kgmax,@dkg,@tu,@den);
   ELSE UPDATE dbo.cau_hinh_cuoc SET ten=@ten,cuoc_co_ban=@cb,don_gia_km=@dkm,km_toi_thieu=@kmin,km_toi_da=@kmax,
   kg_bao_gom=@kg,kg_toi_da=@kgmax,don_gia_kg=@dkg,hieu_luc_tu=@tu,hieu_luc_den=@den WHERE ma_bieu_phi=@ma;
  END
  ELSE IF @loai='THANH_VIEN'
  BEGIN
   DECLARE @hang VARCHAR(15)=JSON_VALUE(@du_lieu,'$.ma_hang'),@rate DECIMAL(5,2)=TRY_CONVERT(DECIMAL(5,2),JSON_VALUE(@du_lieu,'$.ty_le_giam'));
   IF @moi=1 INSERT dbo.chinh_sach_thanh_vien(ma_chinh_sach,ma_hang,ty_le_giam,hieu_luc_tu,hieu_luc_den)
   VALUES(@ma,@hang,@rate,@tu,@den);
   ELSE UPDATE dbo.chinh_sach_thanh_vien SET ma_hang=@hang,ty_le_giam=@rate,hieu_luc_tu=@tu,hieu_luc_den=@den WHERE ma_chinh_sach=@ma;
  END
  ELSE
  BEGIN
   DECLARE @nhom VARCHAR(30)=JSON_VALUE(@du_lieu,'$.ma_loai'),
   @tien DECIMAL(15,0)=TRY_CONVERT(DECIMAL(15,0),JSON_VALUE(@du_lieu,'$.so_tien')),
   @bb BIT=CASE JSON_VALUE(@du_lieu,'$.bat_buoc') WHEN 'true' THEN 1 WHEN 'false' THEN 0 WHEN '1' THEN 1 WHEN '0' THEN 0 END;
   IF @ten IS NULL OR LEN(LTRIM(RTRIM(@ten)))=0 OR @nhom IS NULL OR LEN(LTRIM(RTRIM(@nhom)))=0 OR @bb IS NULL
   THROW 52006,N'Thiếu tên/loại/phân loại phụ thu',1;
   IF @moi=1 INSERT dbo.cau_hinh_phu_thu(ma_phu_thu,ma_loai,ten,bat_buoc,so_tien,hieu_luc_tu,hieu_luc_den)
   VALUES(@ma,@nhom,@ten,@bb,@tien,@tu,@den);
   ELSE UPDATE dbo.cau_hinh_phu_thu SET ma_loai=@nhom,ten=@ten,bat_buoc=@bb,so_tien=@tien,hieu_luc_tu=@tu,hieu_luc_den=@den WHERE ma_phu_thu=@ma;
  END;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
   VALUES(@actor,@loai,@ma,CASE WHEN @moi=1 THEN 'TAO_NHAP' ELSE 'SUA_NHAP' END,@du_lieu);
  COMMIT;
  SELECT @ma AS ma_chinh_sach;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_xoa_chinh_sach_nhap
 @loai VARCHAR(15),@ma UNIQUEIDENTIFIER
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  IF NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP')
   THROW 52003,N'Chỉ xóa chính sách nháp tồn tại',1;
  -- Nếu bị dữ liệu khác tham chiếu, FK từ chối và toàn bộ thao tác rollback.
  IF @loai='CUOC' DELETE dbo.cau_hinh_cuoc WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' DELETE dbo.chinh_sach_thanh_vien WHERE ma_chinh_sach=@ma;
  ELSE DELETE dbo.cau_hinh_phu_thu WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,@loai,@ma,'XOA_NHAP');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_dong_hieu_luc_chinh_sach
 @loai VARCHAR(15),@ma UNIQUEIDENTIFIER,@den DATETIME2(3)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  IF @den IS NULL OR @den<=SYSUTCDATETIME() OR NOT EXISTS(
   SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='CONG_BO'
   AND hieu_luc_den IS NULL AND hieu_luc_tu<@den)
   THROW 52007,N'Chỉ đóng một lần phiên bản công bố, ở mốc tương lai sau ngày bắt đầu',1;
  IF @loai='CUOC' UPDATE dbo.cau_hinh_cuoc SET hieu_luc_den=@den WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' UPDATE dbo.chinh_sach_thanh_vien SET hieu_luc_den=@den WHERE ma_chinh_sach=@ma;
  ELSE UPDATE dbo.cau_hinh_phu_thu SET hieu_luc_den=@den WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
   VALUES(@actor,@loai,@ma,'DONG_HIEU_LUC',(SELECT @den AS hieu_luc_den FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_cong_bo_chinh_sach
 @loai VARCHAR(15),@ma UNIQUEIDENTIFIER
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  DECLARE @nhom VARCHAR(30),@tu DATETIME2(3),@den DATETIME2(3),@now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @nhom=nhom,@tu=hieu_luc_tu,@den=hieu_luc_den FROM dbo.v_phien_ban_chinh_sach
   WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP';
  IF @nhom IS NULL OR (@den IS NOT NULL AND @den<=@now) THROW 52008,N'Chính sách nháp không hợp lệ hoặc đã hết hạn',1;
  IF EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach
   WHERE loai=@loai AND nhom=@nhom AND ma<>@ma AND trang_thai='CONG_BO'
   AND (@den IS NULL OR hieu_luc_tu<@den) AND (hieu_luc_den IS NULL OR @tu<hieu_luc_den))
   THROW 52009,N'Khoảng hiệu lực bị chồng; đóng bản cũ tại mốc tương lai trước khi công bố bản mới',1;
  IF @loai='CUOC' UPDATE dbo.cau_hinh_cuoc SET trang_thai='CONG_BO' WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' UPDATE dbo.chinh_sach_thanh_vien SET trang_thai='CONG_BO' WHERE ma_chinh_sach=@ma;
  ELSE UPDATE dbo.cau_hinh_phu_thu SET trang_thai='CONG_BO' WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,@loai,@ma,'CONG_BO');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.10. CRUD tài khoản, khách hàng, tài xế và phương tiện

`usp_dang_ky_khach` chỉ tạo KHACH_HANG, chạy bằng pool auth backend riêng; mật khẩu rõ
không vào SQL. Bản này dùng BCrypt `$2a$` tương ứng PasswordHasher hiện tại; kiểm tra prefix
không chứng minh hash đúng, backend phải tự sinh/kiểm tra bằng thư viện BCrypt.
Chủ đội xe tạo tài xế/tổng đài; tài khoản CHU_DOI_XE đầu tiên do quản trị seed riêng.
Mọi chỉnh trạng thái/giấy tờ/xe dùng khóa `dieu-phoi`; không sửa tài xế đang có phân công.
Xóa vật lý chỉ cho dữ liệu chưa phát sinh; FK lịch sử bảo vệ và rollback toàn thao tác.
Đơn không có UPDATE nội dung/DELETE công khai: dùng TX1 tạo, TX6 tiến trình, TX7 hủy.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_dang_ky_khach
 @username NVARCHAR(50),@hash NVARCHAR(255),@ho_ten NVARCHAR(100),@sdt VARCHAR(10),@email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
   OR @username LIKE '% %' OR @hash IS NULL OR LEFT(@hash,4)<>'$2a$' OR LEN(@hash)<>60
   OR @sdt IS NULL THROW 52101,N'Thông tin đăng ký hoặc BCrypt hash không hợp lệ',1;
  DECLARE @tk UNIQUEIDENTIFIER=NEWID(),@kh UNIQUEIDENTIFIER=NEWID();
  INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
   VALUES(@tk,@username,@hash,@ho_ten,@sdt,@email,'KHACH_HANG');
  INSERT dbo.khach_hang(ma_kh,ma_tk) VALUES(@kh,@tk);
  COMMIT;
  SELECT @tk AS ma_tk,@kh AS ma_kh;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_tao_tai_khoan_noi_bo
 @username NVARCHAR(50),@hash NVARCHAR(255),@ho_ten NVARCHAR(100),@sdt VARCHAR(10),
 @vai_tro VARCHAR(20),@cccd VARCHAR(12)=NULL,@so_gplx NVARCHAR(50)=NULL,@han_gplx DATE=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF @vai_tro IS NULL OR @vai_tro NOT IN ('TAI_XE','TONG_DAI') OR @hash IS NULL OR LEFT(@hash,4)<>'$2a$' OR LEN(@hash)<>60
   THROW 52102,N'Chỉ tạo tài xế/tổng đài với BCrypt hash hợp lệ',1;
  DECLARE @tk UNIQUEIDENTIFIER=NEWID();
  INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,vai_tro) VALUES(@tk,@username,@hash,@ho_ten,@sdt,@vai_tro);
  IF @vai_tro='TAI_XE'
   INSERT dbo.tai_xe(ma_tk,cccd,so_giay_phep,ngay_het_han_gplx) VALUES(@tk,@cccd,@so_gplx,@han_gplx);
  COMMIT;
  SELECT @tk AS ma_tk;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_cap_nhat_ho_so
 @ma_tk UNIQUEIDENTIFIER,@ho_ten NVARCHAR(100),@sdt VARCHAR(10),@email NVARCHAR(150)=NULL,
 @dia_chi NVARCHAR(255)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @ma_tk IS NULL OR (@role<>'CHU_DOI_XE' AND @ma_tk<>@actor) THROW 52103,N'Chỉ sửa hồ sơ của mình',1;
  UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@ma_tk;
  IF @@ROWCOUNT<>1 THROW 52104,N'Không tìm thấy tài khoản',1;
  UPDATE dbo.khach_hang SET dia_chi_mac_dinh=@dia_chi WHERE ma_tk=@ma_tk;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,'TAI_KHOAN',@ma_tk,'SUA_HO_SO');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_doi_mat_khau
 @hash_moi NVARCHAR(255),@auth_version_cu BIGINT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  -- Backend đã kiểm tra mật khẩu hiện tại bằng BCrypt trước khi gọi, không nhận hash từ FE.
  IF @hash_moi IS NULL OR LEFT(@hash_moi,4)<>'$2a$' OR LEN(@hash_moi)<>60 OR @auth_version_cu IS NULL
   THROW 52105,N'Hash hoặc phiên bản không hợp lệ',1;
  UPDATE dbo.tai_khoan SET mat_khau_hash=@hash_moi,auth_version=auth_version+1
   WHERE ma_tk=@actor AND auth_version=@auth_version_cu;
  IF @@ROWCOUNT<>1 THROW 52106,N'Phiên đã thay đổi; đăng nhập lại',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_khoa_tai_khoan
 @ma_tk UNIQUEIDENTIFIER,@khoa BIT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF @ma_tk=@actor OR @khoa IS NULL THROW 52107,N'Không tự khóa hoặc thiếu trạng thái',1;
  IF EXISTS(SELECT 1 FROM dbo.tai_xe t JOIN dbo.phan_cong_don_hang p ON p.ma_tx=t.ma_tx
   WHERE t.ma_tk=@ma_tk AND p.ket_thuc_luc IS NULL) THROW 52108,N'Tài xế còn phân công đang mở',1;
  UPDATE dbo.tai_khoan SET trang_thai=CASE WHEN @khoa=1 THEN 'KHOA' ELSE 'HOAT_DONG' END,
   auth_version=auth_version+1 WHERE ma_tk=@ma_tk;
  IF @@ROWCOUNT<>1 THROW 52104,N'Không tìm thấy tài khoản',1;
  IF @khoa=1 UPDATE dbo.tai_xe SET trang_thai='OFFLINE',ranh_tu=NULL WHERE ma_tk=@ma_tk;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_xoa_tai_khoan_chua_su_dung
 @ma_tk UNIQUEIDENTIFIER
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF @ma_tk=@actor OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@ma_tk AND vai_tro<>'CHU_DOI_XE')
   THROW 52109,N'Không được xóa tài khoản này',1;
  IF EXISTS(SELECT 1 FROM dbo.don_hang d LEFT JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh WHERE d.ma_tk_tao=@ma_tk OR k.ma_tk=@ma_tk)
   OR EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p LEFT JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx WHERE p.ma_tk_dieu_phoi=@ma_tk OR t.ma_tk=@ma_tk)
   THROW 52110,N'Đã có lịch sử; chỉ khóa, không xóa',1;
  DELETE p FROM dbo.phuong_tien p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx WHERE t.ma_tk=@ma_tk;
  DELETE dbo.tai_xe WHERE ma_tk=@ma_tk;
  DELETE dbo.khach_hang WHERE ma_tk=@ma_tk;
  DELETE dbo.tai_khoan WHERE ma_tk=@ma_tk; -- Các FK lịch sử còn lại vẫn được kiểm tra.
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,'TAI_KHOAN',@ma_tk,'XOA_CHUA_SU_DUNG');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_cap_nhat_hang_khach
 @ma_kh UNIQUEIDENTIFIER,@hang VARCHAR(15),@tu DATETIME2(3)=NULL,@den DATETIME2(3)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  UPDATE dbo.khach_hang SET ma_hang=@hang,thanh_vien_tu=@tu,thanh_vien_den=@den WHERE ma_kh=@ma_kh;
  IF @@ROWCOUNT<>1 THROW 52111,N'Không tìm thấy khách hàng',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,'KHACH_HANG',@ma_kh,'DOI_HANG');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_trang_thai_tai_xe
 @ma_tx UNIQUEIDENTIFIER,@trang_thai VARCHAR(10)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('TAI_XE','CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF @trang_thai IS NULL OR @trang_thai NOT IN ('ONLINE','OFFLINE','NGHI') THROW 52201,N'Sai trạng thái tài xế',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk
   WHERE t.ma_tx=@ma_tx AND k.trang_thai='HOAT_DONG' AND (@role='CHU_DOI_XE' OR t.ma_tk=@actor))
   THROW 52202,N'Không đúng tài xế hoặc tài khoản bị khóa',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
   THROW 52203,N'Đang có phân công; chưa được đổi trạng thái làm việc',1;
  UPDATE dbo.tai_xe SET trang_thai=@trang_thai,
   ranh_tu=CASE WHEN @trang_thai='ONLINE' THEN COALESCE(ranh_tu,SYSUTCDATETIME()) ELSE NULL END WHERE ma_tx=@ma_tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ho_so_tai_xe
 @ma_tx UNIQUEIDENTIFIER,@cccd VARCHAR(12),@so_gplx NVARCHAR(50),@han_gplx DATE
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
   THROW 52203,N'Không sửa giấy tờ khi đang có phân công',1;
  UPDATE dbo.tai_xe SET cccd=@cccd,so_giay_phep=@so_gplx,ngay_het_han_gplx=@han_gplx WHERE ma_tx=@ma_tx;
  IF @@ROWCOUNT<>1 THROW 52204,N'Không tìm thấy tài xế',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,'TAI_XE',@ma_tx,'SUA_GIAY_TO');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_vi_tri_demo
 @ma_tx UNIQUEIDENTIFIER,@dia_chi NVARCHAR(255),@lat DECIMAL(10,7),@lng DECIMAL(10,7)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  -- Backend chỉ gọi sau khi Goong geocode thành công; SQL không gọi HTTP và không chứng minh được nguồn tọa độ.
  IF @dia_chi IS NULL OR LEN(LTRIM(RTRIM(@dia_chi)))=0 OR @lat IS NULL OR @lng IS NULL
   THROW 52205,N'Thiếu địa chỉ hoặc tọa độ đã xác minh',1;
  UPDATE dbo.tai_xe SET vi_tri_demo_dia_chi=@dia_chi,vi_tri_demo_lat=@lat,vi_tri_demo_lng=@lng,
   vi_tri_demo_luc=SYSUTCDATETIME(),vi_tri_demo_nguon='DEMO_CO_DINH' WHERE ma_tx=@ma_tx;
  IF @@ROWCOUNT<>1 THROW 52204,N'Không tìm thấy tài xế',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_luu_phuong_tien
 @ma_tx UNIQUEIDENTIFIER,@bien_so NVARCHAR(15),@loai_xe NVARCHAR(50),
 @mau_xe NVARCHAR(30)=NULL,@hoat_dong BIT=1
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_xe WHERE ma_tx=@ma_tx) THROW 52204,N'Không tìm thấy tài xế',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
   THROW 52203,N'Không đổi xe khi đang có phân công',1;
  IF @bien_so IS NULL OR LEN(LTRIM(RTRIM(@bien_so)))=0 OR @loai_xe IS NULL OR LEN(LTRIM(RTRIM(@loai_xe)))=0
   OR @hoat_dong IS NULL THROW 52206,N'Thông tin xe không hợp lệ',1;
  IF EXISTS(SELECT 1 FROM dbo.phuong_tien WHERE ma_tx=@ma_tx)
   UPDATE dbo.phuong_tien SET bien_so=@bien_so,loai_xe=@loai_xe,mau_xe=@mau_xe,dang_hoat_dong=@hoat_dong WHERE ma_tx=@ma_tx;
  ELSE INSERT dbo.phuong_tien(ma_tx,bien_so,loai_xe,mau_xe,dang_hoat_dong) VALUES(@ma_tx,@bien_so,@loai_xe,@mau_xe,@hoat_dong);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_xoa_phuong_tien_chua_su_dung
 @ma_tx UNIQUEIDENTIFIER
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx)
   THROW 52207,N'Xe gắn tài xế có lịch sử; chỉ ngừng hoạt động khi tài xế rảnh',1;
  DELETE dbo.phuong_tien WHERE ma_tx=@ma_tx;
  IF @@ROWCOUNT<>1 THROW 52208,N'Không có xe để xóa',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.11. Đọc dữ liệu theo session và tra cứu phân trang

Chỉ pool `r_auth_backend` được gọi tra cứu hash, kiểm tra phiên và đăng ký; không cấp cho
bốn role nghiệp vụ hay worker thanh toán. Backend kiểm tra BCrypt trước đăng nhập, mật khẩu
cũ trước đổi mật khẩu; kiểm tra `auth_version` mỗi request rồi đặt actor lên kết nối nghiệp vụ.
Không đưa hash, secret DB hay quyền chọn pool/actor cho trình duyệt. Cần giới hạn tần suất
đăng nhập/đăng ký ở ứng dụng. `total` dùng window count: trang rỗng trả 0 dòng, BE phải xử lý.

```sql
-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_xac_thuc_noi_bo @username NVARCHAR(50) AS
BEGIN
 SET NOCOUNT ON;
 -- Chỉ r_auth_backend được gọi; dữ liệu này không được trả về trình duyệt.
 SELECT ma_tk,username,mat_khau_hash,vai_tro,trang_thai,auth_version FROM dbo.tai_khoan WHERE username=@username;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_phien_noi_bo @ma_tk UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON;
 SELECT t.ma_tk,t.ho_ten,t.vai_tro,t.trang_thai,t.auth_version,k.ma_kh,x.ma_tx
 FROM dbo.tai_khoan t LEFT JOIN dbo.khach_hang k ON k.ma_tk=t.ma_tk
 LEFT JOIN dbo.tai_xe x ON x.ma_tk=t.ma_tk WHERE t.ma_tk=@ma_tk;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ho_so_cua_toi AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 SELECT t.ma_tk,t.username,t.ho_ten,t.so_dien_thoai,t.email,t.vai_tro,t.trang_thai,t.auth_version,
 k.ma_kh,k.dia_chi_mac_dinh,k.ma_hang,x.ma_tx,x.trang_thai AS trang_thai_tai_xe
 FROM dbo.tai_khoan t LEFT JOIN dbo.khach_hang k ON k.ma_tk=t.ma_tk LEFT JOIN dbo.tai_xe x ON x.ma_tk=t.ma_tk WHERE t.ma_tk=@actor;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_tra_cuu_danh_muc
 @loai VARCHAR(15),@q NVARCHAR(100)=NULL,@page INT=0,@size INT=20 AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') OR @loai IS NULL OR @loai NOT IN ('KHACH','TAI_XE','XE','CHINH_SACH')
  OR @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100 THROW 52301,N'Sai quyền hoặc tham số tra cứu',1;
 IF @loai='CHINH_SACH' AND @role<>'CHU_DOI_XE' THROW 52001,N'Chỉ chủ đội xe quản lý phiên bản',1;
 DECLARE @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 IF @loai='KHACH'
  SELECT k.ma_kh,t.ho_ten,t.so_dien_thoai,t.trang_thai,k.ma_hang,COUNT_BIG(*) OVER() AS total
  FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
  WHERE @q IS NULL OR t.ho_ten LIKE N'%'+@q+N'%' OR t.so_dien_thoai LIKE '%'+@q+'%'
  ORDER BY t.ho_ten,k.ma_kh OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
 ELSE IF @loai='TAI_XE'
  SELECT x.ma_tx,t.ho_ten,t.so_dien_thoai,x.trang_thai,x.ranh_tu,x.vi_tri_demo_dia_chi,x.vi_tri_demo_nguon,COUNT_BIG(*) OVER() AS total
  FROM dbo.tai_xe x JOIN dbo.tai_khoan t ON t.ma_tk=x.ma_tk
  WHERE @q IS NULL OR t.ho_ten LIKE N'%'+@q+N'%' OR t.so_dien_thoai LIKE '%'+@q+'%'
  ORDER BY t.ho_ten,x.ma_tx OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
 ELSE IF @loai='XE'
  SELECT p.*,COUNT_BIG(*) OVER() AS total FROM dbo.phuong_tien p WHERE @q IS NULL OR p.bien_so LIKE N'%'+@q+N'%'
  ORDER BY p.bien_so,p.ma_phuong_tien OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
 ELSE SELECT p.*,COUNT_BIG(*) OVER() AS total FROM dbo.v_phien_ban_chinh_sach p WHERE @q IS NULL OR p.loai LIKE '%'+@q+'%'
  ORDER BY p.loai,p.hieu_luc_tu,p.ma OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_doc_don
 @ma_don UNIQUEIDENTIFIER=NULL,@page INT=0,@size INT=20 AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100 THROW 52302,N'Sai phân trang',1;
 DECLARE @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 DECLARE @quyen TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @quyen SELECT d.ma_don FROM dbo.don_hang d JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
 WHERE (@ma_don IS NULL OR d.ma_don=@ma_don) AND (
  @role IN ('TONG_DAI','CHU_DOI_XE') OR (@role='KHACH_HANG' AND k.ma_tk=@actor)
  OR (@role='TAI_XE' AND EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx
   WHERE p.ma_don=d.ma_don AND t.ma_tk=@actor AND (p.ket_qua IS NULL OR p.ket_qua<>'TU_CHOI'))));
 IF @ma_don IS NOT NULL AND NOT EXISTS(SELECT 1 FROM @quyen) THROW 52303,N'Không tìm thấy đơn được phép xem',1;
 SELECT d.*,v.tong_cuoc,COUNT_BIG(*) OVER() AS total FROM dbo.don_hang d JOIN @quyen q ON q.ma_don=d.ma_don
 JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don ORDER BY d.tao_luc DESC,d.ma_don OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
 IF @ma_don IS NOT NULL
 BEGIN
  SELECT k.* FROM dbo.chi_tiet_kien_hang k WHERE k.ma_don=@ma_don;
  SELECT p.* FROM dbo.phu_thu_don_hang p WHERE p.ma_don=@ma_don;
  SELECT n.* FROM dbo.nhat_ky_don_hang n WHERE n.ma_don=@ma_don ORDER BY n.thoi_gian,n.ma_su_kien;
 END;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_goi_y_tai_xe @ma_don UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 52001,N'Không đủ quyền',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.don_hang WHERE ma_don=@ma_don AND trang_thai='CHO_GAN') THROW 51202,N'Đơn không chờ gán',1;
 SELECT v.*,t.vi_tri_demo_dia_chi,t.vi_tri_demo_lat,t.vi_tri_demo_lng,t.vi_tri_demo_nguon,t.vi_tri_demo_luc
 FROM dbo.v_tai_xe_san_sang v JOIN dbo.tai_xe t ON t.ma_tx=v.ma_tx
 WHERE NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p WHERE p.ma_don=@ma_don AND p.ma_tx=v.ma_tx AND p.ket_qua='TU_CHOI')
 ORDER BY v.ranh_tu,v.ma_tx;
 -- BE tính Goong từ demo đến điểm lấy và xếp km; nếu lỗi, ghi nhãn dự phòng theo ranh_tu, không giữ transaction qua HTTP.
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_doc_chinh_sach @loai VARCHAR(15),@ma UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role<>'CHU_DOI_XE' THROW 52001,N'Không đủ quyền',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma)
  THROW 52003,N'Không tìm thấy chính sách',1;
 IF @loai='CUOC' SELECT * FROM dbo.cau_hinh_cuoc WHERE ma_bieu_phi=@ma;
 ELSE IF @loai='THANH_VIEN' SELECT * FROM dbo.chinh_sach_thanh_vien WHERE ma_chinh_sach=@ma;
 ELSE SELECT * FROM dbo.cau_hinh_phu_thu WHERE ma_phu_thu=@ma;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_doc_giao_dich_nop
 @ma UNIQUEIDENTIFIER=NULL,@page INT=0,@size INT=20 AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role NOT IN ('TAI_XE','CHU_DOI_XE') OR @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100
  THROW 52301,N'Sai quyền hoặc phân trang',1;
 SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
 IF @role='TAI_XE' AND @tx IS NULL THROW 51402,N'Thiếu hồ sơ tài xế',1;
 IF @ma IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien
  WHERE ma_giao_dich=@ma AND (@role='CHU_DOI_XE' OR ma_tx=@tx)) THROW 52303,N'Không tìm thấy giao dịch được phép xem',1;
 DECLARE @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 SELECT ma_giao_dich,ma_tx,ma_tham_chieu,so_tien_yeu_cau,trang_thai,tao_luc,giai_quyet_luc,so_tien_thuc_nhan,
  COUNT_BIG(*) OVER() AS total FROM dbo.giao_dich_nop_tien
 WHERE (@ma IS NULL OR ma_giao_dich=@ma) AND (@role='CHU_DOI_XE' OR ma_tx=@tx)
 ORDER BY tao_luc DESC,ma_giao_dich OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
END;
GO
```

## 8. Quy tắc cần phối hợp code / phần cần hoàn thiện khi triển khai

| Quy tắc | Đã có trong bản SQL | Công việc backend hoặc SQL tiếp theo |
|---|---|---|
| Xác nhận khách đã trả | TX3 ghi hoàn tất + khoản chia | UI yêu cầu xác nhận rõ; không khẳng định đã xác minh ngân hàng khách |
| Giá lịch sử | Giá chốt trên đơn; trigger policy; trigger không đổi giá đơn | Các role không có DML trực tiếp; chỉ TX1 được thêm kiện/phụ thu, không có SP công khai sửa/xóa chúng. Khi thêm SP mới phải giữ giới hạn này. Nếu bổ sung sửa đơn sau này phải thiết kế lại cơ chế chốt, không chỉ mở quyền UPDATE |
| Khoản chia phụ thuộc giá bất biến | View suy tiền từ đơn/chính sách | Cấm sửa nguồn/phân công/thời điểm/xóa khoản chia. Chỉ TX4 gắn FK giao dịch; TX5 tháo FK sau KHONG_THU. Không cấp DML trực tiếp |
| Khoản đang thanh toán giữ nguyên | TX4 chốt các khoản và số tiền trong một transaction | Không thêm khoản vào giao dịch đã trả về URL; đơn mới vẫn có FK NULL. Không có API ghép khoản thủ công |
| Giao dịch thất bại và thành công | TX5 ghi kết quả + sự kiện; KHONG_THU còn tháo liên kết cùng transaction | Thành công giữ liên kết để xác định đã nộp. Không đặt công nợ = 0 trực tiếp; không giữ lịch sử ghép từng đơn với giao dịch thất bại |
| Chính sách không chồng | TX1 phát hiện biểu phí/thành viên thiếu/chồng tại thời điểm dùng | Mục 7.9 đã có CRUD nháp, công bố kiểm tra overlap và đóng hiệu lực; cùng khóa chinh-sach và ghi audit. Cần test hai phiên công bố đồng thời và chặn sửa bản công bố |
| Đăng ký/hồ sơ | FK unique + trigger đúng vai trò | Mục 7.10 có đăng ký khách, tạo tài xế/tổng đài, cập nhật hồ sơ và xóa khi chưa có lịch sử; BCrypt ở Java. Cần triển khai auth pool và kiểm thử FK/rollback |
| Đổi mật khẩu | Cột hash/auth_version | Xác minh mật khẩu cũ ở Java; cập nhật hash + tăng auth_version theo điều kiện phiên bản cũ; kiểm tra phiên bản ở mỗi phiên. Không log hash |
| Quyền người dùng | Role SQL + kiểm tra vai trò/sở hữu trong các SP | Backend tự gắn ma_tk từ session vào SESSION_CONTEXT trước mỗi request, xóa khi trả connection về pool; không cho người dùng tự chọn actor. Kiểm tra auth_version và CSRF ở ứng dụng |
| Thay đổi trạng thái tài xế/xe | TX2 kiểm tra sẵn sàng | Mục 7.10 có thủ tục đổi trực, khóa tài khoản, sửa giấy tờ, thêm/sửa/xóa xe; cùng khóa dieu-phoi và từ chối khi còn phân công. Cần nối API/UI và test tranh chấp |
| VNPay | Giao dịch, sự kiện, số tiền, mã tham chiếu unique, TX5 | Xác minh chữ ký/merchant/currency/response code; IPN/query đáng tin mới ghi thành công; Return chỉ hiển thị/tra cứu. Dùng đơn vị số tiền đúng tài liệu VNPay khi chuyển VND ↔ payload |
| Timeout và retry | ux_gd_open chặn lần chưa giải quyết thứ hai | Worker đánh dấu CHUA_RO_KET_QUA và query; chỉ KHONG_THU sau bằng chứng. Không mở lại chỉ vì thời gian trôi qua. Chưa có job/endpoint query trong tài liệu |
| Lỗi giữa DB commit và gửi HTTP | Mã tham chiếu cố định, khóa request tạo đơn/thanh toán, giao dịch chưa giải quyết tái sử dụng | Retry phải trả cùng đối tượng; không bấm lại thành giao dịch mới khi kết quả chưa rõ |
| Sự kiện mâu thuẫn | CAN_DOI_SOAT, không đảo kết quả | Hiện cảnh báo cho chủ đội xe; nghiệp vụ hoàn tiền/điều chỉnh không tự triển khai trong phạm vi này |
| CRUD báo cáo môn học | Schema + các nghiệp vụ chính đủ chỗ tích hợp | Mục 7.9–7.11 có CRUD nháp/hồ sơ/xe, tra cứu phân trang, đơn và giao dịch giới hạn theo actor. Cần test bằng role thật và nối UI; chưa coi UI localStorage là CRUD SQL Server |

Lưu ý thiết kế: SQL Server CHECK chấp nhận UNKNOWN do NULL, nên các nhánh bắt buộc có giá trị đã dùng IS NOT NULL. Ràng buộc ngày giấy phép so với hôm nay đặt ở nghiệp vụ gán, không chỉ CHECK lúc INSERT. FK ngăn tham chiếu không tồn tại nhưng không tự chứng minh người gọi được thao tác bản ghi đó.

**Chốt tài chính:** không lưu snapshot tổng cước lần hai trong phan_chia_cuoc để giảm dư thừa; đổi lại phải giữ nguyên đơn/kiện/phụ thu/policy đã dùng. Nếu sau này cho điều chỉnh cước sau hoàn tất, cần thêm nghiệp vụ điều chỉnh và lịch sử, không chỉnh trực tiếp dữ liệu nguồn. Chính sách 80/20 thay đổi trong tương lai cũng cần phiên bản/snapshot mới; bản này cố định 80/20 theo phạm vi đã thống nhất.

## 9. [V8] Phân quyền SQL Server: bốn role nghiệp vụ, worker và auth backend

Không dùng sa/db_owner cho backend. Bốn role nghiệp vụ và hai role backend dưới đây là quyền SQL thực, không chỉ enum ứng dụng. User WITHOUT LOGIN dùng cho bài demo EXECUTE AS trong DB, **chưa phải tài khoản JDBC đăng nhập được**. Khi triển khai, quản trị tạo LOGIN riêng bằng secret bên ngoài tài liệu và CREATE USER FOR LOGIN tương ứng. Backend có thể dùng pool theo vai trò và một pool worker callback và một pool auth; việc chọn pool phải do session đã xác thực, không do request tự khai. Không cấp worker/auth backend cho khách/tài xế. Pool auth riêng chỉ được EXECUTE ba thủ tục đăng ký/xác thực/kiểm tra phiên; không SELECT trực tiếp bảng và không được áp dụng kết quả VNPay.

```sql
-- FILE: V8__create_roles_and_permissions.sql
CREATE ROLE r_khach_hang;
CREATE ROLE r_tai_xe;
CREATE ROLE r_tong_dai;
CREATE ROLE r_chu_doi_xe;
CREATE ROLE r_payment_worker;
CREATE ROLE r_auth_backend;
CREATE USER demo_khach WITHOUT LOGIN;
CREATE USER demo_taixe WITHOUT LOGIN;
CREATE USER demo_tongdai WITHOUT LOGIN;
CREATE USER demo_chudoi WITHOUT LOGIN;
CREATE USER demo_payment WITHOUT LOGIN;
CREATE USER demo_auth WITHOUT LOGIN;
ALTER ROLE r_khach_hang ADD MEMBER demo_khach;
ALTER ROLE r_tai_xe ADD MEMBER demo_taixe;
ALTER ROLE r_tong_dai ADD MEMBER demo_tongdai;
ALTER ROLE r_chu_doi_xe ADD MEMBER demo_chudoi;
ALTER ROLE r_payment_worker ADD MEMBER demo_payment;
ALTER ROLE r_auth_backend ADD MEMBER demo_auth;
GO
GRANT EXECUTE ON dbo.usp_tao_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_huy_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_tao_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_huy_don TO r_tong_dai;
GRANT SELECT ON dbo.v_don_cho_dieu_phoi TO r_tong_dai;
GRANT SELECT ON dbo.v_tai_xe_san_sang TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_tien_trinh TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_hoan_tat TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_bat_dau_thanh_toan TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_thu_nhap_cua_toi TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_tao_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_huy_don TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_chia_cuoc TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_so_du_tai_xe TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_giao_dich_nop TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_cong_ty_thuc_nhan_ngay TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_ap_dung_ket_qua_nop TO r_payment_worker;
GRANT EXECUTE ON dbo.usp_dang_ky_khach TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_xac_thuc_noi_bo TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_phien_noi_bo TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_doi_mat_khau TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_ho_so_cua_toi TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_doc_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doi_mat_khau TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_ho_so_cua_toi TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doc_don TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_doi_mat_khau TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_ho_so_cua_toi TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_doc_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_doi_mat_khau TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_ho_so_cua_toi TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_doc_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_luu_chinh_sach_nhap TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_xoa_chinh_sach_nhap TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_dong_hieu_luc_chinh_sach TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_cong_bo_chinh_sach TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_tao_tai_khoan_noi_bo TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_khoa_tai_khoan TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_xoa_tai_khoan_chua_su_dung TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_cap_nhat_hang_khach TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_ho_so_tai_xe TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_luu_phuong_tien TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_xoa_phuong_tien_chua_su_dung TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_doc_chinh_sach TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_tra_cuu_danh_muc TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_goi_y_tai_xe TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_vi_tri_demo TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_tra_cuu_danh_muc TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_goi_y_tai_xe TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_vi_tri_demo TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_trang_thai_tai_xe TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doc_giao_dich_nop TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_trang_thai_tai_xe TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_doc_giao_dich_nop TO r_chu_doi_xe;
DENY SELECT,INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_auth_backend;
DENY SELECT ON SCHEMA::dbo TO r_payment_worker;
DENY SELECT ON dbo.tai_khoan TO r_khach_hang;
DENY SELECT ON dbo.tai_khoan TO r_tai_xe;
DENY SELECT ON dbo.tai_khoan TO r_tong_dai;
DENY SELECT ON dbo.tai_khoan TO r_chu_doi_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_khach_hang;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tai_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tong_dai;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_chu_doi_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_payment_worker;
GO
-- Ví dụ cấp tạm quyền xem lịch sử giao dịch nộp cho tổng đài rồi thu hồi (trạng thái cuối: không có quyền).
GRANT SELECT ON dbo.v_giao_dich_nop TO r_tong_dai;
REVOKE SELECT ON dbo.v_giao_dich_nop FROM r_tong_dai;
GO
```

Ownership chaining cùng chủ sở hữu dbo cho phép SP tĩnh được cấp EXECUTE truy cập bảng dù user không được DML trực tiếp. Không dùng dynamic SQL hoặc EXECUTE AS OWNER tràn lan để vượt kiểm tra quyền. Helper usp_actor/usp_khoa không cấp EXECUTE trực tiếp. Khách/tài xế không được SELECT view toàn bộ dữ liệu; truy vấn của mình phải đi qua SP kiểm tra actor. Mục 7.11 có thủ tục đọc hồ sơ, đơn/lịch sử và tra cứu theo actor; không trả hash trong các thủ tục nghiệp vụ.

Giới hạn tin cậy: SESSION_CONTEXT do backend đặt không chống được người đã nắm credential DB của pool. Để demo cô lập theo từng cá nhân ở DB trực tiếp, ánh xạ DB user → ma_tk trong bảng/ cấu hình được quản trị bảo vệ, thay vì cho demo user tự đặt ma_tk. Không tuyên bố đã có row-level security. Với web, credential chỉ nằm ở backend; demo kiểm tra quyền role và sở hữu dùng đúng mô hình này.

## 10. Kịch bản transaction, lỗi và đồng thời để bảo vệ bài

Các bước dưới là **kế hoạch kiểm thử**, chưa chạy và chưa có kết quả đo. Dùng DB thử riêng sau khi duyệt thiết kế, seed tài khoản/hồ sơ/chính sách/đơn bằng dữ liệu nhất quán.

| TX | Thành phần phải commit cùng nhau | Thử lỗi/rollback |
|---|---|---|
| TX1 tạo đơn | Đơn + kiện + phụ thu + log trigger | Trùng thứ tự kiện / sai phụ thu / giá thay đổi → không có đơn mồ côi |
| TX2 phân công | Phân công + trạng thái đơn + hàng đợi tài xế + log | Tài xế bận → không đổi đơn; cố tình gây lỗi sau INSERT phân công trong bản test → rollback tất cả |
| TX3 hoàn tất | Kết thúc phân công + hoàn tất đơn + chia cước + tài xế rảnh + log | Chưa đến điểm nhận/không xác nhận thu đủ → không có thu nhập; lỗi trước COMMIT → không hoàn tất dở |
| TX4 bấm thanh toán | Giao dịch + liên kết các khoản đang chưa nộp | Không có khoản dương → không tạo giao dịch rỗng; hai request → chỉ một giao dịch chưa giải quyết |
| TX5 áp dụng VNPay | Kết quả giao dịch + sự kiện; nếu KHONG_THU thì tháo FK khoản chia | Sai số tiền → chỉ cảnh báo; lỗi tháo liên kết/ghi log → rollback toàn bộ; thành công không tháo FK |
| TX6 tiến trình | Trạng thái + log; từ chối còn đóng phân công và trả tài xế rảnh | Sai tài xế/thứ tự → không đổi dữ liệu |
| TX7 hủy | Hủy đơn + đóng phân công + giải phóng tài xế + log | Đã lấy hàng → từ chối, không ảnh hưởng thu nhập |

### 10.1. Demo hai tổng đài cùng gán

1. Hai session thử, hai tài khoản tổng đài hợp lệ, cùng một đơn CHO_GAN.
2. Session A BEGIN TRAN rồi gọi usp_khoa 'dieu-phoi', giữ khóa trong khi quan sát session B (không gọi SP tự quản transaction lồng vào A).
3. Session B gọi usp_phan_cong; phải chờ khóa hoặc timeout có thông báo.
4. A ROLLBACK để nhả khóa; B hoàn tất gán. Gọi lại gán đơn đó từ A → bị từ chối vì không còn CHO_GAN.
5. Kiểm tra chỉ một phân công mở. Demo bổ sung cùng tài xế/hai đơn: chỉ một thành công nhờ kiểm tra dưới khóa + unique index.

Để demo đúng một thao tác gán đang thực thi rồi tranh chấp, có thể dùng bản sao thủ tục trong DB test với điểm dừng sau lấy khóa; không thêm WAITFOR vào thủ tục chính. Trình bày khóa ứng dụng dùng chủ sở hữu Transaction, được nhả lúc commit/rollback; mã trả về âm phải được xử lý.

### 10.2. Demo tài chính bắt buộc

- Ba đơn tổng cước 300.000đ → hiện Cần nộp 60.000đ; một lần bấm mở VNPay, không màn tạo/chọn đợt. Trả thành công, không có đơn mới → còn 0đ, thu nhập 240.000đ không đổi.
- Không bấm trả, hoàn tất thêm đơn 100.000đ → số cần nộp cộng thành 80.000đ. Khi bấm, VNPay yêu cầu 80.000đ.
- Đã mở VNPay cho 60.000đ rồi mới phát sinh 20.000đ → giao dịch vẫn 60.000đ. Trả thành công → còn 20.000đ. Ngày hôm sau khoản này vẫn còn.
- Bấm hai lần/gửi hai request đồng thời → cùng một giao dịch chưa giải quyết. Frontend dùng khoa_yeu_cau chuẩn trả về cùng giao dịch cho các retry tiếp theo; không tự sinh khóa mới khi retry mạng.
- Callback thành công lặp (cùng hash và khác hash) → không nộp hai lần, không giải quyết các đơn mới ngoài giao dịch.
- Callback sai tiền/chữ ký/merchant → không thành công, công nợ chưa giảm.
- Đóng tab/hết hạn URL/timeout → không tự KHONG_THU, không tháo liên kết, không tạo lần mới cho đến khi tra cứu chắc chắn.
- Sau KHONG_THU đã xác minh → FK của các khoản trở về NULL, giao dịch thất bại vẫn còn nguyên số tiền và sự kiện. Lần bấm mới thanh toán toàn bộ khoản chưa nộp lúc đó (có thể lớn hơn lần trước vì có đơn mới).
- Callback mâu thuẫn muộn sau KHONG_THU → CAN_DOI_SOAT; không tự đánh dấu các khoản đã chuyển sang giao dịch mới là đã nộp, không tự đảo nợ.
- Callback/hoàn tất đơn/bấm thanh toán đồng thời → cùng khóa tài xế giữ ranh giới nhất quán.
- Mất HTTP response sau khi giao dịch đã thành công: retry khóa yêu cầu cũ trả giao dịch thành công cũ, không tự lấy khoản mới để thanh toán.
- Người khác gọi ma_don/ma_giao_dich không thuộc mình → từ chối; API đọc/tra cứu phải kiểm tra sở hữu. Tổng đài không EXECUTE thủ tục áp dụng kết quả.
- Insert/update nhiều dòng để kiểm tra trigger; không chỉ test từng dòng.

### 10.3. Truy vấn đối chiếu bất biến sau kiểm thử

```sql
-- KIEM TRA RIENG: khong ghep khoi nay vao migration.
-- Kỳ vọng 0 dòng cho từng SELECT dưới đây, sau khi các transaction đã kết thúc.
SELECT d.ma_don FROM dbo.don_hang d WHERE d.trang_thai='HOAN_TAT'
 AND NOT EXISTS(SELECT 1 FROM dbo.phan_chia_cuoc c WHERE c.ma_don=d.ma_don);
SELECT d.ma_don FROM dbo.don_hang d
 WHERE NOT EXISTS(SELECT 1 FROM dbo.chi_tiet_kien_hang k WHERE k.ma_don=d.ma_don);
SELECT c.ma_don FROM dbo.v_chia_cuoc c JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=c.ma_giao_dich_nop
 WHERE c.ma_tx<>g.ma_tx OR c.tien_cong_ty<=0 OR g.trang_thai='KHONG_THU';
SELECT * FROM dbo.v_giao_dich_nop
 WHERE (trang_thai<>'KHONG_THU' AND (so_don_dang_lien_ket=0 OR tong_khoan_lien_ket<>so_tien_yeu_cau))
 OR (trang_thai='KHONG_THU' AND so_don_dang_lien_ket<>0);
SELECT * FROM dbo.v_so_du_tai_xe WHERE con_phai_nop<0
 OR con_phai_nop<>dang_thanh_toan+chua_dua_vao_thanh_toan
 OR cong_ty_duoc_huong<>da_nop+con_phai_nop;
-- Đối chiếu tiền đã nhận theo giao dịch với phần công ty của các đơn đã nộp.
SELECT t.ma_tx FROM dbo.v_so_du_tai_xe t OUTER APPLY (
 SELECT SUM(g.so_tien_thuc_nhan) AS tong FROM dbo.giao_dich_nop_tien g
 WHERE g.ma_tx=t.ma_tx AND g.trang_thai='THANH_CONG'
) x WHERE t.da_nop<>COALESCE(x.tong,0);
```

### 10.4. Kiểm thử bổ sung cho lần sửa SQL 18/10

Kịch bản chạy sau khi tạo DB test mới và seed riêng, không áp dụng vào DB đang dùng:

| Trường hợp | Kết quả mong đợi |
|---|---|
| Tài xế đã TU_CHOI đơn A | Không xuất hiện trong usp_goi_y_tai_xe(A); usp_phan_cong(A, tài xế đó) báo 51204; có thể nhận đơn B nếu rảnh |
| ONLINE nhưng ranh_tu NULL | Không có trong view sẵn sàng; gán bị từ chối |
| Cước 50.000 + phụ thu 5.000, giảm 10% | Giảm 5.500; tổng 49.500; hai phần 9.900/39.600 |
| Giảm 100% cả cước và phụ thu | Tổng 0; tạo đơn/hoàn tất được, không tạo giao dịch nộp 0 đồng |
| FE gửi [] nhưng có phụ thu bắt buộc hiệu lực | SQL vẫn thêm khoản bắt buộc và yêu cầu giá đồng ý khớp tổng đã tính |
| Chọn phụ thu tùy chọn hết hạn hoặc gửi mã bắt buộc trong danh sách tùy chọn | Rollback tạo đơn; không có đơn/kiện/phụ thu mồ côi |
| Hai phiên công bố chính sách cùng nhóm, khoảng thời gian chồng | Một phiên bị từ chối; hai khoảng tiếp giáp tại T được phép |
| Sửa/xóa nội dung CONG_BO | Bị từ chối; chỉ đóng mốc kết thúc tương lai một lần |
| Khách sửa hồ sơ/đọc đơn người khác | Bị từ chối; không trả hash qua SP hồ sơ/tra cứu |
| Khách EXEC thủ tục công bố hoặc áp dụng VNPay | Permission denied; worker không đăng ký và auth backend không áp dụng VNPay |
| Đăng ký trùng username/SĐT hoặc thiếu hồ sơ tài xế bắt buộc | Rollback toàn tài khoản và hồ sơ |
| Xóa tài khoản/xe có lịch sử hoặc sửa xe/giấy tờ khi đang có phân công | Từ chối; dữ liệu lịch sử không bị mất |
| Lưu vị trí demo thiếu tọa độ, sai miền lat/lng | Bị từ chối; dữ liệu hợp lệ luôn có nguồn DEMO_CO_DINH và thời điểm UTC |

**Bằng chứng kiểm tra hiện tại:** đã trích các khối SQL định nghĩa ở mục 3–9 (không gồm
các ví dụ đo/kiểm thử) và phân tích bằng SQLFluff 4.4.0 dialect `tsql`, không có lỗi parse.
Đã kiểm tra không trùng tên đối tượng, mọi GRANT EXECUTE trỏ đến SP tồn tại,
helper không được cấp trực tiếp, ba SP auth chỉ cấp r_auth_backend và SP áp dụng
VNPay chỉ cấp r_payment_worker. Có 16 bảng, 8 view, 5 UDF, 9 trigger, 34 SP.
Đây là kiểm tra tĩnh, **không chứng minh biên dịch/ràng buộc/quyền/concurrency trên SQL Server**.
Lượt thử khởi động DB bị chặn tại tải image mcr.microsoft.com/mssql/server:2022-latest
(`Forbidden`); các kịch bản trên chưa chạy, chưa có kết quả thực thi.

## 11. Minh chứng index và đối chiếu rubric

Chọn ít nhất năm truy vấn: lịch sử đơn của khách (ix_don_customer_time), hàng đợi (ix_don_queue), lịch sử tài xế (ix_pc_driver_time), nhật ký đơn (ix_log_order_time), lịch sử nộp tiền của tài xế (ix_gd_driver_time). Seed dữ liệu đủ lớn/phân bố hợp lý trong DB test, cập nhật statistics, dùng cùng tham số và cùng dữ liệu trước/sau. Bật Actual Execution Plan và SET STATISTICS IO, TIME ON; ghi logical reads, CPU, elapsed time, scan/seek. Chạy vài lượt để phân biệt warm cache; không kết luận từ một lần đo.

Ví dụ truy vấn đo (thay UUID bằng khách đã seed):

```sql
-- KIEM TRA RIENG: khong ghep khoi nay vao migration.
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
DECLARE @kh UNIQUEIDENTIFIER='00000000-0000-0000-0000-000000000001';
SELECT TOP (50) ma_don,tao_luc,trang_thai FROM dbo.don_hang
WHERE ma_kh=@kh ORDER BY tao_luc DESC;
SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

So sánh ở hai bản DB thử giống nhau hoặc bỏ/tạo lại **chỉ index thường đang đánh giá** trong DB test. Không xóa unique index bảo vệ nghiệp vụ để lấy số đo. Không bịa số phần trăm cải thiện; bảng nhỏ có thể scan hiệu quả hơn. Với UUID ngẫu nhiên làm clustered PK mặc định, cần đo fragmentation/page split khi dữ liệu lớn; đây là đánh đổi để tương thích cách sinh ID hiện tại, không tuyên bố tối ưu mọi tải.

| Yêu cầu đề bài | Nội dung bản đề xuất | Trạng thái |
|---|---|---|
| ≥8 bảng có quan hệ, phân tích 3NF | 16 bảng, bảng quan hệ mục 2, PK/FK mục 3 | Có thiết kế; cần vẽ ERD từ bản đã duyệt |
| ≥5 CHECK/UNIQUE/DEFAULT | Vai trò, trạng thái, tiền, kg, thời gian, mã tham chiếu, số điện thoại… | Có SQL |
| ≥5 trigger | 9 trigger ở mục 6 | Có SQL; chưa chạy multi-row/rollback test |
| ≥5 view | 8 view ở mục 5 | Có SQL; cần tích hợp màn hình |
| ≥5 index, có non-PK và đo hiệu năng | Unique + 7 index tra cứu thường ở mục 4 | Có SQL; chưa có kết quả đo |
| ≥5 SP, TRY/CATCH | 7 SP transaction chính, SP CRUD/chính sách/tra cứu và 2 helper | Có SQL; cần biên dịch và kiểm thử rollback/quyền |
| ≥5 UDF | 4 scalar + 1 inline TVF | Có SQL và vị trí sử dụng |
| ≥5 nghiệp vụ transaction | TX1–TX7 | Có SQL; chưa có bằng chứng chạy |
| Tranh chấp đồng thời | Gán đơn, bắt đầu thanh toán, callback/retry | Có kịch bản; chưa demo |
| ≥4 Role/Login | 4 role nghiệp vụ + worker + auth backend; 6 user WITHOUT LOGIN cho demo | Có SQL role/user; login thực cấu hình sau |
| GRANT/REVOKE/DENY | Mục 9 | Có SQL; cần test EXECUTE AS/ứng dụng |
| App gọi SP/Function, CRUD/search/report | Kiến trúc đích gọi các SP/View/UDF, mục 8 | Chưa sửa code, không ghi đã hoàn thành |
| Báo cáo/backup/demo | Dùng thiết kế đã duyệt làm cơ sở | Tài liệu này không thay báo cáo 50–100 trang, backup hay demo thật |

## 12. Lộ trình chuyển code sau khi duyệt

1. Duyệt tên bảng/cột, kiểu UUID, quy tắc thanh toán một nút và giải phóng khoản sau KHONG_THU, giá bất biến và phạm vi CRUD. Vẽ ERD/lược đồ quan hệ từ 16 bảng này.
2. Tạo nhánh/DB thử riêng và script tạo mới được kiểm thử; không sửa migration đã áp dụng. Chuyển dữ liệu cũ cần kế hoạch riêng, không tự coi thanh toán cũ là khoản tài xế đã thu theo luồng mới.
3. Đổi entity/DAO và đưa từng nghiệp vụ vào SP; tránh Java vừa tự ghi cùng bảng vừa gọi SP để ghi lặp. Không lồng transaction tùy tiện.
4. Bỏ UI lựa chọn phương thức/người trả, thanh toán khách, COD điều phối, quên mật khẩu. Thêm xác nhận đã giao + thu đủ và màn công nợ tài xế.
5. Chuyển VNPay sang mã tham chiếu giao dịch nộp tiền; sửa IPN/Return/query, job xử lý chưa rõ, chống trùng và quyền worker.
6. Tích hợp các SP CRUD, đọc theo actor, quản lý chính sách, đăng ký/đổi mật khẩu ở mục 7.9–7.11; cấu hình pool/role và thực hiện checklist mục 8.
7. Chạy kiểm thử DB/API/UI trên DB test, lưu bằng chứng rollback, concurrency, quyền và index; chỉ sau đó viết migration/seed và cập nhật báo cáo chính thức.

## 13. [V9 — demo] INSERT dữ liệu mẫu thay Java seeder

### 13.1. Phạm vi và tài khoản

File đích: `db/designV2/sqlserver/demo/V9__insert_demo_data.sql`.
Chỉ tách khối SQL mục 13.2 vào file; mục 13.3 là câu truy vấn kiểm tra riêng.
Chạy sau V1–V8 bằng Flyway trên DB **mới/rỗng** `mini_ong_vang_design_v2_demo`
hoặc `mini_ong_vang_design_v2_test`. Không gọi DesignV1DemoSeeder/SeedCommand.
Giữ đúng 8 username của dự án; không thêm tài khoản đăng nhập khác.

| Username | Vai trò | Hồ sơ |
|---|---|---|
| `0900000001` | KHACH_HANG | Khách thường |
| `0900000002` | KHACH_HANG | Khách Vàng đang hiệu lực |
| `0900000003` | KHACH_HANG | Khách Vàng đã hết hạn |
| `demo_dispatcher` | TONG_DAI | Điều phối |
| `demo_admin` | CHU_DOI_XE | Chủ đội xe |
| `0800000001` | TAI_XE | Tài xế 1 |
| `0800000002` | TAI_XE | Tài xế 2 |
| `0800000003` | TAI_XE | Tài xế 3 |

Mật khẩu riêng cho **bộ dữ liệu demo SQL**: `DemoSql_2026!`; SQL chỉ INSERT BCrypt hash.
Hash đã được tạo và kiểm tra bằng jBCrypt 0.4 của dự án, không lưu mật khẩu rõ vào bảng.
Đây không phải mật khẩu DEMO_PASSWORD hiện có trên máy các thành viên; nếu muốn giữ mật khẩu
đó, thay @hash bằng BCrypt hash được tạo an toàn bên ngoài SQL trước khi chốt migration V9.
Không sửa hash/file V9 sau khi đã áp dụng; muốn đổi mật khẩu dùng thủ tục đổi mật khẩu.
Tên đăng nhập giữ nguyên nhưng ID `TK-DEMO-*`/`KH-DEMO-*`/`TX-DEMO-*` phải đổi thành UUID
vì schema mới không nhận các mã chuỗi cũ. Không dùng lại test/API hardcode các ID cũ.

Bộ nạp tạo 30 đơn, 60 kiện, 37 liên kết phụ thu, 16 phân công, 12 khoản chia,
nhật ký, chính sách và 3 giao dịch nộp đang chờ. Trạng thái cuối: 12 HOAN_TAT,
14 CHO_GAN (gồm 2 đơn từng bị từ chối), 2 DA_HUY, 1 DA_GAN, 1 DANG_GIAO.
Tài xế 3 còn rảnh để thử gợi ý/gán; tài xế 1 và 2 đang giữ hai phân công mở.
Ba giao dịch nộp chỉ minh họa trạng thái chờ, không đại diện tiền công ty đã nhận;
sự kiện mẫu đánh dấu chữ ký không hợp lệ và JSON có `demo=true`.
Địa chỉ đơn có thật nhưng km/thời gian là DEMO; vị trí tài xế để NULL cho đến khi Goong
xác minh. Không gắn tọa độ đoán là DEMO_CO_DINH, không tạo payment_url giả.

Khối INSERT được chạy bằng tài khoản migration có quyền tạo/nạp DB, không phải role
người dùng. Một transaction bao toàn bộ; giữ trigger/FK/CHECK bật, thay actor khi mô phỏng
thao tác để trigger ghi log, phục hồi SESSION_CONTEXT sau cùng. Không gọi các SP tự sở hữu
transaction bên trong transaction nạp dữ liệu. Chạy lại trên DB có dữ liệu sẽ dừng rõ ràng,
không DELETE/TRUNCATE hay ghi đè. Flyway bảo đảm V9 bình thường chỉ chạy một lần.

### 13.2. Nội dung V9__insert_demo_data.sql

```sql
-- FILE: V9__insert_demo_data.sql
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo',N'mini_ong_vang_design_v2_test')
 THROW 52400,N'V9 chỉ được chạy trên DB demo/test của schema designV2',1;
IF EXISTS(SELECT 1 FROM dbo.tai_khoan) OR EXISTS(SELECT 1 FROM dbo.don_hang)
 OR EXISTS(SELECT 1 FROM dbo.cau_hinh_cuoc) OR EXISTS(SELECT 1 FROM dbo.chinh_sach_thanh_vien)
 OR EXISTS(SELECT 1 FROM dbo.cau_hinh_phu_thu) OR EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien)
 OR EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan) OR EXISTS(SELECT 1 FROM dbo.nhat_ky_kiem_toan)
 THROW 52401,N'Chỉ nạp một lần vào DB demo rỗng; không ghi đè dữ liệu thành viên khác',1;
DECLARE @actor_truoc SQL_VARIANT=SESSION_CONTEXT(N'ma_tk');
DECLARE @now DATETIME2(3)=SYSUTCDATETIME(),@tu DATETIME2(3)=DATEADD(DAY,-60,SYSUTCDATETIME()),
 @admin UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000102',
 @dieu_phoi UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000101',
 @hash NVARCHAR(255)=N'$2a$12$5BCGfQz7K8SpnBNCUGRs.uPw/h9oPEZjI7orurXnQiwKHb2w/AH2u',
 @bp UNIQUEIDENTIFIER='60000000-0000-0000-0000-000000000001',
 @vang UNIQUEIDENTIFIER='61000000-0000-0000-0000-000000000002',
 @pt_bat_buoc UNIQUEIDENTIFIER='62000000-0000-0000-0000-000000000001',
 @pt_tuy_chon UNIQUEIDENTIFIER='62000000-0000-0000-0000-000000000002';
BEGIN TRY
 BEGIN TRAN;
 -- 1. Đúng 8 username của DesignV1DemoSeeder; đổi khóa sang UUID theo schema mới.
 INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,vai_tro,ngay_tao) VALUES
 ('10000000-0000-0000-0000-000000000001',N'0900000001',@hash,N'Khách thường','0900000001','KHACH_HANG',@tu),
 ('10000000-0000-0000-0000-000000000002',N'0900000002',@hash,N'Khách hạng Vàng','0900000002','KHACH_HANG',@tu),
 ('10000000-0000-0000-0000-000000000003',N'0900000003',@hash,N'Khách ưu đãi hết hạn','0900000003','KHACH_HANG',@tu),
 (@dieu_phoi,N'demo_dispatcher',@hash,N'Tổng đài demo',NULL,'TONG_DAI',@tu),
 (@admin,N'demo_admin',@hash,N'Chủ đội xe demo',NULL,'CHU_DOI_XE',@tu),
 ('10000000-0000-0000-0000-000000000201',N'0800000001',@hash,N'Tài xế demo 1','0800000001','TAI_XE',@tu),
 ('10000000-0000-0000-0000-000000000202',N'0800000002',@hash,N'Tài xế demo 2','0800000002','TAI_XE',@tu),
 ('10000000-0000-0000-0000-000000000203',N'0800000003',@hash,N'Tài xế demo 3','0800000003','TAI_XE',@tu);
 INSERT dbo.khach_hang(ma_kh,ma_tk,dia_chi_mac_dinh,ma_hang,thanh_vien_tu,thanh_vien_den) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',N'227 Nguyễn Văn Cừ, TP.HCM','THUONG',NULL,NULL),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',N'268 Lý Thường Kiệt, TP.HCM','VANG',@tu,DATEADD(DAY,30,@now)),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003',N'2 Công xã Paris, TP.HCM','VANG',@tu,DATEADD(DAY,-30,@now));
 INSERT dbo.tai_xe(ma_tx,ma_tk,cccd,so_giay_phep,ngay_het_han_gplx,trang_thai,ranh_tu) VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000201','700000000001',N'GPLX-DEMO-1',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000202','700000000002',N'GPLX-DEMO-2',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000203','700000000003',N'GPLX-DEMO-3',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu);
 INSERT dbo.phuong_tien(ma_phuong_tien,ma_tx,bien_so,loai_xe,mau_xe) VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',N'59A00001',N'Xe máy',N'Vàng'),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',N'59A00002',N'Xe máy',N'Đen'),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',N'59A00003',N'Xe máy',N'Trắng');
 -- Vị trí demo để NULL: chỉ điền qua usp_vi_tri_demo sau khi BE đã geocode Goong.
 -- 2. Chính sách mẫu công bố lần đầu; không UPDATE chính sách công bố.
 INSERT dbo.cau_hinh_cuoc(ma_bieu_phi,ten,cuoc_co_ban,don_gia_km,km_toi_thieu,km_toi_da,kg_bao_gom,kg_toi_da,don_gia_kg,hieu_luc_tu,trang_thai)
 VALUES(@bp,N'Biểu phí SQL demo',20000,5000,0,30,1,30,3000,@tu,'CONG_BO');
 INSERT dbo.chinh_sach_thanh_vien(ma_chinh_sach,ma_hang,ty_le_giam,hieu_luc_tu,trang_thai) VALUES
 ('61000000-0000-0000-0000-000000000001','BAC',5,@tu,'CONG_BO'),
 (@vang,'VANG',10,@tu,'CONG_BO'),
 ('61000000-0000-0000-0000-000000000003','KIM_CUONG',15,@tu,'CONG_BO');
 INSERT dbo.cau_hinh_phu_thu(ma_phu_thu,ma_loai,ten,bat_buoc,so_tien,hieu_luc_tu,trang_thai) VALUES
 (@pt_bat_buoc,'DICH_VU',N'Phụ thu dịch vụ',1,5000,@tu,'CONG_BO'),
 (@pt_tuy_chon,'GIAO_NHANH',N'Giao nhanh tùy chọn',0,10000,@tu,'CONG_BO');
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@dieu_phoi;
 -- 3. Lặp INSERT 30 đơn, mỗi đơn 2 kiện; không gọi Java seed hay SP tự mở transaction.
 DECLARE @i INT=1,@kh_so INT,@tx_so INT,@id UNIQUEIDENTIFIER,@kh UNIQUEIDENTIFIER,
 @tx UNIQUEIDENTIFIER,@tk_tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@cs UNIQUEIDENTIFIER,
 @tao DATETIME2(3),@moc DATETIME2(3),@km DECIMAL(10,2),@ckm DECIMAL(15,0),
 @ckg DECIMAL(15,0),@phuthu DECIMAL(15,0),@giam DECIMAL(15,0),@tuy_chon BIT;
 WHILE @i<=30
 BEGIN
  SET @id=CONVERT(UNIQUEIDENTIFIER,'50000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@i),12));
  SET @kh_so=1+((@i-1)%3);
  SET @kh=CONVERT(UNIQUEIDENTIFIER,'20000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@kh_so),12));
  SET @tao=DATEADD(MINUTE,@i*15,DATEADD(DAY,-7,@now));
  SET @km=1+(@i%15);
  SET @tuy_chon=CASE WHEN @i%4=0 THEN 1 ELSE 0 END;
  SET @ckm=dbo.fn_cuoc_km(20000,@km,5000);
  SET @ckg=dbo.fn_cuoc_kg(2.50,1,3000);
  SET @phuthu=5000+CASE WHEN @tuy_chon=1 THEN 10000 ELSE 0 END;
  SET @cs=CASE WHEN @kh_so=2 THEN @vang ELSE NULL END;
  SET @giam=dbo.fn_tien_giam(@ckm+@ckg+@phuthu,CASE WHEN @kh_so=2 THEN 10 ELSE 0 END);
  EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@dieu_phoi;
  INSERT dbo.don_hang(ma_don,ma_kh,ma_tk_tao,khoa_yeu_cau,hash_yeu_cau,ma_bieu_phi,ma_chinh_sach,
   diem_lay,diem_giao,ten_nguoi_nhan,sdt_nguoi_nhan,quang_duong_km,thoi_gian_du_kien_giay,nguon_lo_trinh,
   cuoc_km,cuoc_kg,tien_giam,ghi_chu,tao_luc)
  VALUES(@id,@kh,@dieu_phoi,CONCAT('sql-demo-order-',@i),HASHBYTES('SHA2_256',CONCAT(N'SQL_DEMO_ORDER:',@i)),@bp,@cs,
   N'227 Nguyễn Văn Cừ, TP.HCM',N'268 Lý Thường Kiệt, TP.HCM',CONCAT(N'Người nhận demo ',@i),'0901234567',@km,CONVERT(INT,@km*180),'DEMO',
   @ckm,@ckg,@giam,N'Dữ liệu SQL demo; km/thời gian mô phỏng, chưa xác minh Goong',@tao);
  UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@tao WHERE ma_don=@id AND loai='TAO_DON';
  INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg,ghi_chu) VALUES
   (@id,1,N'Tài liệu',1,N'Giữ khô ráo'),(@id,2,N'Hàng đóng hộp',1.50,N'Không đè nặng');
  INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) VALUES(@id,@pt_bat_buoc);
  IF @tuy_chon=1 INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) VALUES(@id,@pt_tuy_chon);
  -- 12 hoàn tất; 2 từng từ chối; 2 đang giao/đã gán. Còn lại chờ hoặc hủy.
  IF @i<=12 OR @i BETWEEN 27 AND 30
  BEGIN
   SET @tx_so=CASE WHEN @i<=4 OR @i=29 THEN 1 WHEN @i<=8 OR @i=30 THEN 2 ELSE 3 END;
   SET @tx=CONVERT(UNIQUEIDENTIFIER,'30000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@tx_so),12));
   SET @tk_tx=CONVERT(UNIQUEIDENTIFIER,'10000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),200+@tx_so),12));
   SET @pc=CONVERT(UNIQUEIDENTIFIER,'70000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@i),12));
   SET @moc=DATEADD(MINUTE,5,@tao);
   INSERT dbo.phan_cong_don_hang(ma_phan_cong,ma_don,ma_tx,ma_tk_dieu_phoi,bat_dau_luc) VALUES(@pc,@id,@tx,@dieu_phoi,@moc);
   UPDATE dbo.don_hang SET trang_thai='DA_GAN' WHERE ma_don=@id;
   UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc WHERE ma_don=@id AND trang_thai_sau='DA_GAN';
   UPDATE dbo.tai_xe SET ranh_tu=NULL WHERE ma_tx=@tx;
   EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@tk_tx;
   IF @i<=12 OR @i=30
   BEGIN
    UPDATE dbo.don_hang SET trang_thai='DA_LAY_HANG' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,10,@tao) WHERE ma_don=@id AND trang_thai_sau='DA_LAY_HANG';
    UPDATE dbo.don_hang SET trang_thai='DANG_GIAO' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,20,@tao) WHERE ma_don=@id AND trang_thai_sau='DANG_GIAO';
   END;
   IF @i<=12
   BEGIN
    SET @moc=DATEADD(MINUTE,40,@tao);
    INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau,thoi_gian,ghi_chu)
     VALUES(@id,@tk_tx,'DEN_DIEM_NHAN','DANG_GIAO','DANG_GIAO',DATEADD(MINUTE,30,@tao),N'SQL demo: đã đến điểm nhận');
    UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@moc,ket_qua='HOAN_TAT' WHERE ma_phan_cong=@pc;
    UPDATE dbo.don_hang SET trang_thai='HOAN_TAT',hoan_tat_luc=@moc WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc,ghi_chu=N'SQL demo: mô phỏng đã giao và thu đủ, không xác minh ngân hàng khách'
     WHERE ma_don=@id AND trang_thai_sau='HOAN_TAT';
    INSERT dbo.phan_chia_cuoc(ma_don,ma_phan_cong,ghi_nhan_luc) VALUES(@id,@pc,@moc);
    UPDATE dbo.tai_xe SET ranh_tu=@moc WHERE ma_tx=@tx;
   END;
   IF @i BETWEEN 27 AND 28
   BEGIN
    SET @moc=DATEADD(MINUTE,8,@tao);
    UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@moc,ket_qua='TU_CHOI',ly_do=N'Vị trí lấy hàng quá xa — SQL demo' WHERE ma_phan_cong=@pc;
    UPDATE dbo.don_hang SET trang_thai='CHO_GAN' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc,ghi_chu=N'Tài xế từ chối — SQL demo'
     WHERE ma_don=@id AND loai='CHUYEN_TRANG_THAI' AND trang_thai_sau='CHO_GAN';
    UPDATE dbo.tai_xe SET ranh_tu=@moc WHERE ma_tx=@tx;
   END;
  END;
  IF @i BETWEEN 25 AND 26
  BEGIN
   UPDATE dbo.don_hang SET trang_thai='DA_HUY',huy_luc=DATEADD(MINUTE,5,@tao),ly_do_huy=N'Khách đổi kế hoạch — SQL demo' WHERE ma_don=@id;
   UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,5,@tao) WHERE ma_don=@id AND trang_thai_sau='DA_HUY';
  END;
  SET @i+=1;
 END;
 -- 4. Ba giao dịch nộp ĐANG CHỜ; không tạo thanh toán thành công giả hay URL VNPay giả.
 DECLARE @j INT=1,@gd UNIQUEIDENTIFIER,@tong DECIMAL(15,0);
 WHILE @j<=3
 BEGIN
  SET @tx=CONVERT(UNIQUEIDENTIFIER,'30000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@j),12));
  SET @gd=CONVERT(UNIQUEIDENTIFIER,'80000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@j),12));
  SELECT @tong=SUM(tien_cong_ty) FROM dbo.v_chia_cuoc WHERE ma_tx=@tx;
  INSERT dbo.giao_dich_nop_tien(ma_giao_dich,ma_tx,khoa_yeu_cau,ma_tham_chieu,so_tien_yeu_cau,tao_luc)
   VALUES(@gd,@tx,CONCAT('sql-demo-payment-',@j),CONCAT('SQLDEMONOP',@j),@tong,@now);
  UPDATE c SET ma_giao_dich_nop=@gd FROM dbo.phan_chia_cuoc c JOIN dbo.v_chia_cuoc v ON v.ma_don=c.ma_don WHERE v.ma_tx=@tx;
  INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
   VALUES(@gd,'RETURN',HASHBYTES('SHA2_256',CONCAT('SQL_DEMO_EVENT:',@j)),0,'KHONG_HOP_LE',
    N'{"demo":true,"note":"Du lieu SQL minh hoa; khong phai callback VNPay da xac minh"}');
  SET @j+=1;
 END;
 INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
 VALUES(@admin,'SQL_DEMO',@admin,'NAP_DU_LIEU',N'{"accounts":8,"orders":30,"source":"SQL_INSERT_DEMO"}');
 -- 5. Sai số lượng/trạng thái hoặc tiền chia không khớp thì rollback toàn bộ.
 IF (SELECT COUNT(*) FROM dbo.tai_khoan)<>8 OR (SELECT COUNT(*) FROM dbo.don_hang)<>30
  OR (SELECT COUNT(*) FROM dbo.chi_tiet_kien_hang)<>60 OR (SELECT COUNT(*) FROM dbo.phan_chia_cuoc)<>12
  OR (SELECT COUNT(*) FROM dbo.phu_thu_don_hang)<>37 OR (SELECT COUNT(*) FROM dbo.phan_cong_don_hang)<>16
  OR (SELECT COUNT(*) FROM dbo.khach_hang)<>3 OR (SELECT COUNT(*) FROM dbo.tai_xe)<>3
  OR (SELECT COUNT(*) FROM dbo.phuong_tien)<>3 OR (SELECT COUNT(*) FROM dbo.giao_dich_nop_tien)<>3
  OR (SELECT COUNT(*) FROM dbo.don_hang WHERE trang_thai='CHO_GAN')<>14
  OR (SELECT COUNT(*) FROM dbo.don_hang WHERE trang_thai='DA_HUY')<>2
  OR (SELECT COUNT(*) FROM dbo.phan_cong_don_hang WHERE ket_thuc_luc IS NULL)<>2
  THROW 52402,N'Dữ liệu demo không khớp số lượng mong đợi',1;
 IF EXISTS(SELECT 1 FROM dbo.v_chia_cuoc WHERE tien_cong_ty+tien_tai_xe<>tong_cuoc OR tong_cuoc<0)
  OR EXISTS(SELECT 1 FROM dbo.v_giao_dich_nop WHERE tong_khoan_lien_ket<>so_tien_yeu_cau OR so_don_dang_lien_ket=0)
  THROW 52403,N'Dữ liệu demo không khớp tài chính',1;
 COMMIT;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_truoc;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_truoc;
 THROW;
END CATCH;
GO
```

### 13.3. Kiểm tra sau nạp — chạy riêng, không ghép vào migration

```sql
-- KIEM TRA RIENG: khong ghep khoi nay vao migration.
SELECT username,ho_ten,vai_tro,trang_thai FROM dbo.tai_khoan ORDER BY vai_tro,username;
SELECT trang_thai,COUNT(*) AS so_don FROM dbo.don_hang GROUP BY trang_thai;
SELECT * FROM dbo.v_so_du_tai_xe;
SELECT * FROM dbo.v_giao_dich_nop;
-- Kỳ vọng rỗng: không có hai phân công đang mở cùng đơn/tài xế.
SELECT ma_don FROM dbo.phan_cong_don_hang WHERE ket_thuc_luc IS NULL GROUP BY ma_don HAVING COUNT(*)>1;
SELECT ma_tx FROM dbo.phan_cong_don_hang WHERE ket_thuc_luc IS NULL GROUP BY ma_tx HAVING COUNT(*)>1;
-- Kỳ vọng 0; không có tiền nộp thành công giả trong fixture.
SELECT COUNT(*) AS so_giao_dich_da_thu FROM dbo.giao_dich_nop_tien WHERE trang_thai='THANH_CONG';
```

Đã phân tích cú pháp cả khối định nghĩa và INSERT bằng SQLFluff T-SQL, kiểm tra 8 username, JSON mẫu, kiểm kê độc lập 30 kịch bản và xác minh BCrypt bằng thư viện dự án. Phần này chưa chạy nạp trên SQL Server; không khẳng định
các số lượng đã được quan sát thực tế. Các assert trong transaction sẽ từ chối commit nếu
kết quả thực tế không khớp. Sau khi chuyển ứng dụng sang designV2, tắt Java seed trước khi
khởi động; hiện tại tài liệu này chưa tự thay cấu hình Flyway hoặc code ứng dụng.

### Tài liệu kỹ thuật đối chiếu

- Microsoft Learn — [DML trigger xử lý nhiều dòng](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data?view=sql-server-ver17): căn cứ thiết kế inserted/deleted theo tập.
- Microsoft Learn — [Filtered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver17): căn cứ index chỉ một phân công/giao dịch đang mở; không dùng computed column trong filter.
- Microsoft Learn — [sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql?view=sql-server-ver17): khóa theo transaction và kiểm tra mã trả về.
- Nguồn nghiệp vụ cũ: migration designV1 V1–V12 và nội dung csdl.md trước lần viết lại. Nguồn yêu cầu môn học: hướng dẫn/rubric DBMS330284 do người dùng cung cấp. Tài liệu VNPay cụ thể cần đối chiếu lại khi triển khai adapter; phần này chưa khẳng định payload/API sandbox đã được cập nhật hay kiểm thử.
