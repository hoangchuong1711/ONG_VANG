
IF EXISTS (SELECT 1 FROM [${flyway:defaultSchema}].don_hang)
    THROW 50000, N'T03: V1 orders need reviewed fare snapshots before V2 migration', 1;
ALTER TABLE [${flyway:defaultSchema}].tai_khoan ADD ho_ten NVARCHAR(100);
GO
UPDATE tk SET ho_ten = COALESCE(
    (SELECT kh.ho_ten FROM [${flyway:defaultSchema}].khach_hang kh WHERE kh.ma_tk = tk.ma_tk),
    (SELECT tx.ho_ten FROM [${flyway:defaultSchema}].tai_xe tx WHERE tx.ma_tk = tk.ma_tk),
    (SELECT nv.ho_ten FROM [${flyway:defaultSchema}].dieu_phoi_vien nv WHERE nv.ma_tk = tk.ma_tk)
) FROM [${flyway:defaultSchema}].tai_khoan tk;
IF EXISTS (SELECT 1 FROM [${flyway:defaultSchema}].tai_khoan WHERE ho_ten IS NULL)
    THROW 50000, N'T03: account display names must be supplied before V2 migration', 1;
ALTER TABLE [${flyway:defaultSchema}].tai_khoan ALTER COLUMN ho_ten NVARCHAR(100) NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].tai_khoan ADD CONSTRAINT chk_tk_trang_thai CHECK (trang_thai IN (N'HOAT_DONG', N'KHOA'));
GO
-- Fixed role columns plus a composite FK enforce profile roles without triggers.
ALTER TABLE [${flyway:defaultSchema}].tai_khoan ADD CONSTRAINT uq_tk_role UNIQUE (ma_tk, vai_tro);
GO
ALTER TABLE [${flyway:defaultSchema}].khach_hang ADD vai_tro NVARCHAR(20) NOT NULL DEFAULT N'KHACH_HANG' CHECK (vai_tro = N'KHACH_HANG');
GO
ALTER TABLE [${flyway:defaultSchema}].khach_hang ADD CONSTRAINT fk_kh_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk, vai_tro);
GO
ALTER TABLE [${flyway:defaultSchema}].tai_xe ADD vai_tro NVARCHAR(20) NOT NULL DEFAULT N'TAI_XE' CHECK (vai_tro = N'TAI_XE');
GO
ALTER TABLE [${flyway:defaultSchema}].tai_xe ADD CONSTRAINT fk_tx_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk, vai_tro);
GO
ALTER TABLE [${flyway:defaultSchema}].dieu_phoi_vien ADD vai_tro NVARCHAR(20) NOT NULL DEFAULT N'TONG_DAI' CHECK (vai_tro = N'TONG_DAI');
GO
ALTER TABLE [${flyway:defaultSchema}].dieu_phoi_vien ADD CONSTRAINT fk_nv_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk, vai_tro);
GO

ALTER TABLE [${flyway:defaultSchema}].tai_xe ADD ranh_tu DATETIME2(6);
GO
UPDATE [${flyway:defaultSchema}].tai_xe SET ranh_tu = SYSUTCDATETIME() WHERE trang_thai = N'ONLINE';

