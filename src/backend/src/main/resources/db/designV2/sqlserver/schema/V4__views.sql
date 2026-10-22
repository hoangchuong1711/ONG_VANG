-- Consolidated DesignV2 through V26. Fresh database only.
-- Application migration. See ../README.md; preserve checksum after deployment.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
-- Latest definition: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_cuoc_don AS
SELECT d.ma_don,d.ma_kh,d.trang_thai,d.tao_luc,d.hoan_tat_luc,
 d.cuoc_km,d.cuoc_kg,d.tien_giam,
 COALESCE(p.phu_thu,0) AS phu_thu,
 CONVERT(DECIMAL(15,0),d.cuoc_km+d.cuoc_kg-d.tien_giam+COALESCE(p.phu_thu,0)) AS tong_cuoc
FROM dbo.don_hang d OUTER APPLY (
 SELECT SUM(c.so_tien) phu_thu FROM dbo.phu_thu_don_hang x
 JOIN dbo.cau_hinh_phu_thu c ON c.ma_phu_thu=x.ma_phu_thu WHERE x.ma_don=d.ma_don
) p;
GO

-- Latest definition: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_tong_cuoc AS
SELECT ma_don,tong_cuoc
FROM dbo.v_cuoc_don;
GO

-- Latest definition: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_chia_cuoc AS
SELECT c.ma_don,p.ma_tx,c.ghi_nhan_luc,c.ma_giao_dich_nop,v.tong_cuoc,
 dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_cong_ty,
 v.tong_cuoc-dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_tai_xe
FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong
JOIN dbo.v_cuoc_don v ON v.ma_don=c.ma_don;
GO

-- Latest definition: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_giao_dich_nop AS
SELECT g.ma_giao_dich,g.ma_tx,g.ma_tham_chieu,g.trang_thai,g.tao_luc,g.giai_quyet_luc,
 g.so_tien_yeu_cau,g.so_tien_thuc_nhan,COUNT(c.ma_don) AS so_don_dang_lien_ket,
 COALESCE(SUM(c.tien_cong_ty),0) AS tong_khoan_lien_ket
FROM dbo.giao_dich_nop_tien g LEFT JOIN dbo.v_chia_cuoc c ON c.ma_giao_dich_nop=g.ma_giao_dich
GROUP BY g.ma_giao_dich,g.ma_tx,g.ma_tham_chieu,g.trang_thai,g.tao_luc,g.giai_quyet_luc,g.so_tien_yeu_cau,g.so_tien_thuc_nhan;
GO

-- Latest definition: V4__create_business_views.sql
CREATE OR ALTER VIEW dbo.v_so_du_tai_xe AS
SELECT t.ma_tx,
 COALESCE(SUM(c.tong_cuoc),0) AS tong_cuoc_da_thu,
 COALESCE(SUM(c.tien_tai_xe),0) AS thu_nhap_tai_xe,
 COALESCE(SUM(c.tien_cong_ty),0) AS cong_ty_duoc_huong,
 COALESCE(SUM(CASE WHEN g.trang_thai='THANH_CONG' THEN c.tien_cong_ty ELSE 0 END),0) AS da_nop,
 COALESCE(SUM(CASE WHEN g.trang_thai='THANH_CONG' THEN 0 ELSE c.tien_cong_ty END),0) AS con_phai_nop,
 COALESCE(SUM(CASE WHEN g.giai_quyet_luc IS NULL AND g.ma_giao_dich IS NOT NULL THEN c.tien_cong_ty ELSE 0 END),0) AS dang_thanh_toan,
 COALESCE(SUM(CASE WHEN c.ma_giao_dich_nop IS NULL THEN c.tien_cong_ty ELSE 0 END),0) AS chua_dua_vao_thanh_toan
FROM dbo.tai_xe t LEFT JOIN dbo.v_chia_cuoc c ON c.ma_tx=t.ma_tx
LEFT JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=c.ma_giao_dich_nop GROUP BY t.ma_tx;
GO

-- Latest definition: V24__driver_profile_without_license_expiry.sql
CREATE OR ALTER VIEW dbo.v_tai_xe_san_sang AS
SELECT t.ma_tx,k.ho_ten,t.ranh_tu,p.bien_so FROM dbo.tai_xe t
JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx
WHERE t.trang_thai='ONLINE' AND t.ranh_tu IS NOT NULL
 AND k.trang_thai='HOAT_DONG' AND p.dang_hoat_dong=1
 AND NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang a WHERE a.ma_tx=t.ma_tx AND a.ket_thuc_luc IS NULL);
GO
