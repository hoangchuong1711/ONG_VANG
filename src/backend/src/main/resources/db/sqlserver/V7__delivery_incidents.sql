ALTER TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai ADD loai_su_co NVARCHAR(30);
GO
ALTER TABLE [${flyway:defaultSchema}].nhat_ky_trang_thai ADD CONSTRAINT ck_delivery_incident CHECK (
    loai_su_co IS NULL OR (
        loai_su_co IN (N'KHONG_LIEN_LAC_DUOC', N'TU_CHOI_NHAN')
        AND trang_thai = N'DANG_GIAO'
        AND ghi_chu_su_co IS NOT NULL AND LEN(TRIM(ghi_chu_su_co)) > 0
    )
);
