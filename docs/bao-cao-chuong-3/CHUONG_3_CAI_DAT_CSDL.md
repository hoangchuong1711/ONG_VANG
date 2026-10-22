# CHƯƠNG 3. CÀI ĐẶT CƠ SỞ DỮ LIỆU TRÊN SQL SERVER

Trên cơ sở thiết kế ở Chương 2, chương này trình bày bộ script tạo cơ sở dữ liệu ONG VÀNG trên SQL Server. Nội dung gồm tạo bảng và ràng buộc, xây dựng index, function, view, trigger, stored procedure và dữ liệu mẫu. Mỗi nhóm đối tượng có giải thích và hướng dẫn tạo ảnh minh chứng.

**Ghi chú khi hoàn thiện báo cáo:** Bộ SQL dưới đây được trích từ bản thiết kế designV2 do nhóm cung cấp. Tài liệu này chưa xác nhận các script đã thực thi thành công trên SQL Server. Các giá trị nêu trong phần kiểm tra là kết quả mong đợi. Sau khi chạy, thay hướng dẫn trong dấu ngoặc vuông bằng ảnh thật và viết nhận xét theo kết quả quan sát. Không ghi “đã kiểm thử thành công” nếu chưa có bằng chứng.

## 3.1. Môi trường và tổ chức cài đặt

### 3.1.1. Môi trường triển khai

Cơ sở dữ liệu được thiết kế cho SQL Server 2022, sử dụng schema dbo. SQL Server Management Studio (SSMS) được dùng để mở script, thực thi truy vấn và quan sát kết quả. Cơ sở dữ liệu thử nghiệm có tên mini_ong_vang_design_v2_test và được tạo riêng, không thay thế cơ sở dữ liệu designV1 đang sử dụng.

Tài khoản thực hiện cài đặt cần có quyền tạo các đối tượng và role/user. Quyền này phục vụ triển khai; tài khoản ứng dụng khi vận hành phải được giới hạn theo chức năng. Chi tiết phân quyền được trình bày tại Chương 4.

**[Cách có Hình 3.1: kết nối SQL Server bằng SSMS. Chỉ khi tên database chưa tồn tại, mở và chạy file 00_Tao_database_test.sql. Nếu đã có database cùng tên, kiểm tra nguồn gốc và dữ liệu trước, không xóa hoặc chạy lại bộ tạo bảng tùy tiện. Sau đó chạy truy vấn dưới đây, chụp câu lệnh và Results. Không đưa thông tin mật khẩu/kết nối bí mật vào ảnh.]**

```sql
SELECT DB_NAME() AS database_hien_tai,
       SERVERPROPERTY('ProductVersion') AS phien_ban,
       SERVERPROPERTY('Edition') AS phien_ban_cai_dat;
SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME();
```

*[Chèn Hình 3.1. Môi trường SQL Server và cơ sở dữ liệu thử nghiệm.]*

Ảnh cần thể hiện tên cơ sở dữ liệu và phiên bản SQL Server thực tế. Nếu môi trường chạy khác SQL Server 2022, cần ghi đúng phiên bản quan sát được và kiểm tra khả năng tương thích trước khi kết luận.

### 3.1.2. Tổ chức các tệp SQL

| Tệp | Nội dung |
|---|---|
| V1__create_business_tables.sql | Tạo 16 bảng và ràng buộc |
| V2__create_indexes.sql | Tạo 7 index duy nhất có điều kiện và 7 index tra cứu |
| V3__create_fare_functions.sql | Tạo 4 hàm tính tiền |
| V4__create_business_views.sql | Tạo 8 view |
| V5__create_driver_income_function.sql | Tạo hàm trả về bảng thu nhập |
| V6__create_integrity_triggers.sql | Tạo 9 trigger |
| V7__create_business_procedures.sql | Tạo 12 stored procedure |
| V8__create_roles_and_permissions.sql | Tạo role/user và quyền, giải thích ở Chương 4 |
| V9__insert_demo_data.sql | Nạp dữ liệu mẫu |

Các tệp đính kèm nằm trong thư mục sql-tham-khao, được tách nguyên nội dung theo dòng -- FILE: của bản thiết kế. Đây là bộ script phục vụ báo cáo, chưa tự thay đổi cấu hình migration của ứng dụng.

### 3.1.3. Thứ tự thực hiện

Với phương án chạy thủ công để lấy minh chứng, mở lần lượt V1 đến V9 bằng SSMS, chọn đúng database thử ở mỗi cửa sổ và chỉ chạy tệp tiếp theo khi tệp trước hoàn thành không có lỗi. Giữ các dòng GO và SET có sẵn. Không chạy lại V1 hoặc V9 trên database đã có dữ liệu. Không bọc toàn bộ V7 trong transaction bên ngoài.

Trong cấu hình Flyway dự kiến, V1–V8 thuộc thư mục schema, V9 thuộc thư mục demo. Chỉ chọn một cơ chế triển khai cho cùng database: database đã tạo thủ công không được xem là đã có lịch sử migration Flyway hợp lệ. Nếu muốn kiểm thử Flyway, dùng một database mới riêng với cấu hình phù hợp và tắt Java seed.

Các truy vấn chụp ảnh dữ liệu trong chương này thực hiện sau khi đã nạp V9. Phần tạo function trả về thu nhập đặt sau phần view vì hàm sử dụng v_chia_cuoc.

## 3.2. Tạo bảng và ràng buộc toàn vẹn

### 3.2.1. Script tạo các bảng

Bộ tạo bảng triển khai 16 quan hệ đã mô tả ở Chương 2. Các bảng được tạo theo thứ tự để đối tượng được tham chiếu tồn tại trước. Riêng khóa ngoại từ khoản chia đến giao dịch nộp tiền được bổ sung bằng ALTER TABLE sau khi tạo bảng giao dịch.

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

### 3.2.2. Khóa chính, khóa ngoại và ràng buộc duy nhất

Khóa chính xác định từng bản ghi; khóa ngoại giữ liên kết giữa các bảng. Ví dụ, chi_tiet_kien_hang.ma_don phải trỏ đến đơn tồn tại. Cặp (ma_don, ma_phu_thu) là khóa chính của bảng liên kết, ngăn phụ thu trùng. Khóa ngoại ghép của phan_chia_cuoc bảo đảm phân công được chọn thuộc đúng đơn, thay vì chỉ kiểm tra mã phân công tồn tại.

UNIQUE được dùng cho tên đăng nhập, biển số và các khóa yêu cầu ghép. Điều kiện duy nhất chỉ áp dụng cho một số dòng, như số điện thoại khác NULL hoặc phân công đang mở, được triển khai bằng index có điều kiện tại mục 3.3.

### 3.2.3. Miền giá trị và giá trị mặc định

