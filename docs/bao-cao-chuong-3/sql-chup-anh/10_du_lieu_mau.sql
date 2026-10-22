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
SELECT N'Tài khoản' AS doi_tuong,COUNT(*) AS so_luong FROM dbo.tai_khoan
UNION ALL SELECT N'Đơn hàng',COUNT(*) FROM dbo.don_hang
UNION ALL SELECT N'Kiện hàng',COUNT(*) FROM dbo.chi_tiet_kien_hang
UNION ALL SELECT N'Liên kết phụ thu',COUNT(*) FROM dbo.phu_thu_don_hang
UNION ALL SELECT N'Phân công',COUNT(*) FROM dbo.phan_cong_don_hang
UNION ALL SELECT N'Khoản chia',COUNT(*) FROM dbo.phan_chia_cuoc
UNION ALL SELECT N'Giao dịch nộp',COUNT(*) FROM dbo.giao_dich_nop_tien;
SELECT trang_thai,COUNT(*) AS so_don FROM dbo.don_hang GROUP BY trang_thai;
SELECT trang_thai,COUNT(*) AS so_giao_dich
FROM dbo.giao_dich_nop_tien GROUP BY trang_thai;
SELECT ma_don FROM dbo.v_chia_cuoc
WHERE tien_cong_ty+tien_tai_xe<>tong_cuoc;
SELECT ma_tx FROM dbo.v_so_du_tai_xe
WHERE con_phai_nop<>dang_thanh_toan+chua_dua_vao_thanh_toan
 OR cong_ty_duoc_huong<>da_nop+con_phai_nop;
SELECT ma_don FROM dbo.phan_cong_don_hang
WHERE ket_thuc_luc IS NULL GROUP BY ma_don HAVING COUNT(*)>1;
-- Ba truy vấn cuối phải trả về 0 dòng nếu các bất biến trên được giữ.