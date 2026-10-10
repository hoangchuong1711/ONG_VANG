-- designV1 baseline. Apply only to a fresh SQL Server database.
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

CREATE TABLE dbo.[tai_khoan] (
  [ma_tk] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [username] NVARCHAR(50) NOT NULL,
  [mat_khau_hash] NVARCHAR(255) NOT NULL,
  [ho_ten] NVARCHAR(100) NOT NULL,
  [so_dien_thoai] NVARCHAR(10) NULL,
  [email] NVARCHAR(150) NULL,
  [vai_tro] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'HOAT_DONG',
  [ngay_tao] DATETIME2(3) NOT NULL,
  [lan_dang_nhap_cuoi] DATETIME2(3) NULL,
  CONSTRAINT [pk_tai_khoan] PRIMARY KEY ([ma_tk]),
  CONSTRAINT [uq_tai_khoan_role_pair] UNIQUE ([ma_tk],[vai_tro])
);
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_ma_tk] CHECK ([ma_tk]<>N'' AND DATALENGTH([ma_tk])=DATALENGTH(RTRIM([ma_tk])));
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_username] CHECK (DATALENGTH(LTRIM(RTRIM([username])))>0 AND [username] COLLATE Latin1_General_100_BIN2=LOWER([username]) COLLATE Latin1_General_100_BIN2 AND [username]=LTRIM(RTRIM([username])) AND [username] NOT LIKE N'% %');
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_mat_khau_hash] CHECK (DATALENGTH(LTRIM(RTRIM([mat_khau_hash])))>0);
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_ho_ten] CHECK (DATALENGTH(LTRIM(RTRIM([ho_ten])))>0);
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_so_dien_thoai] CHECK (LEN([so_dien_thoai])=10 AND LEFT([so_dien_thoai],1)=N'0' AND [so_dien_thoai] NOT LIKE N'%[^0-9]%');
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_vai_tro] CHECK ([vai_tro] IN (N'KHACH_HANG',N'TAI_XE',N'TONG_DAI',N'CHU_DOI_XE'));
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_tai_khoan_trang_thai] CHECK ([trang_thai] IN (N'HOAT_DONG',N'KHOA'));

CREATE TABLE dbo.[khach_hang] (
  [ma_kh] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [dia_chi_mac_dinh] NVARCHAR(255) NULL,
  [ma_hang] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'THUONG',
  [thanh_vien_tu] DATETIME2(3) NULL,
  [thanh_vien_den] DATETIME2(3) NULL,
  CONSTRAINT [pk_khach_hang] PRIMARY KEY ([ma_kh])
);
ALTER TABLE dbo.[khach_hang] ADD CONSTRAINT [ck_khach_hang_ma_kh] CHECK ([ma_kh]<>N'' AND DATALENGTH([ma_kh])=DATALENGTH(RTRIM([ma_kh])));
ALTER TABLE dbo.[khach_hang] ADD CONSTRAINT [ck_khach_hang_ma_tk] CHECK ([ma_tk]<>N'' AND DATALENGTH([ma_tk])=DATALENGTH(RTRIM([ma_tk])));
ALTER TABLE dbo.[khach_hang] ADD CONSTRAINT [ck_khach_hang_ma_hang] CHECK ([ma_hang] IN (N'THUONG',N'BAC',N'VANG',N'KIM_CUONG'));

CREATE TABLE dbo.[tai_xe] (
  [ma_tx] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [cccd] NVARCHAR(12) NOT NULL,
  [so_giay_phep] NVARCHAR(50) NOT NULL,
  [ngay_het_han_gplx] DATE NOT NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'OFFLINE',
  [ranh_tu] DATETIME2(3) NULL,
  CONSTRAINT [pk_tai_xe] PRIMARY KEY ([ma_tx])
);
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_tai_xe_ma_tx] CHECK ([ma_tx]<>N'' AND DATALENGTH([ma_tx])=DATALENGTH(RTRIM([ma_tx])));
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_tai_xe_ma_tk] CHECK ([ma_tk]<>N'' AND DATALENGTH([ma_tk])=DATALENGTH(RTRIM([ma_tk])));
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_tai_xe_cccd] CHECK (DATALENGTH(LTRIM(RTRIM([cccd])))>0 AND LEN([cccd])=12 AND [cccd] NOT LIKE N'%[^0-9]%');
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_tai_xe_so_giay_phep] CHECK (DATALENGTH(LTRIM(RTRIM([so_giay_phep])))>0);
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_tai_xe_trang_thai] CHECK ([trang_thai] IN (N'ONLINE',N'OFFLINE',N'NGHI'));

