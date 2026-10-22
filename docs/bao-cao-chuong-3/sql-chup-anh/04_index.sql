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
SELECT t.name AS bang, i.name AS chi_muc,
       i.is_unique AS duy_nhat, i.filter_definition AS dieu_kien
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id
WHERE t.schema_id=SCHEMA_ID('dbo') AND i.name IS NOT NULL
 AND i.is_primary_key=0 AND i.is_unique_constraint=0
ORDER BY t.name,i.name;