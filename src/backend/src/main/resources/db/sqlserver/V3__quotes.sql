CREATE TABLE [${flyway:defaultSchema}].bao_gia (
    ma_bao_gia NVARCHAR(36) PRIMARY KEY,
    ma_kh NVARCHAR(36) NOT NULL REFERENCES [${flyway:defaultSchema}].khach_hang(ma_kh),
    ma_bieu_phi NVARCHAR(36) NOT NULL,
    tao_luc DATETIME2(6) NOT NULL,
    het_han_luc DATETIME2(6) NOT NULL,
    yeu_cau_json NVARCHAR(MAX) NOT NULL,
    ket_qua_json NVARCHAR(MAX) NOT NULL,
    CONSTRAINT chk_bao_gia_han CHECK (het_han_luc > tao_luc)
);
CREATE INDEX idx_bao_gia_khach_han ON [${flyway:defaultSchema}].bao_gia(ma_kh, het_han_luc);
