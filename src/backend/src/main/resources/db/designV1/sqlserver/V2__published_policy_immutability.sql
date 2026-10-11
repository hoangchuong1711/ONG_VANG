-- Published policy content is historical data. Only a first, prospective closing boundary may change.
CREATE OR ALTER TRIGGER dbo.trg_membership_policy_immutable
ON dbo.chinh_sach_thanh_vien AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_chinh_sach = d.ma_chinh_sach
        WHERE d.trang_thai = N'CONG_BO' AND (
            i.ma_chinh_sach IS NULL OR d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL
            OR i.hieu_luc_den < SYSUTCDATETIME()
            OR EXISTS (SELECT d.ma_hang, d.ty_le_giam, d.hieu_luc_tu, d.trang_thai
                       EXCEPT SELECT i.ma_hang, i.ty_le_giam, i.hieu_luc_tu, i.trang_thai)
        )
    ) THROW 51021, 'Published membership policy is immutable', 1;
END;
GO

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
                              d.km_toi_thieu, d.km_toi_da, d.hieu_luc_tu, d.trang_thai
                       EXCEPT SELECT i.ten_bieu_phi, i.cuoc_co_ban, i.don_gia_km,
                                     i.km_toi_thieu, i.km_toi_da, i.hieu_luc_tu, i.trang_thai)
        )
    ) THROW 51022, 'Published fare policy is immutable', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_surcharge_policy_immutable
ON dbo.cau_hinh_phu_thu AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_phu_thu = d.ma_phu_thu
        WHERE d.trang_thai = N'CONG_BO' AND (
            i.ma_phu_thu IS NULL OR d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL
            OR i.hieu_luc_den < SYSUTCDATETIME()
            OR EXISTS (SELECT d.ma_loai_phu_thu, d.ten_phu_thu, d.so_tien,
                              d.hieu_luc_tu, d.trang_thai
                       EXCEPT SELECT i.ma_loai_phu_thu, i.ten_phu_thu, i.so_tien,
                                     i.hieu_luc_tu, i.trang_thai)
        )
    ) THROW 51023, 'Published surcharge policy is immutable', 1;
END;
GO
