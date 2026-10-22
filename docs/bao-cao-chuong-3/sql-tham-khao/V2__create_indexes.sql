-- FILE: V2__create_indexes.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE UNIQUE INDEX ux_tk_phone ON dbo.tai_khoan(so_dien_thoai) WHERE so_dien_thoai IS NOT NULL;
CREATE UNIQUE INDEX ux_pc_open_order ON dbo.phan_cong_don_hang(ma_don) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_open_driver ON dbo.phan_cong_don_hang(ma_tx) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_done ON dbo.phan_cong_don_hang(ma_don) WHERE ket_qua='HOAN_TAT';
-- Một filter IS NULL bao phủ cả hai trạng thái chưa giải quyết, không dùng hai index rời.
CREATE UNIQUE INDEX ux_gd_open ON dbo.giao_dich_nop_tien(ma_tx) WHERE giai_quyet_luc IS NULL;
CREATE UNIQUE INDEX ux_gd_partner ON dbo.giao_dich_nop_tien(ma_giao_dich_doi_tac) WHERE ma_giao_dich_doi_tac IS NOT NULL;
CREATE UNIQUE INDEX ux_arrival ON dbo.nhat_ky_don_hang(ma_don) WHERE loai='DEN_DIEM_NHAN';
CREATE INDEX ix_don_customer_time ON dbo.don_hang(ma_kh,tao_luc DESC) INCLUDE(trang_thai);
CREATE INDEX ix_don_queue ON dbo.don_hang(trang_thai,tao_luc) INCLUDE(ma_kh);
CREATE INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang(ma_tx,bat_dau_luc DESC) INCLUDE(ma_don,ket_qua);
CREATE INDEX ix_log_order_time ON dbo.nhat_ky_don_hang(ma_don,thoi_gian,ma_su_kien);
CREATE INDEX ix_gd_driver_time ON dbo.giao_dich_nop_tien(ma_tx,tao_luc DESC) INCLUDE(trang_thai,so_tien_yeu_cau);
CREATE INDEX ix_chia_payment ON dbo.phan_chia_cuoc(ma_giao_dich_nop) INCLUDE(ma_phan_cong);
CREATE INDEX ix_audit_object ON dbo.nhat_ky_kiem_toan(doi_tuong,ma_doi_tuong,thoi_gian DESC);
GO

