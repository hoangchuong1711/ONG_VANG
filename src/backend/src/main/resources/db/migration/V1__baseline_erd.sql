-- PostgreSQL baseline transcribed from docs/api/schema-v0.mysql.sql; database creation is external.
CREATE TABLE tai_khoan (
    ma_tk                VARCHAR(36)  PRIMARY KEY,
    username             VARCHAR(50)  NOT NULL UNIQUE,
    email                VARCHAR(150),
    mat_khau_hash        VARCHAR(255) NOT NULL,
    vai_tro              VARCHAR(20)  NOT NULL,
    trang_thai           VARCHAR(20)  NOT NULL,
    ngay_tao             TIMESTAMP    NOT NULL,
    lan_dang_nhap_cuoi  TIMESTAMP,
    CONSTRAINT chk_tk_vai_tro CHECK (vai_tro IN
        ('KHACH_HANG', 'TAI_XE', 'TONG_DAI', 'CHU_DOI_XE'))
);

CREATE TABLE hang_thanh_vien (
    ma_hang             VARCHAR(20)   PRIMARY KEY,
    ten_hang            VARCHAR(50)   NOT NULL UNIQUE,
    phan_tram_giam_gia  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    nguong_chi_tieu     NUMERIC(15,2) NOT NULL DEFAULT 0,
    mo_ta               VARCHAR(255),
    CONSTRAINT chk_hang_giam_gia CHECK (phan_tram_giam_gia BETWEEN 0 AND 100),
    CONSTRAINT chk_hang_nguong CHECK (nguong_chi_tieu >= 0)
);

CREATE TABLE khach_hang (
    ma_kh              VARCHAR(36)  PRIMARY KEY,
    ma_tk              VARCHAR(36)  NOT NULL UNIQUE,
    ho_ten             VARCHAR(100) NOT NULL,
    so_dien_thoai      VARCHAR(15)  NOT NULL UNIQUE,
    dia_chi_mac_dinh   VARCHAR(255),
    CONSTRAINT fk_kh_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES tai_khoan (ma_tk)
);

CREATE TABLE khach_hang_vip (
    ma_kh          VARCHAR(36) PRIMARY KEY,
    ma_hang        VARCHAR(20) NOT NULL,
    ma_the_vip     VARCHAR(20) NOT NULL UNIQUE,
    diem_tich_luy  INTEGER     DEFAULT 0,
    ngay_het_han   DATE,
    ngay_dang_ky   DATE        NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT fk_vip_khach_hang FOREIGN KEY (ma_kh)
        REFERENCES khach_hang (ma_kh) ON DELETE CASCADE,
    CONSTRAINT fk_vip_hang FOREIGN KEY (ma_hang)
        REFERENCES hang_thanh_vien (ma_hang)
);

CREATE TABLE tai_xe (
    ma_tx              VARCHAR(36)  PRIMARY KEY,
    ma_tk              VARCHAR(36)  NOT NULL UNIQUE,
    ho_ten             VARCHAR(100) NOT NULL,
    so_dien_thoai      VARCHAR(15)  NOT NULL UNIQUE,
    cccd               VARCHAR(12)  NOT NULL UNIQUE,
    so_giay_phep       VARCHAR(50),
    trang_thai         VARCHAR(20)  NOT NULL,
    vi_tri_hien_tai    VARCHAR(255),
    ngay_het_han_gplx  DATE,
    CONSTRAINT fk_tx_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES tai_khoan (ma_tk),
    CONSTRAINT chk_tx_trang_thai CHECK (trang_thai IN ('ONLINE', 'OFFLINE', 'NGHI'))
);

CREATE TABLE phuong_tien (
    ma_phuong_tien       VARCHAR(36) PRIMARY KEY,
    ma_tx                VARCHAR(36) NOT NULL UNIQUE,
    bien_so_xe           VARCHAR(15) NOT NULL UNIQUE,
    loai_xe              VARCHAR(50) NOT NULL,
    mau_xe               VARCHAR(20),
    so_khung             VARCHAR(50),
    tinh_trang_hoat_dong BOOLEAN     DEFAULT TRUE,
    CONSTRAINT fk_pt_tai_xe FOREIGN KEY (ma_tx)
        REFERENCES tai_xe (ma_tx) ON DELETE CASCADE
);

