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
-- Bật Query > Include Actual Execution Plan trước khi chạy.
-- Chỉ chọn chạy TRỌN một khối BEGIN TRY ... END CATCH và GO tương ứng.
-- Chỉ xóa/tạo index thường trong transaction; ROLLBACK khôi phục index gốc.
-- Không chạy đồng thời ứng dụng trên database thử trong lúc đo.
-- Bộ 30 đơn chỉ minh họa cách đo, không đủ chứng minh hiệu năng ở quy mô lớn.
-- Đo ix_don_customer_time
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX ix_don_customer_time ON dbo.don_hang;
 PRINT N'TRUOC INDEX: ix_don_customer_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,tao_luc,trang_thai FROM dbo.don_hang WHERE ma_kh='20000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 CREATE INDEX ix_don_customer_time ON dbo.don_hang(ma_kh,tao_luc DESC) INCLUDE(trang_thai);
 PRINT N'SAU INDEX: ix_don_customer_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,tao_luc,trang_thai FROM dbo.don_hang WHERE ma_kh='20000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO
-- Đo ix_don_queue
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX ix_don_queue ON dbo.don_hang;
 PRINT N'TRUOC INDEX: ix_don_queue';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,ma_kh,tao_luc FROM dbo.don_hang WHERE trang_thai='CHO_GAN' ORDER BY tao_luc;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 CREATE INDEX ix_don_queue ON dbo.don_hang(trang_thai,tao_luc) INCLUDE(ma_kh);
 PRINT N'SAU INDEX: ix_don_queue';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,ma_kh,tao_luc FROM dbo.don_hang WHERE trang_thai='CHO_GAN' ORDER BY tao_luc;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO
-- Đo ix_pc_driver_time
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang;
 PRINT N'TRUOC INDEX: ix_pc_driver_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,bat_dau_luc,ket_qua FROM dbo.phan_cong_don_hang WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY bat_dau_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 CREATE INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang(ma_tx,bat_dau_luc DESC) INCLUDE(ma_don,ket_qua);
 PRINT N'SAU INDEX: ix_pc_driver_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) ma_don,bat_dau_luc,ket_qua FROM dbo.phan_cong_don_hang WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY bat_dau_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO
-- Đo ix_log_order_time
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX ix_log_order_time ON dbo.nhat_ky_don_hang;
 PRINT N'TRUOC INDEX: ix_log_order_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT ma_su_kien,thoi_gian FROM dbo.nhat_ky_don_hang WHERE ma_don='50000000-0000-0000-0000-000000000001' ORDER BY thoi_gian,ma_su_kien;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 CREATE INDEX ix_log_order_time ON dbo.nhat_ky_don_hang(ma_don,thoi_gian,ma_su_kien);
 PRINT N'SAU INDEX: ix_log_order_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT ma_su_kien,thoi_gian FROM dbo.nhat_ky_don_hang WHERE ma_don='50000000-0000-0000-0000-000000000001' ORDER BY thoi_gian,ma_su_kien;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO
-- Đo ix_gd_driver_time
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX ix_gd_driver_time ON dbo.giao_dich_nop_tien;
 PRINT N'TRUOC INDEX: ix_gd_driver_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) tao_luc,trang_thai,so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 CREATE INDEX ix_gd_driver_time ON dbo.giao_dich_nop_tien(ma_tx,tao_luc DESC) INCLUDE(trang_thai,so_tien_yeu_cau);
 PRINT N'SAU INDEX: ix_gd_driver_time';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 SELECT TOP (50) tao_luc,trang_thai,so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO
