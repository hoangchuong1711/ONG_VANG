SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

CREATE OR ALTER PROCEDURE dbo.usp_admin_quan_ly_tong_dai
 @hanh_dong VARCHAR(15), @ma_tk UNIQUEIDENTIFIER=NULL,
 @username NVARCHAR(50)=NULL, @hash NVARCHAR(255)=NULL,
 @ho_ten NVARCHAR(100)=NULL, @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'admin-tong-dai',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại',1;

  IF @hanh_dong='TAO'
  BEGIN
   IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
    OR @username LIKE N'% %' OR @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
    OR @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
    THROW 52401,N'Thông tin tài khoản tổng đài không hợp lệ',1;
   SET @ma_tk=NEWID();
   INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
    VALUES(@ma_tk,@username,@hash,@ho_ten,@sdt,@email,'TONG_DAI');
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_KHOAN',@ma_tk,'TAO_TONG_DAI');
  END
  ELSE
  BEGIN
   IF @ma_tk IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WITH(UPDLOCK,HOLDLOCK)
       WHERE ma_tk=@ma_tk AND vai_tro='TONG_DAI')
    THROW 52204,N'Không tìm thấy tài khoản tổng đài',1;
   IF @hanh_dong='CAP_NHAT'
   BEGIN
    IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
     THROW 52401,N'Thông tin tài khoản tổng đài không hợp lệ',1;
    UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@ma_tk;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,'CAP_NHAT_TONG_DAI');
   END
   ELSE IF @hanh_dong IN ('KHOA','MO_KHOA')
   BEGIN
    UPDATE dbo.tai_khoan SET trang_thai=CASE WHEN @hanh_dong='KHOA' THEN 'KHOA' ELSE 'HOAT_DONG' END,
      auth_version=auth_version+1 WHERE ma_tk=@ma_tk
      AND trang_thai<>CASE WHEN @hanh_dong='KHOA' THEN 'KHOA' ELSE 'HOAT_DONG' END;
    IF @@ROWCOUNT=0 THROW 52402,N'Trạng thái tài khoản đã thay đổi',1;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TONG_DAI' ELSE 'MO_KHOA_TONG_DAI' END);
   END
   ELSE IF @hanh_dong='DAT_MAT_KHAU'
   BEGIN
    IF @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
     THROW 52401,N'Mật khẩu mã hóa không hợp lệ',1;
    UPDATE dbo.tai_khoan SET mat_khau_hash=@hash,auth_version=auth_version+1 WHERE ma_tk=@ma_tk;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,'CAP_LAI_MAT_KHAU_TONG_DAI');
   END
   ELSE THROW 52403,N'Sai hành động quản lý tổng đài',1;
  END;
  COMMIT;
  SELECT @ma_tk AS ma_tk;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_cap_nhat_ho_so_tai_khoan
 @ho_ten NVARCHAR(100), @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG')
   THROW 52001,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
   THROW 52401,N'Thông tin hồ sơ không hợp lệ',1;
  UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@actor;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'TAI_KHOAN',@actor,'CAP_NHAT_HO_SO');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_doi_mat_khau_tai_khoan
 @hash_moi NVARCHAR(255), @auth_version BIGINT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 BEGIN TRY
  BEGIN TRAN;
  IF @hash_moi IS NULL OR LEFT(@hash_moi,4)<>N'$2a$' OR LEN(@hash_moi)<>60
   THROW 52401,N'Mật khẩu mã hóa không hợp lệ',1;
  UPDATE dbo.tai_khoan WITH(UPDLOCK) SET mat_khau_hash=@hash_moi,auth_version=auth_version+1
   WHERE ma_tk=@actor AND trang_thai='HOAT_DONG' AND auth_version=@auth_version;
  IF @@ROWCOUNT=0 THROW 52402,N'Phiên đã thay đổi',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'TAI_KHOAN',@actor,'DOI_MAT_KHAU');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

GRANT EXECUTE ON dbo.usp_admin_quan_ly_tong_dai TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so_tai_khoan TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_doi_mat_khau_tai_khoan TO r_auth_backend;
GO
