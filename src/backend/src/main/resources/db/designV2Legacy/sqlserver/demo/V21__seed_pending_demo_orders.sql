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

IF DB_NAME() NOT IN (N'mini_ong_vang_design_v2_demo', N'mini_ong_vang_design_v2_test')
    THROW 52400, N'V21 is restricted to DesignV2 demo/test databases', 1;

DECLARE @previous_actor SQL_VARIANT = SESSION_CONTEXT(N'ma_tk');
DECLARE @now DATETIME2(3) = SYSUTCDATETIME();
DECLARE @fare_id UNIQUEIDENTIFIER, @base DECIMAL(15,0), @per_km DECIMAL(15,0),
        @included_kg DECIMAL(10,2), @per_kg DECIMAL(15,0),
        @min_km DECIMAL(10,2), @max_km DECIMAL(10,2), @max_kg DECIMAL(10,2),
        @mandatory_total DECIMAL(15,0);

BEGIN TRY
    BEGIN TRANSACTION;

    IF (SELECT COUNT(*) FROM dbo.tai_khoan t
        JOIN dbo.khach_hang k ON k.ma_tk = t.ma_tk
        WHERE t.username IN (N'0900000001', N'0900000002', N'0900000003')
          AND t.vai_tro = 'KHACH_HANG' AND t.trang_thai = 'HOAT_DONG') <> 3
        THROW 52420, N'V21 requires the three active demo customer accounts', 1;

    IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc
        WHERE trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
          AND (hieu_luc_den IS NULL OR hieu_luc_den > @now)) <> 1
        THROW 52421, N'V21 requires exactly one active fare', 1;

    SELECT @fare_id = ma_bieu_phi, @base = cuoc_co_ban, @per_km = don_gia_km,
           @included_kg = kg_bao_gom, @per_kg = don_gia_kg,
           @min_km = km_toi_thieu, @max_km = km_toi_da, @max_kg = kg_toi_da
    FROM dbo.cau_hinh_cuoc
    WHERE trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
      AND (hieu_luc_den IS NULL OR hieu_luc_den > @now);

    -- All nine sample routes use 3-11 km and one 2.50 kg parcel.
    IF @min_km > 3 OR @max_km < 11 OR @max_kg < 2.50
        THROW 52422, N'Active fare does not cover the V21 demo routes', 1;

    IF EXISTS (SELECT ma_loai FROM dbo.cau_hinh_phu_thu
        WHERE bat_buoc = 1 AND trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
          AND (hieu_luc_den IS NULL OR hieu_luc_den > @now)
        GROUP BY ma_loai HAVING COUNT(*) > 1)
        THROW 52423, N'Active mandatory surcharges have duplicate types', 1;

    SELECT @mandatory_total = COALESCE(SUM(so_tien), 0)
    FROM dbo.cau_hinh_phu_thu
    WHERE bat_buoc = 1 AND trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
      AND (hieu_luc_den IS NULL OR hieu_luc_den > @now);

    DECLARE @customer_number INT = 1, @order_number INT, @sequence INT,
            @account_id UNIQUEIDENTIFIER, @customer_id UNIQUEIDENTIFIER,
            @order_id UNIQUEIDENTIFIER, @policy_id UNIQUEIDENTIFIER,
            @tier VARCHAR(15), @rate DECIMAL(5,2), @km DECIMAL(10,2),
            @km_fare DECIMAL(15,0), @kg_fare DECIMAL(15,0), @discount DECIMAL(15,0),
            @request_key VARCHAR(100);

    WHILE @customer_number <= 3
    BEGIN
        SELECT @account_id = t.ma_tk, @customer_id = k.ma_kh
        FROM dbo.tai_khoan t JOIN dbo.khach_hang k ON k.ma_tk = t.ma_tk
        WHERE t.username = CONCAT(N'090000000', @customer_number);

        SET @tier = 'THUONG';
        SELECT @tier = ma_hang FROM dbo.khach_hang
        WHERE ma_kh = @customer_id AND thanh_vien_tu <= @now
          AND (thanh_vien_den IS NULL OR thanh_vien_den > @now);
        SET @policy_id = NULL;
        SET @rate = 0;
        IF @tier <> 'THUONG'
        BEGIN
            IF (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien
                WHERE ma_hang = @tier AND trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
                  AND (hieu_luc_den IS NULL OR hieu_luc_den > @now)) <> 1
                THROW 52424, N'V21 requires one active membership policy for each demo tier', 1;
            SELECT @policy_id = ma_chinh_sach, @rate = ty_le_giam
            FROM dbo.chinh_sach_thanh_vien
            WHERE ma_hang = @tier AND trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
              AND (hieu_luc_den IS NULL OR hieu_luc_den > @now);
        END;

        EXEC sys.sp_set_session_context @key = N'ma_tk', @value = @account_id;
        SET @order_number = 1;
        WHILE @order_number <= 3
        BEGIN
            SET @sequence = (@customer_number - 1) * 3 + @order_number;
            SET @order_id = CONVERT(UNIQUEIDENTIFIER,
                '90000000-0000-0000-0000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12), @sequence), 12));
            SET @request_key = CONCAT('sql-demo-pending-v21-', @sequence);
            IF EXISTS (SELECT 1 FROM dbo.don_hang
                WHERE ma_don = @order_id OR (ma_tk_tao = @account_id AND khoa_yeu_cau = @request_key))
                THROW 52425, N'V21 demo order ID or request key already exists', 1;

            SET @km = CONVERT(DECIMAL(10,2), @sequence + 2);
            SET @km_fare = dbo.fn_cuoc_km(@base, @km, @per_km);
            SET @kg_fare = dbo.fn_cuoc_kg(2.50, @included_kg, @per_kg);
            SET @discount = dbo.fn_tien_giam(@km_fare + @kg_fare + @mandatory_total, @rate);

            INSERT dbo.don_hang
                (ma_don, ma_kh, ma_tk_tao, khoa_yeu_cau, hash_yeu_cau,
                 ma_bieu_phi, ma_chinh_sach, diem_lay, diem_giao,
                 ten_nguoi_nhan, sdt_nguoi_nhan, quang_duong_km,
                 thoi_gian_du_kien_giay, nguon_lo_trinh, cuoc_km, cuoc_kg,
                 tien_giam, ghi_chu, tao_luc)
            VALUES
                (@order_id, @customer_id, @account_id, @request_key,
                 HASHBYTES('SHA2_256', CONCAT('SQL_DEMO_PENDING_V21:', @sequence)),
                 @fare_id, @policy_id, N'227 Nguyễn Văn Cừ, TP.HCM',
                 N'268 Lý Thường Kiệt, TP.HCM', CONCAT(N'Người nhận demo ', @sequence),
                 '0901234567', @km, CONVERT(INT, @km * 180), 'DEMO',
                 @km_fare, @kg_fare, @discount,
                 N'Đơn chờ gán demo; km/thời gian mô phỏng, chưa xác minh Goong', @now);

            INSERT dbo.chi_tiet_kien_hang (ma_don, thu_tu, loai_hang, khoi_luong_kg)
            VALUES (@order_id, 1, N'Hàng đóng hộp', 2.50);

            INSERT dbo.phu_thu_don_hang (ma_don, ma_phu_thu)
            SELECT @order_id, ma_phu_thu FROM dbo.cau_hinh_phu_thu
            WHERE bat_buoc = 1 AND trang_thai = 'CONG_BO' AND hieu_luc_tu <= @now
              AND (hieu_luc_den IS NULL OR hieu_luc_den > @now);

            SET @order_number += 1;
        END;
        SET @customer_number += 1;
    END;

    IF EXISTS (
        SELECT t.ma_tk
        FROM dbo.tai_khoan t JOIN dbo.khach_hang k ON k.ma_tk = t.ma_tk
        LEFT JOIN dbo.don_hang d ON d.ma_kh = k.ma_kh AND d.ma_tk_tao = t.ma_tk
            AND d.khoa_yeu_cau LIKE 'sql-demo-pending-v21-%'
            AND d.trang_thai = 'CHO_GAN' AND d.nguon_lo_trinh = 'DEMO'
        WHERE t.username IN (N'0900000001', N'0900000002', N'0900000003')
        GROUP BY t.ma_tk HAVING COUNT(d.ma_don) <> 3
    )
        THROW 52426, N'V21 did not create three pending orders per customer', 1;

    COMMIT TRANSACTION;
    EXEC sys.sp_set_session_context @key = N'ma_tk', @value = @previous_actor;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    EXEC sys.sp_set_session_context @key = N'ma_tk', @value = @previous_actor;
    THROW;
END CATCH;
