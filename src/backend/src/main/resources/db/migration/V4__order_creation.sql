CREATE TABLE order_creation_request (
    request_id VARCHAR(64) PRIMARY KEY,
    ma_tk VARCHAR(36) NOT NULL REFERENCES tai_khoan(ma_tk),
    ma_don VARCHAR(36) NOT NULL UNIQUE REFERENCES don_hang(ma_don),
    request_json TEXT NOT NULL,
    response_json TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_order_creation_expiry ON order_creation_request(expires_at);
