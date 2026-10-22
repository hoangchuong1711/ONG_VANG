SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- Published content stays immutable; setting its end to the current instant is allowed.
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_cuoc ON dbo.cau_hinh_cuoc AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_bieu_phi=d.ma_bieu_phi
 WHERE d.trang_thai='CONG_BO' AND (i.ma_bieu_phi IS NULL
  OR EXISTS(SELECT i.ten,i.cuoc_co_ban,i.don_gia_km,i.km_toi_thieu,i.km_toi_da,i.kg_bao_gom,i.kg_toi_da,i.don_gia_kg,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ten,d.cuoc_co_ban,d.don_gia_km,d.km_toi_thieu,d.km_toi_da,d.kg_bao_gom,d.kg_toi_da,d.don_gia_kg,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL)))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_chinh_sach_thanh_vien ON dbo.chinh_sach_thanh_vien AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_chinh_sach=d.ma_chinh_sach
 WHERE d.trang_thai='CONG_BO' AND (i.ma_chinh_sach IS NULL
  OR EXISTS(SELECT i.ma_hang,i.ty_le_giam,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_hang,d.ty_le_giam,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL)))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_phu_thu ON dbo.cau_hinh_phu_thu AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_phu_thu=d.ma_phu_thu
 WHERE d.trang_thai='CONG_BO' AND (i.ma_phu_thu IS NULL
  OR EXISTS(SELECT i.ma_loai,i.ten,i.so_tien,i.bat_buoc,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_loai,d.ten,d.so_tien,d.bat_buoc,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL)))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_admin_dong_hieu_luc_hien_tai
 @loai VARCHAR(15), @ma UNIQUEIDENTIFIER
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @lock_result INT, @now DATETIME2(3);
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor
   AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  IF @loai IS NULL OR @loai NOT IN ('CUOC','THANH_VIEN','PHU_THU') OR @ma IS NULL
   THROW 52002,N'Loại chính sách không hợp lệ',1;
  EXEC @lock_result=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',
   @LockOwner='Transaction',@LockTimeout=10000;
  IF @lock_result<0 THROW 51100,N'Không lấy được khóa chính sách; thử lại',1;
  SET @now=SYSUTCDATETIME();
  IF NOT EXISTS(SELECT 1 FROM dbo.v_phien_ban_chinh_sach
   WHERE loai=@loai AND ma=@ma AND trang_thai='CONG_BO'
    AND hieu_luc_den IS NULL AND hieu_luc_tu<@now)
   THROW 52007,N'Chỉ đóng phiên bản công bố đã bắt đầu và chưa đóng',1;
  IF @loai='CUOC' UPDATE dbo.cau_hinh_cuoc SET hieu_luc_den=@now WHERE ma_bieu_phi=@ma;
  ELSE IF @loai='THANH_VIEN' UPDATE dbo.chinh_sach_thanh_vien SET hieu_luc_den=@now WHERE ma_chinh_sach=@ma;
  ELSE UPDATE dbo.cau_hinh_phu_thu SET hieu_luc_den=@now WHERE ma_phu_thu=@ma;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
   VALUES(@actor,@loai,@ma,'DONG_HIEU_LUC',(SELECT @now AS hieu_luc_den FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
GRANT EXECUTE ON dbo.usp_admin_dong_hieu_luc_hien_tai TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_admin_dong_hieu_luc_hien_tai TO r_chu_doi_xe;
GO