CHECK giới hạn trạng thái, khối lượng, số tiền và quan hệ giữa các mốc thời gian. NOT NULL yêu cầu các dữ liệu bắt buộc. DEFAULT hỗ trợ khởi tạo mã, trạng thái và thời điểm tạo. Các điều kiện bắt buộc có giá trị cần kiểm tra IS NOT NULL khi phù hợp vì CHECK không tự từ chối kết quả UNKNOWN do NULL.

Ví dụ, đơn HOAN_TAT phải có thời điểm hoàn tất và không có thông tin hủy; giao dịch THANH_CONG phải có số tiền thực nhận bằng số tiền yêu cầu. Những điều kiện liên bảng như “mỗi đơn phải có một kiện” còn cần thủ tục và hạn chế quyền ghi trực tiếp.

### 3.2.4. Kiểm tra cấu trúc và ràng buộc

**[Cách có Hình 3.2: sau V1–V9, Refresh mục Tables trong Object Explorer rồi chạy 02_cau_truc.sql. Chụp danh sách bảng và bảng đếm đối tượng. Database thử sạch dự kiến có 16 bảng nghiệp vụ, 8 view, 4 scalar function, 1 inline table-valued function, 9 trigger và 12 SP. Nếu xuất hiện bảng công cụ như sysdiagrams hoặc lịch sử Flyway, phân biệt với 16 bảng nghiệp vụ.]**

```sql
SELECT name AS ten_bang FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
SELECT type_desc AS loai_doi_tuong, COUNT(*) AS so_luong
FROM sys.objects
WHERE schema_id = SCHEMA_ID('dbo') AND is_ms_shipped = 0
  AND type IN ('U','V','FN','IF','P','TR')
GROUP BY type_desc ORDER BY type_desc;
```

*[Chèn Hình 3.2. Danh sách bảng và các đối tượng đã tạo.]*

**[Cách có Hình 3.3: chạy lần lượt ba ví dụ trong 03_rang_buoc.sql. Mỗi ví dụ nằm trong TRY/CATCH và hoàn tác dữ liệu. Chụp câu INSERT cùng Results chứa mã lỗi, nội dung lỗi. Có thể ghép ba ảnh thành Hình 3.3a–c. Chỉ kết luận đúng khi lỗi nêu đúng CHECK khối lượng, UNIQUE thứ tự kiện hoặc FK đơn tương ứng; lỗi khác không được xem là đạt.]**

```sql
-- Thử CHECK: khối lượng âm. Đơn 1 phải tồn tại sau khi nạp V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',999,N'Kiểm tra CHECK',-1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: dữ liệu âm được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử UNIQUE: cặp đơn 1, thứ tự kiện 1 đã có trong V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',1,N'Kiểm tra UNIQUE',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: thứ tự kiện trùng được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử FK: kiểm tra mã ngẫu nhiên chắc chắn chưa tồn tại trước khi INSERT.
DECLARE @don_khong_co UNIQUEIDENTIFIER = NEWID();
WHILE EXISTS(SELECT 1 FROM dbo.don_hang WHERE ma_don=@don_khong_co)
 SET @don_khong_co=NEWID();
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES(@don_khong_co,1,N'Kiểm tra FK',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: đơn không tồn tại được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
```

*[Chèn Hình 3.3. Kiểm tra CHECK, UNIQUE và khóa ngoại.]*

Kết quả mong đợi là khối lượng âm, thứ tự kiện trùng và mã đơn không tồn tại đều bị từ chối. Mã lỗi thường là 547 đối với CHECK/FK, 2601 hoặc 2627 đối với trùng khóa; nội dung lỗi và tên ràng buộc là căn cứ xác định đúng nguyên nhân.

## 3.3. Xây dựng chỉ mục — Index

### 3.3.1. Chỉ mục duy nhất bảo vệ nghiệp vụ

Bảy index duy nhất có điều kiện bảo vệ số điện thoại không trùng khi có giá trị; một phân công mở trên mỗi đơn và mỗi tài xế; một phân công hoàn tất trên mỗi đơn; một giao dịch chưa giải quyết trên mỗi tài xế; mã đối tác không trùng và sự kiện đến điểm nhận không lặp.

Việc lọc giai_quyet_luc IS NULL bao phủ cả CHO_XU_LY và CHUA_RO_KET_QUA. Tách thành hai index theo từng trạng thái sẽ không bảo đảm một tài xế chỉ có một giao dịch chưa giải quyết nói chung.

### 3.3.2. Chỉ mục hỗ trợ truy vấn

Bảy index thường phục vụ tra cứu đơn của khách, hàng đợi, lịch sử phân công, nhật ký, giao dịch của tài xế, khoản chia theo giao dịch và lịch sử kiểm toán. Các cột INCLUDE bổ sung dữ liệu cần đọc mà không thay đổi thứ tự khóa index.

```sql
-- FILE: V2__create_indexes.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
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

**[Cách có Hình 3.4: chạy 04_index.sql, chụp Results có tên bảng, tên index, is_unique và điều kiện lọc. Danh sách dự kiến có 14 index được tạo riêng ở V2; không tính index tự sinh từ PK/UNIQUE.]**

```sql
SELECT t.name AS bang, i.name AS chi_muc,
       i.is_unique AS duy_nhat, i.filter_definition AS dieu_kien
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id
WHERE t.schema_id=SCHEMA_ID('dbo') AND i.name IS NOT NULL
 AND i.is_primary_key=0 AND i.is_unique_constraint=0