-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].tai_khoan SET ngay_tao = CAST((ngay_tao AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].tai_khoan SET lan_dang_nhap_cuoi = CAST((lan_dang_nhap_cuoi AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].don_hang SET thoi_gian_tao = CAST((thoi_gian_tao AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].don_hang SET thoi_gian_huy = CAST((thoi_gian_huy AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD thoi_gian_hoan_tat DATETIME2(6);
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD version BIGINT NOT NULL DEFAULT 0;
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ALTER COLUMN tien_giam_gia NUMERIC(15,2) NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD CONSTRAINT chk_dh_giam CHECK (tien_giam_gia >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD CONSTRAINT chk_dh_km CHECK (quang_duong_km >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD CONSTRAINT chk_dh_huy CHECK
    ((trang_thai <> N'DA_HUY') OR (thoi_gian_huy IS NOT NULL AND ly_do_huy IS NOT NULL));
GO
ALTER TABLE [${flyway:defaultSchema}].don_hang ADD CONSTRAINT chk_dh_hoan_tat CHECK
    ((trang_thai <> N'HOAN_TAT') OR thoi_gian_hoan_tat IS NOT NULL);
GO
-- The snapshot is the only stored source for the applied discount.
ALTER TABLE [${flyway:defaultSchema}].don_hang DROP CONSTRAINT chk_dh_giam;
ALTER TABLE [${flyway:defaultSchema}].don_hang DROP CONSTRAINT df_dh_giam;
ALTER TABLE [${flyway:defaultSchema}].don_hang DROP COLUMN tien_giam_gia;
CREATE TABLE [${flyway:defaultSchema}].snapshot_cuoc_don_hang (
    ma_don NVARCHAR(36) PRIMARY KEY REFERENCES [${flyway:defaultSchema}].don_hang(ma_don) ON DELETE CASCADE,
    ten_bieu_phi NVARCHAR(100) NOT NULL,
    cuoc_goc NUMERIC(15,2) NOT NULL CHECK (cuoc_goc >= 0),
    tien_phu_thu NUMERIC(15,2) NOT NULL CHECK (tien_phu_thu >= 0),
    tien_giam_gia NUMERIC(15,2) NOT NULL CHECK (tien_giam_gia >= 0),
    tong_cuoc NUMERIC(15,2) NOT NULL CHECK (tong_cuoc >= 0),
    don_vi_tien NVARCHAR(3) NOT NULL DEFAULT N'VND' CHECK (don_vi_tien = N'VND'),
    ten_hang_ap_dung NVARCHAR(50),
    phan_tram_giam_gia NUMERIC(5,2) CHECK (phan_tram_giam_gia BETWEEN 0 AND 100),
    CONSTRAINT chk_snapshot_tong CHECK (tong_cuoc = cuoc_goc + tien_phu_thu - tien_giam_gia)
);
ALTER TABLE [${flyway:defaultSchema}].phu_thu_don_hang ADD ten_phu_thu_snapshot NVARCHAR(150);
GO
UPDATE p SET ten_phu_thu_snapshot = c.ten_phu_thu
    FROM [${flyway:defaultSchema}].phu_thu_don_hang p JOIN [${flyway:defaultSchema}].cau_hinh_phu_thu c ON c.ma_phu_thu = p.ma_phu_thu;
ALTER TABLE [${flyway:defaultSchema}].phu_thu_don_hang ALTER COLUMN ten_phu_thu_snapshot NVARCHAR(150) NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].phu_thu_don_hang ALTER COLUMN so_tien_tinh NUMERIC(15,2) NOT NULL;
GO
-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].phu_thu_don_hang SET thoi_gian_ap_dung = CAST((thoi_gian_ap_dung AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_phu_thu ALTER COLUMN so_tien_phu_thu NUMERIC(15,2) NOT NULL;
GO

CREATE TABLE [${flyway:defaultSchema}].phan_cong_don_hang (
    ma_phan_cong NVARCHAR(36) PRIMARY KEY,
    ma_don NVARCHAR(36) NOT NULL REFERENCES [${flyway:defaultSchema}].don_hang(ma_don),
    ma_tx NVARCHAR(36) NOT NULL REFERENCES [${flyway:defaultSchema}].tai_xe(ma_tx),
    ma_tk_dieu_phoi NVARCHAR(36) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk),
    bat_dau_luc DATETIME2(6) NOT NULL,
    ket_thuc_luc DATETIME2(6),
    ly_do_ket_thuc NVARCHAR(500),
    CONSTRAINT chk_pc_time CHECK (ket_thuc_luc IS NULL OR ket_thuc_luc >= bat_dau_luc)
);
CREATE UNIQUE INDEX uq_pc_active_order ON [${flyway:defaultSchema}].phan_cong_don_hang(ma_don) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX uq_pc_active_driver ON [${flyway:defaultSchema}].phan_cong_don_hang(ma_tx) WHERE ket_thuc_luc IS NULL;

-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].nhat_ky_trang_thai SET thoi_gian_ghi_nhan = CAST((thoi_gian_ghi_nhan AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
ALTER TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai ADD ma_tk_thuc_hien NVARCHAR(36) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk);
GO
ALTER TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai ADD vai_tro_thuc_hien NVARCHAR(20);
GO
ALTER TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai ADD CONSTRAINT chk_nk_trang_thai CHECK (trang_thai IN
    (N'CHO_GAN', N'DA_GAN', N'DA_LAY_HANG', N'DANG_GIAO', N'HOAN_TAT', N'DA_HUY'));
GO

ALTER TABLE [${flyway:defaultSchema}].thanh_toan DROP CONSTRAINT IF EXISTS thanh_toan_ma_don_key;
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ALTER COLUMN so_tien NUMERIC(15,2) NOT NULL;
GO
-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].thanh_toan SET thoi_gian_thanh_toan = CAST((thoi_gian_thanh_toan AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ADD tao_luc DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME();
GO
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ADD ma_tk_xac_nhan NVARCHAR(36) REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk);
GO
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ADD CONSTRAINT chk_tt_so_tien CHECK (so_tien >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ADD CONSTRAINT chk_tt_paid CHECK
    ((trang_thai IN (N'THANH_CONG', N'HOAN_TIEN') AND thoi_gian_thanh_toan IS NOT NULL)
     OR (trang_thai IN (N'CHO_XU_LY', N'THAT_BAI') AND thoi_gian_thanh_toan IS NULL));
GO
ALTER TABLE [${flyway:defaultSchema}].thanh_toan ADD CONSTRAINT chk_tt_online_reference CHECK
    (phuong_thuc <> N'VNPAY_QR' OR ma_tham_chieu IS NOT NULL);
GO
CREATE UNIQUE INDEX uq_tt_success_order ON [${flyway:defaultSchema}].thanh_toan(ma_don) WHERE trang_thai = N'THANH_CONG';
CREATE UNIQUE INDEX uq_tt_pending_online ON [${flyway:defaultSchema}].thanh_toan(ma_don)
    WHERE phuong_thuc = N'VNPAY_QR' AND trang_thai = N'CHO_XU_LY';

-- Preserve the V1 wall-clock interpretation, then store UTC at microsecond precision.
UPDATE [${flyway:defaultSchema}].danh_gia_chuyen_di SET thoi_gian_danh_gia = CAST((thoi_gian_danh_gia AT TIME ZONE 'SE Asia Standard Time') AT TIME ZONE 'UTC' AS DATETIME2(6));
ALTER TABLE [${flyway:defaultSchema}].chi_tiet_kien_hang ADD CONSTRAINT chk_kien_khoi_luong CHECK (khoi_luong_kg > 0);
GO
ALTER TABLE [${flyway:defaultSchema}].hang_thanh_vien ADD CONSTRAINT chk_hang_diem CHECK (nguong_chi_tieu >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].khach_hang_vip ALTER COLUMN diem_tich_luy INTEGER NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].khach_hang_vip ADD CONSTRAINT chk_vip_diem CHECK (diem_tich_luy >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].phuong_tien ALTER COLUMN tinh_trang_hoat_dong BIT NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_cuoc ALTER COLUMN km_toi_thieu NUMERIC(10,2) NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_cuoc ALTER COLUMN dang_kich_hoat BIT NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_phu_thu ALTER COLUMN dang_kich_hoat BIT NOT NULL;
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_phu_thu ADD CONSTRAINT chk_phu_thu_gia CHECK (so_tien_phu_thu >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_gia CHECK (cuoc_co_ban >= 0 AND don_gia_km >= 0);
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_range CHECK
    (km_toi_thieu >= 0 AND (km_toi_da IS NULL OR km_toi_da >= km_toi_thieu));
GO
ALTER TABLE [${flyway:defaultSchema}].cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_dates CHECK
    (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau);
GO

CREATE INDEX ix_dh_kh_created ON [${flyway:defaultSchema}].don_hang(ma_kh, thoi_gian_tao DESC, ma_don);
CREATE INDEX ix_dh_status_created ON [${flyway:defaultSchema}].don_hang(trang_thai, thoi_gian_tao DESC);
CREATE INDEX ix_dh_driver ON [${flyway:defaultSchema}].don_hang(ma_tx);
CREATE INDEX ix_dh_completed ON [${flyway:defaultSchema}].don_hang(thoi_gian_hoan_tat) WHERE thoi_gian_hoan_tat IS NOT NULL;
CREATE INDEX ix_kien_order ON [${flyway:defaultSchema}].chi_tiet_kien_hang(ma_don);
CREATE INDEX ix_log_order_time ON [${flyway:defaultSchema}].nhat_ky_trang_thai(ma_don, thoi_gian_ghi_nhan, ma_nhat_ky);
CREATE INDEX ix_payment_order_time ON [${flyway:defaultSchema}].thanh_toan(ma_don, tao_luc DESC, ma_giao_dich);
CREATE INDEX ix_payment_paid ON [${flyway:defaultSchema}].thanh_toan(thoi_gian_thanh_toan) WHERE trang_thai = N'THANH_CONG';
CREATE INDEX ix_assignment_order ON [${flyway:defaultSchema}].phan_cong_don_hang(ma_don, bat_dau_luc);
CREATE INDEX ix_assignment_driver ON [${flyway:defaultSchema}].phan_cong_don_hang(ma_tx, bat_dau_luc);

CREATE TABLE [${flyway:defaultSchema}].demo_seed_manifest (
    seed_key NVARCHAR(30) PRIMARY KEY,
    seeded_at DATETIME2(6) NOT NULL
);
