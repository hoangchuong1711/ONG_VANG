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

    UPDATE tx
    SET vi_tri_demo_dia_chi = CASE tk.username
            WHEN N'0800000001' THEN N'227 Nguyễn Văn Cừ, TP.HCM'
            WHEN N'0800000002' THEN N'268 Lý Thường Kiệt, TP.HCM'
            WHEN N'0800000003' THEN N'2 Công xã Paris, TP.HCM'
        END,
        vi_tri_demo_lat = CASE tk.username
            WHEN N'0800000001' THEN 10.7626220
            WHEN N'0800000002' THEN 10.7725670
            WHEN N'0800000003' THEN 10.7797830
        END,
        vi_tri_demo_lng = CASE tk.username
            WHEN N'0800000001' THEN 106.6821800
            WHEN N'0800000002' THEN 106.6601720
            WHEN N'0800000003' THEN 106.6991200
        END,
        vi_tri_demo_nguon=N'DEMO_CO_DINH',
        vi_tri_demo_luc=SYSUTCDATETIME()
    FROM dbo.tai_xe tx
    JOIN dbo.tai_khoan tk ON tk.ma_tk=tx.ma_tk
    WHERE tk.username IN (N'0800000001',N'0800000002',N'0800000003');

    COMMIT;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
END CATCH;
