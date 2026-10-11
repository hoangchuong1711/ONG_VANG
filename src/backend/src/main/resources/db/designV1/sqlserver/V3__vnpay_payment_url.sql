ALTER TABLE dbo.thanh_toan ADD payment_url NVARCHAR(2048) NULL;
GO
ALTER TABLE dbo.thanh_toan ADD CONSTRAINT ck_payment_url_method
    CHECK (payment_url IS NULL OR phuong_thuc = N'VNPAY_QR');
