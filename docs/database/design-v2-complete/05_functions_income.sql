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
-- Latest definition: V5__create_driver_income_function.sql
CREATE OR ALTER FUNCTION dbo.fn_thu_nhap_tai_xe(@ma_tx UNIQUEIDENTIFIER,@tu DATETIME2(3),@den DATETIME2(3))
RETURNS TABLE AS RETURN (
 SELECT COUNT_BIG(*) AS so_don,COALESCE(SUM(tong_cuoc),0) AS tong_cuoc,
 COALESCE(SUM(tien_tai_xe),0) AS thu_nhap,COALESCE(SUM(tien_cong_ty),0) AS phan_cong_ty
 FROM dbo.v_chia_cuoc WHERE ma_tx=@ma_tx AND ghi_nhan_luc>=@tu AND ghi_nhan_luc<@den
);
GO