ORDER BY t.name,i.name;
```

*[Chèn Hình 3.4. Các index phục vụ ràng buộc và truy vấn.]*

### 3.3.3. Đánh giá hiệu quả chỉ mục

Hiệu quả index cần được đánh giá bằng cùng truy vấn, cùng tham số và cùng bộ dữ liệu trước và sau khi tạo. Số liệu gồm logical reads, CPU time, elapsed time và kế hoạch thực thi. Không kết luận mọi truy vấn có index đều nhanh hơn; với bảng nhỏ, SQL Server có thể chọn scan hợp lý.

**[Cách có Hình 3.5: mở 11_do_hieu_nang_index.sql, bật Query > Include Actual Execution Plan. Chọn chạy trọn một khối BEGIN TRY đến END CATCH kèm GO. Tệp có 5 trường hợp: lịch sử đơn khách, hàng đợi, phân công tài xế, nhật ký đơn, giao dịch nộp. Mỗi khối bỏ một index thường trong transaction, chạy truy vấn trước, tạo lại index, chạy truy vấn sau rồi ROLLBACK để khôi phục trạng thái ban đầu. Không chạy riêng đoạn DROP; không bỏ index duy nhất bảo vệ nghiệp vụ.]**

**[Chụp hai phần: tab Execution Plan cho truy vấn SELECT trước/sau và tab Messages có dấu TRUOC INDEX/SAU INDEX cùng STATISTICS IO, TIME. Có thể dùng Hình 3.5a–e hoặc đưa các trường hợp còn lại vào phụ lục. Không dùng chi phí phần trăm của các lệnh CREATE INDEX để kết luận truy vấn nhanh hơn.]**

*[Chèn Hình 3.5. So sánh kế hoạch thực thi và số liệu truy vấn trước/sau index.]*

| Truy vấn | Logical reads trước/sau | CPU trước/sau (ms) | Thời gian trước/sau (ms) | Kế hoạch trước/sau |
|---|---|---|---|---|
| Lịch sử đơn khách | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Hàng đợi | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Lịch sử phân công | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Nhật ký đơn | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Giao dịch tài xế | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |

Bộ V9 có 30 đơn chỉ phù hợp minh họa cách đo. Để đánh giá hiệu năng có ý nghĩa, cần chuẩn bị bộ dữ liệu thử lớn hơn, cập nhật statistics và chạy nhiều lượt với cùng điều kiện. Ghi nhận khác biệt về cache; không lấy một lần chạy làm kết luận chung. Tài liệu chưa có số đo thực tế nên chưa khẳng định mức cải thiện.

## 3.4. Xây dựng hàm tính cước — Function

### 3.4.1. Hàm tính cước theo quãng đường

fn_cuoc_km nhận cước cơ bản, quãng đường và đơn giá. Kết quả bằng cước cơ bản cộng quãng đường nhân đơn giá, làm tròn đến đồng. Giới hạn km được kiểm tra ở thủ tục tạo đơn; km_toi_thieu không phải số km miễn phí.

### 3.4.2. Hàm tính cước theo khối lượng

fn_cuoc_kg nhận tổng khối lượng, mức được bao gồm và đơn giá. Chỉ phần khối lượng vượt mức bao gồm được tính thêm; nếu không vượt thì kết quả bằng 0.

### 3.4.3. Hàm tính tiền giảm giá

fn_tien_giam nhận tổng tiền trước giảm và tỷ lệ giảm phần trăm. Trong nghiệp vụ tạo đơn, cơ sở giảm gồm cước km, cước kg và phụ thu. Kết quả làm tròn đến đồng.

### 3.4.4. Hàm tính phần công ty được hưởng

fn_phan_cong_ty trả về 20% tổng cước cuối cùng, làm tròn đến đồng. Phần tài xế được xác định bằng tổng cước trừ phần công ty để tổng hai phần luôn khớp.

```sql
-- FILE: V3__create_fare_functions.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
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

**[Cách có Hình 3.6: chạy 05_function.sql, chụp câu SELECT và một dòng kết quả. Đây là bốn ví dụ độc lập, không cộng các cột thành một báo giá.]**

```sql
SELECT dbo.fn_cuoc_km(20000,5,5000) AS cuoc_km,
       dbo.fn_cuoc_kg(2.50,1,3000) AS cuoc_kg,
       dbo.fn_tien_giam(55000,10) AS giam_tren_55000,
       dbo.fn_phan_cong_ty(49500) AS cong_ty_tren_49500;
-- Bốn ví dụ độc lập; không cộng các cột thành một báo giá.
-- Mong đợi: 45000; 4500; 5500; 9900.
```

*[Chèn Hình 3.6. Kết quả gọi bốn hàm tính tiền.]*

Kết quả mong đợi lần lượt là 45.000 đồng, 4.500 đồng, 5.500 đồng và 9.900 đồng. Nếu kết quả thực tế khác, cần kiểm tra định nghĩa hàm và tham số trước khi nhận xét.

## 3.5. Xây dựng khung nhìn — View

### 3.5.1. Các view tính cước và công nợ

v_cuoc_don tính tổng cước từ các thành phần giá chốt và phụ thu. v_chia_cuoc xác định tài xế của khoản chia, phần công ty và phần tài xế. v_giao_dich_nop tổng hợp số khoản và tổng tiền đang gắn với mỗi giao dịch. v_so_du_tai_xe tổng hợp thu nhập, phần công ty, đã nộp, còn phải nộp và phần đang thanh toán theo toàn bộ lịch sử.

Tên v_so_du_tai_xe không có nghĩa đây là ví điện tử. View tổng hợp dữ liệu nghiệp vụ; không có thao tác nạp/rút số dư. Các khoản đang thanh toán vẫn nằm trong khoản còn phải nộp cho đến khi giao dịch thành công.

### 3.5.2. Các view hỗ trợ điều phối

v_don_cho_dieu_phoi liệt kê đơn CHO_GAN. v_tai_xe_san_sang chọn tài xế trực tuyến, có thời điểm rảnh, tài khoản và phương tiện hoạt động, giấy phép còn hạn và không có phân công mở. Việc loại tài xế đã từ chối một đơn cụ thể cần thực hiện thêm trong truy vấn gợi ý và thủ tục gán; view sẵn sàng không nhận mã đơn.

### 3.5.3. Các view phục vụ quản lý

v_cong_ty_thuc_nhan_ngay tổng hợp tiền của giao dịch thành công theo ngày Việt Nam. v_phien_ban_chinh_sach hợp nhất thông tin phiên bản của ba nhóm chính sách, phục vụ kiểm tra và quản lý thời gian hiệu lực.

```sql
-- FILE: V4__create_business_views.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
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

### 3.5.4. Ví dụ truy vấn và kết quả

**[Cách có Hình 3.7: chạy 06_view.sql sau V9. Chụp bảng chia cước và bảng công nợ; có thể tách thành Hình 3.7a–b. Chụp thêm danh sách tài xế sẵn sàng nếu cần minh họa điều phối. Không cần chụp đủ tám view nếu ảnh không bổ sung thông tin.]**

```sql
SELECT TOP (12) ma_don,tong_cuoc,tien_cong_ty,tien_tai_xe
FROM dbo.v_chia_cuoc ORDER BY ma_don;
SELECT ma_tx,thu_nhap_tai_xe,cong_ty_duoc_huong,da_nop,
       con_phai_nop,dang_thanh_toan,chua_dua_vao_thanh_toan
FROM dbo.v_so_du_tai_xe ORDER BY ma_tx;
SELECT * FROM dbo.v_tai_xe_san_sang;
```

*[Chèn Hình 3.7. Truy vấn chia cước, công nợ và tài xế sẵn sàng.]*

Với dữ liệu V9 chưa thay đổi, dự kiến có 12 khoản chia. Các giao dịch mẫu đều đang chờ nên tiền đã nộp bằng 0; điều đó không có nghĩa thu nhập tài xế bằng 0. Tài xế 3 dự kiến sẵn sàng ngay sau nạp; kết quả còn phụ thuộc thời điểm kiểm tra và các thay đổi dữ liệu sau đó.

## 3.6. Xây dựng hàm thống kê thu nhập tài xế

### 3.6.1. Mục đích và tham số

fn_thu_nhap_tai_xe là hàm trả về bảng, nhận mã tài xế, thời điểm bắt đầu và kết thúc. Hàm thống kê số đơn, tổng cước, thu nhập tài xế và phần công ty trong khoảng [từ, đến), dựa trên thời điểm ghi nhận khoản chia. Trong nghiệp vụ hoàn tất, thời điểm này được ghi cùng thời điểm hoàn tất đơn.

Hàm phục vụ lọc thu nhập theo thời gian. Công nợ vẫn phải lấy từ view toàn lịch sử, không sử dụng khoảng thời gian này để bỏ các khoản chưa nộp trước đó.

### 3.6.2. Script và ví dụ sử dụng

```sql
-- FILE: V5__create_driver_income_function.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE OR ALTER FUNCTION dbo.fn_thu_nhap_tai_xe(@ma_tx UNIQUEIDENTIFIER,@tu DATETIME2(3),@den DATETIME2(3))
RETURNS TABLE AS RETURN (
 SELECT COUNT_BIG(*) AS so_don,COALESCE(SUM(tong_cuoc),0) AS tong_cuoc,
 COALESCE(SUM(tien_tai_xe),0) AS thu_nhap,COALESCE(SUM(tien_cong_ty),0) AS phan_cong_ty
 FROM dbo.v_chia_cuoc WHERE ma_tx=@ma_tx AND ghi_nhan_luc>=@tu AND ghi_nhan_luc<@den
);
GO
```

**[Cách có Hình 3.8: chạy 07_thu_nhap.sql, chụp tham số và bảng kết quả. Dữ liệu V9 gán bốn đơn hoàn tất cho tài xế 1 nên số đơn mong đợi là 4 nếu chưa thay đổi dữ liệu.]**

```sql
DECLARE @den DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
SELECT * FROM dbo.fn_thu_nhap_tai_xe(
 '30000000-0000-0000-0000-000000000001','2000-01-01',@den);
-- Dùng khoảng rộng để bao phủ các đơn V9 dù ngày chụp khác ngày nạp.
```

*[Chèn Hình 3.8. Thống kê thu nhập tài xế theo khoảng thời gian.]*

## 3.7. Xây dựng Trigger

### 3.7.1. Kiểm tra vai trò và kiểm toán tài khoản

tr_kh_role và tr_tx_role kiểm tra loại tài khoản khi thêm hoặc sửa hồ sơ. tr_tk_role_audit ngăn thay đổi vai trò tài khoản đã tạo và ghi kiểm toán khi trạng thái tài khoản thay đổi; không ghi mật khẩu vào nhật ký.

### 3.7.2. Kiểm soát trạng thái và nhật ký đơn

tr_don_transition_log yêu cầu tài khoản thao tác hợp lệ trong SESSION_CONTEXT, kiểm tra trạng thái ban đầu và các bước chuyển hợp lệ, bảo vệ các thuộc tính nội dung/giá đã chốt được liệt kê trong trigger. Trigger tự ghi sự kiện tạo đơn và chuyển trạng thái. Việc bảo vệ đầy đủ dữ liệu nguồn còn dựa vào hạn chế DML trực tiếp và các thủ tục được cấp quyền.

### 3.7.3. Bảo vệ dữ liệu tài chính

tr_chia_hop_le kiểm tra nguồn khoản chia, ngăn xóa hoặc sửa nguồn và kiểm soát liên kết giao dịch. tr_gd_bao_ve bảo vệ định danh, số tiền và kết quả đã chốt; khi giao dịch thành công còn kiểm tra tổng tiền khoản chia liên kết. Các trigger không gọi HTTP hoặc VNPay.

### 3.7.4. Bảo vệ chính sách đã công bố

Ba trigger tr_policy_cau_hinh_cuoc, tr_policy_chinh_sach_thanh_vien và tr_policy_cau_hinh_phu_thu ngăn sửa/xóa nội dung phiên bản đã công bố. Chúng cho phép đóng thời điểm kết thúc một lần ở tương lai theo điều kiện. Việc kiểm tra chồng thời gian được thực hiện thêm tại thủ tục quản lý chính sách.

```sql
-- FILE: V6__create_integrity_triggers.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
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

### 3.7.5. Kiểm thử hoạt động

Các trigger sử dụng inserted/deleted theo tập dữ liệu, không giả định mỗi lệnh chỉ tác động một dòng. Ví dụ sau cố thay đổi tỷ lệ giảm của nhiều chính sách đã công bố và đọc dữ liệu trước/sau.

**[Cách có Hình 3.9: chạy trọn 08_trigger.sql sau V9. Chụp câu UPDATE, thông báo lỗi và kết quả trước/sau. Mong đợi lỗi 51015 với nội dung không được sửa/xóa phiên bản công bố; các tỷ lệ 5, 10, 15 vẫn giữ nguyên. Nếu lỗi khác xuất hiện, chưa kết luận trigger đã hoạt động đúng. Đây là thử nghiệm nhiều dòng cho trigger chính sách; chưa thay thế kiểm thử tất cả chín trigger.]**

```sql
-- Kiểm tra nhiều dòng: cả ba chính sách thành viên mẫu đã CONG_BO.
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;
BEGIN TRY
 BEGIN TRAN;
 UPDATE dbo.chinh_sach_thanh_vien
 SET ty_le_giam=ty_le_giam+1 WHERE trang_thai='CONG_BO';
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: sửa chính sách công bố được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi,ERROR_MESSAGE() AS noi_dung;
END CATCH;
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;
```

*[Chèn Hình 3.9. Trigger từ chối sửa nhiều chính sách đã công bố.]*

## 3.8. Xây dựng Stored Procedure

### 3.8.1. Nhóm quản lý đơn hàng

usp_tao_don kiểm tra người tạo, khóa yêu cầu, kiện hàng và phụ thu; chọn chính sách, tính lại giá và tạo dữ liệu đồng bộ. Nếu giá thay đổi so với giá đã đồng ý, thủ tục từ chối để người dùng xác nhận lại. usp_doc_don đọc danh sách hoặc chi tiết theo quyền và hỗ trợ phân trang. usp_huy_don cho phép hủy trước lấy hàng, đóng phân công và giải phóng tài xế nếu có.

### 3.8.2. Nhóm phân công và giao hàng

usp_phan_cong kiểm tra đơn chờ, tài xế đủ điều kiện và việc đã từ chối trước đó trước khi gán. usp_tien_trinh xử lý lấy hàng, bắt đầu giao, đến điểm nhận, từ chối và sự cố theo trạng thái. usp_hoan_tat yêu cầu đúng tài xế, đã đến điểm nhận và xác nhận thu đủ, sau đó ghi hoàn tất và khoản chia cùng một transaction.

### 3.8.3. Nhóm thanh toán và thu nhập

usp_bat_dau_thanh_toan trả lại giao dịch phù hợp nếu yêu cầu lặp hoặc còn giao dịch chưa giải quyết; nếu không thì gom các khoản chưa nộp dương để tạo giao dịch mới. Việc ký URL VNPay do backend thực hiện sau commit.

