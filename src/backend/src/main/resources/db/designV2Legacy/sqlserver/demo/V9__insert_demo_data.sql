-- FILE: V9__insert_demo_data.sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo',N'mini_ong_vang_design_v2_test')
 THROW 52400,N'V9 chỉ được chạy trên DB demo/test của schema designV2',1;
IF EXISTS(SELECT 1 FROM dbo.tai_khoan) OR EXISTS(SELECT 1 FROM dbo.don_hang)
 OR EXISTS(SELECT 1 FROM dbo.cau_hinh_cuoc) OR EXISTS(SELECT 1 FROM dbo.chinh_sach_thanh_vien)
 OR EXISTS(SELECT 1 FROM dbo.cau_hinh_phu_thu) OR EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien)
 OR EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan) OR EXISTS(SELECT 1 FROM dbo.nhat_ky_kiem_toan)
 THROW 52401,N'Chỉ nạp một lần vào DB demo rỗng; không ghi đè dữ liệu thành viên khác',1;
DECLARE @actor_truoc SQL_VARIANT=SESSION_CONTEXT(N'ma_tk');
DECLARE @now DATETIME2(3)=SYSUTCDATETIME(),@tu DATETIME2(3)=DATEADD(DAY,-60,SYSUTCDATETIME()),
 @admin UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000102',
 @dieu_phoi UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000101',
 @hash NVARCHAR(255)=N'$2a$12$UtM40aUakGjktuJCHkLoTehUjLszC39AdfwpqUH2fUjCZqKc2WTfW',
 @bp UNIQUEIDENTIFIER='60000000-0000-0000-0000-000000000001',
 @vang UNIQUEIDENTIFIER='61000000-0000-0000-0000-000000000002',
 @pt_bat_buoc UNIQUEIDENTIFIER='62000000-0000-0000-0000-000000000001',
 @pt_tuy_chon UNIQUEIDENTIFIER='62000000-0000-0000-0000-000000000002';
