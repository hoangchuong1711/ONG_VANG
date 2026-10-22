-- Consolidated DesignV2 through V26. Fresh database only.
-- Application migration. See ../README.md; preserve checksum after deployment.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_tao_don
 @ma_kh UNIQUEIDENTIFIER,@khoa VARCHAR(100),@hash BINARY(32),
 @diem_lay NVARCHAR(255),@diem_giao NVARCHAR(255),@ten_nhan NVARCHAR(100),@sdt_nhan VARCHAR(10),
 @km DECIMAL(10,2),@giay INT,@nguon VARCHAR(10),@kien_json NVARCHAR(MAX),@phu_thu_json NVARCHAR(MAX),
 @gia_da_dong_y DECIMAL(15,0)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@now DATETIME2(3)=SYSUTCDATETIME(),@id UNIQUEIDENTIFIER,@oldhash BINARY(32);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') THROW 51102,N'Không được tạo đơn',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
   WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG' AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51103,N'Khách hàng không hợp lệ',1;
  DECLARE @lock NVARCHAR(255)=N'tao-don:'+CONVERT(NVARCHAR(36),@actor);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  SELECT @id=ma_don,@oldhash=hash_yeu_cau FROM dbo.don_hang WHERE ma_tk_tao=@actor AND khoa_yeu_cau=@khoa;
  IF @id IS NOT NULL
  BEGIN
   IF @oldhash<>@hash THROW 51104,N'Khóa tạo đơn đã dùng cho nội dung khác',1;
   COMMIT; SELECT @id AS ma_don; RETURN;
  END;
  IF @km IS NULL OR @km<=0 OR @giay IS NULL OR @giay<=0 OR @gia_da_dong_y IS NULL
   OR @khoa IS NULL OR LEN(@khoa)=0 OR @hash IS NULL
   OR ISNULL(ISJSON(@kien_json),0)<>1 OR LEFT(LTRIM(@kien_json),1)<>'['
   OR ISNULL(ISJSON(@phu_thu_json),0)<>1 OR LEFT(LTRIM(@phu_thu_json),1)<>'['
   THROW 51105,N'Dữ liệu tạo đơn không hợp lệ',1;
  DECLARE @kien TABLE(thu_tu INT,loai NVARCHAR(100),kg DECIMAL(10,2));
  INSERT @kien SELECT thu_tu,loai,kg FROM OPENJSON(@kien_json)
   WITH(thu_tu INT '$.thu_tu',loai NVARCHAR(100) '$.loai_hang',kg DECIMAL(10,2) '$.kg');
  IF NOT EXISTS(SELECT 1 FROM @kien) OR EXISTS(SELECT 1 FROM @kien WHERE thu_tu IS NULL OR thu_tu<=0 OR kg IS NULL OR kg<=0 OR loai IS NULL OR LEN(LTRIM(RTRIM(loai)))=0)
   OR EXISTS(SELECT thu_tu FROM @kien GROUP BY thu_tu HAVING COUNT(*)>1)
   THROW 51106,N'Kiện hàng không hợp lệ',1;
  DECLARE @pt TABLE(id UNIQUEIDENTIFIER);
  INSERT @pt SELECT TRY_CONVERT(UNIQUEIDENTIFIER,value) FROM OPENJSON(@phu_thu_json);
  IF EXISTS(SELECT 1 FROM @pt WHERE id IS NULL) OR EXISTS(SELECT id FROM @pt GROUP BY id HAVING COUNT(*)>1)
   THROW 51107,N'Phụ thu không hợp lệ hoặc trùng',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  DECLARE @kg DECIMAL(10,2)=(SELECT SUM(kg) FROM @kien),@bp UNIQUEIDENTIFIER,@cs UNIQUEIDENTIFIER,
   @ckm DECIMAL(15,0),@ckg DECIMAL(15,0),@giam DECIMAL(15,0)=0,@phuthu DECIMAL(15,0),@rate DECIMAL(5,2)=0;
  IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
   THROW 51108,N'Phải có đúng một biểu phí đang hiệu lực',1;
  SELECT @bp=ma_bieu_phi,@ckm=dbo.fn_cuoc_km(cuoc_co_ban,@km,don_gia_km),@ckg=dbo.fn_cuoc_kg(@kg,kg_bao_gom,don_gia_kg)
  FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den)
   AND @km BETWEEN km_toi_thieu AND km_toi_da AND @kg<=kg_toi_da;
  IF @bp IS NULL THROW 51109,N'Ngoài phạm vi km/kg',1;
  DECLARE @hang VARCHAR(15)='THUONG';
  SELECT @hang=ma_hang FROM dbo.khach_hang WITH(UPDLOCK,HOLDLOCK)
   WHERE ma_kh=@ma_kh AND thanh_vien_tu<=@now AND (thanh_vien_den IS NULL OR @now<thanh_vien_den);
  IF @hang<>'THUONG'
  BEGIN
   IF (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
    THROW 51110,N'Chính sách thành viên thiếu hoặc chồng',1;
   SELECT @cs=ma_chinh_sach,@rate=ty_le_giam FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den);
  END;
  IF EXISTS(SELECT 1 FROM @pt x LEFT JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id
   WHERE p.ma_phu_thu IS NULL OR p.bat_buoc<>0 OR p.trang_thai<>'CONG_BO' OR p.hieu_luc_tu>@now OR p.hieu_luc_den<=@now)
   OR EXISTS(SELECT p.ma_loai FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id GROUP BY p.ma_loai HAVING COUNT(*)>1)
   THROW 51111,N'Phụ thu tùy chọn không hiệu lực, không đúng loại hoặc bị trùng',1;
  INSERT @pt SELECT ma_phu_thu FROM dbo.cau_hinh_phu_thu
   WHERE bat_buoc=1 AND trang_thai='CONG_BO' AND hieu_luc_tu<=@now
    AND (hieu_luc_den IS NULL OR @now<hieu_luc_den);
  IF EXISTS(SELECT p.ma_loai FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id
    GROUP BY p.ma_loai HAVING COUNT(*)>1) THROW 51111,N'Phụ thu bị chồng phiên bản hoặc trùng loại',1;
  SELECT @phuthu=COALESCE(SUM(p.so_tien),0) FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id;
  SET @giam=dbo.fn_tien_giam(@ckm+@ckg+@phuthu,@rate);
  IF @gia_da_dong_y<>@ckm+@ckg-@giam+@phuthu THROW 51112,N'Giá thay đổi; cần khách xác nhận lại',1;
  SET @id=NEWID();
  INSERT dbo.don_hang(ma_don,ma_kh,ma_tk_tao,khoa_yeu_cau,hash_yeu_cau,ma_bieu_phi,ma_chinh_sach,diem_lay,diem_giao,
   ten_nguoi_nhan,sdt_nguoi_nhan,quang_duong_km,thoi_gian_du_kien_giay,nguon_lo_trinh,cuoc_km,cuoc_kg,tien_giam,tao_luc)
  VALUES(@id,@ma_kh,@actor,@khoa,@hash,@bp,@cs,@diem_lay,@diem_giao,@ten_nhan,@sdt_nhan,@km,@giay,@nguon,@ckm,@ckg,@giam,@now);
  INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg) SELECT @id,thu_tu,loai,kg FROM @kien;
  INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) SELECT @id,id FROM @pt;
  COMMIT; SELECT @id AS ma_don;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_phan_cong @ma_don UNIQUEIDENTIFIER,@ma_tx UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 51201,N'Không có quyền điều phối',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang WITH(UPDLOCK,HOLDLOCK) WHERE ma_don=@ma_don AND trang_thai='CHO_GAN')
   THROW 51202,N'Đơn không chờ gán',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.v_tai_xe_san_sang WHERE ma_tx=@ma_tx) THROW 51203,N'Tài xế không sẵn sàng',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang
    WHERE ma_don=@ma_don AND ma_tx=@ma_tx AND ket_qua='TU_CHOI')
   THROW 51204,N'Tài xế đã từ chối đơn này',1;
  INSERT dbo.phan_cong_don_hang(ma_don,ma_tx,ma_tk_dieu_phoi) VALUES(@ma_don,@ma_tx,@actor);
  UPDATE dbo.don_hang SET trang_thai='DA_GAN' WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=NULL WHERE ma_tx=@ma_tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_hoan_tat @ma_don UNIQUEIDENTIFIER,@xac_nhan_thu_du BIT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@now DATETIME2(3)=SYSUTCDATETIME();
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' OR ISNULL(@xac_nhan_thu_du,0)<>1 THROW 51301,N'Cần tài xế xác nhận thu đủ',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51302,N'Thiếu hồ sơ tài xế',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong WHERE c.ma_don=@ma_don AND p.ma_tx=@tx)
  BEGIN COMMIT; RETURN; END;
  SELECT @pc=p.ma_phan_cong FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL AND d.trang_thai='DANG_GIAO';
  IF @pc IS NULL THROW 51303,N'Không đúng tài xế hoặc trạng thái',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
   THROW 51304,N'Chưa xác nhận đến điểm nhận',1;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@now,ket_qua='HOAN_TAT' WHERE ma_phan_cong=@pc;
  UPDATE dbo.don_hang SET trang_thai='HOAN_TAT',hoan_tat_luc=@now WHERE ma_don=@ma_don;
  INSERT dbo.phan_chia_cuoc(ma_don,ma_phan_cong,ghi_nhan_luc) VALUES(@ma_don,@pc,@now);
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN @now ELSE NULL END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_bat_dau_thanh_toan @khoa_yeu_cau VARCHAR(100) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@gd UNIQUEIDENTIFIER,@tien DECIMAL(15,0);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' OR @khoa_yeu_cau IS NULL OR LEN(LTRIM(RTRIM(@khoa_yeu_cau)))=0
   THROW 51401,N'Chỉ tài xế thanh toán; cần khóa yêu cầu',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51402,N'Thiếu hồ sơ tài xế',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  SELECT @gd=ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tx=@tx AND khoa_yeu_cau=@khoa_yeu_cau;
  IF @gd IS NULL
   SELECT @gd=ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tx=@tx AND giai_quyet_luc IS NULL;
  IF @gd IS NULL
  BEGIN
   DECLARE @chon TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY,tien DECIMAL(15,0));
   INSERT @chon SELECT ma_don,tien_cong_ty FROM dbo.v_chia_cuoc
    WHERE ma_tx=@tx AND ma_giao_dich_nop IS NULL AND tien_cong_ty>0;
   SELECT @tien=SUM(tien) FROM @chon;
   IF @tien IS NULL OR @tien<=0 THROW 51403,N'Không có tiền cần nộp',1;
   SET @gd=NEWID();
   INSERT dbo.giao_dich_nop_tien(ma_giao_dich,ma_tx,khoa_yeu_cau,ma_tham_chieu,so_tien_yeu_cau)
    VALUES(@gd,@tx,@khoa_yeu_cau,REPLACE(CONVERT(VARCHAR(36),@gd),'-',''),@tien);
   UPDATE c SET ma_giao_dich_nop=@gd FROM dbo.phan_chia_cuoc c JOIN @chon x ON x.ma_don=c.ma_don;
   IF NOT EXISTS(SELECT 1 FROM dbo.v_giao_dich_nop WHERE ma_giao_dich=@gd AND tong_khoan_lien_ket=@tien AND so_don_dang_lien_ket>0)
    THROW 51404,N'Khoản thanh toán không khớp; rollback',1;
  END;
  COMMIT; SELECT * FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=@gd;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V14__recover_validated_vnpay_ipn.sql
