-- SQL Server translation of the preserved PostgreSQL V1; database creation is external.
-- NVARCHAR preserves Unicode; the database must use the documented case-sensitive collation.
CREATE TABLE [${flyway:defaultSchema}].tai_khoan (
    ma_tk                NVARCHAR(36)  PRIMARY KEY,
    username             NVARCHAR(50)  NOT NULL UNIQUE,
    email                NVARCHAR(150),
    mat_khau_hash        NVARCHAR(255) NOT NULL,
    vai_tro              NVARCHAR(20)  NOT NULL,
    trang_thai           NVARCHAR(20)  NOT NULL,
    ngay_tao             DATETIME2(6)    NOT NULL,
    lan_dang_nhap_cuoi  DATETIME2(6),
    CONSTRAINT chk_tk_vai_tro CHECK (vai_tro IN
        (N'KHACH_HANG', N'TAI_XE', N'TONG_DAI', N'CHU_DOI_XE'))
);

CREATE TABLE [${flyway:defaultSchema}].hang_thanh_vien (
    ma_hang             NVARCHAR(20)   PRIMARY KEY,
    ten_hang            NVARCHAR(50)   NOT NULL UNIQUE,
    phan_tram_giam_gia  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    nguong_chi_tieu     NUMERIC(15,2) NOT NULL DEFAULT 0,
    mo_ta               NVARCHAR(255),
    CONSTRAINT chk_hang_giam_gia CHECK (phan_tram_giam_gia BETWEEN 0 AND 100),
    CONSTRAINT chk_hang_nguong CHECK (nguong_chi_tieu >= 0)
);

CREATE TABLE [${flyway:defaultSchema}].khach_hang (
    ma_kh              NVARCHAR(36)  PRIMARY KEY,
    ma_tk              NVARCHAR(36)  NOT NULL UNIQUE,
    ho_ten             NVARCHAR(100) NOT NULL,
    so_dien_thoai      NVARCHAR(15)  NOT NULL UNIQUE,
    dia_chi_mac_dinh   NVARCHAR(255),
    CONSTRAINT fk_kh_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES [${flyway:defaultSchema}].tai_khoan (ma_tk)
);

CREATE TABLE [${flyway:defaultSchema}].khach_hang_vip (
    ma_kh          NVARCHAR(36) PRIMARY KEY,
    ma_hang        NVARCHAR(20) NOT NULL,
    ma_the_vip     NVARCHAR(20) NOT NULL UNIQUE,
    diem_tich_luy  INTEGER     DEFAULT 0,
    ngay_het_han   DATE,
    ngay_dang_ky   DATE        NOT NULL DEFAULT CONVERT(date, SYSUTCDATETIME()),
    CONSTRAINT fk_vip_khach_hang FOREIGN KEY (ma_kh)
        REFERENCES [${flyway:defaultSchema}].khach_hang (ma_kh) ON DELETE CASCADE,
    CONSTRAINT fk_vip_hang FOREIGN KEY (ma_hang)
        REFERENCES [${flyway:defaultSchema}].hang_thanh_vien (ma_hang)
);

CREATE TABLE [${flyway:defaultSchema}].tai_xe (
    ma_tx              NVARCHAR(36)  PRIMARY KEY,
    ma_tk              NVARCHAR(36)  NOT NULL UNIQUE,
    ho_ten             NVARCHAR(100) NOT NULL,
    so_dien_thoai      NVARCHAR(15)  NOT NULL UNIQUE,
    cccd               NVARCHAR(12)  NOT NULL UNIQUE,
    so_giay_phep       NVARCHAR(50),
    trang_thai         NVARCHAR(20)  NOT NULL,
    vi_tri_hien_tai    NVARCHAR(255),
    ngay_het_han_gplx  DATE,
    CONSTRAINT fk_tx_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES [${flyway:defaultSchema}].tai_khoan (ma_tk),
    CONSTRAINT chk_tx_trang_thai CHECK (trang_thai IN (N'ONLINE', N'OFFLINE', N'NGHI'))
);

CREATE TABLE [${flyway:defaultSchema}].phuong_tien (
    ma_phuong_tien       NVARCHAR(36) PRIMARY KEY,
    ma_tx                NVARCHAR(36) NOT NULL UNIQUE,
    bien_so_xe           NVARCHAR(15) NOT NULL UNIQUE,
    loai_xe              NVARCHAR(50) NOT NULL,
    mau_xe               NVARCHAR(20),
    so_khung             NVARCHAR(50),
    tinh_trang_hoat_dong BIT     DEFAULT 1,
    CONSTRAINT fk_pt_tai_xe FOREIGN KEY (ma_tx)
        REFERENCES [${flyway:defaultSchema}].tai_xe (ma_tx) ON DELETE CASCADE
);