usp_ap_dung_ket_qua_nop chỉ nhận kết quả mà backend đã xác minh. Thủ tục đối chiếu số tiền, chống sự kiện lặp, ghi nhận thành công hoặc không thu; kết quả mâu thuẫn được ghi để đối soát. RETURN không được dùng để quyết toán. usp_thu_nhap_cua_toi trả hai tập kết quả: thu nhập theo khoảng thời gian và công nợ toàn lịch sử của tài xế trong phiên.

### 3.8.4. Nhóm quản lý dữ liệu

usp_quan_ly_chinh_sach hỗ trợ lưu/xóa nháp, công bố và đóng hiệu lực; kiểm tra các phiên bản không chồng thời gian. usp_quan_ly_phuong_tien hỗ trợ thêm, sửa, ngừng hoạt động hoặc xóa khi đủ điều kiện. usp_dang_ky_khach tạo tài khoản và hồ sơ trong cùng transaction; BCrypt hash được backend tạo trước khi gọi.

| Thủ tục | Đầu vào chính | Kết quả hoặc tác động |
|---|---|---|
| usp_tao_don | Khách, khóa/hash yêu cầu, giao nhận, km/thời gian, JSON kiện/phụ thu, giá đồng ý | Mã đơn đã tạo hoặc mã đơn của yêu cầu lặp |
| usp_doc_don | Mã đơn tùy chọn, trang, kích thước trang | Danh sách; chi tiết kiện/phụ thu/nhật ký nếu đọc một đơn |
| usp_huy_don | Mã đơn, lý do | Hủy đơn hợp lệ và đóng phân công |
| usp_phan_cong | Mã đơn, tài xế | Phân công mới và cập nhật đơn/tài xế |
| usp_tien_trinh | Mã đơn, hành động, ghi chú | Cập nhật tiến trình hoặc nhật ký |
| usp_hoan_tat | Mã đơn, xác nhận thu đủ | Hoàn tất và ghi khoản chia |
| usp_bat_dau_thanh_toan | Khóa yêu cầu | Trả giao dịch nộp tiền |
| usp_ap_dung_ket_qua_nop | Tham chiếu, nguồn, khóa sự kiện, JSON, kết quả, số tiền, mã đối tác | Áp dụng kết quả đã xác minh hoặc ghi tình huống cần kiểm tra |
| usp_thu_nhap_cua_toi | Từ ngày, đến ngày | Thu nhập và công nợ của tài xế |
| usp_quan_ly_chinh_sach | Hành động, loại, mã, JSON, thời điểm đóng | Lưu hoặc cập nhật vòng đời chính sách |
| usp_quan_ly_phuong_tien | Hành động, tài xế và thông tin xe | Thay đổi phương tiện theo điều kiện |
| usp_dang_ky_khach | Tên đăng nhập, hash, họ tên, SĐT, email | Mã tài khoản và mã khách |

Bộ script dưới đây chứa đầy đủ 12 thủ tục theo thứ tự của bản thiết kế. Thủ tục ghi tự quản lý transaction, không gọi trong một transaction Java hoặc transaction thử nghiệm đang mở. Các câu thử chỉ đọc ở mục tiếp theo không thay đổi dữ liệu nghiệp vụ. Các kịch bản rollback, tranh chấp và quyền thực tế được dành cho Chương 4.

