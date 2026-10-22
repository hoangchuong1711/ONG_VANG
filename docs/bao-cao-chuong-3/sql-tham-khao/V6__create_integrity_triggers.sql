-- FILE: V6__create_integrity_triggers.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE OR ALTER TRIGGER dbo.tr_kh_role ON dbo.khach_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'KHACH_HANG')
  THROW 51001,N'Hồ sơ khách sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tx_role ON dbo.tai_xe AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'TAI_XE')
  THROW 51002,N'Hồ sơ tài xế sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tk_role_audit ON dbo.tai_khoan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.vai_tro<>d.vai_tro)
  THROW 51003,N'Không đổi vai trò tài khoản đã tạo',1;
 INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
 SELECT TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),'TAI_KHOAN',i.ma_tk,'DOI_TRANG_THAI',
  (SELECT d.trang_thai AS truoc,i.trang_thai AS sau FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.trang_thai<>d.trang_thai;
 -- Không ghi hash/mật khẩu/token vào audit.
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_don_transition_log ON dbo.don_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 IF @actor IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG')
  THROW 51004,N'Thiếu tài khoản thao tác hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don
  WHERE d.ma_don IS NULL AND i.trang_thai<>'CHO_GAN') THROW 51005,N'Đơn mới phải chờ gán',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don WHERE i.trang_thai<>d.trang_thai AND NOT(
  (d.trang_thai='CHO_GAN' AND i.trang_thai IN ('DA_GAN','DA_HUY')) OR
  (d.trang_thai='DA_GAN' AND i.trang_thai IN ('CHO_GAN','DA_LAY_HANG','DA_HUY')) OR
  (d.trang_thai='DA_LAY_HANG' AND i.trang_thai='DANG_GIAO') OR
  (d.trang_thai='DANG_GIAO' AND i.trang_thai='HOAN_TAT')))
  THROW 51006,N'Chuyển trạng thái không hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don
  WHERE EXISTS(SELECT i.ma_kh,i.ma_tk_tao,i.khoa_yeu_cau,i.hash_yeu_cau,i.ma_bieu_phi,i.ma_chinh_sach,
   i.cuoc_km,i.cuoc_kg,i.tien_giam,i.quang_duong_km,i.diem_lay,i.diem_giao,i.ten_nguoi_nhan,i.sdt_nguoi_nhan
   EXCEPT SELECT d.ma_kh,d.ma_tk_tao,d.khoa_yeu_cau,d.hash_yeu_cau,d.ma_bieu_phi,d.ma_chinh_sach,
   d.cuoc_km,d.cuoc_kg,d.tien_giam,d.quang_duong_km,d.diem_lay,d.diem_giao,d.ten_nguoi_nhan,d.sdt_nguoi_nhan))
  THROW 51007,N'Không sửa nội dung/giá đơn đã tạo',1;
 INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
 SELECT i.ma_don,@actor,CASE WHEN d.ma_don IS NULL THEN 'TAO_DON' ELSE 'CHUYEN_TRANG_THAI' END,d.trang_thai,i.trang_thai
 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don WHERE d.ma_don IS NULL OR d.trang_thai<>i.trang_thai;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_chia_hop_le ON dbo.phan_chia_cuoc AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_don=d.ma_don WHERE i.ma_don IS NULL)
  THROW 51008,N'Không xóa khoản chia',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don
  WHERE i.ma_phan_cong<>d.ma_phan_cong OR i.ghi_nhan_luc<>d.ghi_nhan_luc)
  THROW 51009,N'Không sửa nguồn/thời điểm khoản chia',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.don_hang d ON d.ma_don=i.ma_don
  JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=i.ma_phan_cong
  WHERE d.trang_thai<>'HOAN_TAT' OR p.ket_qua IS NULL OR p.ket_qua<>'HOAN_TAT')
  THROW 51010,N'Chỉ chia cước cho phân công hoàn tất',1;
 -- Không chuyển trực tiếp liên kết giữa hai giao dịch. Chỉ tháo sau KHONG_THU.
 IF EXISTS(SELECT 1 FROM deleted d JOIN inserted i ON i.ma_don=d.ma_don
  JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=d.ma_giao_dich_nop
  WHERE (i.ma_giao_dich_nop IS NULL OR i.ma_giao_dich_nop<>d.ma_giao_dich_nop)
   AND (i.ma_giao_dich_nop IS NOT NULL OR g.trang_thai<>'KHONG_THU'))
  THROW 51011,N'Không tháo khoản đang chờ hoặc đã nộp',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don
  JOIN dbo.giao_dich_nop_tien g ON g.ma_giao_dich=i.ma_giao_dich_nop
  JOIN dbo.v_chia_cuoc c ON c.ma_don=i.ma_don
  WHERE (d.ma_don IS NULL OR d.ma_giao_dich_nop IS NULL)
   AND (g.giai_quyet_luc IS NOT NULL OR g.ma_tx<>c.ma_tx OR c.tien_cong_ty<=0))
  THROW 51012,N'Liên kết giao dịch sai tài xế/trạng thái/số tiền',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_gd_bao_ve ON dbo.giao_dich_nop_tien AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_giao_dich=d.ma_giao_dich WHERE i.ma_giao_dich IS NULL)
  THROW 51013,N'Không xóa giao dịch',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_giao_dich=i.ma_giao_dich
  WHERE d.ma_giao_dich IS NULL AND i.trang_thai<>'CHO_XU_LY')
  THROW 51014,N'Giao dịch mới phải chờ xử lý',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_giao_dich=i.ma_giao_dich
  WHERE i.ma_tx<>d.ma_tx OR i.khoa_yeu_cau<>d.khoa_yeu_cau OR i.ma_tham_chieu<>d.ma_tham_chieu OR i.so_tien_yeu_cau<>d.so_tien_yeu_cau OR i.tao_luc<>d.tao_luc
   OR (d.giai_quyet_luc IS NOT NULL AND EXISTS(SELECT i.trang_thai,i.giai_quyet_luc,i.ma_giao_dich_doi_tac,i.so_tien_thuc_nhan
     EXCEPT SELECT d.trang_thai,d.giai_quyet_luc,d.ma_giao_dich_doi_tac,d.so_tien_thuc_nhan)))
  THROW 51016,N'Không đổi định danh/số tiền/kết quả đã chốt',1;
 -- INSERT giao dịch xảy ra trước khi gắn khoản chia trong cùng TX4.
 -- Khi thành công bắt buộc các khoản đang gắn khớp số tiền đã yêu cầu.
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.v_giao_dich_nop v ON v.ma_giao_dich=i.ma_giao_dich
  WHERE i.trang_thai='THANH_CONG' AND (v.so_don_dang_lien_ket=0 OR v.tong_khoan_lien_ket<>i.so_tien_yeu_cau))
  THROW 51017,N'Số tiền thành công không khớp các khoản chia',1;
