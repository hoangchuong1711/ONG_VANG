-- Distinguish a rejection from later completion/cancellation of an assignment.
ALTER TABLE phan_cong_don_hang ADD COLUMN tu_choi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE phan_cong_don_hang ADD CONSTRAINT chk_pc_rejection CHECK
    (NOT tu_choi OR (ket_thuc_luc IS NOT NULL AND length(trim(ly_do_ket_thuc)) > 0
                    AND ly_do_ket_thuc IS NOT NULL));
CREATE INDEX ix_pc_rejected_order_driver ON phan_cong_don_hang(ma_don, ma_tx) WHERE tu_choi;
