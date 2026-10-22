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
SELECT dbo.fn_cuoc_km(20000,5,5000) AS cuoc_km,
       dbo.fn_cuoc_kg(2.50,1,3000) AS cuoc_kg,
       dbo.fn_tien_giam(55000,10) AS giam_tren_55000,
       dbo.fn_phan_cong_ty(49500) AS cong_ty_tren_49500;
-- Bốn ví dụ độc lập; không cộng các cột thành một báo giá.
-- Mong đợi: 45000; 4500; 5500; 9900.