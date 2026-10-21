-- Flyway keeps V4/V6/V7/V23 in history; this migration removes their
-- admin-only objects from databases that have already applied them.
DROP PROCEDURE IF EXISTS dbo.usp_admin_dong_hieu_luc_hien_tai;
DROP PROCEDURE IF EXISTS dbo.usp_quan_ly_chinh_sach;
DROP TRIGGER IF EXISTS dbo.tr_policy_cau_hinh_cuoc;
DROP TRIGGER IF EXISTS dbo.tr_policy_chinh_sach_thanh_vien;
DROP TRIGGER IF EXISTS dbo.tr_policy_cau_hinh_phu_thu;
DROP VIEW IF EXISTS dbo.v_phien_ban_chinh_sach;
