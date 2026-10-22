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

