ALTER TABLE dbo.[nhat_ky_don_hang] DROP CONSTRAINT [ck_order_event_shape];
ALTER TABLE dbo.[nhat_ky_don_hang] DROP CONSTRAINT [ck_nhat_ky_don_hang_loai_su_kien];

ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_nhat_ky_don_hang_loai_su_kien]
  CHECK ([loai_su_kien] IN (N'TAO_DON',N'CHUYEN_TRANG_THAI',N'DEN_DIEM_NHAN',N'SU_CO'));

ALTER TABLE dbo.[nhat_ky_don_hang] ADD CONSTRAINT [ck_order_event_shape] CHECK (
  ([loai_su_kien]=N'TAO_DON' AND [thu_tu]=1 AND [trang_thai_truoc] IS NULL AND [trang_thai_sau]=N'CHO_GAN' AND [loai_su_co] IS NULL)
  OR ([loai_su_kien]=N'CHUYEN_TRANG_THAI' AND [trang_thai_truoc] IS NOT NULL AND [trang_thai_truoc]<>[trang_thai_sau] AND [loai_su_co] IS NULL)
  OR ([loai_su_kien]=N'DEN_DIEM_NHAN' AND [trang_thai_truoc]=N'DANG_GIAO' AND [trang_thai_sau]=N'DANG_GIAO' AND [loai_su_co] IS NULL AND [ghi_chu] IS NULL)
  OR ([loai_su_kien]=N'SU_CO' AND [trang_thai_truoc]=N'DANG_GIAO' AND [trang_thai_sau]=N'DANG_GIAO' AND [loai_su_co] IS NOT NULL AND [ghi_chu] IS NOT NULL)
);

CREATE UNIQUE INDEX [ux_nhat_ky_don_hang_arrival] ON dbo.[nhat_ky_don_hang]([ma_don])
  WHERE [loai_su_kien]=N'DEN_DIEM_NHAN';