CREATE TABLE dbo.[phuong_tien] (
  [ma_phuong_tien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tx] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bien_so_xe] NVARCHAR(15) NOT NULL,
  [loai_xe] NVARCHAR(50) NOT NULL,
  [mau_xe] NVARCHAR(30) NULL,
  [dang_hoat_dong] BIT NOT NULL DEFAULT 1,
  CONSTRAINT [pk_phuong_tien] PRIMARY KEY ([ma_phuong_tien])
);
ALTER TABLE dbo.[phuong_tien] ADD CONSTRAINT [ck_phuong_tien_ma_phuong_tien] CHECK ([ma_phuong_tien]<>N'' AND DATALENGTH([ma_phuong_tien])=DATALENGTH(RTRIM([ma_phuong_tien])));
ALTER TABLE dbo.[phuong_tien] ADD CONSTRAINT [ck_phuong_tien_ma_tx] CHECK ([ma_tx]<>N'' AND DATALENGTH([ma_tx])=DATALENGTH(RTRIM([ma_tx])));
ALTER TABLE dbo.[phuong_tien] ADD CONSTRAINT [ck_phuong_tien_bien_so_xe] CHECK (DATALENGTH(LTRIM(RTRIM([bien_so_xe])))>0);
ALTER TABLE dbo.[phuong_tien] ADD CONSTRAINT [ck_phuong_tien_loai_xe] CHECK (DATALENGTH(LTRIM(RTRIM([loai_xe])))>0);

CREATE TABLE dbo.[chinh_sach_thanh_vien] (
  [ma_chinh_sach] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_hang] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ty_le_giam] DECIMAL(5,2) NOT NULL,
  [hieu_luc_tu] DATETIME2(3) NOT NULL,
  [hieu_luc_den] DATETIME2(3) NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'NHAP',
  CONSTRAINT [pk_chinh_sach_thanh_vien] PRIMARY KEY ([ma_chinh_sach])
);
ALTER TABLE dbo.[chinh_sach_thanh_vien] ADD CONSTRAINT [ck_chinh_sach_thanh_vien_ma_chinh_sach] CHECK ([ma_chinh_sach]<>N'' AND DATALENGTH([ma_chinh_sach])=DATALENGTH(RTRIM([ma_chinh_sach])));
ALTER TABLE dbo.[chinh_sach_thanh_vien] ADD CONSTRAINT [ck_chinh_sach_thanh_vien_ma_hang] CHECK ([ma_hang] IN (N'THUONG',N'BAC',N'VANG',N'KIM_CUONG') AND [ma_hang]<>N'THUONG');
ALTER TABLE dbo.[chinh_sach_thanh_vien] ADD CONSTRAINT [ck_chinh_sach_thanh_vien_ty_le_giam] CHECK ([ty_le_giam] BETWEEN 0 AND 100);
ALTER TABLE dbo.[chinh_sach_thanh_vien] ADD CONSTRAINT [ck_chinh_sach_thanh_vien_trang_thai] CHECK ([trang_thai] IN (N'NHAP',N'CONG_BO'));

CREATE TABLE dbo.[cau_hinh_cuoc] (
  [ma_bieu_phi] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ten_bieu_phi] NVARCHAR(100) NOT NULL,
  [cuoc_co_ban] DECIMAL(15,2) NOT NULL,
  [don_gia_km] DECIMAL(15,2) NOT NULL,
  [km_toi_thieu] DECIMAL(10,2) NOT NULL,
  [km_toi_da] DECIMAL(10,2) NULL,
  [hieu_luc_tu] DATETIME2(3) NOT NULL,
  [hieu_luc_den] DATETIME2(3) NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'NHAP',
  CONSTRAINT [pk_cau_hinh_cuoc] PRIMARY KEY ([ma_bieu_phi])
);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_ma_bieu_phi] CHECK ([ma_bieu_phi]<>N'' AND DATALENGTH([ma_bieu_phi])=DATALENGTH(RTRIM([ma_bieu_phi])));
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_ten_bieu_phi] CHECK (DATALENGTH(LTRIM(RTRIM([ten_bieu_phi])))>0);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_cuoc_co_ban] CHECK ([cuoc_co_ban]>=0);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_don_gia_km] CHECK ([don_gia_km]>=0);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_km_toi_thieu] CHECK ([km_toi_thieu]>=0);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_km_toi_da] CHECK ([km_toi_da]>=0);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_cau_hinh_cuoc_trang_thai] CHECK ([trang_thai] IN (N'NHAP',N'CONG_BO'));

CREATE TABLE dbo.[cau_hinh_phu_thu] (
  [ma_phu_thu] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_loai_phu_thu] NVARCHAR(30) NOT NULL,
  [ten_phu_thu] NVARCHAR(150) NOT NULL,
  [so_tien] DECIMAL(15,2) NOT NULL,
  [hieu_luc_tu] DATETIME2(3) NOT NULL,
  [hieu_luc_den] DATETIME2(3) NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'NHAP',
  CONSTRAINT [pk_cau_hinh_phu_thu] PRIMARY KEY ([ma_phu_thu])
);
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_cau_hinh_phu_thu_ma_phu_thu] CHECK ([ma_phu_thu]<>N'' AND DATALENGTH([ma_phu_thu])=DATALENGTH(RTRIM([ma_phu_thu])));
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_cau_hinh_phu_thu_ma_loai_phu_thu] CHECK (DATALENGTH(LTRIM(RTRIM([ma_loai_phu_thu])))>0);
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_cau_hinh_phu_thu_ten_phu_thu] CHECK (DATALENGTH(LTRIM(RTRIM([ten_phu_thu])))>0);
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_cau_hinh_phu_thu_so_tien] CHECK ([so_tien]>=0 AND [so_tien]=ROUND([so_tien],0));
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_cau_hinh_phu_thu_trang_thai] CHECK ([trang_thai] IN (N'NHAP',N'CONG_BO'));

