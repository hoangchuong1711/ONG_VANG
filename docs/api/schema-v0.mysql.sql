DROP DATABASE IF EXISTS HeThongGiaoHangMINI;
CREATE DATABASE HeThongGiaoHangMINI
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE HeThongGiaoHangMINI;

CREATE TABLE khach_hang (
    ma_kh               VARCHAR(36)  NOT NULL,
    ho_ten              VARCHAR(100) NOT NULL,
    so_dien_thoai       VARCHAR(15)  NOT NULL,
    email               VARCHAR(150) NULL,
    dia_chi_mac_dinh    VARCHAR(255) NULL,
    ngay_tao_tai_khoan  DATETIME     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ma_kh),
    UNIQUE KEY uq_kh_sdt (so_dien_thoai)
) ENGINE=InnoDB;

CREATE TABLE hang_thanh_vien (
    ma_hang             VARCHAR(20)  NOT NULL,
    ten_hang            VARCHAR(50)  NOT NULL,
    phan_tram_giam_gia  DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    mo_ta_quyen_loi     VARCHAR(255) NULL,
    PRIMARY KEY (ma_hang)
) ENGINE=InnoDB;

CREATE TABLE khach_hang_vip (
    ma_kh         VARCHAR(36) NOT NULL,
    ma_the_vip    VARCHAR(20) NOT NULL,
    ma_hang       VARCHAR(20) NOT NULL,
    diem_tich_luy INT         DEFAULT 0,
    ngay_het_han  DATE        NULL,
    PRIMARY KEY (ma_kh),
    UNIQUE KEY uq_vip_ma_the (ma_the_vip),
    CONSTRAINT fk_vip_khach_hang
        FOREIGN KEY (ma_kh) REFERENCES khach_hang(ma_kh)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vip_hang
        FOREIGN KEY (ma_hang) REFERENCES hang_thanh_vien(ma_hang)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tai_xe (
    ma_tx                VARCHAR(36)  NOT NULL,
    ho_ten               VARCHAR(100) NOT NULL,
    so_dien_thoai        VARCHAR(15)  NOT NULL,
    cccd                 VARCHAR(12)  NOT NULL,
    trang_thai_hoat_dong ENUM('ONLINE','OFFLINE','NGHI') NOT NULL,
    dang_ban_chuyen      BOOLEAN      DEFAULT 0,
    vi_tri_hien_tai      VARCHAR(255) NULL,
    ti_le_nhan_don       DECIMAL(5,2) NULL,
    PRIMARY KEY (ma_tx),
    UNIQUE KEY uq_tx_sdt  (so_dien_thoai),
    UNIQUE KEY uq_tx_cccd (cccd)
) ENGINE=InnoDB;

CREATE TABLE phuong_tien (
    ma_phuong_tien       VARCHAR(36) NOT NULL,
    ma_tx                VARCHAR(36) NOT NULL,
    bien_so_xe           VARCHAR(15) NOT NULL,
    loai_xe              VARCHAR(50) NOT NULL,
    mau_xe               VARCHAR(20) NULL,
    so_khung             VARCHAR(50) NULL,
    tinh_trang_hoat_dong VARCHAR(50) NULL,
    PRIMARY KEY (ma_phuong_tien),
    UNIQUE KEY uq_pt_ma_tx   (ma_tx),
    UNIQUE KEY uq_pt_bien_so (bien_so_xe),
    CONSTRAINT fk_pt_tai_xe
        FOREIGN KEY (ma_tx) REFERENCES tai_xe(ma_tx)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE thong_ke_thu_nhap (
    ma_thong_ke            VARCHAR(36) NOT NULL,
    ma_tx                  VARCHAR(36) NOT NULL,
    ngay_thong_ke          DATE        NOT NULL,
    tong_so_don_hoan_thanh INT         DEFAULT 0,
    tong_cuoc_nhan         DECIMAL(15,2) DEFAULT 0,
    phi_doi_xe_ong_vang    DECIMAL(15,2) DEFAULT 0,
    PRIMARY KEY (ma_thong_ke),
    CONSTRAINT fk_tktn_tai_xe
        FOREIGN KEY (ma_tx) REFERENCES tai_xe(ma_tx)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dieu_phoi_vien (
    ma_nv    VARCHAR(36)  NOT NULL,
    ho_ten   VARCHAR(100) NOT NULL,
    username VARCHAR(50)  NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    vai_tro  ENUM('TONG_DAI','CHU_DOI_XE') NOT NULL,
    ca_truc  VARCHAR(50)  NULL,
    PRIMARY KEY (ma_nv),
    UNIQUE KEY uq_nv_username (username)
) ENGINE=InnoDB;

CREATE TABLE cau_hinh_phu_thu (
    ma_phu_thu      VARCHAR(36)  NOT NULL,
    ten_phu_thu     VARCHAR(150) NOT NULL,
    so_tien_phu_thu DECIMAL(12,2) NOT NULL,
    khu_vuc_ap_dung VARCHAR(255) NULL,
    dang_kich_hoat  TINYINT(1)   DEFAULT 0,
    PRIMARY KEY (ma_phu_thu)
) ENGINE=InnoDB;

CREATE TABLE don_hang (
    ma_don            VARCHAR(36)  NOT NULL,
    thoi_gian_tao     DATETIME     NOT NULL,
    diem_lay_hang     VARCHAR(255) NOT NULL,
    diem_giao_hang    VARCHAR(255) NOT NULL,
    sdt_nguoi_nhan    VARCHAR(15)  NOT NULL,
    quang_duong_km    DECIMAL(10,2) NULL,
    cuoc_goc          DECIMAL(15,2) NOT NULL,
    tien_phu_thu      DECIMAL(15,2) DEFAULT 0,
    tien_giam_gia     DECIMAL(15,2) DEFAULT 0,
    ghi_chu_giao_hang VARCHAR(500) NULL,
    trang_thai        VARCHAR(20)  NOT NULL,
    ma_kh             VARCHAR(36)  NOT NULL,
    ma_tx             VARCHAR(36)  NULL,
    ma_nv             VARCHAR(36)  NULL,
    PRIMARY KEY (ma_don),
    CONSTRAINT fk_dh_khach_hang
        FOREIGN KEY (ma_kh) REFERENCES khach_hang(ma_kh)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dh_tai_xe
        FOREIGN KEY (ma_tx) REFERENCES tai_xe(ma_tx)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dh_dieu_phoi
        FOREIGN KEY (ma_nv) REFERENCES dieu_phoi_vien(ma_nv)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE phu_thu_don_hang (
    id           VARCHAR(36)  NOT NULL,
    ma_don       VARCHAR(36)  NOT NULL,
    ma_phu_thu   VARCHAR(36)  NOT NULL,
    so_tien_tinh DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ptdh_don_hang
        FOREIGN KEY (ma_don) REFERENCES don_hang(ma_don)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ptdh_phu_thu
        FOREIGN KEY (ma_phu_thu) REFERENCES cau_hinh_phu_thu(ma_phu_thu)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_kien_hang (
    ma_kien_hang      VARCHAR(36)  NOT NULL,
    ma_don            VARCHAR(36)  NOT NULL,
    loai_hang_hoa     VARCHAR(100) NOT NULL,
    ghi_chu_bao_quan  VARCHAR(500) NULL,
    khoi_luong_kg     DECIMAL(10,2) NULL,
    hinh_anh_xac_nhan VARCHAR(500) NULL,
    PRIMARY KEY (ma_kien_hang),
    CONSTRAINT fk_ctkh_don_hang
        FOREIGN KEY (ma_don) REFERENCES don_hang(ma_don)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE nhat_ky_trang_thai (
    ma_nhat_ky         VARCHAR(36) NOT NULL,
    ma_don             VARCHAR(36) NOT NULL,
    ten_trang_thai     VARCHAR(50) NOT NULL,
    thoi_gian_ghi_nhan DATETIME    NOT NULL,
    nguoi_thuc_hien    VARCHAR(100) NULL,
    vi_do              DECIMAL(10,7) NULL,
    kinh_do            DECIMAL(10,7) NULL,
    ghi_chu_su_co      VARCHAR(500) NULL,
    PRIMARY KEY (ma_nhat_ky),
    CONSTRAINT fk_nktt_don_hang
        FOREIGN KEY (ma_don) REFERENCES don_hang(ma_don)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE thanh_toan (
    ma_giao_dich         VARCHAR(36)  NOT NULL,
    ma_don               VARCHAR(36)  NOT NULL,
    so_tien              DECIMAL(12,2) NOT NULL,
    phuong_thuc          ENUM('TIEN_MAT','VNPAY_QR','MOMO') NOT NULL,
    trang_thai           ENUM('CHO_XU_LY','THANH_CONG','THAT_BAI','HOAN_TIEN')
                         NOT NULL DEFAULT 'CHO_XU_LY',
    ma_giao_dich_doi_tac VARCHAR(100) NULL,
    thoi_gian_thanh_toan DATETIME     DEFAULT NOW(),
    PRIMARY KEY (ma_giao_dich),
    UNIQUE KEY uq_tt_ma_don (ma_don),
    CONSTRAINT fk_tt_don_hang
        FOREIGN KEY (ma_don) REFERENCES don_hang(ma_don)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE danh_gia_chuyen_di (
    ma_danh_gia        VARCHAR(36) NOT NULL,
    ma_don             VARCHAR(36) NOT NULL,
    so_sao             INT         NOT NULL,
    nhan_xet           TEXT        NULL,
    thoi_gian_danh_gia DATETIME    NOT NULL,
    PRIMARY KEY (ma_danh_gia),
    UNIQUE KEY uq_dg_ma_don (ma_don),
    CONSTRAINT chk_dg_so_sao CHECK (so_sao BETWEEN 1 AND 5),
    CONSTRAINT fk_dg_don_hang
        FOREIGN KEY (ma_don) REFERENCES don_hang(ma_don)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

SHOW TABLES;