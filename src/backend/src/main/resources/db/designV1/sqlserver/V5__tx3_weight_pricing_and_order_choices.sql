-- TX3: additive migration. Existing V1-V4 databases keep their historical rows.
ALTER TABLE dbo.cau_hinh_cuoc ADD
    phien_ban INT NOT NULL CONSTRAINT df_cau_hinh_cuoc_phien_ban DEFAULT 1,
    kg_bao_gom DECIMAL(10,2) NOT NULL CONSTRAINT df_cau_hinh_cuoc_kg_bao_gom DEFAULT 1.00,
    don_gia_kg DECIMAL(15,2) NOT NULL CONSTRAINT df_cau_hinh_cuoc_don_gia_kg DEFAULT 3000.00,
    kg_toi_da DECIMAL(10,2) NOT NULL CONSTRAINT df_cau_hinh_cuoc_kg_toi_da DEFAULT 30.00;
GO
ALTER TABLE dbo.cau_hinh_cuoc ADD CONSTRAINT ck_tx3_fare_weight
    CHECK (phien_ban >= 1 AND kg_bao_gom >= 0 AND don_gia_kg >= 0 AND kg_toi_da >= kg_bao_gom);

ALTER TABLE dbo.don_hang ADD
    ten_nguoi_nhan NVARCHAR(100) NULL,
    ben_thanh_toan NVARCHAR(20) NOT NULL CONSTRAINT df_don_hang_ben_thanh_toan DEFAULT N'NGUOI_DAT',
    phuong_thuc_thanh_toan NVARCHAR(20) NOT NULL CONSTRAINT df_don_hang_phuong_thuc_thanh_toan DEFAULT N'TIEN_MAT';
GO
ALTER TABLE dbo.don_hang ADD CONSTRAINT ck_tx3_order_payment_choices
    CHECK (ben_thanh_toan IN (N'NGUOI_DAT', N'NGUOI_NHAN')
       AND phuong_thuc_thanh_toan IN (N'TIEN_MAT', N'VNPAY_QR'));

ALTER TABLE dbo.cuoc_don_hang ADD
    cuoc_km DECIMAL(15,2) NOT NULL CONSTRAINT df_cuoc_don_hang_cuoc_km DEFAULT 0,
    cuoc_khoi_luong DECIMAL(15,2) NOT NULL CONSTRAINT df_cuoc_don_hang_cuoc_khoi_luong DEFAULT 0,
    tong_khoi_luong_kg DECIMAL(10,2) NOT NULL CONSTRAINT df_cuoc_don_hang_tong_kg DEFAULT 0,
    phien_ban_bieu_phi INT NOT NULL CONSTRAINT df_cuoc_don_hang_phien_ban DEFAULT 1;
GO
-- Before TX3, cuoc_goc contained only the distance fare.
UPDATE dbo.cuoc_don_hang SET cuoc_km = cuoc_goc;
ALTER TABLE dbo.cuoc_don_hang ADD CONSTRAINT ck_tx3_fare_snapshot
    CHECK (cuoc_km >= 0 AND cuoc_khoi_luong >= 0 AND tong_khoi_luong_kg >= 0
       AND phien_ban_bieu_phi >= 1 AND cuoc_goc = cuoc_km + cuoc_khoi_luong);
GO

-- Keep published versions immutable when the new weight columns are edited.
CREATE OR ALTER TRIGGER dbo.trg_fare_policy_immutable
ON dbo.cau_hinh_cuoc AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_bieu_phi = d.ma_bieu_phi
        WHERE d.trang_thai = N'CONG_BO' AND (
            i.ma_bieu_phi IS NULL OR d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL
            OR i.hieu_luc_den < SYSUTCDATETIME()
            OR EXISTS (SELECT d.ten_bieu_phi, d.cuoc_co_ban, d.don_gia_km,
                              d.km_toi_thieu, d.km_toi_da, d.hieu_luc_tu, d.trang_thai,
                              d.phien_ban, d.kg_bao_gom, d.don_gia_kg, d.kg_toi_da
                       EXCEPT SELECT i.ten_bieu_phi, i.cuoc_co_ban, i.don_gia_km,
                                     i.km_toi_thieu, i.km_toi_da, i.hieu_luc_tu, i.trang_thai,
                                     i.phien_ban, i.kg_bao_gom, i.don_gia_kg, i.kg_toi_da)
        )
    ) THROW 51022, 'Published fare policy is immutable', 1;
END;
GO