CREATE TABLE dbo.[don_hang] (
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_kh] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk_tao] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [thoi_gian_tao] DATETIME2(3) NOT NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'CHO_GAN',
  [diem_lay_hang] NVARCHAR(255) NOT NULL,
  [diem_giao_hang] NVARCHAR(255) NOT NULL,
  [sdt_nguoi_nhan] NVARCHAR(10) NOT NULL,
  [quang_duong_km] DECIMAL(10,2) NOT NULL,
  [thoi_gian_du_kien_giay] INT NOT NULL,
  [nguon_lo_trinh] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ghi_chu_giao_hang] NVARCHAR(500) NULL,
  [thoi_gian_hoan_tat] DATETIME2(3) NULL,
  [thoi_gian_huy] DATETIME2(3) NULL,
  [ly_do_huy] NVARCHAR(500) NULL,
  CONSTRAINT [pk_don_hang] PRIMARY KEY ([ma_don]),
  CONSTRAINT [ck_don_hang_terminal_state] CHECK (([trang_thai]=N'HOAN_TAT' AND [thoi_gian_hoan_tat] IS NOT NULL AND [thoi_gian_huy] IS NULL AND [ly_do_huy] IS NULL) OR ([trang_thai]=N'DA_HUY' AND [thoi_gian_huy] IS NOT NULL AND [thoi_gian_hoan_tat] IS NULL AND [ly_do_huy] IS NOT NULL) OR ([trang_thai] NOT IN (N'HOAN_TAT',N'DA_HUY') AND [thoi_gian_hoan_tat] IS NULL AND [thoi_gian_huy] IS NULL AND [ly_do_huy] IS NULL))
);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_ma_kh] CHECK ([ma_kh]<>N'' AND DATALENGTH([ma_kh])=DATALENGTH(RTRIM([ma_kh])));
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_ma_tk_tao] CHECK ([ma_tk_tao]<>N'' AND DATALENGTH([ma_tk_tao])=DATALENGTH(RTRIM([ma_tk_tao])));
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_trang_thai] CHECK ([trang_thai] IN (N'CHO_GAN',N'DA_GAN',N'DA_LAY_HANG',N'DANG_GIAO',N'HOAN_TAT',N'DA_HUY'));
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_diem_lay_hang] CHECK (DATALENGTH(LTRIM(RTRIM([diem_lay_hang])))>0);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_diem_giao_hang] CHECK (DATALENGTH(LTRIM(RTRIM([diem_giao_hang])))>0);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_sdt_nguoi_nhan] CHECK (DATALENGTH(LTRIM(RTRIM([sdt_nguoi_nhan])))>0 AND LEN([sdt_nguoi_nhan])=10 AND LEFT([sdt_nguoi_nhan],1)=N'0' AND [sdt_nguoi_nhan] NOT LIKE N'%[^0-9]%');
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_quang_duong_km] CHECK ([quang_duong_km]>0);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_thoi_gian_du_kien_giay] CHECK ([thoi_gian_du_kien_giay]>0);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_don_hang_nguon_lo_trinh] CHECK ([nguon_lo_trinh] IN (N'FAKE',N'GOONG'));

