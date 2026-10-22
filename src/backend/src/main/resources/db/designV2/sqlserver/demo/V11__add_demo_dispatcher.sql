-- Additional dispatcher for testing concurrent assignment on demo/test databases.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo', N'mini_ong_vang_design_v2_test')
 THROW 52400, N'V11 chỉ được chạy trên DB demo/test của schema designV2', 1;

-- Use the same BCrypt hash for 12345678 as the V9 demo accounts.
-- Let uniqueness constraints reject collisions rather than overwrite an account.
INSERT dbo.tai_khoan
 (ma_tk, username, mat_khau_hash, ho_ten, so_dien_thoai, vai_tro, trang_thai)
VALUES
 ('10000000-0000-0000-0000-000000000103',
  N'demo_dispatcher_2',
  N'$2a$12$g4SKnozNPTfhvGmcbR027eZuc2xPibVo8up0kjlRNTv3oCfbyxJsO',
  N'Tổng đài demo 2', NULL, 'TONG_DAI', 'HOAT_DONG');
GO
