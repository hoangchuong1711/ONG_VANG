
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM don_hang) THEN
        RAISE EXCEPTION 'T03: V1 orders need reviewed fare snapshots before V2 migration';
    END IF;
END $$;
ALTER TABLE tai_khoan ADD COLUMN ho_ten VARCHAR(100);
UPDATE tai_khoan tk SET ho_ten = COALESCE(
    (SELECT kh.ho_ten FROM khach_hang kh WHERE kh.ma_tk = tk.ma_tk),
    (SELECT tx.ho_ten FROM tai_xe tx WHERE tx.ma_tk = tk.ma_tk),
    (SELECT nv.ho_ten FROM dieu_phoi_vien nv WHERE nv.ma_tk = tk.ma_tk)
);
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM tai_khoan WHERE ho_ten IS NULL) THEN
        RAISE EXCEPTION 'T03: account display names must be supplied before V2 migration';
    END IF;
END $$;
ALTER TABLE tai_khoan ALTER COLUMN ho_ten SET NOT NULL;
ALTER TABLE tai_khoan ADD CONSTRAINT chk_tk_trang_thai CHECK (trang_thai IN ('HOAT_DONG', 'KHOA'));
-- Fixed role columns plus a composite FK enforce profile roles without triggers.
ALTER TABLE tai_khoan ADD CONSTRAINT uq_tk_role UNIQUE (ma_tk, vai_tro);
ALTER TABLE khach_hang ADD COLUMN vai_tro VARCHAR(20) NOT NULL DEFAULT 'KHACH_HANG' CHECK (vai_tro = 'KHACH_HANG');
ALTER TABLE khach_hang ADD CONSTRAINT fk_kh_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES tai_khoan(ma_tk, vai_tro);
ALTER TABLE tai_xe ADD COLUMN vai_tro VARCHAR(20) NOT NULL DEFAULT 'TAI_XE' CHECK (vai_tro = 'TAI_XE');
ALTER TABLE tai_xe ADD CONSTRAINT fk_tx_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES tai_khoan(ma_tk, vai_tro);
ALTER TABLE dieu_phoi_vien ADD COLUMN vai_tro VARCHAR(20) NOT NULL DEFAULT 'TONG_DAI' CHECK (vai_tro = 'TONG_DAI');
ALTER TABLE dieu_phoi_vien ADD CONSTRAINT fk_nv_role FOREIGN KEY (ma_tk, vai_tro) REFERENCES tai_khoan(ma_tk, vai_tro);

ALTER TABLE tai_xe ADD COLUMN ranh_tu TIMESTAMPTZ;
UPDATE tai_xe SET ranh_tu = CURRENT_TIMESTAMP WHERE trang_thai = 'ONLINE';

ALTER TABLE tai_khoan ALTER COLUMN ngay_tao TYPE TIMESTAMPTZ USING ngay_tao AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE tai_khoan ALTER COLUMN lan_dang_nhap_cuoi TYPE TIMESTAMPTZ USING lan_dang_nhap_cuoi AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE don_hang ALTER COLUMN thoi_gian_tao TYPE TIMESTAMPTZ USING thoi_gian_tao AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE don_hang ALTER COLUMN thoi_gian_huy TYPE TIMESTAMPTZ USING thoi_gian_huy AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE don_hang ADD COLUMN thoi_gian_hoan_tat TIMESTAMPTZ;
ALTER TABLE don_hang ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE don_hang ALTER COLUMN tien_giam_gia SET NOT NULL;
ALTER TABLE don_hang ADD CONSTRAINT chk_dh_giam CHECK (tien_giam_gia >= 0);
ALTER TABLE don_hang ADD CONSTRAINT chk_dh_km CHECK (quang_duong_km >= 0);
ALTER TABLE don_hang ADD CONSTRAINT chk_dh_huy CHECK
    ((trang_thai <> 'DA_HUY') OR (thoi_gian_huy IS NOT NULL AND ly_do_huy IS NOT NULL));
ALTER TABLE don_hang ADD CONSTRAINT chk_dh_hoan_tat CHECK
    ((trang_thai <> 'HOAN_TAT') OR thoi_gian_hoan_tat IS NOT NULL);