BEGIN TRY
 BEGIN TRAN;
 -- 1. Tạo 8 tài khoản và dữ liệu mẫu theo schema hiện tại.
 INSERT dbo.tai_khoan(ma_tk,username,mat_khau_hash,ho_ten,so_dien_thoai,vai_tro,ngay_tao) VALUES
 ('10000000-0000-0000-0000-000000000001',N'0900000001',@hash,N'Khách thường','0900000001','KHACH_HANG',@tu),
 ('10000000-0000-0000-0000-000000000002',N'0900000002',@hash,N'Khách hạng Vàng','0900000002','KHACH_HANG',@tu),
 ('10000000-0000-0000-0000-000000000003',N'0900000003',@hash,N'Khách ưu đãi hết hạn','0900000003','KHACH_HANG',@tu),
 (@dieu_phoi,N'demo_dispatcher',@hash,N'Tổng đài demo',NULL,'TONG_DAI',@tu),
 (@admin,N'demo_admin',@hash,N'Chủ đội xe demo',NULL,'CHU_DOI_XE',@tu),
 ('10000000-0000-0000-0000-000000000201',N'0800000001',@hash,N'Tài xế demo 1','0800000001','TAI_XE',@tu),
 ('10000000-0000-0000-0000-000000000202',N'0800000002',@hash,N'Tài xế demo 2','0800000002','TAI_XE',@tu),
 ('10000000-0000-0000-0000-000000000203',N'0800000003',@hash,N'Tài xế demo 3','0800000003','TAI_XE',@tu);
 INSERT dbo.khach_hang(ma_kh,ma_tk,dia_chi_mac_dinh,ma_hang,thanh_vien_tu,thanh_vien_den) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',N'227 Nguyễn Văn Cừ, TP.HCM','THUONG',NULL,NULL),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',N'268 Lý Thường Kiệt, TP.HCM','VANG',@tu,DATEADD(DAY,30,@now)),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003',N'2 Công xã Paris, TP.HCM','VANG',@tu,DATEADD(DAY,-30,@now));
 INSERT dbo.tai_xe(ma_tx,ma_tk,cccd,so_giay_phep,ngay_het_han_gplx,trang_thai,ranh_tu) VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000201','700000000001',N'GPLX-DEMO-1',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000202','700000000002',N'GPLX-DEMO-2',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000203',N'700000000003',N'GPLX-DEMO-3',DATEADD(YEAR,1,CONVERT(DATE,@now)),'ONLINE',@tu);
 INSERT dbo.phuong_tien(ma_phuong_tien,ma_tx,bien_so,loai_xe,mau_xe) VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',N'59A00001',N'Xe máy',N'Vàng'),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',N'59A00002',N'Xe máy',N'Đen'),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',N'59A00003',N'Xe máy',N'Trắng');
 UPDATE dbo.tai_xe SET vi_tri_demo_dia_chi = CASE ma_tx
   WHEN '30000000-0000-0000-0000-000000000001' THEN N'227 Nguyễn Văn Cừ, TP.HCM'
   WHEN '30000000-0000-0000-0000-000000000002' THEN N'268 Lý Thường Kiệt, TP.HCM'
   ELSE N'2 Công xã Paris, TP.HCM' END,
   vi_tri_demo_lat = CASE ma_tx
     WHEN '30000000-0000-0000-0000-000000000001' THEN 10.7626220
     WHEN '30000000-0000-0000-0000-000000000002' THEN 10.7725670
     ELSE 10.7797830 END,
   vi_tri_demo_lng = CASE ma_tx
     WHEN '30000000-0000-0000-0000-000000000001' THEN 106.6821800
     WHEN '30000000-0000-0000-0000-000000000002' THEN 106.6601720
     ELSE 106.6991200 END,
   vi_tri_demo_nguon = 'DEMO_CO_DINH', vi_tri_demo_luc = @now;
 -- 2. Chính sách mẫu công bố lần đầu; không UPDATE chính sách công bố.
 INSERT dbo.cau_hinh_cuoc(ma_bieu_phi,ten,cuoc_co_ban,don_gia_km,km_toi_thieu,km_toi_da,kg_bao_gom,kg_toi_da,don_gia_kg,hieu_luc_tu,trang_thai)
 VALUES(@bp,N'Biểu phí SQL demo',20000,5000,0,30,1,30,3000,@tu,'CONG_BO');
 INSERT dbo.chinh_sach_thanh_vien(ma_chinh_sach,ma_hang,ty_le_giam,hieu_luc_tu,trang_thai) VALUES
 ('61000000-0000-0000-0000-000000000001','BAC',5,@tu,'CONG_BO'),
 (@vang,'VANG',10,@tu,'CONG_BO'),
 ('61000000-0000-0000-0000-000000000003','KIM_CUONG',15,@tu,'CONG_BO');
 INSERT dbo.cau_hinh_phu_thu(ma_phu_thu,ma_loai,ten,bat_buoc,so_tien,hieu_luc_tu,trang_thai) VALUES
 (@pt_bat_buoc,'DICH_VU',N'Phụ thu dịch vụ',1,5000,@tu,'CONG_BO'),
 (@pt_tuy_chon,'GIAO_NHANH',N'Giao nhanh tùy chọn',0,10000,@tu,'CONG_BO');
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@dieu_phoi;
 -- 3. Lặp INSERT 30 đơn, mỗi đơn 2 kiện; không gọi Java seed hay SP tự mở transaction.
 DECLARE @i INT=1,@kh_so INT,@tx_so INT,@id UNIQUEIDENTIFIER,@kh UNIQUEIDENTIFIER,
 @tx UNIQUEIDENTIFIER,@tk_tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@cs UNIQUEIDENTIFIER,
 @tao DATETIME2(3),@moc DATETIME2(3),@km DECIMAL(10,2),@ckm DECIMAL(15,0),
 @ckg DECIMAL(15,0),@phuthu DECIMAL(15,0),@giam DECIMAL(15,0),@tuy_chon BIT;
 WHILE @i<=30
 BEGIN
  SET @id=CONVERT(UNIQUEIDENTIFIER,'50000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@i),12));
  SET @kh_so=1+((@i-1)%3);
  SET @kh=CONVERT(UNIQUEIDENTIFIER,'20000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@kh_so),12));
  SET @tao=DATEADD(MINUTE,@i*15,DATEADD(DAY,-7,@now));
  SET @km=1+(@i%15);
  SET @tuy_chon=CASE WHEN @i%4=0 THEN 1 ELSE 0 END;
  SET @ckm=dbo.fn_cuoc_km(20000,@km,5000);
  SET @ckg=dbo.fn_cuoc_kg(2.50,1,3000);
  SET @phuthu=5000+CASE WHEN @tuy_chon=1 THEN 10000 ELSE 0 END;
  SET @cs=CASE WHEN @kh_so=2 THEN @vang ELSE NULL END;
  SET @giam=dbo.fn_tien_giam(@ckm+@ckg+@phuthu,CASE WHEN @kh_so=2 THEN 10 ELSE 0 END);
  EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@dieu_phoi;
  INSERT dbo.don_hang(ma_don,ma_kh,ma_tk_tao,khoa_yeu_cau,hash_yeu_cau,ma_bieu_phi,ma_chinh_sach,
   diem_lay,diem_giao,ten_nguoi_nhan,sdt_nguoi_nhan,quang_duong_km,thoi_gian_du_kien_giay,nguon_lo_trinh,
   cuoc_km,cuoc_kg,tien_giam,ghi_chu,tao_luc)
  VALUES(@id,@kh,@dieu_phoi,CONCAT('sql-demo-order-',@i),HASHBYTES('SHA2_256',CONCAT(N'SQL_DEMO_ORDER:',@i)),@bp,@cs,
   N'227 Nguyễn Văn Cừ, TP.HCM',N'268 Lý Thường Kiệt, TP.HCM',CONCAT(N'Người nhận demo ',@i),'0901234567',@km,CONVERT(INT,@km*180),'DEMO',
   @ckm,@ckg,@giam,N'Dữ liệu SQL demo; km/thời gian mô phỏng, chưa xác minh Goong',@tao);
  UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@tao WHERE ma_don=@id AND loai='TAO_DON';
  INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg,ghi_chu) VALUES
   (@id,1,N'Tài liệu',1,N'Giữ khô ráo'),(@id,2,N'Hàng đóng hộp',1.50,N'Không đè nặng');
  INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) VALUES(@id,@pt_bat_buoc);
  IF @tuy_chon=1 INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) VALUES(@id,@pt_tuy_chon);
  -- 12 hoàn tất; 2 từng từ chối; 2 đang giao/đã gán. Còn lại chờ hoặc hủy.
  IF @i<=12 OR @i BETWEEN 27 AND 30
  BEGIN
   SET @tx_so=CASE WHEN @i<=4 OR @i=29 THEN 1 WHEN @i<=8 OR @i=30 THEN 2 ELSE 3 END;
   SET @tx=CONVERT(UNIQUEIDENTIFIER,'30000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@tx_so),12));
   SET @tk_tx=CONVERT(UNIQUEIDENTIFIER,'10000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),200+@tx_so),12));
   SET @pc=CONVERT(UNIQUEIDENTIFIER,'70000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@i),12));
   SET @moc=DATEADD(MINUTE,5,@tao);
   INSERT dbo.phan_cong_don_hang(ma_phan_cong,ma_don,ma_tx,ma_tk_dieu_phoi,bat_dau_luc) VALUES(@pc,@id,@tx,@dieu_phoi,@moc);
   UPDATE dbo.don_hang SET trang_thai='DA_GAN' WHERE ma_don=@id;
   UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc WHERE ma_don=@id AND trang_thai_sau='DA_GAN';
   UPDATE dbo.tai_xe SET ranh_tu=NULL WHERE ma_tx=@tx;
   EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@tk_tx;
   IF @i<=12 OR @i=30
   BEGIN
    UPDATE dbo.don_hang SET trang_thai='DA_LAY_HANG' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,10,@tao) WHERE ma_don=@id AND trang_thai_sau='DA_LAY_HANG';
    UPDATE dbo.don_hang SET trang_thai='DANG_GIAO' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,20,@tao) WHERE ma_don=@id AND trang_thai_sau='DANG_GIAO';
   END;
   IF @i<=12
   BEGIN
    SET @moc=DATEADD(MINUTE,40,@tao);
    INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau,thoi_gian,ghi_chu)
     VALUES(@id,@tk_tx,'DEN_DIEM_NHAN','DANG_GIAO','DANG_GIAO',DATEADD(MINUTE,30,@tao),N'SQL demo: đã đến điểm nhận');
    UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@moc,ket_qua='HOAN_TAT' WHERE ma_phan_cong=@pc;
    UPDATE dbo.don_hang SET trang_thai='HOAN_TAT',hoan_tat_luc=@moc WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc,ghi_chu=N'SQL demo: mô phỏng đã giao và thu đủ, không xác minh ngân hàng khách'
     WHERE ma_don=@id AND trang_thai_sau='HOAN_TAT';
    INSERT dbo.phan_chia_cuoc(ma_don,ma_phan_cong,ghi_nhan_luc) VALUES(@id,@pc,@moc);
    UPDATE dbo.tai_xe SET ranh_tu=@moc WHERE ma_tx=@tx;
   END;
   IF @i BETWEEN 27 AND 28
   BEGIN
    SET @moc=DATEADD(MINUTE,8,@tao);
    UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@moc,ket_qua='TU_CHOI',ly_do=N'Vị trí lấy hàng quá xa — SQL demo' WHERE ma_phan_cong=@pc;
    UPDATE dbo.don_hang SET trang_thai='CHO_GAN' WHERE ma_don=@id;
    UPDATE dbo.nhat_ky_don_hang SET thoi_gian=@moc,ghi_chu=N'Tài xế từ chối — SQL demo'
     WHERE ma_don=@id AND loai='CHUYEN_TRANG_THAI' AND trang_thai_sau='CHO_GAN';
    UPDATE dbo.tai_xe SET ranh_tu=@moc WHERE ma_tx=@tx;
   END;
  END;
  IF @i BETWEEN 25 AND 26
  BEGIN
   UPDATE dbo.don_hang SET trang_thai='DA_HUY',huy_luc=DATEADD(MINUTE,5,@tao),ly_do_huy=N'Khách đổi kế hoạch — SQL demo' WHERE ma_don=@id;
   UPDATE dbo.nhat_ky_don_hang SET thoi_gian=DATEADD(MINUTE,5,@tao) WHERE ma_don=@id AND trang_thai_sau='DA_HUY';
  END;
  SET @i+=1;
 END;
 -- 4. Ba giao dịch nộp ĐANG CHỜ; không tạo thanh toán thành công giả hay URL VNPay giả.
 DECLARE @j INT=1,@gd UNIQUEIDENTIFIER,@tong DECIMAL(15,0);
 WHILE @j<=3
 BEGIN
  SET @tx=CONVERT(UNIQUEIDENTIFIER,'30000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@j),12));
  SET @gd=CONVERT(UNIQUEIDENTIFIER,'80000000-0000-0000-0000-'+RIGHT('000000000000'+CONVERT(VARCHAR(12),@j),12));
  SELECT @tong=SUM(tien_cong_ty) FROM dbo.v_chia_cuoc WHERE ma_tx=@tx;
  INSERT dbo.giao_dich_nop_tien(ma_giao_dich,ma_tx,khoa_yeu_cau,ma_tham_chieu,so_tien_yeu_cau,tao_luc)
   VALUES(@gd,@tx,CONCAT('sql-demo-payment-',@j),CONCAT('SQLDEMONOP',@j),@tong,@now);
  UPDATE c SET ma_giao_dich_nop=@gd FROM dbo.phan_chia_cuoc c JOIN dbo.v_chia_cuoc v ON v.ma_don=c.ma_don WHERE v.ma_tx=@tx;
  INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
   VALUES(@gd,'RETURN',HASHBYTES('SHA2_256',CONCAT('SQL_DEMO_EVENT:',@j)),0,'KHONG_HOP_LE',
    N'{"demo":true,"note":"Du lieu SQL minh hoa; khong phai callback VNPay da xac minh"}');
  SET @j+=1;
 END;
 INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
 VALUES(@admin,'SQL_DEMO',@admin,'NAP_DU_LIEU',N'{"accounts":8,"orders":30,"source":"SQL_INSERT_DEMO"}');
 -- 5. Sai số lượng/trạng thái hoặc tiền chia không khớp thì rollback toàn bộ.
 IF (SELECT COUNT(*) FROM dbo.tai_khoan)<>8 OR (SELECT COUNT(*) FROM dbo.don_hang)<>30
  OR (SELECT COUNT(*) FROM dbo.chi_tiet_kien_hang)<>60 OR (SELECT COUNT(*) FROM dbo.phan_chia_cuoc)<>12
  OR (SELECT COUNT(*) FROM dbo.phu_thu_don_hang)<>37 OR (SELECT COUNT(*) FROM dbo.phan_cong_don_hang)<>16
  OR (SELECT COUNT(*) FROM dbo.khach_hang)<>3 OR (SELECT COUNT(*) FROM dbo.tai_xe)<>3
  OR (SELECT COUNT(*) FROM dbo.phuong_tien)<>3 OR (SELECT COUNT(*) FROM dbo.giao_dich_nop_tien)<>3
  OR (SELECT COUNT(*) FROM dbo.don_hang WHERE trang_thai='CHO_GAN')<>14
  OR (SELECT COUNT(*) FROM dbo.don_hang WHERE trang_thai='DA_HUY')<>2
  OR (SELECT COUNT(*) FROM dbo.phan_cong_don_hang WHERE ket_thuc_luc IS NULL)<>2
  THROW 52402,N'Dữ liệu demo không khớp số lượng mong đợi',1;
 IF EXISTS(SELECT 1 FROM dbo.v_chia_cuoc WHERE tien_cong_ty+tien_tai_xe<>tong_cuoc OR tong_cuoc<0)
  OR EXISTS(SELECT 1 FROM dbo.v_giao_dich_nop WHERE tong_khoan_lien_ket<>so_tien_yeu_cau OR so_don_dang_lien_ket=0)
  THROW 52403,N'Dữ liệu demo không khớp tài chính',1;
 COMMIT;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_truoc;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_truoc;
 THROW;
END CATCH;
GO
