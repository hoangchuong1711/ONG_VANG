SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Keep one usable fare and the demo membership/surcharge rules even without DESIGN_V2_DEMO.
-- Existing published versions and order references remain untouched.
DECLARE @now DATETIME2(3) = SYSUTCDATETIME();
DECLARE @start DATETIME2(3) = DATEADD(DAY, -1, @now);

BEGIN TRY
 BEGIN TRAN;

 IF NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_cuoc
                WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now
                  AND (hieu_luc_den IS NULL OR hieu_luc_den>@now))
 BEGIN
  INSERT dbo.cau_hinh_cuoc
   (ma_bieu_phi,ten,cuoc_co_ban,don_gia_km,km_toi_thieu,km_toi_da,
    kg_bao_gom,kg_toi_da,don_gia_kg,hieu_luc_tu,hieu_luc_den,trang_thai)
  VALUES
   (NEWID(),N'Biểu phí mặc định',20000,5000,0,30,1,30,3000,@start,
    (SELECT MIN(hieu_luc_tu) FROM dbo.cau_hinh_cuoc
     WHERE trang_thai='CONG_BO' AND hieu_luc_tu>@now),'CONG_BO');
 END;

 IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc
     WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now
       AND (hieu_luc_den IS NULL OR hieu_luc_den>@now))<>1
  THROW 52403,N'Cần đúng một biểu phí đang hiệu lực',1;

 INSERT dbo.chinh_sach_thanh_vien
  (ma_chinh_sach,ma_hang,ty_le_giam,hieu_luc_tu,hieu_luc_den,trang_thai)
 SELECT NEWID(),v.ma_hang,v.ty_le_giam,@start,
  (SELECT MIN(f.hieu_luc_tu) FROM dbo.chinh_sach_thanh_vien f
   WHERE f.ma_hang=v.ma_hang AND f.trang_thai='CONG_BO' AND f.hieu_luc_tu>@now),
  'CONG_BO'
 FROM (VALUES ('BAC',CONVERT(DECIMAL(5,2),5)),
              ('VANG',CONVERT(DECIMAL(5,2),10)),
              ('KIM_CUONG',CONVERT(DECIMAL(5,2),15))) v(ma_hang,ty_le_giam)
 WHERE NOT EXISTS (SELECT 1 FROM dbo.chinh_sach_thanh_vien p
                   WHERE p.ma_hang=v.ma_hang AND p.trang_thai='CONG_BO'
                     AND p.hieu_luc_tu<=@now
                     AND (p.hieu_luc_den IS NULL OR p.hieu_luc_den>@now));

 IF EXISTS (SELECT 1 FROM dbo.chinh_sach_thanh_vien
            WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now
              AND (hieu_luc_den IS NULL OR hieu_luc_den>@now)
            GROUP BY ma_hang HAVING COUNT(*)>1)
  THROW 52404,N'Chính sách thành viên đang hiệu lực bị trùng hạng',1;

 INSERT dbo.cau_hinh_phu_thu
  (ma_phu_thu,ma_loai,ten,bat_buoc,so_tien,hieu_luc_tu,hieu_luc_den,trang_thai)
 SELECT NEWID(),v.ma_loai,v.ten,v.bat_buoc,v.so_tien,@start,
  (SELECT MIN(f.hieu_luc_tu) FROM dbo.cau_hinh_phu_thu f
   WHERE f.ma_loai=v.ma_loai AND f.trang_thai='CONG_BO' AND f.hieu_luc_tu>@now),
  'CONG_BO'
 FROM (VALUES ('DICH_VU',N'Phụ thu dịch vụ',CONVERT(BIT,1),CONVERT(DECIMAL(15,0),5000)),
              ('GIAO_NHANH',N'Giao nhanh',CONVERT(BIT,0),CONVERT(DECIMAL(15,0),10000)))
  v(ma_loai,ten,bat_buoc,so_tien)
 WHERE NOT EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu p
                   WHERE p.ma_loai=v.ma_loai AND p.trang_thai='CONG_BO'
                     AND p.hieu_luc_tu<=@now
                     AND (p.hieu_luc_den IS NULL OR p.hieu_luc_den>@now));

 IF EXISTS (SELECT 1 FROM dbo.cau_hinh_phu_thu
            WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now
              AND (hieu_luc_den IS NULL OR hieu_luc_den>@now)
            GROUP BY ma_loai HAVING COUNT(*)>1)
  THROW 52405,N'Phụ thu đang hiệu lực bị trùng loại',1;

 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