CREATE TABLE dieu_phoi_vien (
    ma_nv    VARCHAR(36)  PRIMARY KEY,
    ma_tk    VARCHAR(36)  NOT NULL UNIQUE,
    ho_ten   VARCHAR(100) NOT NULL,
    ca_truc  VARCHAR(50),
    CONSTRAINT fk_dpv_tai_khoan FOREIGN KEY (ma_tk)
        REFERENCES tai_khoan (ma_tk)
);

CREATE TABLE cau_hinh_cuoc (
    ma_bieu_phi     VARCHAR(36)   PRIMARY KEY,
    ten_bieu_phi    VARCHAR(100)  NOT NULL,
    cuoc_co_ban     NUMERIC(15,2) NOT NULL,
    don_gia_km      NUMERIC(15,2) NOT NULL,
    km_toi_thieu    NUMERIC(10,2) DEFAULT 0,
    km_toi_da       NUMERIC(10,2),
    ngay_bat_dau    DATE          NOT NULL,
    ngay_ket_thuc   DATE,
    dang_kich_hoat BOOLEAN       DEFAULT TRUE
);

CREATE TABLE cau_hinh_phu_thu (
    ma_phu_thu      VARCHAR(36)   PRIMARY KEY,
    ten_phu_thu     VARCHAR(150)  NOT NULL,
    so_tien_phu_thu NUMERIC(12,2) NOT NULL,
    khu_vuc_ap_dung VARCHAR(255),
    dang_kich_hoat  BOOLEAN       DEFAULT FALSE
);

CREATE TABLE don_hang (
    ma_don             VARCHAR(36)   PRIMARY KEY,
    ma_kh              VARCHAR(36)   NOT NULL,
    ma_tx              VARCHAR(36),
    ma_nv              VARCHAR(36),
    ma_bieu_phi        VARCHAR(36)   NOT NULL,
    tien_giam_gia      NUMERIC(15,2) DEFAULT 0,
    thoi_gian_tao      TIMESTAMP     NOT NULL,
    trang_thai         VARCHAR(20)   NOT NULL,
    diem_lay_hang      VARCHAR(255)  NOT NULL,
    diem_giao_hang     VARCHAR(255)  NOT NULL,
    sdt_nguoi_nhan     VARCHAR(15)   NOT NULL,
    quang_duong_km     NUMERIC(10,2) NOT NULL,
    ghi_chu_giao_hang  VARCHAR(500),
    thoi_gian_huy      TIMESTAMP,
    ly_do_huy          VARCHAR(500),
    CONSTRAINT fk_dh_khach_hang FOREIGN KEY (ma_kh)
        REFERENCES khach_hang (ma_kh),
    CONSTRAINT fk_dh_tai_xe FOREIGN KEY (ma_tx)
        REFERENCES tai_xe (ma_tx) ON DELETE SET NULL,
    CONSTRAINT fk_dh_dieu_phoi FOREIGN KEY (ma_nv)
        REFERENCES dieu_phoi_vien (ma_nv) ON DELETE SET NULL,
    CONSTRAINT fk_dh_bieu_phi FOREIGN KEY (ma_bieu_phi)
        REFERENCES cau_hinh_cuoc (ma_bieu_phi),
    CONSTRAINT chk_dh_trang_thai CHECK (trang_thai IN
        ('CHO_GAN', 'DA_GAN', 'DA_LAY_HANG', 'DANG_GIAO', 'HOAN_TAT', 'DA_HUY'))
);

