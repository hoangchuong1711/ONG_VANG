CREATE TABLE dbo.phan_chia_cuoc (
  ma_don NVARCHAR(36) NOT NULL PRIMARY KEY REFERENCES dbo.don_hang(ma_don),
  ma_phan_cong NVARCHAR(36) NOT NULL REFERENCES dbo.phan_cong_don_hang(ma_phan_cong),
  ma_giao_dich_cuoc NVARCHAR(36) NULL REFERENCES dbo.thanh_toan(ma_giao_dich),
  phien_ban_chinh_sach INT NOT NULL CONSTRAINT df_share_policy DEFAULT 1,
  ty_le_cong_ty DECIMAL(5,4) NOT NULL,
  tong_cuoc DECIMAL(15,2) NOT NULL,
  tien_cong_ty DECIMAL(15,2) NOT NULL,
  tien_tai_xe DECIMAL(15,2) NOT NULL,
  ghi_nhan_luc DATETIME2(3) NOT NULL,
  CONSTRAINT ck_share_amount CHECK (tong_cuoc>=0 AND tien_cong_ty>=0 AND tien_tai_xe>=0 AND tien_cong_ty+tien_tai_xe=tong_cuoc)
);

CREATE TABLE dbo.dot_nop_cod (
  ma_dot NVARCHAR(36) NOT NULL PRIMARY KEY,
  ma_tx NVARCHAR(36) NOT NULL REFERENCES dbo.tai_xe(ma_tx),
  ma_tk_dieu_phoi NVARCHAR(36) NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
  khoa_idempotency NVARCHAR(100) NOT NULL,
  tao_luc DATETIME2(3) NOT NULL,
  tong_tien DECIMAL(15,2) NOT NULL,
  trang_thai NVARCHAR(30) NOT NULL,
  xac_nhan_luc DATETIME2(3) NULL,
  CONSTRAINT ck_cod_batch_amount CHECK (tong_tien>0),
  CONSTRAINT ck_cod_batch_status CHECK (trang_thai IN (N'CHO_XU_LY',N'CHUA_RO_KET_QUA',N'THANH_CONG',N'THAT_BAI',N'CAN_DOI_SOAT')),
  CONSTRAINT uq_cod_idempotency UNIQUE (ma_tk_dieu_phoi,khoa_idempotency)
);
CREATE INDEX ix_cod_driver ON dbo.dot_nop_cod(ma_tx,tao_luc DESC);

CREATE TABLE dbo.khoan_cod_trong_dot (
  ma_dot NVARCHAR(36) NOT NULL REFERENCES dbo.dot_nop_cod(ma_dot),
  ma_giao_dich_cuoc NVARCHAR(36) NOT NULL REFERENCES dbo.thanh_toan(ma_giao_dich),
  so_tien DECIMAL(15,2) NOT NULL,
  CONSTRAINT pk_cod_item PRIMARY KEY (ma_dot,ma_giao_dich_cuoc),
  CONSTRAINT uq_cod_payment UNIQUE (ma_giao_dich_cuoc),
  CONSTRAINT ck_cod_item_amount CHECK (so_tien>0)
);

CREATE TABLE dbo.lan_nop_cod (
  ma_lan_nop NVARCHAR(36) NOT NULL PRIMARY KEY,
  ma_dot NVARCHAR(36) NOT NULL REFERENCES dbo.dot_nop_cod(ma_dot),
  ma_tham_chieu NVARCHAR(100) NOT NULL UNIQUE,
  trang_thai NVARCHAR(30) NOT NULL,
  payment_url NVARCHAR(2048) NOT NULL,
  tao_luc DATETIME2(3) NOT NULL,
  thu_luc DATETIME2(3) NULL,
  so_tien_thuc_nhan DECIMAL(15,2) NULL,
  ma_giao_dich_doi_tac NVARCHAR(100) NULL,
  CONSTRAINT ck_cod_attempt_status CHECK (trang_thai IN (N'CHO_XU_LY',N'CHUA_RO_KET_QUA',N'THANH_CONG',N'THAT_BAI',N'CAN_DOI_SOAT'))
);
CREATE UNIQUE INDEX uq_cod_active_attempt ON dbo.lan_nop_cod(ma_dot) WHERE trang_thai IN (N'CHO_XU_LY',N'CHUA_RO_KET_QUA',N'THANH_CONG');

CREATE TABLE dbo.su_kien_nop_cod (
  ma_su_kien NVARCHAR(36) NOT NULL PRIMARY KEY,
  ma_lan_nop NVARCHAR(36) NULL REFERENCES dbo.lan_nop_cod(ma_lan_nop),
  nguon NVARCHAR(20) NOT NULL,
  khoa_su_kien NVARCHAR(64) NOT NULL,
  chu_ky_hop_le BIT NOT NULL,
  ket_qua NVARCHAR(30) NOT NULL,
  nhan_luc DATETIME2(3) NOT NULL,
  noi_dung_json NVARCHAR(MAX) NOT NULL,
  CONSTRAINT uq_cod_event UNIQUE (nguon,khoa_su_kien),
  CONSTRAINT ck_cod_event_json CHECK (ISJSON(noi_dung_json)=1)
);

-- Existing completed demo orders already have an assignment and possibly a collected fare.
-- Snapshot only rows whose payment can be identified; do not invent a collector.
INSERT INTO dbo.phan_chia_cuoc
  (ma_don,ma_phan_cong,ma_giao_dich_cuoc,phien_ban_chinh_sach,ty_le_cong_ty,tong_cuoc,tien_cong_ty,tien_tai_xe,ghi_nhan_luc)
SELECT d.ma_don,a.ma_phan_cong,x.ma_giao_dich,1,0.20,v.tong_cuoc,
       ROUND(v.tong_cuoc*0.20,0),v.tong_cuoc-ROUND(v.tong_cuoc*0.20,0),
       CASE WHEN p.thu_luc>d.thoi_gian_hoan_tat THEN p.thu_luc ELSE d.thoi_gian_hoan_tat END
FROM dbo.don_hang d
JOIN dbo.cuoc_don_hang c ON c.ma_don=d.ma_don
JOIN dbo.phan_cong_don_hang a ON a.ma_don=d.ma_don AND a.ket_qua_ket_thuc=N'HOAN_TAT'
LEFT JOIN dbo.xac_nhan_thanh_toan_don_hang x ON x.ma_don=d.ma_don
LEFT JOIN dbo.thanh_toan p ON p.ma_giao_dich=x.ma_giao_dich
CROSS APPLY (SELECT c.cuoc_goc-c.tien_giam_gia+
    COALESCE((SELECT SUM(policy.so_tien) FROM dbo.phu_thu_don_hang s
      JOIN dbo.cau_hinh_phu_thu policy ON policy.ma_phu_thu=s.ma_phu_thu WHERE s.ma_don=d.ma_don),0) AS tong_cuoc) v
WHERE d.trang_thai=N'HOAN_TAT' AND d.thoi_gian_hoan_tat IS NOT NULL
  AND (v.tong_cuoc=0 OR p.thu_luc IS NOT NULL);