CREATE TABLE dbo.[cuoc_don_hang] (
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_bieu_phi] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_chinh_sach_giam] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NULL,
  [cuoc_goc] DECIMAL(15,2) NOT NULL,
  [tien_giam_gia] DECIMAL(15,2) NOT NULL,
  CONSTRAINT [pk_cuoc_don_hang] PRIMARY KEY ([ma_don])
);
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [ck_cuoc_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [ck_cuoc_don_hang_ma_bieu_phi] CHECK ([ma_bieu_phi]<>N'' AND DATALENGTH([ma_bieu_phi])=DATALENGTH(RTRIM([ma_bieu_phi])));
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [ck_cuoc_don_hang_ma_chinh_sach_giam] CHECK ([ma_chinh_sach_giam]<>N'' AND DATALENGTH([ma_chinh_sach_giam])=DATALENGTH(RTRIM([ma_chinh_sach_giam])));
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [ck_cuoc_don_hang_cuoc_goc] CHECK ([cuoc_goc]>=0 AND [cuoc_goc]=ROUND([cuoc_goc],0));
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [ck_cuoc_don_hang_tien_giam_gia] CHECK ([tien_giam_gia]>=0 AND [tien_giam_gia]=ROUND([tien_giam_gia],0));

CREATE TABLE dbo.[phu_thu_don_hang] (
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_phu_thu] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CONSTRAINT [pk_phu_thu_don_hang] PRIMARY KEY ([ma_don],[ma_phu_thu])
);
ALTER TABLE dbo.[phu_thu_don_hang] ADD CONSTRAINT [ck_phu_thu_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[phu_thu_don_hang] ADD CONSTRAINT [ck_phu_thu_don_hang_ma_phu_thu] CHECK ([ma_phu_thu]<>N'' AND DATALENGTH([ma_phu_thu])=DATALENGTH(RTRIM([ma_phu_thu])));

CREATE TABLE dbo.[chi_tiet_kien_hang] (
  [ma_kien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [thu_tu] INT NOT NULL,
  [loai_hang_hoa] NVARCHAR(100) NOT NULL,
  [khoi_luong_kg] DECIMAL(10,2) NOT NULL,
  [ghi_chu_bao_quan] NVARCHAR(500) NULL,
  CONSTRAINT [pk_chi_tiet_kien_hang] PRIMARY KEY ([ma_kien]),
  CONSTRAINT [uq_parcel_order_sequence] UNIQUE ([ma_don],[thu_tu])
);
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [ck_chi_tiet_kien_hang_ma_kien] CHECK ([ma_kien]<>N'' AND DATALENGTH([ma_kien])=DATALENGTH(RTRIM([ma_kien])));
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [ck_chi_tiet_kien_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [ck_chi_tiet_kien_hang_thu_tu] CHECK ([thu_tu]>=1);
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [ck_chi_tiet_kien_hang_loai_hang_hoa] CHECK (DATALENGTH(LTRIM(RTRIM([loai_hang_hoa])))>0);
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [ck_chi_tiet_kien_hang_khoi_luong_kg] CHECK ([khoi_luong_kg]>0);

CREATE TABLE dbo.[phan_cong_don_hang] (
  [ma_phan_cong] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tx] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk_dieu_phoi] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bat_dau_luc] DATETIME2(3) NOT NULL,
  [ket_thuc_luc] DATETIME2(3) NULL,
  [ket_qua_ket_thuc] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NULL,
  [ly_do] NVARCHAR(500) NULL,
  CONSTRAINT [pk_phan_cong_don_hang] PRIMARY KEY ([ma_phan_cong]),
  CONSTRAINT [ck_assignment_end_pair] CHECK (([ket_thuc_luc] IS NULL AND [ket_qua_ket_thuc] IS NULL) OR ([ket_thuc_luc] IS NOT NULL AND [ket_qua_ket_thuc] IS NOT NULL AND [ket_thuc_luc]>=[bat_dau_luc]))
);
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [ck_phan_cong_don_hang_ma_phan_cong] CHECK ([ma_phan_cong]<>N'' AND DATALENGTH([ma_phan_cong])=DATALENGTH(RTRIM([ma_phan_cong])));
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [ck_phan_cong_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [ck_phan_cong_don_hang_ma_tx] CHECK ([ma_tx]<>N'' AND DATALENGTH([ma_tx])=DATALENGTH(RTRIM([ma_tx])));
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [ck_phan_cong_don_hang_ma_tk_dieu_phoi] CHECK ([ma_tk_dieu_phoi]<>N'' AND DATALENGTH([ma_tk_dieu_phoi])=DATALENGTH(RTRIM([ma_tk_dieu_phoi])));
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [ck_phan_cong_don_hang_ket_qua_ket_thuc] CHECK ([ket_qua_ket_thuc] IN (N'TU_CHOI',N'HOAN_TAT',N'HUY_DON'));

CREATE TABLE dbo.[nhat_ky_don_hang] (
  [ma_su_kien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [thu_tu] INT NOT NULL,
  [loai_su_kien] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [trang_thai_truoc] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NULL,
  [trang_thai_sau] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [thoi_gian] DATETIME2(3) NOT NULL,
  [ma_tk_thuc_hien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [loai_su_co] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NULL,
  [ghi_chu] NVARCHAR(500) NULL,
  CONSTRAINT [pk_nhat_ky_don_hang] PRIMARY KEY ([ma_su_kien]),
  CONSTRAINT [uq_order_event_sequence] UNIQUE ([ma_don],[thu_tu]),
  CONSTRAINT [ck_order_event_shape] CHECK (([loai_su_kien]=N'TAO_DON' AND [thu_tu]=1 AND [trang_thai_truoc] IS NULL AND [trang_thai_sau]=N'CHO_GAN' AND [loai_su_co] IS NULL) OR ([loai_su_kien]=N'CHUYEN_TRANG_THAI' AND [trang_thai_truoc] IS NOT NULL AND [trang_thai_truoc]<>[trang_thai_sau] AND [loai_su_co] IS NULL) OR ([loai_su_kien]=N'SU_CO' AND [trang_thai_truoc]=N'DANG_GIAO' AND [trang_thai_sau]=N'DANG_GIAO' AND [loai_su_co] IS NOT NULL AND [ghi_chu] IS NOT NULL))
);
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_ma_su_kien] CHECK ([ma_su_kien]<>N'' AND DATALENGTH([ma_su_kien])=DATALENGTH(RTRIM([ma_su_kien])));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_thu_tu] CHECK ([thu_tu]>=1);
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_loai_su_kien] CHECK ([loai_su_kien] IN (N'TAO_DON',N'CHUYEN_TRANG_THAI',N'SU_CO'));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_trang_thai_truoc] CHECK ([trang_thai_truoc] IN (N'CHO_GAN',N'DA_GAN',N'DA_LAY_HANG',N'DANG_GIAO',N'HOAN_TAT',N'DA_HUY'));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_trang_thai_sau] CHECK ([trang_thai_sau] IN (N'CHO_GAN',N'DA_GAN',N'DA_LAY_HANG',N'DANG_GIAO',N'HOAN_TAT',N'DA_HUY'));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_ma_tk_thuc_hien] CHECK ([ma_tk_thuc_hien]<>N'' AND DATALENGTH([ma_tk_thuc_hien])=DATALENGTH(RTRIM([ma_tk_thuc_hien])));
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_loai_su_co] CHECK ([loai_su_co] IN (N'KHONG_LIEN_LAC_DUOC',N'TU_CHOI_NHAN'));