CREATE TABLE phu_thu_don_hang (
    ma_don           VARCHAR(36)   NOT NULL,
    ma_phu_thu      VARCHAR(36)   NOT NULL,
    so_tien_tinh    NUMERIC(12,2) NOT NULL,
    ly_do           VARCHAR(255),
    -- ERD says ENUM DEFAULT 0 but does not list its members.
    trang_thai      VARCHAR(20)   NOT NULL DEFAULT '0',
    thoi_gian_ap_dung TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_phu_thu_don_hang PRIMARY KEY (ma_don, ma_phu_thu),
    CONSTRAINT chk_ptdh_so_tien CHECK (so_tien_tinh >= 0),
    CONSTRAINT fk_ptdh_don_hang FOREIGN KEY (ma_don)
        REFERENCES don_hang (ma_don) ON DELETE CASCADE,
    CONSTRAINT fk_ptdh_phu_thu FOREIGN KEY (ma_phu_thu)
        REFERENCES cau_hinh_phu_thu (ma_phu_thu)
);

CREATE TABLE chi_tiet_kien_hang (
    ma_kien_hang      VARCHAR(36)   PRIMARY KEY,
    ma_don            VARCHAR(36)   NOT NULL,
    loai_hang_hoa     VARCHAR(100)  NOT NULL,
    hinh_anh_xac_nhan VARCHAR(500),
    khoi_luong_kg     NUMERIC(10,2) NOT NULL,
    ghi_chu_bao_quan  VARCHAR(500),
    CONSTRAINT fk_ctkh_don_hang FOREIGN KEY (ma_don)
        REFERENCES don_hang (ma_don) ON DELETE CASCADE
);

CREATE TABLE nhat_ky_trang_thai (
    ma_nhat_ky         VARCHAR(36)  PRIMARY KEY,
    ma_don             VARCHAR(36)  NOT NULL,
    thoi_gian_ghi_nhan TIMESTAMP    NOT NULL,
    trang_thai         VARCHAR(20)  NOT NULL,
    nguoi_thuc_hien    VARCHAR(100),
    vi_do              NUMERIC(10,7),
    kinh_do            NUMERIC(10,7),
    ghi_chu_su_co      VARCHAR(500),
    CONSTRAINT fk_nktt_don_hang FOREIGN KEY (ma_don)
        REFERENCES don_hang (ma_don) ON DELETE CASCADE
);

CREATE TABLE thanh_toan (
    ma_giao_dich         VARCHAR(36)   PRIMARY KEY,
    ma_don               VARCHAR(36)   NOT NULL UNIQUE,
    so_tien              NUMERIC(12,2) NOT NULL,
    ma_tham_chieu        VARCHAR(100)  UNIQUE,
    ma_giao_dich_doi_tac VARCHAR(100),
    phuong_thuc          VARCHAR(20)   NOT NULL,
    nha_cung_cap         VARCHAR(30),
    trang_thai           VARCHAR(20)   NOT NULL,
    thoi_gian_thanh_toan TIMESTAMP,
    CONSTRAINT fk_tt_don_hang FOREIGN KEY (ma_don)
        REFERENCES don_hang (ma_don),
    CONSTRAINT chk_tt_phuong_thuc CHECK (phuong_thuc IN
        ('TIEN_MAT', 'VNPAY_QR', 'MOMO')),
    CONSTRAINT chk_tt_trang_thai CHECK (trang_thai IN
        ('CHO_XU_LY', 'THANH_CONG', 'THAT_BAI', 'HOAN_TIEN'))
);

CREATE TABLE danh_gia_chuyen_di (
    ma_danh_gia        VARCHAR(36) PRIMARY KEY,
    ma_don             VARCHAR(36) NOT NULL UNIQUE,
    so_sao             INTEGER     NOT NULL,
    nhan_xet           TEXT,
    thoi_gian_danh_gia TIMESTAMP   NOT NULL,
    CONSTRAINT chk_dg_so_sao CHECK (so_sao BETWEEN 1 AND 5),
    CONSTRAINT fk_dg_don_hang FOREIGN KEY (ma_don)
        REFERENCES don_hang (ma_don)
);
