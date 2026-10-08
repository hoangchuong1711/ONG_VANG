CREATE TABLE bao_gia (
    ma_bao_gia VARCHAR(36) PRIMARY KEY,
    ma_kh VARCHAR(36) NOT NULL REFERENCES khach_hang(ma_kh),
    ma_bieu_phi VARCHAR(36) NOT NULL,
    tao_luc TIMESTAMPTZ NOT NULL,
    het_han_luc TIMESTAMPTZ NOT NULL,
    yeu_cau_json TEXT NOT NULL,
    ket_qua_json TEXT NOT NULL,
    CONSTRAINT chk_bao_gia_han CHECK (het_han_luc > tao_luc)
);
CREATE INDEX idx_bao_gia_khach_han ON bao_gia(ma_kh, het_han_luc);