CREATE TABLE [${flyway:defaultSchema}].dieu_phoi_vien (
    ma_nv    NVARCHAR(36)  PRIMARY KEY,
    ma_tk    NVARCHAR(36)  NOT NULL UNIQUE,
    ho_ten   NVARCHAR(100) NOT NULL,
    ca_truc  NVARCHAR(50),
    CONSTRAINT fk_dpv_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES [${flyway:defaultSchema}].tai_khoan (ma_tk)
);

CREATE TABLE [${flyway:defaultSchema}].cau_hinh_cuoc (
    ma_bieu_phi     NVARCHAR(36)   PRIMARY KEY,
    ten_bieu_phi    NVARCHAR(100)  NOT NULL,
    cuoc_co_ban     NUMERIC(15,2) NOT NULL,
    don_gia_km      NUMERIC(15,2) NOT NULL,
    km_toi_thieu    NUMERIC(10,2) DEFAULT 0,
    km_toi_da       NUMERIC(10,2),
    ngay_bat_dau    DATE          NOT NULL,
    ngay_ket_thuc   DATE,
    dang_kich_hoat BIT       DEFAULT 1
);

CREATE TABLE [${flyway:defaultSchema}].cau_hinh_phu_thu (
    ma_phu_thu      NVARCHAR(36)   PRIMARY KEY,
    ten_phu_thu     NVARCHAR(150)  NOT NULL,
    so_tien_phu_thu NUMERIC(12,2) NOT NULL,
    khu_vuc_ap_dung NVARCHAR(255),
    dang_kich_hoat  BIT       DEFAULT 0
);

CREATE TABLE [${flyway:defaultSchema}].don_hang (
    ma_don             NVARCHAR(36)   PRIMARY KEY,
    ma_kh              NVARCHAR(36)   NOT NULL,
    ma_tx              NVARCHAR(36),
    ma_nv              NVARCHAR(36),
    ma_bieu_phi        NVARCHAR(36)   NOT NULL,
    tien_giam_gia      NUMERIC(15,2) CONSTRAINT df_dh_giam DEFAULT 0,
    thoi_gian_tao      DATETIME2(6)     NOT NULL,
    trang_thai         NVARCHAR(20)   NOT NULL,
    diem_lay_hang      NVARCHAR(255)  NOT NULL,
    diem_giao_hang     NVARCHAR(255)  NOT NULL,
    sdt_nguoi_nhan     NVARCHAR(15)   NOT NULL,
    quang_duong_km     NUMERIC(10,2) NOT NULL,
    ghi_chu_giao_hang  NVARCHAR(500),
    thoi_gian_huy      DATETIME2(6),
    ly_do_huy          NVARCHAR(500),
    CONSTRAINT fk_dh_khach_hang FOREIGN KEY (ma_kh)
        REFERENCES [${flyway:defaultSchema}].khach_hang (ma_kh),
    CONSTRAINT fk_dh_tai_xe FOREIGN KEY (ma_tx)
        REFERENCES [${flyway:defaultSchema}].tai_xe (ma_tx) ON DELETE SET NULL,
    CONSTRAINT fk_dh_dieu_phoi FOREIGN KEY (ma_nv)
        REFERENCES [${flyway:defaultSchema}].dieu_phoi_vien (ma_nv) ON DELETE SET NULL,
    CONSTRAINT fk_dh_bieu_phi FOREIGN KEY (ma_bieu_phi)
        REFERENCES [${flyway:defaultSchema}].cau_hinh_cuoc (ma_bieu_phi),
    CONSTRAINT chk_dh_trang_thai CHECK (trang_thai IN
        (N'CHO_GAN', N'DA_GAN', N'DA_LAY_HANG', N'DANG_GIAO', N'HOAN_TAT', N'DA_HUY'))
);

