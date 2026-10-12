-- DT01: FK alone does not guarantee that an account has the right profile.
CREATE OR ALTER TRIGGER dbo.trg_customer_profile_role
ON dbo.khach_hang AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.tai_khoan a ON a.ma_tk=i.ma_tk
               WHERE a.vai_tro<>N'KHACH_HANG')
        THROW 51080, 'Customer profile requires a customer account', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_driver_profile_role
ON dbo.tai_xe AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.tai_khoan a ON a.ma_tk=i.ma_tk
               WHERE a.vai_tro<>N'TAI_XE')
        THROW 51081, 'Driver profile requires a driver account', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_account_role_immutable
ON dbo.tai_khoan AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk
               WHERE i.vai_tro<>d.vai_tro)
        THROW 51082, 'Account role is immutable', 1;
END;
GO
