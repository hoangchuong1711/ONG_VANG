ALTER TABLE dbo.tai_khoan ADD auth_version BIGINT NOT NULL CONSTRAINT df_tai_khoan_auth_version DEFAULT 0;

CREATE TABLE dbo.password_reset_challenge (
    ma_tk NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
    otp_hash NVARCHAR(255) NULL,
    otp_expires_at DATETIME2(6) NOT NULL,
    attempts INT NOT NULL CONSTRAINT df_reset_attempts DEFAULT 0,
    token_hash NVARCHAR(64) NULL,
    token_expires_at DATETIME2(6) NULL,
    auth_version BIGINT NOT NULL,
    CONSTRAINT fk_reset_account FOREIGN KEY (ma_tk) REFERENCES dbo.tai_khoan(ma_tk) ON DELETE CASCADE,
    CONSTRAINT ck_reset_attempts CHECK (attempts BETWEEN 0 AND 5)
);

CREATE TABLE dbo.auth_rate_limit (
    bucket_key VARCHAR(64) NOT NULL PRIMARY KEY,
    expires_at DATETIME2(6) NOT NULL,
    request_count INT NOT NULL,
    CONSTRAINT ck_auth_rate_count CHECK (request_count > 0)
);
CREATE INDEX ix_auth_rate_expiry ON dbo.auth_rate_limit(expires_at);
