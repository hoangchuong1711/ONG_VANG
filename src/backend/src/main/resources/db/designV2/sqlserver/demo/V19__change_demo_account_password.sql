SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo',N'mini_ong_vang_design_v2_test')
    THROW 52400,N'V14 chi chay tren DB demo/test cua schema designV2',1;

DECLARE @hash NVARCHAR(255)=N'$2a$12$g4SKnozNPTfhvGmcbR027eZuc2xPibVo8up0kjlRNTv3oCfbyxJsO';

BEGIN TRY
    BEGIN TRAN;

    UPDATE dbo.tai_khoan
    SET mat_khau_hash=@hash,
        auth_version=auth_version+1
    WHERE username IN (
        N'0900000001', N'0900000002', N'0900000003',
        N'demo_dispatcher', N'demo_admin',
        N'0800000001', N'0800000002', N'0800000003'
    );

    IF @@ROWCOUNT <> 8
        THROW 52402,N'V14 yeu cau du 8 tai khoan demo truoc khi cap nhat mat khau',1;

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    THROW;
END CATCH;