-- The snapshot is the only stored source for the applied discount.
ALTER TABLE don_hang DROP COLUMN tien_giam_gia;
CREATE TABLE snapshot_cuoc_don_hang (
    ma_don VARCHAR(36) PRIMARY KEY REFERENCES don_hang(ma_don) ON DELETE CASCADE,
    ten_bieu_phi VARCHAR(100) NOT NULL,
    cuoc_goc NUMERIC(15,2) NOT NULL CHECK (cuoc_goc >= 0),
    tien_phu_thu NUMERIC(15,2) NOT NULL CHECK (tien_phu_thu >= 0),
    tien_giam_gia NUMERIC(15,2) NOT NULL CHECK (tien_giam_gia >= 0),
    tong_cuoc NUMERIC(15,2) NOT NULL CHECK (tong_cuoc >= 0),
    don_vi_tien VARCHAR(3) NOT NULL DEFAULT 'VND' CHECK (don_vi_tien = 'VND'),
    ten_hang_ap_dung VARCHAR(50),
    phan_tram_giam_gia NUMERIC(5,2) CHECK (phan_tram_giam_gia BETWEEN 0 AND 100),
    CONSTRAINT chk_snapshot_tong CHECK (tong_cuoc = cuoc_goc + tien_phu_thu - tien_giam_gia)
);
ALTER TABLE phu_thu_don_hang ADD COLUMN ten_phu_thu_snapshot VARCHAR(150);
UPDATE phu_thu_don_hang p SET ten_phu_thu_snapshot = c.ten_phu_thu
    FROM cau_hinh_phu_thu c WHERE c.ma_phu_thu = p.ma_phu_thu;
ALTER TABLE phu_thu_don_hang ALTER COLUMN ten_phu_thu_snapshot SET NOT NULL;
ALTER TABLE phu_thu_don_hang ALTER COLUMN so_tien_tinh TYPE NUMERIC(15,2);
ALTER TABLE phu_thu_don_hang ALTER COLUMN thoi_gian_ap_dung TYPE TIMESTAMPTZ
    USING thoi_gian_ap_dung AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE cau_hinh_phu_thu ALTER COLUMN so_tien_phu_thu TYPE NUMERIC(15,2);

CREATE TABLE phan_cong_don_hang (
    ma_phan_cong VARCHAR(36) PRIMARY KEY,
    ma_don VARCHAR(36) NOT NULL REFERENCES don_hang(ma_don),
    ma_tx VARCHAR(36) NOT NULL REFERENCES tai_xe(ma_tx),
    ma_tk_dieu_phoi VARCHAR(36) REFERENCES tai_khoan(ma_tk),
    bat_dau_luc TIMESTAMPTZ NOT NULL,
    ket_thuc_luc TIMESTAMPTZ,
    ly_do_ket_thuc VARCHAR(500),
    CONSTRAINT chk_pc_time CHECK (ket_thuc_luc IS NULL OR ket_thuc_luc >= bat_dau_luc)
);
CREATE UNIQUE INDEX uq_pc_active_order ON phan_cong_don_hang(ma_don) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX uq_pc_active_driver ON phan_cong_don_hang(ma_tx) WHERE ket_thuc_luc IS NULL;

ALTER TABLE nhat_ky_trang_thai ALTER COLUMN thoi_gian_ghi_nhan TYPE TIMESTAMPTZ
    USING thoi_gian_ghi_nhan AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE nhat_ky_trang_thai ADD COLUMN ma_tk_thuc_hien VARCHAR(36) REFERENCES tai_khoan(ma_tk);
ALTER TABLE nhat_ky_trang_thai ADD COLUMN vai_tro_thuc_hien VARCHAR(20);
ALTER TABLE nhat_ky_trang_thai ADD CONSTRAINT chk_nk_trang_thai CHECK (trang_thai IN
    ('CHO_GAN', 'DA_GAN', 'DA_LAY_HANG', 'DANG_GIAO', 'HOAN_TAT', 'DA_HUY'));

ALTER TABLE thanh_toan DROP CONSTRAINT IF EXISTS thanh_toan_ma_don_key;
ALTER TABLE thanh_toan ALTER COLUMN so_tien TYPE NUMERIC(15,2);
ALTER TABLE thanh_toan ALTER COLUMN thoi_gian_thanh_toan TYPE TIMESTAMPTZ
    USING thoi_gian_thanh_toan AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE thanh_toan ADD COLUMN tao_luc TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE thanh_toan ADD COLUMN ma_tk_xac_nhan VARCHAR(36) REFERENCES tai_khoan(ma_tk);