```sql
-- FILE: V7__create_business_procedures.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE OR ALTER PROCEDURE dbo.usp_tao_don
 @ma_kh UNIQUEIDENTIFIER,@khoa VARCHAR(100),@hash BINARY(32),
 @diem_lay NVARCHAR(255),@diem_giao NVARCHAR(255),@ten_nhan NVARCHAR(100),@sdt_nhan VARCHAR(10),
 @km DECIMAL(10,2),@giay INT,@nguon VARCHAR(10),@kien_json NVARCHAR(MAX),@phu_thu_json NVARCHAR(MAX),
 @gia_da_dong_y DECIMAL(15,0)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@now DATETIME2(3)=SYSUTCDATETIME(),@id UNIQUEIDENTIFIER,@oldhash BINARY(32);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') THROW 51102,N'Không được tạo đơn',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
   WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG' AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51103,N'Khách hàng không hợp lệ',1;
  DECLARE @lock NVARCHAR(255)=N'tao-don:'+CONVERT(NVARCHAR(36),@actor);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_phan_cong @ma_don UNIQUEIDENTIFIER,@ma_tx UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 51201,N'Không có quyền điều phối',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_hoan_tat @ma_don UNIQUEIDENTIFIER,@xac_nhan_thu_du BIT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@now DATETIME2(3)=SYSUTCDATETIME();
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' OR ISNULL(@xac_nhan_thu_du,0)<>1 THROW 51301,N'Cần tài xế xác nhận thu đủ',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51302,N'Thiếu hồ sơ tài xế',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_bat_dau_thanh_toan @khoa_yeu_cau VARCHAR(100) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@gd UNIQUEIDENTIFIER,@tien DECIMAL(15,0);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' OR @khoa_yeu_cau IS NULL OR LEN(LTRIM(RTRIM(@khoa_yeu_cau)))=0
   THROW 51401,N'Chỉ tài xế thanh toán; cần khóa yêu cầu',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51402,N'Thiếu hồ sơ tài xế',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_ap_dung_ket_qua_nop
 @ma_tham_chieu VARCHAR(100),@nguon VARCHAR(15),@khoa BINARY(32),@json NVARCHAR(MAX),
 @thanh_cong BIT,@so_tien DECIMAL(15,0),@ma_doi_tac VARCHAR(100)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF @nguon IS NULL OR @nguon NOT IN ('IPN','QUERY') OR @thanh_cong IS NULL OR @so_tien IS NULL
   OR @khoa IS NULL OR ISNULL(ISJSON(@json),0)<>1 THROW 51601,N'Kết quả xác minh không hợp lệ',1;
  DECLARE @gd UNIQUEIDENTIFIER,@tx UNIQUEIDENTIFIER,@expected DECIMAL(15,0),
   @status VARCHAR(20),@partner VARCHAR(100),@now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @gd=ma_giao_dich,@tx=ma_tx FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=@ma_tham_chieu;
  IF @gd IS NULL THROW 51602,N'Không tìm thấy giao dịch; backend ghi sự kiện không khớp riêng',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_tien_trinh @ma_don UNIQUEIDENTIFIER,@hanh_dong VARCHAR(25),@ghi_chu NVARCHAR(500)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@state VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' THROW 51701,N'Chỉ tài xế cập nhật tiến trình',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_huy_don @ma_don UNIQUEIDENTIFIER,@ly_do NVARCHAR(500) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') OR @ly_do IS NULL OR LEN(LTRIM(RTRIM(@ly_do)))=0
   THROW 51801,N'Không được hủy hoặc thiếu lý do',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_thu_nhap_cua_toi @tu DATETIME2(3),@den DATETIME2(3) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
 SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
 IF @role<>'TAI_XE' OR @tu IS NULL OR @den IS NULL OR @tu>=@den THROW 51901,N'Không đúng quyền/khoảng thời gian',1;
 SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
 SELECT * FROM dbo.fn_thu_nhap_tai_xe(@tx,@tu,@den);
 SELECT * FROM dbo.v_so_du_tai_xe WHERE ma_tx=@tx; -- Không lọc ngày cho công nợ.
END;
GO

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_quan_ly_chinh_sach
 @hanh_dong VARCHAR(15),@loai VARCHAR(15),@ma UNIQUEIDENTIFIER=NULL,
 @du_lieu NVARCHAR(MAX)=NULL,@den DATETIME2(3)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'CHU_DOI_XE' THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF @hanh_dong IS NULL OR @hanh_dong NOT IN ('LUU_NHAP','XOA_NHAP','CONG_BO','DONG_HIEU_LUC')
   THROW 52002,N'Hành động chính sách không hợp lệ',1;
  IF @hanh_dong='LUU_NHAP'
  BEGIN
IF @loai IS NULL OR @loai NOT IN ('CUOC','THANH_VIEN','PHU_THU')
   OR ISNULL(ISJSON(@du_lieu),0)<>1 OR LEFT(LTRIM(@du_lieu),1)<>'{'
   THROW 52002,N'Loại hoặc JSON chính sách không hợp lệ',1;
  DECLARE @moi BIT=CASE WHEN @ma IS NULL THEN 1 ELSE 0 END;
  IF @moi=0 AND NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP')
   THROW 52003,N'Chỉ sửa chính sách nháp tồn tại',1;
  IF @moi=1 SET @ma=NEWID();
  DECLARE @ten NVARCHAR(100)=JSON_VALUE(@du_lieu,'$.ten'),
   @tu DATETIME2(3)=TRY_CONVERT(DATETIME2(3),JSON_VALUE(@du_lieu,'$.hieu_luc_tu'),126),
   @nhap_den DATETIME2(3)=TRY_CONVERT(DATETIME2(3),JSON_VALUE(@du_lieu,'$.hieu_luc_den'),126);
  IF @tu IS NULL OR (JSON_VALUE(@du_lieu,'$.hieu_luc_den') IS NOT NULL AND @nhap_den IS NULL)
   OR (@nhap_den IS NOT NULL AND @nhap_den<=@tu) THROW 52004,N'Khoảng hiệu lực không hợp lệ',1;
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
   VALUES(@ma,@ten,@cb,@dkm,@kmin,@kmax,@kg,@kgmax,@dkg,@tu,@nhap_den);
   ELSE UPDATE dbo.cau_hinh_cuoc SET ten=@ten,cuoc_co_ban=@cb,don_gia_km=@dkm,km_toi_thieu=@kmin,km_toi_da=@kmax,
   kg_bao_gom=@kg,kg_toi_da=@kgmax,don_gia_kg=@dkg,hieu_luc_tu=@tu,hieu_luc_den=@nhap_den WHERE ma_bieu_phi=@ma;
  END
  ELSE IF @loai='THANH_VIEN'
  BEGIN
   DECLARE @hang VARCHAR(15)=JSON_VALUE(@du_lieu,'$.ma_hang'),@rate DECIMAL(5,2)=TRY_CONVERT(DECIMAL(5,2),JSON_VALUE(@du_lieu,'$.ty_le_giam'));
   IF @moi=1 INSERT dbo.chinh_sach_thanh_vien(ma_chinh_sach,ma_hang,ty_le_giam,hieu_luc_tu,hieu_luc_den)
   VALUES(@ma,@hang,@rate,@tu,@nhap_den);
   ELSE UPDATE dbo.chinh_sach_thanh_vien SET ma_hang=@hang,ty_le_giam=@rate,hieu_luc_tu=@tu,hieu_luc_den=@nhap_den WHERE ma_chinh_sach=@ma;
  END
  ELSE
  BEGIN
   DECLARE @nhom VARCHAR(30)=JSON_VALUE(@du_lieu,'$.ma_loai'),
   @tien DECIMAL(15,0)=TRY_CONVERT(DECIMAL(15,0),JSON_VALUE(@du_lieu,'$.so_tien')),
   @bb BIT=CASE JSON_VALUE(@du_lieu,'$.bat_buoc') WHEN 'true' THEN 1 WHEN 'false' THEN 0 WHEN '1' THEN 1 WHEN '0' THEN 0 END;
   IF @ten IS NULL OR LEN(LTRIM(RTRIM(@ten)))=0 OR @nhom IS NULL OR LEN(LTRIM(RTRIM(@nhom)))=0 OR @bb IS NULL
   THROW 52006,N'Thiếu tên/loại/phân loại phụ thu',1;
   IF @moi=1 INSERT dbo.cau_hinh_phu_thu(ma_phu_thu,ma_loai,ten,bat_buoc,so_tien,hieu_luc_tu,hieu_luc_den)
   VALUES(@ma,@nhom,@ten,@bb,@tien,@tu,@nhap_den);
   ELSE UPDATE dbo.cau_hinh_phu_thu SET ma_loai=@nhom,ten=@ten,bat_buoc=@bb,so_tien=@tien,hieu_luc_tu=@tu,hieu_luc_den=@nhap_den WHERE ma_phu_thu=@ma;
  END;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
   VALUES(@actor,@loai,@ma,CASE WHEN @moi=1 THEN 'TAO_NHAP' ELSE 'SUA_NHAP' END,@du_lieu);
  END
  ELSE IF @hanh_dong='XOA_NHAP'
  BEGIN
IF NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP')
   THROW 52003,N'Chỉ xóa chính sách nháp tồn tại',1;
  -- Nếu bị dữ liệu khác tham chiếu, FK từ chối và toàn bộ thao tác rollback.
  IF @loai='CUOC' DELETE dbo.cau_hinh_cuoc WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' DELETE dbo.chinh_sach_thanh_vien WHERE ma_chinh_sach=@ma;
  ELSE DELETE dbo.cau_hinh_phu_thu WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,@loai,@ma,'XOA_NHAP');
  END
  ELSE IF @hanh_dong='CONG_BO'
  BEGIN
DECLARE @cb_nhom VARCHAR(30),@cb_tu DATETIME2(3),@cb_den DATETIME2(3),@cb_now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @cb_nhom=nhom,@cb_tu=hieu_luc_tu,@cb_den=hieu_luc_den FROM dbo.v_phien_ban_chinh_sach
   WHERE loai=@loai AND ma=@ma AND trang_thai='NHAP';
  IF @cb_nhom IS NULL OR (@cb_den IS NOT NULL AND @cb_den<=@cb_now) THROW 52008,N'Chính sách nháp không hợp lệ hoặc đã hết hạn',1;
  IF EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach
   WHERE loai=@loai AND nhom=@cb_nhom AND ma<>@ma AND trang_thai='CONG_BO'
   AND (@cb_den IS NULL OR hieu_luc_tu<@cb_den) AND (hieu_luc_den IS NULL OR @cb_tu<hieu_luc_den))
   THROW 52009,N'Khoảng hiệu lực bị chồng; đóng bản cũ tại mốc tương lai trước khi công bố bản mới',1;
  IF @loai='CUOC' UPDATE dbo.cau_hinh_cuoc SET trang_thai='CONG_BO' WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' UPDATE dbo.chinh_sach_thanh_vien SET trang_thai='CONG_BO' WHERE ma_chinh_sach=@ma;
  ELSE UPDATE dbo.cau_hinh_phu_thu SET trang_thai='CONG_BO' WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong) VALUES(@actor,@loai,@ma,'CONG_BO');
  END
  ELSE
  BEGIN
IF @den IS NULL OR @den<=SYSUTCDATETIME() OR NOT EXISTS(
   SELECT 1 FROM dbo.v_phien_ban_chinh_sach WHERE loai=@loai AND ma=@ma AND trang_thai='CONG_BO'
   AND hieu_luc_den IS NULL AND hieu_luc_tu<@den)
   THROW 52007,N'Chỉ đóng một lần phiên bản công bố, ở mốc tương lai sau ngày bắt đầu',1;
  IF @loai='CUOC' UPDATE dbo.cau_hinh_cuoc SET hieu_luc_den=@den WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' UPDATE dbo.chinh_sach_thanh_vien SET hieu_luc_den=@den WHERE ma_chinh_sach=@ma;
  ELSE UPDATE dbo.cau_hinh_phu_thu SET hieu_luc_den=@den WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
   VALUES(@actor,@loai,@ma,'DONG_HIEU_LUC',(SELECT @den AS hieu_luc_den FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  END;
  COMMIT;
  SELECT @ma AS ma_chinh_sach;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_quan_ly_phuong_tien
 @hanh_dong VARCHAR(10),@ma_tx UNIQUEIDENTIFIER,@bien_so NVARCHAR(15)=NULL,
 @loai_xe NVARCHAR(50)=NULL,@mau_xe NVARCHAR(30)=NULL,@hoat_dong BIT=1
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'CHU_DOI_XE' THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF @hanh_dong IS NULL OR @hanh_dong NOT IN ('LUU','XOA') THROW 52201,N'Sai hành động',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_xe WHERE ma_tx=@ma_tx) THROW 52204,N'Không tìm thấy tài xế',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
   THROW 52203,N'Không đổi xe khi đang có phân công',1;
  IF @hanh_dong='XOA'
  BEGIN
   IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx)
    THROW 52207,N'Có lịch sử; chỉ được ngừng hoạt động',1;
   DELETE dbo.phuong_tien WHERE ma_tx=@ma_tx;
   IF @@ROWCOUNT<>1 THROW 52208,N'Không có xe để xóa',1;
  END
  ELSE
  BEGIN
   IF @bien_so IS NULL OR LEN(LTRIM(RTRIM(@bien_so)))=0 OR @loai_xe IS NULL OR LEN(LTRIM(RTRIM(@loai_xe)))=0
    OR @hoat_dong IS NULL THROW 52206,N'Thông tin xe không hợp lệ',1;
   IF EXISTS(SELECT 1 FROM dbo.phuong_tien WHERE ma_tx=@ma_tx)
    UPDATE dbo.phuong_tien SET bien_so=@bien_so,loai_xe=@loai_xe,mau_xe=@mau_xe,dang_hoat_dong=@hoat_dong WHERE ma_tx=@ma_tx;
   ELSE INSERT dbo.phuong_tien(ma_tx,bien_so,loai_xe,mau_xe,dang_hoat_dong) VALUES(@ma_tx,@bien_so,@loai_xe,@mau_xe,@hoat_dong);
  END;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'PHUONG_TIEN',@ma_tx,CASE WHEN @hanh_dong='XOA' THEN 'XOA_XE' ELSE 'LUU_XE' END);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

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

-- FILE: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_doc_don
 @ma_don UNIQUEIDENTIFIER=NULL,@page INT=0,@size INT=20 AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
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
```