END;
GO

-- FILE: V6__create_integrity_triggers.sql
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_cuoc ON dbo.cau_hinh_cuoc AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_bieu_phi=d.ma_bieu_phi
 WHERE d.trang_thai='CONG_BO' AND (i.ma_bieu_phi IS NULL
  OR EXISTS(SELECT i.ten,i.cuoc_co_ban,i.don_gia_km,i.km_toi_thieu,i.km_toi_da,i.kg_bao_gom,i.kg_toi_da,i.don_gia_kg,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ten,d.cuoc_co_ban,d.don_gia_km,d.km_toi_thieu,d.km_toi_da,d.kg_bao_gom,d.kg_toi_da,d.don_gia_kg,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_chinh_sach_thanh_vien ON dbo.chinh_sach_thanh_vien AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_chinh_sach=d.ma_chinh_sach
 WHERE d.trang_thai='CONG_BO' AND (i.ma_chinh_sach IS NULL
  OR EXISTS(SELECT i.ma_hang,i.ty_le_giam,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_hang,d.ty_le_giam,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_phu_thu ON dbo.cau_hinh_phu_thu AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_phu_thu=d.ma_phu_thu
 WHERE d.trang_thai='CONG_BO' AND (i.ma_phu_thu IS NULL
  OR EXISTS(SELECT i.ma_loai,i.ten,i.so_tien,i.bat_buoc,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_loai,d.ten,d.so_tien,d.bat_buoc,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO

