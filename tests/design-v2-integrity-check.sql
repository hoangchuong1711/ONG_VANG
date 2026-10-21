SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

DECLARE @views INT = (SELECT COUNT(*) FROM sys.views WHERE schema_id = SCHEMA_ID('dbo') AND name LIKE 'v_%');
IF @views <> 5 OR OBJECT_ID('dbo.v_don_cho_dieu_phoi', 'V') IS NOT NULL
 OR OBJECT_ID('dbo.v_cong_ty_thuc_nhan_ngay', 'V') IS NOT NULL
 THROW 52901, 'View migration check failed', 1;
PRINT 'PASS: exactly five business views; removed views are absent';

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

IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc
    WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME()
      AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME()))<>1
 THROW 52907, 'Exactly one seeded fare must be active', 1;
IF OBJECT_ID('dbo.usp_quan_ly_chinh_sach','P') IS NOT NULL
 OR OBJECT_ID('dbo.usp_admin_dong_hieu_luc_hien_tai','P') IS NOT NULL
 OR OBJECT_ID('dbo.v_phien_ban_chinh_sach','V') IS NOT NULL
 OR OBJECT_ID('dbo.tr_policy_cau_hinh_cuoc','TR') IS NOT NULL
 OR OBJECT_ID('dbo.tr_policy_chinh_sach_thanh_vien','TR') IS NOT NULL
 OR OBJECT_ID('dbo.tr_policy_cau_hinh_phu_thu','TR') IS NOT NULL
 THROW 52913, 'Admin policy objects were not removed', 1;
PRINT 'PASS: seeded fare is active and admin policy objects are absent';

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