CREATE TABLE dbo.[thanh_toan] (
  [ma_giao_dich] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tham_chieu] NVARCHAR(100) NOT NULL,
  [phuong_thuc] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [trang_thai] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT N'CHO_XU_LY',
  [tao_luc] DATETIME2(3) NOT NULL,
  [giai_quyet_luc] DATETIME2(3) NULL,
  [ma_giao_dich_doi_tac] NVARCHAR(100) NULL,
  [so_tien_thuc_nhan] DECIMAL(15,2) NULL,
  [thu_luc] DATETIME2(3) NULL,
  [ma_tk_xac_nhan] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NULL,
  CONSTRAINT [pk_thanh_toan] PRIMARY KEY ([ma_giao_dich]),
  CONSTRAINT [uq_payment_order_transaction] UNIQUE ([ma_don],[ma_giao_dich]),
  CONSTRAINT [ck_payment_status_fields] CHECK ((([trang_thai] IN (N'CHO_XU_LY',N'CHUA_RO_KET_QUA') AND [giai_quyet_luc] IS NULL AND [thu_luc] IS NULL AND [so_tien_thuc_nhan] IS NULL) OR ([trang_thai] IN (N'THAT_BAI',N'DA_HUY') AND [giai_quyet_luc] IS NOT NULL AND [giai_quyet_luc]>=[tao_luc] AND [thu_luc] IS NULL AND [so_tien_thuc_nhan] IS NULL) OR ([trang_thai]=N'THANH_CONG' AND [giai_quyet_luc] IS NOT NULL AND [giai_quyet_luc]>=[tao_luc] AND [thu_luc] IS NOT NULL AND [so_tien_thuc_nhan]>0)) AND (([phuong_thuc]=N'TIEN_MAT' AND [ma_giao_dich_doi_tac] IS NULL) OR ([phuong_thuc]=N'VNPAY_QR' AND ([trang_thai]<>N'THANH_CONG' OR [ma_giao_dich_doi_tac] IS NOT NULL))))
);
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_ma_giao_dich] CHECK ([ma_giao_dich]<>N'' AND DATALENGTH([ma_giao_dich])=DATALENGTH(RTRIM([ma_giao_dich])));
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_ma_tham_chieu] CHECK (DATALENGTH(LTRIM(RTRIM([ma_tham_chieu])))>0);
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_phuong_thuc] CHECK ([phuong_thuc] IN (N'TIEN_MAT',N'VNPAY_QR'));
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_trang_thai] CHECK ([trang_thai] IN (N'CHO_XU_LY',N'CHUA_RO_KET_QUA',N'THANH_CONG',N'THAT_BAI',N'DA_HUY'));
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_so_tien_thuc_nhan] CHECK ([so_tien_thuc_nhan]>=0 AND [so_tien_thuc_nhan]=ROUND([so_tien_thuc_nhan],0));
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [ck_thanh_toan_ma_tk_xac_nhan] CHECK ([ma_tk_xac_nhan]<>N'' AND DATALENGTH([ma_tk_xac_nhan])=DATALENGTH(RTRIM([ma_tk_xac_nhan])));

CREATE TABLE dbo.[xac_nhan_thanh_toan_don_hang] (
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_giao_dich] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CONSTRAINT [pk_xac_nhan_thanh_toan_don_hang] PRIMARY KEY ([ma_don]),
  CONSTRAINT [uq_confirmation_payment] UNIQUE ([ma_giao_dich]),
  CONSTRAINT [fk_confirm_payment_pair] FOREIGN KEY ([ma_don],[ma_giao_dich]) REFERENCES dbo.[thanh_toan]([ma_don],[ma_giao_dich])
);
ALTER TABLE dbo.[xac_nhan_thanh_toan_don_hang] ADD CONSTRAINT [ck_xac_nhan_thanh_toan_don_hang_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[xac_nhan_thanh_toan_don_hang] ADD CONSTRAINT [ck_xac_nhan_thanh_toan_don_hang_ma_giao_dich] CHECK ([ma_giao_dich]<>N'' AND DATALENGTH([ma_giao_dich])=DATALENGTH(RTRIM([ma_giao_dich])));

CREATE TABLE dbo.[su_kien_thanh_toan] (
  [ma_su_kien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_giao_dich] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NULL,
  [nguon] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [khoa_su_kien] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [nhan_luc] DATETIME2(3) NOT NULL,
  [chu_ky_hop_le] BIT NOT NULL,
  [ket_qua_xu_ly] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [noi_dung_json] NVARCHAR(MAX) NOT NULL,
  CONSTRAINT [pk_su_kien_thanh_toan] PRIMARY KEY ([ma_su_kien]),
  CONSTRAINT [uq_payment_event_source_hash] UNIQUE ([nguon],[khoa_su_kien])
);
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_ma_su_kien] CHECK ([ma_su_kien]<>N'' AND DATALENGTH([ma_su_kien])=DATALENGTH(RTRIM([ma_su_kien])));
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_ma_giao_dich] CHECK ([ma_giao_dich]<>N'' AND DATALENGTH([ma_giao_dich])=DATALENGTH(RTRIM([ma_giao_dich])));
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_nguon] CHECK ([nguon] IN (N'VNPAY_IPN',N'VNPAY_QUERY',N'VNPAY_RETURN'));
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_khoa_su_kien] CHECK ([khoa_su_kien] NOT LIKE '%[^0-9a-f]%' AND LEN([khoa_su_kien])=64);
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_ket_qua_xu_ly] CHECK ([ket_qua_xu_ly] IN (N'DA_AP_DUNG',N'KHONG_THAY_DOI',N'KHONG_HOP_LE',N'KHONG_KHOP',N'CAN_DOI_SOAT'));
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [ck_su_kien_thanh_toan_noi_dung_json] CHECK (ISJSON([noi_dung_json])=1);

