SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo', N'mini_ong_vang_design_v2_test')
    THROW 52400, N'V12 is restricted to designV2 demo/test databases', 1;

-- V11 replaced the working 12345678 hash with one for a different password.
-- Only repair accounts still carrying that exact hash, preserving later password changes.
UPDATE dbo.tai_khoan
SET mat_khau_hash = N'$2a$12$UtM40aUakGjktuJCHkLoTehUjLszC39AdfwpqUH2fUjCZqKc2WTfW'
WHERE username IN (
    N'0900000001', N'0900000002', N'0900000003',
    N'demo_dispatcher', N'demo_admin',
    N'0800000001', N'0800000002', N'0800000003'
)
AND mat_khau_hash = N'$2a$12$/wS5Xo5EaRXLYFwYgw7XPuAddgjumoPBsQ8UJKjBgCYoj7KN3.Xh2';
