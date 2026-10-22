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
SELECT name AS ten_bang FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
SELECT type_desc AS loai_doi_tuong, COUNT(*) AS so_luong
FROM sys.objects
WHERE schema_id = SCHEMA_ID('dbo') AND is_ms_shipped = 0
  AND type IN ('U','V','FN','IF','P','TR')
GROUP BY type_desc ORDER BY type_desc;