ALTER TABLE thanh_toan ADD CONSTRAINT chk_tt_so_tien CHECK (so_tien >= 0);
ALTER TABLE thanh_toan ADD CONSTRAINT chk_tt_paid CHECK
    ((trang_thai IN ('THANH_CONG', 'HOAN_TIEN') AND thoi_gian_thanh_toan IS NOT NULL)
     OR (trang_thai IN ('CHO_XU_LY', 'THAT_BAI') AND thoi_gian_thanh_toan IS NULL));
ALTER TABLE thanh_toan ADD CONSTRAINT chk_tt_online_reference CHECK
    (phuong_thuc <> 'VNPAY_QR' OR ma_tham_chieu IS NOT NULL);
CREATE UNIQUE INDEX uq_tt_success_order ON thanh_toan(ma_don) WHERE trang_thai = 'THANH_CONG';
CREATE UNIQUE INDEX uq_tt_pending_online ON thanh_toan(ma_don)
    WHERE phuong_thuc = 'VNPAY_QR' AND trang_thai = 'CHO_XU_LY';

ALTER TABLE danh_gia_chuyen_di ALTER COLUMN thoi_gian_danh_gia TYPE TIMESTAMPTZ
    USING thoi_gian_danh_gia AT TIME ZONE 'Asia/Ho_Chi_Minh';
ALTER TABLE chi_tiet_kien_hang ADD CONSTRAINT chk_kien_khoi_luong CHECK (khoi_luong_kg > 0);
ALTER TABLE hang_thanh_vien ADD CONSTRAINT chk_hang_diem CHECK (nguong_chi_tieu >= 0);
ALTER TABLE khach_hang_vip ALTER COLUMN diem_tich_luy SET NOT NULL;
ALTER TABLE khach_hang_vip ADD CONSTRAINT chk_vip_diem CHECK (diem_tich_luy >= 0);
ALTER TABLE phuong_tien ALTER COLUMN tinh_trang_hoat_dong SET NOT NULL;
ALTER TABLE cau_hinh_cuoc ALTER COLUMN km_toi_thieu SET NOT NULL;
ALTER TABLE cau_hinh_cuoc ALTER COLUMN dang_kich_hoat SET NOT NULL;
ALTER TABLE cau_hinh_phu_thu ALTER COLUMN dang_kich_hoat SET NOT NULL;
ALTER TABLE cau_hinh_phu_thu ADD CONSTRAINT chk_phu_thu_gia CHECK (so_tien_phu_thu >= 0);
ALTER TABLE cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_gia CHECK (cuoc_co_ban >= 0 AND don_gia_km >= 0);
ALTER TABLE cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_range CHECK
    (km_toi_thieu >= 0 AND (km_toi_da IS NULL OR km_toi_da >= km_toi_thieu));
ALTER TABLE cau_hinh_cuoc ADD CONSTRAINT chk_cuoc_dates CHECK
    (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau);

CREATE INDEX ix_dh_kh_created ON don_hang(ma_kh, thoi_gian_tao DESC, ma_don);
CREATE INDEX ix_dh_status_created ON don_hang(trang_thai, thoi_gian_tao DESC);
CREATE INDEX ix_dh_driver ON don_hang(ma_tx);
CREATE INDEX ix_dh_completed ON don_hang(thoi_gian_hoan_tat) WHERE thoi_gian_hoan_tat IS NOT NULL;
CREATE INDEX ix_kien_order ON chi_tiet_kien_hang(ma_don);
CREATE INDEX ix_log_order_time ON nhat_ky_trang_thai(ma_don, thoi_gian_ghi_nhan, ma_nhat_ky);
CREATE INDEX ix_payment_order_time ON thanh_toan(ma_don, tao_luc DESC, ma_giao_dich);
CREATE INDEX ix_payment_paid ON thanh_toan(thoi_gian_thanh_toan) WHERE trang_thai = 'THANH_CONG';
CREATE INDEX ix_assignment_order ON phan_cong_don_hang(ma_don, bat_dau_luc);
CREATE INDEX ix_assignment_driver ON phan_cong_don_hang(ma_tx, bat_dau_luc);

CREATE TABLE demo_seed_manifest (
    seed_key VARCHAR(30) PRIMARY KEY,
    seeded_at TIMESTAMPTZ NOT NULL
);
