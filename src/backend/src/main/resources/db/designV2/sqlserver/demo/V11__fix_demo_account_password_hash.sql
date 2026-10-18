SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo',N'mini_ong_vang_design_v2_test',N'mini_ong_vang_test')
    THROW 52400,N'V11 chỉ được chạy trên DB demo/test của schema designV2',1;

DECLARE @hash NVARCHAR(255)=N'$2a$12$/wS5Xo5EaRXLYFwYgw7XPuAddgjumoPBsQ8UJKjBgCYoj7KN3.Xh2';

BEGIN TRY
    BEGIN TRAN;

    UPDATE dbo.tai_khoan
    SET mat_khau_hash=@hash
    WHERE username IN (
        N'0900000001', N'0900000002', N'0900000003',
        N'demo_dispatcher', N'demo_admin',
        N'0800000001', N'0800000002', N'0800000003'
    );

    IF @@ROWCOUNT <> 8
        THROW 52402,N'V11 yêu cầu đủ 8 tài khoản demo trước khi cập nhật mật khẩu',1;

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    THROW;
END CATCH;
