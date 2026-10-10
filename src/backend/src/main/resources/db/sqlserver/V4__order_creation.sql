CREATE TABLE [${flyway:defaultSchema}].order_creation_request (
    request_id NVARCHAR(64) PRIMARY KEY,
    ma_tk NVARCHAR(36) NOT NULL REFERENCES [${flyway:defaultSchema}].tai_khoan(ma_tk),
    ma_don NVARCHAR(36) NOT NULL UNIQUE REFERENCES [${flyway:defaultSchema}].don_hang(ma_don),
    request_json NVARCHAR(MAX) NOT NULL,
    response_json NVARCHAR(MAX) NOT NULL,
    expires_at DATETIME2(6) NOT NULL
);
CREATE INDEX ix_order_creation_expiry ON [${flyway:defaultSchema}].order_creation_request(expires_at);
