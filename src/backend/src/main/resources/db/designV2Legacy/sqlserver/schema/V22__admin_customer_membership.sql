SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

CREATE OR ALTER PROCEDURE dbo.usp_admin_gan_hang_khach
 @ma_kh UNIQUEIDENTIFIER, @ma_hang VARCHAR(15)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @now DATETIME2(3)=SYSUTCDATETIME(), @lock_result INT,
         @old_tier VARCHAR(15), @old_from DATETIME2(3), @old_until DATETIME2(3);
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan
   WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  IF @ma_hang IS NULL OR @ma_hang NOT IN ('THUONG','BAC','VANG','KIM_CUONG')
   THROW 52430,N'Hạng thành viên không hợp lệ',1;

  EXEC @lock_result=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',
   @LockOwner='Transaction',@LockTimeout=10000;
  IF @lock_result<0 THROW 51100,N'Không lấy được khóa chính sách; thử lại',1;

  SELECT @old_tier=k.ma_hang,@old_from=k.thanh_vien_tu,@old_until=k.thanh_vien_den
  FROM dbo.khach_hang k WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
  WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG';
  IF @old_tier IS NULL THROW 52204,N'Không tìm thấy khách hàng đang hoạt động',1;

  IF @ma_hang<>'THUONG' AND
   (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien
    WHERE ma_hang=@ma_hang AND trang_thai='CONG_BO' AND hieu_luc_tu<=@now
     AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
   THROW 52431,N'Hạng chưa có đúng một chính sách đang hiệu lực',1;

  IF @old_tier=@ma_hang AND
   (@ma_hang='THUONG' OR (@old_from<=@now AND (@old_until IS NULL OR @now<@old_until)))
   THROW 52432,N'Khách hàng đã ở hạng này',1;

  UPDATE dbo.khach_hang
  SET ma_hang=@ma_hang,
      thanh_vien_tu=CASE WHEN @ma_hang='THUONG' THEN NULL ELSE @now END,
      thanh_vien_den=NULL
  WHERE ma_kh=@ma_kh;

  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
  VALUES(@actor,'KHACH_HANG',@ma_kh,'GAN_HANG_THANH_VIEN',
   (SELECT @old_tier AS hang_cu,@old_from AS tu_cu,@old_until AS den_cu,
           @ma_hang AS hang_moi,CASE WHEN @ma_hang='THUONG' THEN NULL ELSE @now END AS tu_moi
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

GRANT EXECUTE ON dbo.usp_admin_gan_hang_khach TO r_auth_backend;
GO
