SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo', N'mini_ong_vang_design_v2_test')
    THROW 52400, N'V13 is restricted to designV2 demo/test databases', 1;

IF (SELECT COUNT(*) FROM dbo.tai_khoan WHERE username IN
    (N'0900000001', N'0900000002', N'0900000003', N'demo_dispatcher', N'demo_admin',
     N'0800000001', N'0800000002', N'0800000003')) <> 8
    THROW 52402, N'V13 requires the eight demo accounts', 1;

DECLARE @effective DATETIME2(3) = DATEADD(DAY, -1, SYSUTCDATETIME());

BEGIN TRY
    BEGIN TRAN;

    -- The quote and order procedures require exactly one published active fare.
    IF NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_cuoc
                   WHERE trang_thai = 'CONG_BO' AND hieu_luc_tu <= SYSUTCDATETIME()
                     AND (hieu_luc_den IS NULL OR hieu_luc_den > SYSUTCDATETIME()))
        INSERT dbo.cau_hinh_cuoc
            (ma_bieu_phi, ten, cuoc_co_ban, don_gia_km, km_toi_thieu, km_toi_da,
             kg_bao_gom, kg_toi_da, don_gia_kg, hieu_luc_tu, trang_thai)
        VALUES
            ('60000000-0000-0000-0000-000000000001', N'Biểu phí demo',
             20000, 5000, 0, 30, 1, 30, 3000, @effective, 'CONG_BO');

    IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc
        WHERE trang_thai = 'CONG_BO' AND hieu_luc_tu <= SYSUTCDATETIME()
          AND (hieu_luc_den IS NULL OR hieu_luc_den > SYSUTCDATETIME())) <> 1
        THROW 52403, N'Demo database must have exactly one active fare', 1;

    -- A policy is needed whenever a customer has an active nonstandard tier.
    IF NOT EXISTS (SELECT 1 FROM dbo.chinh_sach_thanh_vien WHERE ma_hang = 'BAC' AND trang_thai = 'CONG_BO')
        INSERT dbo.chinh_sach_thanh_vien (ma_chinh_sach, ma_hang, ty_le_giam, hieu_luc_tu, trang_thai)
        VALUES ('61000000-0000-0000-0000-000000000001', 'BAC', 5, @effective, 'CONG_BO');
    IF NOT EXISTS (SELECT 1 FROM dbo.chinh_sach_thanh_vien WHERE ma_hang = 'VANG' AND trang_thai = 'CONG_BO')
        INSERT dbo.chinh_sach_thanh_vien (ma_chinh_sach, ma_hang, ty_le_giam, hieu_luc_tu, trang_thai)
        VALUES ('61000000-0000-0000-0000-000000000002', 'VANG', 10, @effective, 'CONG_BO');
    IF NOT EXISTS (SELECT 1 FROM dbo.chinh_sach_thanh_vien WHERE ma_hang = 'KIM_CUONG' AND trang_thai = 'CONG_BO')
        INSERT dbo.chinh_sach_thanh_vien (ma_chinh_sach, ma_hang, ty_le_giam, hieu_luc_tu, trang_thai)
        VALUES ('61000000-0000-0000-0000-000000000003', 'KIM_CUONG', 15, @effective, 'CONG_BO');

    UPDATE dbo.khach_hang
    SET ma_hang = 'VANG', thanh_vien_tu = @effective,
        thanh_vien_den = DATEADD(DAY, 30, SYSUTCDATETIME())
    WHERE ma_kh = '20000000-0000-0000-0000-000000000002' AND ma_hang = 'THUONG';
    UPDATE dbo.khach_hang
    SET ma_hang = 'VANG', thanh_vien_tu = DATEADD(DAY, -60, SYSUTCDATETIME()),
        thanh_vien_den = DATEADD(DAY, -30, SYSUTCDATETIME())
    WHERE ma_kh = '20000000-0000-0000-0000-000000000003' AND ma_hang = 'THUONG';

    IF NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu WHERE ma_loai = 'DICH_VU' AND trang_thai = 'CONG_BO')
        INSERT dbo.cau_hinh_phu_thu
            (ma_phu_thu, ma_loai, ten, bat_buoc, so_tien, hieu_luc_tu, trang_thai)
        VALUES ('62000000-0000-0000-0000-000000000001', 'DICH_VU', N'Phụ thu dịch vụ', 1, 5000, @effective, 'CONG_BO');
    IF NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu WHERE ma_loai = 'GIAO_NHANH' AND trang_thai = 'CONG_BO')
        INSERT dbo.cau_hinh_phu_thu
            (ma_phu_thu, ma_loai, ten, bat_buoc, so_tien, hieu_luc_tu, trang_thai)
        VALUES ('62000000-0000-0000-0000-000000000002', 'GIAO_NHANH', N'Giao nhanh', 0, 10000, @effective, 'CONG_BO');

    -- Keep the three account profiles usable for dispatch without creating orders.
    INSERT dbo.phuong_tien (ma_phuong_tien, ma_tx, bien_so, loai_xe, mau_xe)
    SELECT v.ma_phuong_tien, v.ma_tx, v.bien_so, N'Xe máy', v.mau_xe
    FROM (VALUES
        (CONVERT(UNIQUEIDENTIFIER, '40000000-0000-0000-0000-000000000001'), CONVERT(UNIQUEIDENTIFIER, '30000000-0000-0000-0000-000000000001'), N'59A00001', N'Vàng'),
        (CONVERT(UNIQUEIDENTIFIER, '40000000-0000-0000-0000-000000000002'), CONVERT(UNIQUEIDENTIFIER, '30000000-0000-0000-0000-000000000002'), N'59A00002', N'Đen'),
        (CONVERT(UNIQUEIDENTIFIER, '40000000-0000-0000-0000-000000000003'), CONVERT(UNIQUEIDENTIFIER, '30000000-0000-0000-0000-000000000003'), N'59A00003', N'Trắng')
    ) v(ma_phuong_tien, ma_tx, bien_so, mau_xe)
    WHERE EXISTS (SELECT 1 FROM dbo.tai_xe t WHERE t.ma_tx = v.ma_tx)
      AND NOT EXISTS (SELECT 1 FROM dbo.phuong_tien p WHERE p.ma_tx = v.ma_tx);

    UPDATE t SET trang_thai = 'ONLINE', ranh_tu = SYSUTCDATETIME()
    FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk = t.ma_tk
    WHERE k.username IN (N'0800000001', N'0800000002', N'0800000003')
      AND t.trang_thai = 'OFFLINE' AND t.ranh_tu IS NULL;

    UPDATE t SET
        vi_tri_demo_dia_chi = CASE k.username
            WHEN N'0800000001' THEN N'227 Nguyễn Văn Cừ, TP.HCM'
            WHEN N'0800000002' THEN N'268 Lý Thường Kiệt, TP.HCM'
            ELSE N'2 Công xã Paris, TP.HCM' END,
        vi_tri_demo_lat = CASE k.username
            WHEN N'0800000001' THEN 10.7626220
            WHEN N'0800000002' THEN 10.7725670
            ELSE 10.7797830 END,
        vi_tri_demo_lng = CASE k.username
            WHEN N'0800000001' THEN 106.6821800
            WHEN N'0800000002' THEN 106.6601720
            ELSE 106.6991200 END,
        vi_tri_demo_luc = SYSUTCDATETIME(), vi_tri_demo_nguon = 'DEMO_CO_DINH'
    FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk = t.ma_tk
    WHERE k.username IN (N'0800000001', N'0800000002', N'0800000003')
      AND t.vi_tri_demo_dia_chi IS NULL;

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    THROW;
END CATCH;
