-- This T03 fixture is a known rejection, not a completed trip. V5 defaulted
-- legacy rows to false; repair only the exact demo row, without inferring
-- rejection from arbitrary application reasons or modifying old checksums.
UPDATE phan_cong_don_hang SET tu_choi = TRUE
WHERE ma_phan_cong = 'PC-DEMO-REJECTED'
  AND ma_don = 'DH-DEMO-PAID-CASH' AND ma_tx = 'TX-DEMO-2'
  AND ket_thuc_luc IS NOT NULL
  AND ly_do_ket_thuc = 'Tài xế từ chối: xe gặp sự cố';