CREATE TABLE dbo.[bao_gia] (
  [ma_bao_gia] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_kh] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_bieu_phi] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [tao_luc] DATETIME2(3) NOT NULL,
  [het_han_luc] DATETIME2(3) NOT NULL,
  [yeu_cau_json] NVARCHAR(MAX) NOT NULL,
  [ket_qua_json] NVARCHAR(MAX) NOT NULL,
  CONSTRAINT [pk_bao_gia] PRIMARY KEY ([ma_bao_gia])
);
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_ma_bao_gia] CHECK ([ma_bao_gia]<>N'' AND DATALENGTH([ma_bao_gia])=DATALENGTH(RTRIM([ma_bao_gia])));
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_ma_kh] CHECK ([ma_kh]<>N'' AND DATALENGTH([ma_kh])=DATALENGTH(RTRIM([ma_kh])));
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_ma_bieu_phi] CHECK ([ma_bieu_phi]<>N'' AND DATALENGTH([ma_bieu_phi])=DATALENGTH(RTRIM([ma_bieu_phi])));
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_yeu_cau_json] CHECK (ISJSON([yeu_cau_json])=1);
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_ket_qua_json] CHECK (ISJSON([ket_qua_json])=1);
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [ck_bao_gia_expiration] CHECK ([het_han_luc]>[tao_luc]);

CREATE TABLE dbo.[yeu_cau_tao_don] (
  [request_id] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_don] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [request_json] NVARCHAR(MAX) NOT NULL,
  [response_json] NVARCHAR(MAX) NOT NULL,
  [expires_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_yeu_cau_tao_don] PRIMARY KEY ([request_id])
);
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [ck_yeu_cau_tao_don_request_id] CHECK ([request_id] NOT LIKE '%[^0-9a-f]%' AND LEN([request_id])=64);
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [ck_yeu_cau_tao_don_ma_tk] CHECK ([ma_tk]<>N'' AND DATALENGTH([ma_tk])=DATALENGTH(RTRIM([ma_tk])));
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [ck_yeu_cau_tao_don_ma_don] CHECK ([ma_don]<>N'' AND DATALENGTH([ma_don])=DATALENGTH(RTRIM([ma_don])));
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [ck_yeu_cau_tao_don_request_json] CHECK (ISJSON([request_json])=1);
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [ck_yeu_cau_tao_don_response_json] CHECK (ISJSON([response_json])=1);

CREATE TABLE dbo.[nhat_ky_kiem_toan] (
  [ma_audit] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [ma_tk_thuc_hien] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NULL,
  [nguon] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [loai_doi_tuong] NVARCHAR(50) NOT NULL,
  [ma_doi_tuong] NVARCHAR(100) NOT NULL,
  [hanh_dong] NVARCHAR(40) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [thoi_gian] DATETIME2(3) NOT NULL,
  [truoc_json] NVARCHAR(MAX) NULL,
  [sau_json] NVARCHAR(MAX) NULL,
  [ly_do] NVARCHAR(500) NULL,
  CONSTRAINT [pk_nhat_ky_kiem_toan] PRIMARY KEY ([ma_audit]),
  CONSTRAINT [ck_audit_actor_source] CHECK (([nguon]=N'NGUOI_DUNG' AND [ma_tk_thuc_hien] IS NOT NULL) OR [nguon]=N'HE_THONG')
);
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_ma_audit] CHECK ([ma_audit]<>N'' AND DATALENGTH([ma_audit])=DATALENGTH(RTRIM([ma_audit])));
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_ma_tk_thuc_hien] CHECK ([ma_tk_thuc_hien]<>N'' AND DATALENGTH([ma_tk_thuc_hien])=DATALENGTH(RTRIM([ma_tk_thuc_hien])));
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_nguon] CHECK ([nguon] IN (N'NGUOI_DUNG',N'HE_THONG'));
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_loai_doi_tuong] CHECK (DATALENGTH(LTRIM(RTRIM([loai_doi_tuong])))>0);
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_ma_doi_tuong] CHECK (DATALENGTH(LTRIM(RTRIM([ma_doi_tuong])))>0);
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_hanh_dong] CHECK ([hanh_dong] IN (N'TAO',N'SUA',N'KHOA',N'MO_KHOA',N'CONG_BO',N'XOA'));
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_truoc_json] CHECK (ISJSON([truoc_json])=1);
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [ck_nhat_ky_kiem_toan_sau_json] CHECK (ISJSON([sau_json])=1);