### 3.8.5. Ví dụ gọi thủ tục và kết quả

**[Cách có Hình 3.10: mở 09_sp.sql bằng kết nối quản trị database thử, chạy toàn bộ khối. Khối này gắn tài khoản tài xế 1 vào SESSION_CONTEXT, gọi báo cáo và danh sách đơn, sau đó khôi phục ngữ cảnh cũ. Chụp EXEC và các Results: báo cáo thu nhập, công nợ và tối đa 5 đơn. Dữ liệu mẫu chưa đổi dự kiến có 4 đơn hoàn tất trong báo cáo thu nhập.]**

```sql
-- Kiểm tra chức năng đọc bằng tài khoản quản trị DB trong môi trường thử.
-- Đây chưa phải minh chứng phân quyền SQL Role/User (trình bày ở Chương 4).
DECLARE @actor_cu SQL_VARIANT=SESSION_CONTEXT(N'ma_tk');
DECLARE @actor UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000201';
DECLARE @tu DATETIME2(3)='2000-01-01';
DECLARE @den DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
BEGIN TRY
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor;
 EXEC dbo.usp_thu_nhap_cua_toi @tu=@tu,@den=@den;
 EXEC dbo.usp_doc_don @ma_don=NULL,@page=0,@size=5;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_cu;
END TRY
BEGIN CATCH
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_cu;
 THROW;
END CATCH;
```

*[Chèn Hình 3.10. Gọi stored procedure xem thu nhập và danh sách đơn của tài xế.]*

Ngữ cảnh ở ví dụ do người thử chủ động thiết lập, chỉ phục vụ kiểm tra chức năng. Đây không phải bằng chứng SQL đã chống giả mạo người dùng hay đã kiểm thử các Role/User. Khi tích hợp, backend phải lấy tài khoản từ phiên đã xác thực và đặt/xóa ngữ cảnh đúng vòng đời kết nối.

## 3.9. Nạp dữ liệu mẫu và kiểm tra kết quả

### 3.9.1. Xây dựng dữ liệu mẫu

Bộ V9 dự kiến tạo 8 tài khoản: 3 khách hàng, 3 tài xế, 1 tổng đài và 1 chủ đội xe. Dữ liệu gồm 30 đơn, 60 kiện, 37 liên kết phụ thu, 16 phân công và 12 khoản chia. Các trường hợp khách thường, thành viên còn hạn và thành viên hết hạn được bố trí để minh họa điều kiện giảm giá.

Trạng thái cuối dự kiến là 12 HOAN_TAT, 14 CHO_GAN, 2 DA_HUY, 1 DA_GAN và 1 DANG_GIAO. Ba giao dịch nộp mẫu đều đang chờ; không có giao dịch thành công giả. Vị trí tài xế để NULL cho đến khi được xác minh theo quy trình demo.

