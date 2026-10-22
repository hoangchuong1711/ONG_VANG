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
CREATE ROLE r_khach_hang;
CREATE ROLE r_tai_xe;
CREATE ROLE r_tong_dai;
CREATE ROLE r_chu_doi_xe;
CREATE ROLE r_payment_worker;
CREATE ROLE r_auth_backend;
CREATE USER demo_khach WITHOUT LOGIN;
CREATE USER demo_taixe WITHOUT LOGIN;
CREATE USER demo_tongdai WITHOUT LOGIN;
CREATE USER demo_chudoi WITHOUT LOGIN;
CREATE USER demo_payment WITHOUT LOGIN;
CREATE USER demo_auth WITHOUT LOGIN;
ALTER ROLE r_khach_hang ADD MEMBER demo_khach;
ALTER ROLE r_tai_xe ADD MEMBER demo_taixe;
ALTER ROLE r_tong_dai ADD MEMBER demo_tongdai;
ALTER ROLE r_chu_doi_xe ADD MEMBER demo_chudoi;
ALTER ROLE r_payment_worker ADD MEMBER demo_payment;
ALTER ROLE r_auth_backend ADD MEMBER demo_auth;
GO
GRANT EXECUTE ON dbo.usp_tao_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_huy_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_doc_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_tien_trinh TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_hoan_tat TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_bat_dau_thanh_toan TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_thu_nhap_cua_toi TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doc_don TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_tao_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_huy_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_doc_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_tao_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_huy_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_quan_ly_phuong_tien TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_doc_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_ap_dung_ket_qua_nop TO r_payment_worker;
GRANT EXECUTE ON dbo.usp_dang_ky_khach TO r_auth_backend;
GRANT SELECT ON dbo.v_tai_xe_san_sang TO r_tong_dai;
GRANT SELECT ON dbo.phan_cong_don_hang TO r_tong_dai;
GRANT SELECT ON dbo.v_tai_xe_san_sang TO r_chu_doi_xe;
GRANT SELECT ON dbo.phan_cong_don_hang TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_chia_cuoc TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_so_du_tai_xe TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_giao_dich_nop TO r_chu_doi_xe;
-- Chỉ pool backend tin cậy. Không phải quyền cấp cho khách/tài xế trực tiếp.
GRANT SELECT,INSERT,DELETE ON dbo.tai_khoan TO r_auth_backend;
GRANT UPDATE (ho_ten,so_dien_thoai,email,mat_khau_hash,auth_version,trang_thai) ON dbo.tai_khoan TO r_auth_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.khach_hang TO r_auth_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.tai_xe TO r_auth_backend;
GRANT SELECT ON dbo.phuong_tien TO r_auth_backend;
DENY SELECT ON dbo.tai_khoan TO r_khach_hang;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_khach_hang;
DENY SELECT ON dbo.tai_khoan TO r_tai_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tai_xe;
DENY SELECT ON dbo.tai_khoan TO r_tong_dai;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tong_dai;
DENY SELECT ON dbo.tai_khoan TO r_chu_doi_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_chu_doi_xe;
DENY SELECT,INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_payment_worker;
DENY INSERT,UPDATE,DELETE ON dbo.don_hang TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.chi_tiet_kien_hang TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.phu_thu_don_hang TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.phan_cong_don_hang TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.phan_chia_cuoc TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.giao_dich_nop_tien TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.su_kien_thanh_toan TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.nhat_ky_don_hang TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.nhat_ky_kiem_toan TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.cau_hinh_cuoc TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.cau_hinh_phu_thu TO r_auth_backend;
DENY INSERT,UPDATE,DELETE ON dbo.chinh_sach_thanh_vien TO r_auth_backend;
GO
-- Minh họa quyền tạm; trạng thái cuối tổng đài không có view giao dịch nộp.
GRANT SELECT ON dbo.v_giao_dich_nop TO r_tong_dai;
REVOKE SELECT ON dbo.v_giao_dich_nop FROM r_tong_dai;
GO

GRANT EXECUTE ON dbo.usp_admin_quan_ly_tai_xe TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_admin_trang_thai_khach TO r_auth_backend;
GO
GRANT EXECUTE ON dbo.usp_admin_quan_ly_tong_dai TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_cap_nhat_ho_so_tai_khoan TO r_auth_backend;
GRANT EXECUTE ON dbo.usp_doi_mat_khau_tai_khoan TO r_auth_backend;
GO
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_chu_doi_xe;
GO
GRANT EXECUTE ON dbo.usp_admin_gan_hang_khach TO r_auth_backend;
GO
GO
GRANT EXECUTE ON dbo.usp_admin_dat_mat_khau_tai_xe TO r_auth_backend;
GO
