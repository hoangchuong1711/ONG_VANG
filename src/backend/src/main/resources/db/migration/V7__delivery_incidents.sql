ALTER TABLE nhat_ky_trang_thai ADD COLUMN loai_su_co varchar(30);
ALTER TABLE nhat_ky_trang_thai ADD CONSTRAINT ck_delivery_incident CHECK (
    loai_su_co IS NULL OR (
        loai_su_co IN ('KHONG_LIEN_LAC_DUOC', 'TU_CHOI_NHAN')
        AND trang_thai = 'DANG_GIAO'
        AND ghi_chu_su_co IS NOT NULL AND length(trim(ghi_chu_su_co)) > 0
    )
);
