SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo',N'mini_ong_vang_design_v2_test')
    THROW 52400,N'V10 chỉ được chạy trên DB demo/test của schema hiện tại',1;

DECLARE @hash NVARCHAR(255)=N'$2a$12$UtM40aUakGjktuJCHkLoTehUjLszC39AdfwpqUH2fUjCZqKc2WTfW';

BEGIN TRY
    BEGIN TRAN;

    UPDATE dbo.tai_khoan
    SET mat_khau_hash=@hash
    WHERE username IN (
        N'0900000001', N'0900000002', N'0900000003',
        N'demo_dispatcher', N'demo_admin',
        N'0800000001', N'0800000002', N'0800000003'
    );

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
END CATCH;