CREATE OR ALTER PROCEDURE dbo.usp_ap_dung_ket_qua_nop
 @ma_tham_chieu VARCHAR(100),@nguon VARCHAR(15),@khoa BINARY(32),@json NVARCHAR(MAX),
 @thanh_cong BIT,@so_tien DECIMAL(15,0),@ma_doi_tac VARCHAR(100)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF @nguon IS NULL OR @nguon NOT IN ('IPN','QUERY') OR @thanh_cong IS NULL OR @so_tien IS NULL
   OR @khoa IS NULL OR ISNULL(ISJSON(@json),0)<>1 THROW 51601,N'Kết quả xác minh không hợp lệ',1;
  DECLARE @gd UNIQUEIDENTIFIER,@tx UNIQUEIDENTIFIER,@expected DECIMAL(15,0),
   @status VARCHAR(20),@partner VARCHAR(100),@now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @gd=ma_giao_dich,@tx=ma_tx FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=@ma_tham_chieu;
  IF @gd IS NULL THROW 51602,N'Không tìm thấy giao dịch; backend ghi sự kiện không khớp riêng',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC @khoa_rc=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  DECLARE @existing VARCHAR(25);
  SELECT @existing=ket_qua FROM dbo.su_kien_thanh_toan WHERE nguon=@nguon AND khoa_su_kien=@khoa;
  IF @existing IS NOT NULL AND @existing<>'KHONG_KHOP'
  BEGIN COMMIT; RETURN; END;
  SELECT @expected=so_tien_yeu_cau,@status=trang_thai,@partner=ma_giao_dich_doi_tac
   FROM dbo.giao_dich_nop_tien WITH(UPDLOCK,HOLDLOCK) WHERE ma_giao_dich=@gd;
  IF @so_tien<>@expected OR (@thanh_cong=1 AND (@ma_doi_tac IS NULL OR LEN(@ma_doi_tac)=0))
  BEGIN
   IF @existing IS NULL
    INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
     VALUES(@gd,@nguon,@khoa,1,'KHONG_KHOP',@json);
   COMMIT; SELECT 'KHONG_KHOP' AS ket_qua; RETURN;
  END;
  IF @status IN ('THANH_CONG','KHONG_THU')
  BEGIN
   DECLARE @result VARCHAR(25)=CASE WHEN (@status='THANH_CONG' AND @thanh_cong=1 AND @partner=@ma_doi_tac)
    OR (@status='KHONG_THU' AND @thanh_cong=0) THEN 'KHONG_THAY_DOI' ELSE 'CAN_DOI_SOAT' END;
   IF @existing='KHONG_KHOP'
    UPDATE dbo.su_kien_thanh_toan SET ket_qua=@result WHERE nguon=@nguon AND khoa_su_kien=@khoa;
   ELSE
    INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
     VALUES(@gd,@nguon,@khoa,1,@result,@json);
   COMMIT; SELECT @result AS ket_qua; RETURN;
  END;
  UPDATE dbo.giao_dich_nop_tien SET trang_thai=CASE WHEN @thanh_cong=1 THEN 'THANH_CONG' ELSE 'KHONG_THU' END,
   giai_quyet_luc=@now,so_tien_thuc_nhan=CASE WHEN @thanh_cong=1 THEN @so_tien END,
   ma_giao_dich_doi_tac=CASE WHEN @thanh_cong=1 THEN @ma_doi_tac END WHERE ma_giao_dich=@gd;
  IF @thanh_cong=0 UPDATE dbo.phan_chia_cuoc SET ma_giao_dich_nop=NULL WHERE ma_giao_dich_nop=@gd;
  IF @existing='KHONG_KHOP'
   UPDATE dbo.su_kien_thanh_toan SET ket_qua='DA_AP_DUNG' WHERE nguon=@nguon AND khoa_su_kien=@khoa;
  ELSE
   INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
    VALUES(@gd,@nguon,@khoa,1,'DA_AP_DUNG',@json);
  COMMIT; SELECT 'DA_AP_DUNG' AS ket_qua;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_tien_trinh @ma_don UNIQUEIDENTIFIER,@hanh_dong VARCHAR(25),@ghi_chu NVARCHAR(500)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@state VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'TAI_XE' THROW 51701,N'Chỉ tài xế cập nhật tiến trình',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  SELECT @pc=p.ma_phan_cong,@state=d.trang_thai FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL;
  IF @pc IS NULL THROW 51702,N'Không có phân công đang hoạt động của tài xế',1;
  IF @hanh_dong='LAY_HANG' AND @state='DA_GAN'
   UPDATE dbo.don_hang SET trang_thai='DA_LAY_HANG' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='BAT_DAU_GIAO' AND @state='DA_LAY_HANG'
   UPDATE dbo.don_hang SET trang_thai='DANG_GIAO' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='TU_CHOI' AND @state='DA_GAN' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
  BEGIN
   UPDATE dbo.phan_cong_don_hang SET ket_qua='TU_CHOI',ket_thuc_luc=SYSUTCDATETIME(),ly_do=@ghi_chu WHERE ma_phan_cong=@pc;
   UPDATE dbo.don_hang SET trang_thai='CHO_GAN' WHERE ma_don=@ma_don;
   UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  END
  ELSE IF @hanh_dong='DEN_DIEM_NHAN' AND @state='DANG_GIAO'
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
    INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
     VALUES(@ma_don,@actor,'DEN_DIEM_NHAN',@state,@state);
  END
  ELSE IF @hanh_dong='SU_CO' AND @state='DANG_GIAO' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
   INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau,ghi_chu)
    VALUES(@ma_don,@actor,'SU_CO',@state,@state,@ghi_chu);
  ELSE THROW 51703,N'Hành động không hợp lệ cho trạng thái hiện tại',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_huy_don @ma_don UNIQUEIDENTIFIER,@ly_do NVARCHAR(500) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') OR @ly_do IS NULL OR LEN(LTRIM(RTRIM(@ly_do)))=0
   THROW 51801,N'Không được hủy hoặc thiếu lý do',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang d JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
   WHERE d.ma_don=@ma_don AND d.trang_thai IN ('CHO_GAN','DA_GAN') AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51802,N'Không đúng chủ đơn hoặc đã lấy hàng',1;
  SELECT @tx=ma_tx FROM dbo.phan_cong_don_hang WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=SYSUTCDATETIME(),ket_qua='HUY_DON',ly_do=@ly_do
   WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.don_hang SET trang_thai='DA_HUY',huy_luc=SYSUTCDATETIME(),ly_do_huy=@ly_do WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_thu_nhap_cua_toi @tu DATETIME2(3),@den DATETIME2(3) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
 SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
 IF @role<>'TAI_XE' OR @tu IS NULL OR @den IS NULL OR @tu>=@den THROW 51901,N'Không đúng quyền/khoảng thời gian',1;
 SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
 SELECT * FROM dbo.fn_thu_nhap_tai_xe(@tx,@tu,@den);
 SELECT * FROM dbo.v_so_du_tai_xe WHERE ma_tx=@tx; -- Không lọc ngày cho công nợ.
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_quan_ly_phuong_tien
 @hanh_dong VARCHAR(10),@ma_tx UNIQUEIDENTIFIER,@bien_so NVARCHAR(15)=NULL,
 @loai_xe NVARCHAR(50)=NULL,@mau_xe NVARCHAR(30)=NULL,@hoat_dong BIT=1
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @role<>'CHU_DOI_XE' THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
  IF @hanh_dong IS NULL OR @hanh_dong NOT IN ('LUU','XOA') THROW 52201,N'Sai hành động',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_xe WHERE ma_tx=@ma_tx) THROW 52204,N'Không tìm thấy tài xế',1;
  IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
   THROW 52203,N'Không đổi xe khi đang có phân công',1;
  IF @hanh_dong='XOA'
  BEGIN
   IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx)
    THROW 52207,N'Có lịch sử; chỉ được ngừng hoạt động',1;
   DELETE dbo.phuong_tien WHERE ma_tx=@ma_tx;
   IF @@ROWCOUNT<>1 THROW 52208,N'Không có xe để xóa',1;
  END
  ELSE
  BEGIN
   IF @bien_so IS NULL OR LEN(LTRIM(RTRIM(@bien_so)))=0 OR @loai_xe IS NULL OR LEN(LTRIM(RTRIM(@loai_xe)))=0
    OR @hoat_dong IS NULL THROW 52206,N'Thông tin xe không hợp lệ',1;
   IF EXISTS(SELECT 1 FROM dbo.phuong_tien WHERE ma_tx=@ma_tx)
    UPDATE dbo.phuong_tien SET bien_so=@bien_so,loai_xe=@loai_xe,mau_xe=@mau_xe,dang_hoat_dong=@hoat_dong WHERE ma_tx=@ma_tx;
   ELSE INSERT dbo.phuong_tien(ma_tx,bien_so,loai_xe,mau_xe,dang_hoat_dong) VALUES(@ma_tx,@bien_so,@loai_xe,@mau_xe,@hoat_dong);
  END;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'PHUONG_TIEN',@ma_tx,CASE WHEN @hanh_dong='XOA' THEN 'XOA_XE' ELSE 'LUU_XE' END);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_dang_ky_khach
 @username NVARCHAR(50),@hash NVARCHAR(255),@ho_ten NVARCHAR(100),@sdt VARCHAR(10),@email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
   OR @username LIKE '% %' OR @hash IS NULL OR LEFT(@hash,4)<>'$2a$' OR LEN(@hash)<>60
   OR @sdt IS NULL THROW 52101,N'Thông tin đăng ký hoặc BCrypt hash không hợp lệ',1;
  DECLARE @tk UNIQUEIDENTIFIER=NEWID(),@kh UNIQUEIDENTIFIER=NEWID();
  INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
   VALUES(@tk,@username,@hash,@ho_ten,@sdt,@email,'KHACH_HANG');
  INSERT dbo.khach_hang(ma_kh,ma_tk) VALUES(@kh,@tk);
  COMMIT;
  SELECT @tk AS ma_tk,@kh AS ma_kh;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V7__create_business_procedures.sql