ALTER TABLE dbo.[khach_hang] ADD CONSTRAINT [fk_khach_hang_ma_tk] FOREIGN KEY ([ma_tk]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [fk_tai_xe_ma_tk] FOREIGN KEY ([ma_tk]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[phuong_tien] ADD CONSTRAINT [fk_phuong_tien_ma_tx] FOREIGN KEY ([ma_tx]) REFERENCES dbo.[tai_xe]([ma_tx]);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [fk_don_hang_ma_kh] FOREIGN KEY ([ma_kh]) REFERENCES dbo.[khach_hang]([ma_kh]);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [fk_don_hang_ma_tk_tao] FOREIGN KEY ([ma_tk_tao]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [fk_cuoc_don_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [fk_cuoc_don_hang_ma_bieu_phi] FOREIGN KEY ([ma_bieu_phi]) REFERENCES dbo.[cau_hinh_cuoc]([ma_bieu_phi]);
ALTER TABLE dbo.[cuoc_don_hang] ADD CONSTRAINT [fk_cuoc_don_hang_ma_chinh_sach_giam] FOREIGN KEY ([ma_chinh_sach_giam]) REFERENCES dbo.[chinh_sach_thanh_vien]([ma_chinh_sach]);
ALTER TABLE dbo.[phu_thu_don_hang] ADD CONSTRAINT [fk_phu_thu_don_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[phu_thu_don_hang] ADD CONSTRAINT [fk_phu_thu_don_hang_ma_phu_thu] FOREIGN KEY ([ma_phu_thu]) REFERENCES dbo.[cau_hinh_phu_thu]([ma_phu_thu]);
ALTER TABLE dbo.[chi_tiet_kien_hang] ADD CONSTRAINT [fk_chi_tiet_kien_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [fk_phan_cong_don_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [fk_phan_cong_don_hang_ma_tx] FOREIGN KEY ([ma_tx]) REFERENCES dbo.[tai_xe]([ma_tx]);
ALTER TABLE dbo.[phan_cong_don_hang] ADD CONSTRAINT [fk_phan_cong_don_hang_ma_tk_dieu_phoi] FOREIGN KEY ([ma_tk_dieu_phoi]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [fk_nhat_ky_don_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [fk_nhat_ky_don_hang_ma_tk_thuc_hien] FOREIGN KEY ([ma_tk_thuc_hien]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [fk_thanh_toan_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[thanh_toan] ADD CONSTRAINT [fk_thanh_toan_ma_tk_xac_nhan] FOREIGN KEY ([ma_tk_xac_nhan]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[xac_nhan_thanh_toan_don_hang] ADD CONSTRAINT [fk_xac_nhan_thanh_toan_don_hang_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[su_kien_thanh_toan] ADD CONSTRAINT [fk_su_kien_thanh_toan_ma_giao_dich] FOREIGN KEY ([ma_giao_dich]) REFERENCES dbo.[thanh_toan]([ma_giao_dich]);
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [fk_bao_gia_ma_kh] FOREIGN KEY ([ma_kh]) REFERENCES dbo.[khach_hang]([ma_kh]);
ALTER TABLE dbo.[bao_gia] ADD CONSTRAINT [fk_bao_gia_ma_bieu_phi] FOREIGN KEY ([ma_bieu_phi]) REFERENCES dbo.[cau_hinh_cuoc]([ma_bieu_phi]);
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [fk_yeu_cau_tao_don_ma_tk] FOREIGN KEY ([ma_tk]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[yeu_cau_tao_don] ADD CONSTRAINT [fk_yeu_cau_tao_don_ma_don] FOREIGN KEY ([ma_don]) REFERENCES dbo.[don_hang]([ma_don]);
ALTER TABLE dbo.[nhat_ky_kiem_toan] ADD CONSTRAINT [fk_nhat_ky_kiem_toan_ma_tk_thuc_hien] FOREIGN KEY ([ma_tk_thuc_hien]) REFERENCES dbo.[tai_khoan]([ma_tk]);
ALTER TABLE dbo.[khach_hang] ADD CONSTRAINT [ck_customer_membership_dates] CHECK (([ma_hang]=N'THUONG' AND [thanh_vien_tu] IS NULL AND [thanh_vien_den] IS NULL) OR ([ma_hang]<>N'THUONG' AND [thanh_vien_tu] IS NOT NULL AND ([thanh_vien_den] IS NULL OR [thanh_vien_den]>[thanh_vien_tu])));
ALTER TABLE dbo.[chinh_sach_thanh_vien] ADD CONSTRAINT [ck_membership_policy_dates] CHECK ([hieu_luc_den] IS NULL OR [hieu_luc_den]>[hieu_luc_tu]);
ALTER TABLE dbo.[cau_hinh_cuoc] ADD CONSTRAINT [ck_fare_policy_range] CHECK (([hieu_luc_den] IS NULL OR [hieu_luc_den]>[hieu_luc_tu]) AND ([km_toi_da] IS NULL OR [km_toi_da]>=[km_toi_thieu]));
ALTER TABLE dbo.[cau_hinh_phu_thu] ADD CONSTRAINT [ck_surcharge_policy_dates] CHECK ([hieu_luc_den] IS NULL OR [hieu_luc_den]>[hieu_luc_tu]);
ALTER TABLE dbo.[tai_khoan] ADD CONSTRAINT [ck_account_login_chronology] CHECK ([lan_dang_nhap_cuoi] IS NULL OR [lan_dang_nhap_cuoi]>=[ngay_tao]);
ALTER TABLE dbo.[tai_xe] ADD CONSTRAINT [ck_driver_queue_status] CHECK ([trang_thai]=N'ONLINE' OR [ranh_tu] IS NULL);
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_order_terminal_chronology] CHECK (([thoi_gian_hoan_tat] IS NULL OR [thoi_gian_hoan_tat]>=[thoi_gian_tao]) AND ([thoi_gian_huy] IS NULL OR [thoi_gian_huy]>=[thoi_gian_tao]));
ALTER TABLE dbo.[don_hang] ADD CONSTRAINT [ck_order_route_values] CHECK ([quang_duong_km]>0 AND [thoi_gian_du_kien_giay]>0);
CREATE TABLE dbo.[demo_seed_manifest] ([seed_key] NVARCHAR(100) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [pk_demo_seed_manifest] PRIMARY KEY, [seed_version] NVARCHAR(40) NOT NULL, [seeded_at] DATETIME2(3) NOT NULL);
CREATE UNIQUE INDEX [uq_tai_khoan_username] ON dbo.[tai_khoan]([username]);
CREATE UNIQUE INDEX [uq_tai_khoan_so_dien_thoai] ON dbo.[tai_khoan]([so_dien_thoai]) WHERE [so_dien_thoai] IS NOT NULL;
CREATE UNIQUE INDEX [uq_khach_hang_ma_tk] ON dbo.[khach_hang]([ma_tk]);
CREATE UNIQUE INDEX [uq_tai_xe_ma_tk] ON dbo.[tai_xe]([ma_tk]);
CREATE UNIQUE INDEX [uq_tai_xe_cccd] ON dbo.[tai_xe]([cccd]);
CREATE UNIQUE INDEX [uq_tai_xe_so_giay_phep] ON dbo.[tai_xe]([so_giay_phep]);
CREATE UNIQUE INDEX [uq_phuong_tien_ma_tx] ON dbo.[phuong_tien]([ma_tx]);
CREATE UNIQUE INDEX [uq_phuong_tien_bien_so_xe] ON dbo.[phuong_tien]([bien_so_xe]);
CREATE UNIQUE INDEX [uq_thanh_toan_ma_tham_chieu] ON dbo.[thanh_toan]([ma_tham_chieu]);
CREATE UNIQUE INDEX [uq_thanh_toan_ma_giao_dich_doi_tac] ON dbo.[thanh_toan]([ma_giao_dich_doi_tac]) WHERE [ma_giao_dich_doi_tac] IS NOT NULL;
CREATE UNIQUE INDEX [uq_yeu_cau_tao_don_ma_don] ON dbo.[yeu_cau_tao_don]([ma_don]);
CREATE UNIQUE INDEX [uq_assignment_active_order] ON dbo.[phan_cong_don_hang]([ma_don]) WHERE [ket_thuc_luc] IS NULL;
CREATE UNIQUE INDEX [uq_assignment_active_driver] ON dbo.[phan_cong_don_hang]([ma_tx]) WHERE [ket_thuc_luc] IS NULL;
CREATE UNIQUE INDEX [uq_assignment_completed_order] ON dbo.[phan_cong_don_hang]([ma_don]) WHERE [ket_qua_ket_thuc]=N'HOAN_TAT';
CREATE UNIQUE INDEX [uq_assignment_rejected_driver_order] ON dbo.[phan_cong_don_hang]([ma_don],[ma_tx]) WHERE [ket_qua_ket_thuc]=N'TU_CHOI';
-- SQL Server filtered-index predicates support simple comparisons; transaction code also serializes the combined pending-state invariant.
CREATE UNIQUE INDEX [uq_payment_pending_order] ON dbo.[thanh_toan]([ma_don]) WHERE [trang_thai]=N'CHO_XU_LY';
CREATE UNIQUE INDEX [uq_payment_unknown_order] ON dbo.[thanh_toan]([ma_don]) WHERE [trang_thai]=N'CHUA_RO_KET_QUA';
CREATE UNIQUE INDEX [uq_policy_member_start] ON dbo.[chinh_sach_thanh_vien]([ma_hang],[hieu_luc_tu]);
CREATE UNIQUE INDEX [uq_policy_surcharge_start] ON dbo.[cau_hinh_phu_thu]([ma_loai_phu_thu],[hieu_luc_tu]);
CREATE INDEX [ix_order_customer_created] ON dbo.[don_hang]([ma_kh],[thoi_gian_tao] DESC);
CREATE INDEX [ix_assignment_driver_active] ON dbo.[phan_cong_don_hang]([ma_tx],[ket_thuc_luc]);
CREATE INDEX [ix_order_event_order_sequence] ON dbo.[nhat_ky_don_hang]([ma_don],[thu_tu]);
CREATE INDEX [ix_payment_order_created] ON dbo.[thanh_toan]([ma_don],[tao_luc] DESC);
CREATE INDEX [ix_quote_expiration] ON dbo.[bao_gia]([het_han_luc]);
CREATE INDEX [ix_order_request_expiration] ON dbo.[yeu_cau_tao_don]([expires_at]);
CREATE INDEX [ix_audit_object_time] ON dbo.[nhat_ky_kiem_toan]([loai_doi_tuong],[ma_doi_tuong],[thoi_gian] DESC);
