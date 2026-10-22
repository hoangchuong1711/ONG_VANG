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
DECLARE @den DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
SELECT * FROM dbo.fn_thu_nhap_tai_xe(
 '30000000-0000-0000-0000-000000000001','2000-01-01',@den);
-- Dùng khoảng rộng để bao phủ các đơn V9 dù ngày chụp khác ngày nạp.