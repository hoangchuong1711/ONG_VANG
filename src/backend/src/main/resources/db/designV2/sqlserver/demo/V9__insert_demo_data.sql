-- Fresh demo databases contain identities only. Business data is created through the app.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo', N'mini_ong_vang_design_v2_test', N'mini_ong_vang_test')
    THROW 52400, N'V9 is restricted to designV2 demo/test databases', 1;

IF EXISTS (SELECT 1 FROM dbo.tai_khoan)
    OR EXISTS (SELECT 1 FROM dbo.khach_hang)
    OR EXISTS (SELECT 1 FROM dbo.tai_xe)
    OR EXISTS (SELECT 1 FROM dbo.don_hang)
    OR EXISTS (SELECT 1 FROM dbo.giao_dich_nop_tien)
    THROW 52401, N'Demo accounts require an empty demo/test database', 1;

DECLARE @hash NVARCHAR(255) = N'$2a$12$UtM40aUakGjktuJCHkLoTehUjLszC39AdfwpqUH2fUjCZqKc2WTfW';

BEGIN TRY
    BEGIN TRAN;

    INSERT dbo.tai_khoan (ma_tk, username, mat_khau_hash, ho_ten, so_dien_thoai, vai_tro) VALUES
    ('10000000-0000-0000-0000-000000000001', N'0900000001', @hash, N'Khách demo 1', '0900000001', 'KHACH_HANG'),
    ('10000000-0000-0000-0000-000000000002', N'0900000002', @hash, N'Khách demo 2', '0900000002', 'KHACH_HANG'),
    ('10000000-0000-0000-0000-000000000003', N'0900000003', @hash, N'Khách demo 3', '0900000003', 'KHACH_HANG'),
    ('10000000-0000-0000-0000-000000000101', N'demo_dispatcher', @hash, N'Tổng đài demo', NULL, 'TONG_DAI'),
    ('10000000-0000-0000-0000-000000000102', N'demo_admin', @hash, N'Chủ đội xe demo', NULL, 'CHU_DOI_XE'),
    ('10000000-0000-0000-0000-000000000201', N'0800000001', @hash, N'Tài xế demo 1', '0800000001', 'TAI_XE'),
    ('10000000-0000-0000-0000-000000000202', N'0800000002', @hash, N'Tài xế demo 2', '0800000002', 'TAI_XE'),
    ('10000000-0000-0000-0000-000000000203', N'0800000003', @hash, N'Tài xế demo 3', '0800000003', 'TAI_XE');

    -- These one-to-one profiles are required by customer and driver API routes.
    INSERT dbo.khach_hang (ma_kh, ma_tk) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003');

    INSERT dbo.tai_xe (ma_tx, ma_tk, cccd, so_giay_phep, ngay_het_han_gplx) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000201', '700000000001', N'GPLX-DEMO-1', DATEADD(YEAR, 1, CONVERT(DATE, SYSUTCDATETIME()))),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000202', '700000000002', N'GPLX-DEMO-2', DATEADD(YEAR, 1, CONVERT(DATE, SYSUTCDATETIME()))),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000203', '700000000003', N'GPLX-DEMO-3', DATEADD(YEAR, 1, CONVERT(DATE, SYSUTCDATETIME())));

    IF (SELECT COUNT(*) FROM dbo.tai_khoan) <> 8
        OR (SELECT COUNT(*) FROM dbo.khach_hang) <> 3
        OR (SELECT COUNT(*) FROM dbo.tai_xe) <> 3
        THROW 52402, N'Demo account seed count mismatch', 1;

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    THROW;
END CATCH;
