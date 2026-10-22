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
SELECT TOP (12) ma_don,tong_cuoc,tien_cong_ty,tien_tai_xe
FROM dbo.v_chia_cuoc ORDER BY ma_don;
SELECT ma_tx,thu_nhap_tai_xe,cong_ty_duoc_huong,da_nop,
       con_phai_nop,dang_thanh_toan,chua_dua_vao_thanh_toan
FROM dbo.v_so_du_tai_xe ORDER BY ma_tx;
SELECT * FROM dbo.v_tai_xe_san_sang;