CREATE OR ALTER PROCEDURE dbo.usp_doc_don
 @ma_don UNIQUEIDENTIFIER=NULL,@page INT=0,@size INT=20 AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
 SET @actor=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
  SET @role=NULL;
  SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
  IF @role IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
 IF @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100 THROW 52302,N'Sai phân trang',1;
 DECLARE @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 DECLARE @quyen TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @quyen SELECT d.ma_don FROM dbo.don_hang d JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
 WHERE (@ma_don IS NULL OR d.ma_don=@ma_don) AND (
  @role IN ('TONG_DAI','CHU_DOI_XE') OR (@role='KHACH_HANG' AND k.ma_tk=@actor)
  OR (@role='TAI_XE' AND EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx
   WHERE p.ma_don=d.ma_don AND t.ma_tk=@actor AND (p.ket_qua IS NULL OR p.ket_qua<>'TU_CHOI'))));
 IF @ma_don IS NOT NULL AND NOT EXISTS(SELECT 1 FROM @quyen) THROW 52303,N'Không tìm thấy đơn được phép xem',1;
 SELECT d.*,v.tong_cuoc,COUNT_BIG(*) OVER() AS total FROM dbo.don_hang d JOIN @quyen q ON q.ma_don=d.ma_don
 JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don ORDER BY d.tao_luc DESC,d.ma_don OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
 IF @ma_don IS NOT NULL
 BEGIN
  SELECT k.* FROM dbo.chi_tiet_kien_hang k WHERE k.ma_don=@ma_don;
  SELECT p.* FROM dbo.phu_thu_don_hang p WHERE p.ma_don=@ma_don;
  SELECT n.* FROM dbo.nhat_ky_don_hang n WHERE n.ma_don=@ma_don ORDER BY n.thoi_gian,n.ma_su_kien;
 END;
