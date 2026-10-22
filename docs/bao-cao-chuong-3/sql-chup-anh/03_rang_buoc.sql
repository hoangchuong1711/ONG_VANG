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
-- Thử CHECK: khối lượng âm. Đơn 1 phải tồn tại sau khi nạp V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',999,N'Kiểm tra CHECK',-1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: dữ liệu âm được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử UNIQUE: cặp đơn 1, thứ tự kiện 1 đã có trong V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',1,N'Kiểm tra UNIQUE',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: thứ tự kiện trùng được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử FK: kiểm tra mã ngẫu nhiên chắc chắn chưa tồn tại trước khi INSERT.
DECLARE @don_khong_co UNIQUEIDENTIFIER = NEWID();
WHILE EXISTS(SELECT 1 FROM dbo.don_hang WHERE ma_don=@don_khong_co)
 SET @don_khong_co=NEWID();
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES(@don_khong_co,1,N'Kiểm tra FK',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: đơn không tồn tại được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;