### 3.9.2. Script nạp dữ liệu

V9 chỉ cho phép chạy trên database demo/test có tên quy định và chưa có dữ liệu. Script giữ các ràng buộc, trigger đang bật, thực hiện nạp trong một transaction và kiểm tra số lượng trước commit. Không chạy Java seed đồng thời và không chạy lại V9 để ghi đè dữ liệu.

```sql
-- FILE: V9__insert_demo_data.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
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
 -- Vị trí demo để NULL: chỉ điền qua DAO sau khi BE đã geocode Goong, kiểm tra quyền tổng đài/chủ đội xe và khóa dieu-phoi.
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

### 3.9.3. Kiểm tra sau khi nạp

**[Cách có Hình 3.11: chạy 10_du_lieu_mau.sql. Chụp bảng số lượng và thống kê trạng thái. Các truy vấn cuối trả 0 dòng là kết quả tốt đối với những bất biến được kiểm tra, không phải lỗi không có dữ liệu. Nếu số lượng khác dự kiến, kiểm tra database đã chọn và các thao tác phát sinh sau nạp.]**

```sql
SELECT N'Tài khoản' AS doi_tuong,COUNT(*) AS so_luong FROM dbo.tai_khoan
UNION ALL SELECT N'Đơn hàng',COUNT(*) FROM dbo.don_hang
UNION ALL SELECT N'Kiện hàng',COUNT(*) FROM dbo.chi_tiet_kien_hang
UNION ALL SELECT N'Liên kết phụ thu',COUNT(*) FROM dbo.phu_thu_don_hang
UNION ALL SELECT N'Phân công',COUNT(*) FROM dbo.phan_cong_don_hang
UNION ALL SELECT N'Khoản chia',COUNT(*) FROM dbo.phan_chia_cuoc
UNION ALL SELECT N'Giao dịch nộp',COUNT(*) FROM dbo.giao_dich_nop_tien;
SELECT trang_thai,COUNT(*) AS so_don FROM dbo.don_hang GROUP BY trang_thai;
SELECT trang_thai,COUNT(*) AS so_giao_dich
FROM dbo.giao_dich_nop_tien GROUP BY trang_thai;
SELECT ma_don FROM dbo.v_chia_cuoc
WHERE tien_cong_ty+tien_tai_xe<>tong_cuoc;
SELECT ma_tx FROM dbo.v_so_du_tai_xe
WHERE con_phai_nop<>dang_thanh_toan+chua_dua_vao_thanh_toan
 OR cong_ty_duoc_huong<>da_nop+con_phai_nop;
SELECT ma_don FROM dbo.phan_cong_don_hang
WHERE ket_thuc_luc IS NULL GROUP BY ma_don HAVING COUNT(*)>1;
-- Ba truy vấn cuối phải trả về 0 dòng nếu các bất biến trên được giữ.
```

*[Chèn Hình 3.11. Đối chiếu dữ liệu mẫu và các điều kiện nhất quán.]*

| Nội dung | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|
| Bảng nghiệp vụ / View / Function / Trigger / SP | 16 / 8 / 5 / 9 / 12 | [Điền sau khi chạy] |
| Tài khoản / Đơn / Kiện | 8 / 30 / 60 | [Điền sau khi chạy] |
| Liên kết phụ thu / Phân công / Khoản chia | 37 / 16 / 12 | [Điền sau khi chạy] |
| Giao dịch mẫu | 3 đang chờ; 0 thành công | [Điền sau khi chạy] |
| Vi phạm tổng tiền chia | 0 dòng | [Điền sau khi chạy] |
| Vi phạm công nợ | 0 dòng | [Điền sau khi chạy] |
| Đơn có nhiều phân công đang mở | 0 dòng | [Điền sau khi chạy] |

## 3.10. Tổng kết chương

Chương 3 trình bày bộ script triển khai thiết kế designV2 trên SQL Server, gồm 16 bảng nghiệp vụ, 14 index tạo riêng, 5 function, 8 view, 9 trigger và 12 stored procedure. Các đối tượng phối hợp để tính cước, điều phối, ghi nhận hoàn tất, chia cước và quản lý việc tài xế nộp tiền công ty.

Bộ dữ liệu mẫu và các truy vấn kiểm tra cung cấp cơ sở tạo minh chứng thực thi. Tại thời điểm soạn tài liệu, chưa có ảnh hoặc số đo SQL Server được thu thập trong lần thực hiện này; mức độ hoàn thành cần được cập nhật theo kết quả chạy thực tế. Phần tiếp theo phân tích transaction, xử lý đồng thời và phân quyền Role/User.

---

## Hướng dẫn biên tập ảnh — bỏ mục này khỏi bản nộp cuối

1. Mở file SQL tương ứng trong sql-chup-anh. Chạy phần USE/SET đầu file trước, rồi chọn trọn ví dụ cần chụp. Chọn Results to Grid, mở Results hoặc Messages theo hướng dẫn.
2. Tăng cỡ chữ để đọc được cả câu lệnh và kết quả. Chụp vùng có thông tin cần chứng minh, tránh chụp toàn màn hình khi chữ quá nhỏ.
3. Dùng Windows + Shift + S để chụp vùng. Trong Word, dán hoặc chèn ảnh, căn giữa và đặt In Line with Text. Giữ tỷ lệ ảnh, không kéo méo.
4. Đặt chú thích ở dưới ảnh theo đúng số hình. Bên dưới ghi “Nguồn: Nhóm thực hiện” nếu nhóm tự chạy và chụp. Với ảnh nhiều phần, dùng a, b, c và mô tả từng phần.
5. Đoạn nhận xét phải nêu thao tác, kết quả quan sát và điều kiện được chứng minh. Ví dụ chỉ dùng sau khi đã thấy đúng lỗi: “Lệnh thêm kiện có khối lượng -1 bị từ chối bởi ràng buộc CHECK. Kết quả cho thấy dữ liệu khối lượng âm không được ghi nhận.”
6. Không dùng ảnh chỉ có dòng “Commands completed successfully” để chứng minh toàn bộ nghiệp vụ đúng. Cần thấy dữ liệu hoặc lỗi cụ thể tương ứng.
7. Bản này chứa toàn bộ SQL để tra cứu và sử dụng. Nếu báo cáo quá dài, chuyển các khối định nghĩa đầy đủ sang phụ lục và giữ đoạn tiêu biểu cùng giải thích trong chương; luôn dẫn đúng tệp/phụ lục. Không chạy cả văn bản Markdown như một script SQL.
8. Các thử nghiệm trong chương chưa thay thế kiểm thử toàn bộ hệ thống, 12 thủ tục hoặc chín trigger. Chương 4 bổ sung kịch bản tạo đơn, gán, hoàn tất, hủy, thanh toán, callback lặp, rollback, hai phiên đồng thời và quyền truy cập.