END;
GO

-- Latest definition: V24__driver_profile_without_license_expiry.sql
CREATE OR ALTER PROCEDURE dbo.usp_admin_quan_ly_tai_xe
 @hanh_dong VARCHAR(12), @ma_tx UNIQUEIDENTIFIER=NULL,
 @username NVARCHAR(50)=NULL, @hash NVARCHAR(255)=NULL,
 @ho_ten NVARCHAR(100)=NULL, @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL,
 @cccd VARCHAR(12)=NULL, @so_gplx NVARCHAR(50)=NULL, @het_han DATE=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @tk UNIQUEIDENTIFIER, @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'admin-ho-so-tai-xe',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại',1;

  IF @hanh_dong='TAO'
  BEGIN
   IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
    OR @username LIKE N'% %' OR @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
    OR @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0 OR @sdt IS NULL
    OR @cccd IS NULL OR @so_gplx IS NULL
    THROW 52206,N'Thông tin tài xế không hợp lệ',1;
   SET @tk=NEWID(); SET @ma_tx=NEWID();
   INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
    VALUES(@tk,@username,@hash,@ho_ten,@sdt,@email,'TAI_XE');
   INSERT dbo.tai_xe(ma_tx,ma_tk,cccd,so_giay_phep,ngay_het_han_gplx,trang_thai)
    VALUES(@ma_tx,@tk,@cccd,@so_gplx,NULL,'OFFLINE');
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,'TAO_HO_SO');
  END
  ELSE IF @hanh_dong='CAP_NHAT'
  BEGIN
   SELECT @tk=ma_tk FROM dbo.tai_xe WITH(UPDLOCK,HOLDLOCK) WHERE ma_tx=@ma_tx;
   IF @tk IS NULL THROW 52204,N'Không tìm thấy tài xế',1;
   IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0 OR @sdt IS NULL
    OR @cccd IS NULL OR @so_gplx IS NULL
    THROW 52206,N'Thông tin tài xế không hợp lệ',1;
   UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@tk;
   UPDATE dbo.tai_xe SET cccd=@cccd,so_giay_phep=@so_gplx WHERE ma_tx=@ma_tx;
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,'CAP_NHAT_HO_SO');
  END
  ELSE IF @hanh_dong IN ('KHOA','MO_KHOA')
  BEGIN
   SELECT @tk=ma_tk FROM dbo.tai_xe WITH(UPDLOCK,HOLDLOCK) WHERE ma_tx=@ma_tx;
   IF @tk IS NULL THROW 52204,N'Không tìm thấy tài xế',1;
   IF @hanh_dong='KHOA'
   BEGIN
    IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_tx=@ma_tx AND ket_thuc_luc IS NULL)
     THROW 52203,N'Tài xế đang có phân công; xử lý đơn trước khi khóa',1;
    UPDATE dbo.tai_xe SET trang_thai='NGHI',ranh_tu=NULL WHERE ma_tx=@ma_tx;
    UPDATE dbo.tai_khoan SET trang_thai='KHOA',auth_version=auth_version+1 WHERE ma_tk=@tk;
   END
   ELSE
   BEGIN
    UPDATE dbo.tai_xe SET trang_thai='OFFLINE',ranh_tu=NULL WHERE ma_tx=@ma_tx;
    UPDATE dbo.tai_khoan SET trang_thai='HOAT_DONG',auth_version=auth_version+1 WHERE ma_tk=@tk;
   END;
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_XE',@ma_tx,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TAI_KHOAN' ELSE 'MO_KHOA_TAI_KHOAN' END);
  END
  ELSE THROW 52201,N'Sai hành động',1;
  COMMIT;
  SELECT @ma_tx AS ma_tx;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V12__admin_driver_customer_management.sql
