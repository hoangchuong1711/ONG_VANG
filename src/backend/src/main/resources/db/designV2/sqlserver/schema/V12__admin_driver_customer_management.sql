SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

CREATE OR ALTER PROCEDURE dbo.usp_admin_quan_ly_tai_xe
 @hanh_dong VARCHAR(12), @ma_tx UNIQUEIDENTIFIER=NULL,
 @username NVARCHAR(50)=NULL, @hash NVARCHAR(255)=NULL,
 @ho_ten NVARCHAR(100)=NULL, @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL,
 @cccd VARCHAR(12)=NULL, @so_gplx NVARCHAR(50)=NULL, @het_han DATE=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @tk UNIQUEIDENTIFIER, @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'admin-ho-so-tai-xe',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại',1;

  IF @hanh_dong='TAO'
  BEGIN
   IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
    OR @username LIKE N'% %' OR @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
    OR @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0 OR @sdt IS NULL
    OR @cccd IS NULL OR @so_gplx IS NULL OR @het_han IS NULL
    THROW 52206,N'Thông tin tài xế không hợp lệ',1;
   SET @tk=NEWID(); SET @ma_tx=NEWID();
   INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
    VALUES(@tk,@username,@hash,@ho_ten,@sdt,@email,'TAI_XE');
   INSERT dbo.tai_xe(ma_tx,ma_tk,cccd,so_giay_phep,ngay_het_han_gplx,trang_thai)
    VALUES(@ma_tx,@tk,@cccd,@so_gplx,@het_han,'OFFLINE');
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,'TAO_HO_SO');
  END
  ELSE IF @hanh_dong='CAP_NHAT'
  BEGIN
   SELECT @tk=ma_tk FROM dbo.tai_xe WITH(UPDLOCK,HOLDLOCK) WHERE ma_tx=@ma_tx;
   IF @tk IS NULL THROW 52204,N'Không tìm thấy tài xế',1;
   IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0 OR @sdt IS NULL
    OR @cccd IS NULL OR @so_gplx IS NULL OR @het_han IS NULL
    THROW 52206,N'Thông tin tài xế không hợp lệ',1;
   UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@tk;
   UPDATE dbo.tai_xe SET cccd=@cccd,so_giay_phep=@so_gplx,ngay_het_han_gplx=@het_han WHERE ma_tx=@ma_tx;
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,'CAP_NHAT_HO_SO');
  END
  ELSE IF @hanh_dong IN ('KHOA','MO_KHOA')
  BEGIN
   SELECT @tk=ma_tk FROM dbo.tai_xe WITH(UPDLOCK,HOLDLOCK) WHERE ma_tx=@ma_tx;
   IF @tk IS NULL THROW 52204,N'Không tìm thấy tài xế',1;
   IF @hanh_dong='KHOA'
   BEGIN
    IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
     THROW 52203,N'Tài xế đang có phân công; xử lý đơn trước khi khóa',1;
    UPDATE dbo.tai_xe SET trang_thai='NGHI',ranh_tu=NULL WHERE ma_tx=@ma_tx;
    UPDATE dbo.tai_khoan SET trang_thai='KHOA',auth_version=auth_version+1 WHERE ma_tk=@tk;
   END
   ELSE
   BEGIN
    UPDATE dbo.tai_xe SET trang_thai='OFFLINE',ranh_tu=NULL WHERE ma_tx=@ma_tx;
    UPDATE dbo.tai_khoan SET trang_thai='HOAT_DONG',auth_version=auth_version+1 WHERE ma_tk=@tk;
   END;
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TAI_KHOAN' ELSE 'MO_KHOA_TAI_KHOAN' END);
  END
  ELSE THROW 52201,N'Sai hành động',1;
  COMMIT;
  SELECT @ma_tx AS ma_tx;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_admin_trang_thai_khach
 @ma_kh UNIQUEIDENTIFIER,@hanh_dong VARCHAR(8)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @tk UNIQUEIDENTIFIER;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  SELECT @tk=ma_tk FROM dbo.khach_hang WITH(UPDLOCK,HOLDLOCK) WHERE ma_kh=@ma_kh;
  IF @tk IS NULL THROW 52204,N'Không tìm thấy khách hàng',1;
  IF @hanh_dong='KHOA'
   UPDATE dbo.tai_khoan SET trang_thai='KHOA',auth_version=auth_version+1 WHERE ma_tk=@tk AND trang_thai='HOAT_DONG';
  ELSE IF @hanh_dong='MO_KHOA'
   UPDATE dbo.tai_khoan SET trang_thai='HOAT_DONG',auth_version=auth_version+1 WHERE ma_tk=@tk AND trang_thai='KHOA';
  ELSE THROW 52201,N'Sai hành động',1;
  IF @@ROWCOUNT=0 THROW 52205,N'Trạng thái tài khoản đã thay đổi',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'KHACH_HANG',@ma_kh,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TAI_KHOAN' ELSE 'MO_KHOA_TAI_KHOAN' END);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

GRANT EXECUTE ON dbo.usp_admin_quan_ly_tai_xe TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_admin_trang_thai_khach TO r_auth_backend;
GO
