-- Chạy trên SSMS sau khi đã chạy V1-V9 thành công vào DB thử mới.
-- Chọn từng ví dụ để chụp, không ghép file này vào migration.
USE mini_ong_vang_design_v2_test;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
GO
-- Kiểm tra nhiều dòng: cả ba chính sách thành viên mẫu đã CONG_BO.
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;
BEGIN TRY
 BEGIN TRAN;
 UPDATE dbo.chinh_sach_thanh_vien
 SET ty_le_giam=ty_le_giam+1 WHERE trang_thai='CONG_BO';
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: sửa chính sách công bố được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi,ERROR_MESSAGE() AS noi_dung;
END CATCH;
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;