SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

DECLARE @views INT = (SELECT COUNT(*) FROM sys.views WHERE schema_id = SCHEMA_ID('dbo') AND name LIKE 'v_%');
IF @views <> 6 OR OBJECT_ID('dbo.v_don_cho_dieu_phoi', 'V') IS NOT NULL
 OR OBJECT_ID('dbo.v_cong_ty_thuc_nhan_ngay', 'V') IS NOT NULL
 THROW 52901, 'View migration check failed', 1;
PRINT 'PASS: exactly six business views; removed views are absent';

DECLARE @actor UNIQUEIDENTIFIER = (SELECT ma_tk FROM dbo.tai_khoan WHERE username = 'demo_admin');
IF @actor IS NULL THROW 52902, 'Demo admin account is required', 1;
EXEC sys.sp_set_session_context @key=N'ma_tk', @value=@actor;

DECLARE @order UNIQUEIDENTIFIER = (SELECT TOP (1) ma_don FROM dbo.don_hang ORDER BY tao_luc DESC);
IF @order IS NULL THROW 52903, 'A real order is required', 1;
DECLARE @original DECIMAL(15,0) = (SELECT cuoc_km FROM dbo.don_hang WHERE ma_don=@order);
BEGIN TRY
 BEGIN TRAN;
 UPDATE dbo.don_hang SET cuoc_km=cuoc_km+1 WHERE ma_don=@order;
 ROLLBACK;
 THROW 52904, 'Immutable order price was accepted', 1;
END TRY
BEGIN CATCH
 DECLARE @orderError INT=ERROR_NUMBER();
 IF XACT_STATE()<>0 ROLLBACK;
 IF @orderError<>51007 THROW;
END CATCH;
IF (SELECT cuoc_km FROM dbo.don_hang WHERE ma_don=@order)<>@original
 THROW 52905, 'Order rollback failed', 1;
PRINT 'PASS: order price trigger rejected update and transaction rolled back';

DECLARE @fare UNIQUEIDENTIFIER=(SELECT TOP (1) ma_bieu_phi FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO');
DECLARE @base DECIMAL(15,0)=(SELECT cuoc_co_ban FROM dbo.cau_hinh_cuoc WHERE ma_bieu_phi=@fare);
BEGIN TRY
 BEGIN TRAN;
 UPDATE dbo.cau_hinh_cuoc SET cuoc_co_ban=cuoc_co_ban+1 WHERE ma_bieu_phi=@fare;
 ROLLBACK;
 THROW 52906, 'Published fare edit was accepted', 1;
END TRY
BEGIN CATCH
 DECLARE @policyError INT=ERROR_NUMBER();
 IF XACT_STATE()<>0 ROLLBACK;
 IF @policyError<>51015 THROW;
END CATCH;
IF (SELECT cuoc_co_ban FROM dbo.cau_hinh_cuoc WHERE ma_bieu_phi=@fare)<>@base
 THROW 52907, 'Fare rollback failed', 1;
PRINT 'PASS: published policy trigger rejected edit and transaction rolled back';

DECLARE @newSurcharge UNIQUEIDENTIFIER;
BEGIN TRY
 BEGIN TRAN;
 EXEC dbo.usp_quan_ly_chinh_sach 'LUU_NHAP','PHU_THU',NULL,
  N'{"ten":"Integrity test","ma_loai":"KIEM_THU_TAM","so_tien":1000,"bat_buoc":false,"hieu_luc_tu":"2030-01-01T00:00:00","hieu_luc_den":"2030-01-02T00:00:00"}',NULL;
 SELECT TOP (1) @newSurcharge=ma_phu_thu FROM dbo.cau_hinh_phu_thu WHERE ma_loai='KIEM_THU_TAM';
 IF @newSurcharge IS NULL THROW 52911, 'Policy draft was not created', 1;
 EXEC dbo.usp_quan_ly_chinh_sach 'CONG_BO','PHU_THU',@newSurcharge,NULL,NULL;
 IF NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu WHERE ma_phu_thu=@newSurcharge AND trang_thai='CONG_BO')
  THROW 52912, 'Policy was not published', 1;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
IF EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu WHERE ma_phu_thu=@newSurcharge)
 THROW 52913, 'Policy test rollback failed', 1;
PRINT 'PASS: policy SP created and published a draft; outer rollback removed the test policy';

DECLARE @first UNIQUEIDENTIFIER, @second UNIQUEIDENTIFIER, @driver UNIQUEIDENTIFIER;
SELECT TOP (1) @first=ma_don FROM dbo.don_hang ORDER BY tao_luc DESC;
SELECT TOP (1) @second=ma_don FROM dbo.don_hang WHERE ma_don<>@first ORDER BY tao_luc DESC;
SELECT TOP (1) @driver=t.ma_tx FROM dbo.tai_xe t
 WHERE NOT EXISTS (SELECT 1 FROM dbo.phan_cong_don_hang p WHERE p.ma_tx=t.ma_tx AND p.ket_thuc_luc IS NULL);
IF @second IS NULL OR @driver IS NULL THROW 52908, 'Two orders and an idle driver are required', 1;
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.phan_cong_don_hang(ma_don,ma_tx,ma_tk_dieu_phoi) VALUES(@first,@driver,@actor);
 INSERT dbo.phan_cong_don_hang(ma_don,ma_tx,ma_tk_dieu_phoi) VALUES(@second,@driver,@actor);
 ROLLBACK;
 THROW 52909, 'Two open assignments for one driver were accepted', 1;
END TRY
BEGIN CATCH
 DECLARE @assignError INT=ERROR_NUMBER();
 IF XACT_STATE()<>0 ROLLBACK;
 IF @assignError NOT IN (2601,2627) THROW;
END CATCH;
IF EXISTS (SELECT 1 FROM dbo.phan_cong_don_hang
           WHERE ma_tx=@driver AND ket_thuc_luc IS NULL AND ma_don IN (@first,@second))
 THROW 52910, 'Assignment rollback failed', 1;
PRINT 'PASS: unique filtered index blocked simultaneous open assignments; rollback left no test rows';
