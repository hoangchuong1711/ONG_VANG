-- Distinguish a rejection from later completion/cancellation of an assignment.
ALTER TABLE [${flyway:defaultSchema}].phan_cong_don_hang ADD tu_choi BIT NOT NULL DEFAULT 0;
GO
ALTER TABLE [${flyway:defaultSchema}].phan_cong_don_hang ADD CONSTRAINT chk_pc_rejection CHECK
    (tu_choi = 0 OR (ket_thuc_luc IS NOT NULL AND LEN(TRIM(ly_do_ket_thuc)) > 0
                    AND ly_do_ket_thuc IS NOT NULL));
CREATE INDEX ix_pc_rejected_order_driver ON [${flyway:defaultSchema}].phan_cong_don_hang(ma_don, ma_tx) WHERE tu_choi = 1;
