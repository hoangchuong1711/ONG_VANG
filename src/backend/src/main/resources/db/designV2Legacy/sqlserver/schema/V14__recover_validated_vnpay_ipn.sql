-- Allow a signed, fully validated VNPay callback to recover an earlier KHONG_KHOP observation.
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
  -- Thành công giữ liên kết vĩnh viễn; công nợ tự giảm qua View, không SET số dư=0.
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
