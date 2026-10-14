-- A configured demonstration position is shared by every dispatcher session.
ALTER TABLE dbo.tai_xe ADD
    vi_tri_demo_dia_chi NVARCHAR(255) NULL,
    vi_tri_demo_lat DECIMAL(10,7) NULL,
    vi_tri_demo_lng DECIMAL(10,7) NULL,
    vi_tri_demo_nguon NVARCHAR(30) NULL,
    vi_tri_demo_cau_hinh_luc DATETIME2(6) NULL;
GO
ALTER TABLE dbo.tai_xe ADD CONSTRAINT ck_tx4_demo_position CHECK (
    (vi_tri_demo_dia_chi IS NULL AND vi_tri_demo_lat IS NULL AND vi_tri_demo_lng IS NULL
      AND vi_tri_demo_nguon IS NULL AND vi_tri_demo_cau_hinh_luc IS NULL)
    OR (vi_tri_demo_dia_chi IS NOT NULL AND vi_tri_demo_lat BETWEEN -90 AND 90
      AND vi_tri_demo_lng BETWEEN -180 AND 180 AND vi_tri_demo_nguon = N'DEMO_CO_DINH'
      AND vi_tri_demo_cau_hinh_luc IS NOT NULL));