CREATE OR ALTER PROCEDURE dbo.usp_admin_trang_thai_khach
 @ma_kh UNIQUEIDENTIFIER,@hanh_dong VARCHAR(8)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @tk UNIQUEIDENTIFIER;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  SELECT @tk=ma_tk FROM dbo.khach_hang WITH(UPDLOCK,HOLDLOCK) WHERE ma_kh=@ma_kh;
  IF @tk IS NULL THROW 52204,N'Không tìm thấy khách hàng',1;
  IF @hanh_dong='KHOA'
   UPDATE dbo.tai_khoan SET trang_thai='KHOA',auth_version=auth_version+1 WHERE ma_tk=@tk AND trang_thai='HOAT_DONG';
  ELSE IF @hanh_dong='MO_KHOA'
   UPDATE dbo.tai_khoan SET trang_thai='HOAT_DONG',auth_version=auth_version+1 WHERE ma_tk=@tk AND trang_thai='KHOA';
  ELSE THROW 52201,N'Sai hành động',1;
  IF @@ROWCOUNT=0 THROW 52205,N'Trạng thái tài khoản đã thay đổi',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'KHACH_HANG',@ma_kh,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TAI_KHOAN' ELSE 'MO_KHOA_TAI_KHOAN' END);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V13__admin_staff_profile_management.sql