CREATE TABLE [${flyway:defaultSchema}].phu_thu_don_hang (
    ma_don           NVARCHAR(36)   NOT NULL,
    ma_phu_thu      NVARCHAR(36)   NOT NULL,
    so_tien_tinh    NUMERIC(12,2) NOT NULL,
    ly_do           NVARCHAR(255),
    -- ERD says ENUM DEFAULT 0 but does not list its members.
    trang_thai      NVARCHAR(20)   NOT NULL DEFAULT N'0',
    thoi_gian_ap_dung DATETIME2(6)   NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_phu_thu_don_hang PRIMARY KEY (ma_don, ma_phu_thu),
    CONSTRAINT chk_ptdh_so_tien CHECK (so_tien_tinh >= 0),
    CONSTRAINT fk_ptdh_don_hang FOREIGN KEY (ma_don)
        REFERENCES [${flyway:defaultSchema}].don_hang (ma_don) ON DELETE CASCADE,
    CONSTRAINT fk_ptdh_phu_thu FOREIGN KEY (ma_phu_thu)
        REFERENCES [${flyway:defaultSchema}].cau_hinh_phu_thu (ma_phu_thu)
);

CREATE TABLE [${flyway:defaultSchema}].chi_tiet_kien_hang (
    ma_kien_hang      NVARCHAR(36)   PRIMARY KEY,
    ma_don            NVARCHAR(36)   NOT NULL,
    loai_hang_hoa     NVARCHAR(100)  NOT NULL,
    hinh_anh_xac_nhan NVARCHAR(500),
    khoi_luong_kg     NUMERIC(10,2) NOT NULL,
    ghi_chu_bao_quan  NVARCHAR(500),
    CONSTRAINT fk_ctkh_don_hang FOREIGN KEY (ma_don)
        REFERENCES [${flyway:defaultSchema}].don_hang (ma_don) ON DELETE CASCADE
);

CREATE TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai (
    ma_nhat_ky         NVARCHAR(36)  PRIMARY KEY,
    ma_don             NVARCHAR(36)  NOT NULL,
    thoi_gian_ghi_nhan DATETIME2(6)    NOT NULL,
    trang_thai         NVARCHAR(20)  NOT NULL,
    nguoi_thuc_hien    NVARCHAR(100),
    vi_do              NUMERIC(10,7),
    kinh_do            NUMERIC(10,7),
    ghi_chu_su_co      NVARCHAR(500),
    CONSTRAINT fk_nktt_don_hang FOREIGN KEY (ma_don)
        REFERENCES [${flyway:defaultSchema}].don_hang (ma_don) ON DELETE CASCADE
);

CREATE TABLE [${flyway:defaultSchema}].thanh_toan (
    ma_giao_dich         NVARCHAR(36)   PRIMARY KEY,
    ma_don               NVARCHAR(36)   NOT NULL CONSTRAINT thanh_toan_ma_don_key UNIQUE,
    so_tien              NUMERIC(12,2) NOT NULL,
    ma_tham_chieu        NVARCHAR(100),
    ma_giao_dich_doi_tac NVARCHAR(100),
    phuong_thuc          NVARCHAR(20)   NOT NULL,
    nha_cung_cap         NVARCHAR(30),
    trang_thai           NVARCHAR(20)   NOT NULL,
    thoi_gian_thanh_toan DATETIME2(6),
    CONSTRAINT fk_tt_don_hang FOREIGN KEY (ma_don)
        REFERENCES [${flyway:defaultSchema}].don_hang (ma_don),
    CONSTRAINT chk_tt_phuong_thuc CHECK (phuong_thuc IN
        (N'TIEN_MAT', N'VNPAY_QR', N'MOMO')),
    CONSTRAINT chk_tt_trang_thai CHECK (trang_thai IN
        (N'CHO_XU_LY', N'THANH_CONG', N'THAT_BAI', N'HOAN_TIEN'))
);

CREATE TABLE [${flyway:defaultSchema}].danh_gia_chuyen_di (
    ma_danh_gia        NVARCHAR(36) PRIMARY KEY,
    ma_don             NVARCHAR(36) NOT NULL UNIQUE,
    so_sao             INTEGER     NOT NULL,
    nhan_xet           NVARCHAR(MAX),
    thoi_gian_danh_gia DATETIME2(6)   NOT NULL,
    CONSTRAINT chk_dg_so_sao CHECK (so_sao BETWEEN 1 AND 5),
    CONSTRAINT fk_dg_don_hang FOREIGN KEY (ma_don)
        REFERENCES [${flyway:defaultSchema}].don_hang (ma_don)
);

CREATE UNIQUE INDEX thanh_toan_ma_tham_chieu_key ON [${flyway:defaultSchema}].thanh_toan(ma_tham_chieu) WHERE ma_tham_chieu IS NOT NULL;