CREATE OR ALTER PROCEDURE dbo.usp_admin_quan_ly_tong_dai
 @hanh_dong VARCHAR(15), @ma_tk UNIQUEIDENTIFIER=NULL,
 @username NVARCHAR(50)=NULL, @hash NVARCHAR(255)=NULL,
 @ho_ten NVARCHAR(100)=NULL, @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @khoa_rc INT;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  EXEC @khoa_rc=sys.sp_getapplock @Resource=N'admin-tong-dai',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @khoa_rc<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại',1;

  IF @hanh_dong='TAO'
  BEGIN
   IF @username IS NULL OR @username<>LOWER(LTRIM(RTRIM(@username))) COLLATE Latin1_General_100_BIN2
    OR @username LIKE N'% %' OR @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
    OR @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
    THROW 52401,N'Thông tin tài khoản tổng đài không hợp lệ',1;
   SET @ma_tk=NEWID();
   INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,email,vai_tro)
    VALUES(@ma_tk,@username,@hash,@ho_ten,@sdt,@email,'TONG_DAI');
   INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
    VALUES(@actor,'TAI_KHOAN',@ma_tk,'TAO_TONG_DAI');
  END
  ELSE
  BEGIN
   IF @ma_tk IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WITH(UPDLOCK,HOLDLOCK)
       WHERE ma_tk=@ma_tk AND vai_tro='TONG_DAI')
    THROW 52204,N'Không tìm thấy tài khoản tổng đài',1;
   IF @hanh_dong='CAP_NHAT'
   BEGIN
    IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
     THROW 52401,N'Thông tin tài khoản tổng đài không hợp lệ',1;
    UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@ma_tk;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,'CAP_NHAT_TONG_DAI');
   END
   ELSE IF @hanh_dong IN ('KHOA','MO_KHOA')
   BEGIN
    UPDATE dbo.tai_khoan SET trang_thai=CASE WHEN @hanh_dong='KHOA' THEN 'KHOA' ELSE 'HOAT_DONG' END,
      auth_version=auth_version+1 WHERE ma_tk=@ma_tk
      AND trang_thai<>CASE WHEN @hanh_dong='KHOA' THEN 'KHOA' ELSE 'HOAT_DONG' END;
    IF @@ROWCOUNT=0 THROW 52402,N'Trạng thái tài khoản đã thay đổi',1;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,CASE WHEN @hanh_dong='KHOA' THEN 'KHOA_TONG_DAI' ELSE 'MO_KHOA_TONG_DAI' END);
   END
   ELSE IF @hanh_dong='DAT_MAT_KHAU'
   BEGIN
    IF @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
     THROW 52401,N'Mật khẩu mã hóa không hợp lệ',1;
    UPDATE dbo.tai_khoan SET mat_khau_hash=@hash,auth_version=auth_version+1 WHERE ma_tk=@ma_tk;
    INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
     VALUES(@actor,'TAI_KHOAN',@ma_tk,'CAP_LAI_MAT_KHAU_TONG_DAI');
   END
   ELSE THROW 52403,N'Sai hành động quản lý tổng đài',1;
  END;
  COMMIT;
  SELECT @ma_tk AS ma_tk;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V13__admin_staff_profile_management.sql
CREATE OR ALTER PROCEDURE dbo.usp_cap_nhat_ho_so_tai_khoan
 @ho_ten NVARCHAR(100), @sdt VARCHAR(10)=NULL, @email NVARCHAR(150)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG')
   THROW 52001,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
  IF @ho_ten IS NULL OR LEN(LTRIM(RTRIM(@ho_ten)))=0
   THROW 52401,N'Thông tin hồ sơ không hợp lệ',1;
  UPDATE dbo.tai_khoan SET ho_ten=@ho_ten,so_dien_thoai=@sdt,email=@email WHERE ma_tk=@actor;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'TAI_KHOAN',@actor,'CAP_NHAT_HO_SO');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V13__admin_staff_profile_management.sql
CREATE OR ALTER PROCEDURE dbo.usp_doi_mat_khau_tai_khoan
 @hash_moi NVARCHAR(255), @auth_version BIGINT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 BEGIN TRY
  BEGIN TRAN;
  IF @hash_moi IS NULL OR LEFT(@hash_moi,4)<>N'$2a$' OR LEN(@hash_moi)<>60
   THROW 52401,N'Mật khẩu mã hóa không hợp lệ',1;
  UPDATE dbo.tai_khoan WITH(UPDLOCK) SET mat_khau_hash=@hash_moi,auth_version=auth_version+1
   WHERE ma_tk=@actor AND trang_thai='HOAT_DONG' AND auth_version=@auth_version;
  IF @@ROWCOUNT=0 THROW 52402,N'Phiên đã thay đổi',1;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'TAI_KHOAN',@actor,'DOI_MAT_KHAU');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V16__list_orders_with_filters.sql
CREATE OR ALTER PROCEDURE dbo.usp_doc_don_trang
 @trang_thai VARCHAR(20)=NULL, @page INT=0, @size INT=20
AS
BEGIN
 SET NOCOUNT ON;
 IF @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100
  THROW 52302,N'Sai phan trang',1;
 IF @trang_thai IS NOT NULL AND @trang_thai NOT IN
  ('CHO_GAN','DA_GAN','DA_LAY_HANG','DANG_GIAO','HOAN_TAT','DA_HUY')
  THROW 52304,N'Sai trang thai don',1;

 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @role VARCHAR(20), @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
 IF @role IS NULL THROW 51101,N'Phien khong hop le',1;

 DECLARE @visible TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @visible(ma_don)
 SELECT d.ma_don FROM dbo.don_hang d
 JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
 WHERE (@trang_thai IS NULL OR d.trang_thai=@trang_thai)
   AND (@role IN ('TONG_DAI','CHU_DOI_XE')
     OR (@role='KHACH_HANG' AND k.ma_tk=@actor)
     OR (@role='TAI_XE' AND EXISTS (
       SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx
       WHERE p.ma_don=d.ma_don AND t.ma_tk=@actor AND (p.ket_qua IS NULL OR p.ket_qua<>'TU_CHOI'))))
 OPTION(RECOMPILE);

 SELECT COUNT_BIG(*) AS total FROM @visible;
 SELECT d.*,v.tong_cuoc FROM dbo.don_hang d
 JOIN @visible q ON q.ma_don=d.ma_don
 JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don
 ORDER BY d.tao_luc DESC,d.ma_don
 OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
END;
GO

-- Latest definition: V22__admin_customer_membership.sql
CREATE OR ALTER PROCEDURE dbo.usp_admin_gan_hang_khach
 @ma_kh UNIQUEIDENTIFIER, @ma_hang VARCHAR(15)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @now DATETIME2(3)=SYSUTCDATETIME(), @lock_result INT,
         @old_tier VARCHAR(15), @old_from DATETIME2(3), @old_until DATETIME2(3);
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan
   WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  IF @ma_hang IS NULL OR @ma_hang NOT IN ('THUONG','BAC','VANG','KIM_CUONG')
   THROW 52430,N'Hạng thành viên không hợp lệ',1;

  EXEC @lock_result=sys.sp_getapplock @Resource=N'chinh-sach',@LockMode='Exclusive',
   @LockOwner='Transaction',@LockTimeout=10000;
  IF @lock_result<0 THROW 51100,N'Không lấy được khóa chính sách; thử lại',1;

  SELECT @old_tier=k.ma_hang,@old_from=k.thanh_vien_tu,@old_until=k.thanh_vien_den
  FROM dbo.khach_hang k WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
  WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG';
  IF @old_tier IS NULL THROW 52204,N'Không tìm thấy khách hàng đang hoạt động',1;

  IF @ma_hang<>'THUONG' AND
   (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien
    WHERE ma_hang=@ma_hang AND trang_thai='CONG_BO' AND hieu_luc_tu<=@now
     AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
   THROW 52431,N'Hạng chưa có đúng một chính sách đang hiệu lực',1;

  IF @old_tier=@ma_hang AND
   (@ma_hang='THUONG' OR (@old_from<=@now AND (@old_until IS NULL OR @now<@old_until)))
   THROW 52432,N'Khách hàng đã ở hạng này',1;

  UPDATE dbo.khach_hang
  SET ma_hang=@ma_hang,
      thanh_vien_tu=CASE WHEN @ma_hang='THUONG' THEN NULL ELSE @now END,
      thanh_vien_den=NULL
  WHERE ma_kh=@ma_kh;

  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
  VALUES(@actor,'KHACH_HANG',@ma_kh,'GAN_HANG_THANH_VIEN',
   (SELECT @old_tier AS hang_cu,@old_from AS tu_cu,@old_until AS den_cu,
           @ma_hang AS hang_moi,CASE WHEN @ma_hang='THUONG' THEN NULL ELSE @now END AS tu_moi
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO

-- Latest definition: V24__driver_profile_without_license_expiry.sql
CREATE OR ALTER PROCEDURE dbo.usp_admin_dat_mat_khau_tai_xe
 @ma_tx UNIQUEIDENTIFIER, @hash NVARCHAR(255)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @tk UNIQUEIDENTIFIER;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND vai_tro='CHU_DOI_XE' AND trang_thai='HOAT_DONG')
   THROW 52001,N'Không đủ quyền',1;
  IF @hash IS NULL OR LEFT(@hash,4)<>N'$2a$' OR LEN(@hash)<>60
   THROW 52401,N'Mật khẩu mã hóa không hợp lệ',1;
  SELECT @tk=ma_tk FROM dbo.tai_xe WITH(UPDLOCK,HOLDLOCK) WHERE ma_tx=@ma_tx;
  IF @tk IS NULL THROW 52204,N'Không tìm thấy tài xế',1;
  UPDATE dbo.tai_khoan SET mat_khau_hash=@hash,auth_version=auth_version+1 WHERE ma_tk=@tk;
  INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong)
   VALUES(@actor,'TAI_XE',@ma_tx,'CAP_LAI_MAT_KHAU');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
