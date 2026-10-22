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
    THROW 52400, N'V20 is restricted to DesignV2 demo/test databases', 1;

DECLARE @orders TABLE (
    ma_don UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    khoa_yeu_cau VARCHAR(100) NOT NULL
);

;WITH numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 30
)
INSERT @orders (ma_don, khoa_yeu_cau)
SELECT CONVERT(UNIQUEIDENTIFIER,
        '50000000-0000-0000-0000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12), n), 12)),
       CONCAT('sql-demo-order-', n)
FROM numbers
OPTION (MAXRECURSION 30);

DECLARE @payments TABLE (
    ma_giao_dich UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ma_tx UNIQUEIDENTIFIER NOT NULL,
    khoa_yeu_cau VARCHAR(100) NOT NULL,
    ma_tham_chieu VARCHAR(100) NOT NULL
);

;WITH numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 3
)
INSERT @payments (ma_giao_dich, ma_tx, khoa_yeu_cau, ma_tham_chieu)
SELECT CONVERT(UNIQUEIDENTIFIER,
        '80000000-0000-0000-0000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12), n), 12)),
       CONVERT(UNIQUEIDENTIFIER,
        '30000000-0000-0000-0000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12), n), 12)),
       CONCAT('sql-demo-payment-', n),
       CONCAT('SQLDEMONOP', n)
FROM numbers
OPTION (MAXRECURSION 3);

-- Refuse to delete a fixed ID if it no longer identifies the exact V9 fixture.
IF EXISTS (
    SELECT 1
    FROM dbo.don_hang d
    JOIN @orders f ON f.ma_don = d.ma_don
    WHERE d.khoa_yeu_cau <> f.khoa_yeu_cau
       OR d.ma_tk_tao <> '10000000-0000-0000-0000-000000000101'
       OR d.nguon_lo_trinh <> 'DEMO'
)
    THROW 52410, N'A fixed V9 order ID no longer matches its demo marker; cleanup stopped', 1;

IF EXISTS (
    SELECT 1
    FROM dbo.giao_dich_nop_tien g
    JOIN @payments f ON f.ma_giao_dich = g.ma_giao_dich
    WHERE g.ma_tx <> f.ma_tx
       OR g.khoa_yeu_cau <> f.khoa_yeu_cau
       OR g.ma_tham_chieu <> f.ma_tham_chieu
       OR g.trang_thai <> 'CHO_XU_LY'
       OR g.giai_quyet_luc IS NOT NULL
       OR g.ma_giao_dich_doi_tac IS NOT NULL
       OR g.so_tien_thuc_nhan IS NOT NULL
       OR g.payment_url IS NOT NULL
)
    THROW 52411, N'A fixed V9 payment ID is no longer an untouched demo payment; cleanup stopped', 1;

IF EXISTS (
    SELECT 1
    FROM dbo.phan_chia_cuoc c
    JOIN @orders o ON o.ma_don = c.ma_don
    WHERE c.ma_giao_dich_nop IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM @payments p WHERE p.ma_giao_dich = c.ma_giao_dich_nop
      )
)
    THROW 52412, N'A fixed V9 order is linked to a non-demo payment; cleanup stopped', 1;

IF EXISTS (
    SELECT 1
    FROM dbo.phan_chia_cuoc c
    JOIN @payments p ON p.ma_giao_dich = c.ma_giao_dich_nop
    WHERE NOT EXISTS (SELECT 1 FROM @orders o WHERE o.ma_don = c.ma_don)
)
    THROW 52413, N'A fixed V9 payment is linked to a non-demo order; cleanup stopped', 1;

DECLARE @division_trigger_disabled BIT;
DECLARE @payment_trigger_disabled BIT;

SELECT @division_trigger_disabled = is_disabled
FROM sys.triggers
WHERE object_id = OBJECT_ID(N'dbo.tr_chia_hop_le', N'TR');

SELECT @payment_trigger_disabled = is_disabled
FROM sys.triggers
WHERE object_id = OBJECT_ID(N'dbo.tr_gd_bao_ve', N'TR');

IF @division_trigger_disabled IS NULL OR @payment_trigger_disabled IS NULL
    THROW 52414, N'Required DesignV2 integrity triggers are missing; cleanup stopped', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    -- These append-only guards are disabled only while deleting the fixed V9 fixtures.
    IF @division_trigger_disabled = 0
        DISABLE TRIGGER dbo.tr_chia_hop_le ON dbo.phan_chia_cuoc;
    IF @payment_trigger_disabled = 0
        DISABLE TRIGGER dbo.tr_gd_bao_ve ON dbo.giao_dich_nop_tien;

    DELETE e
    FROM dbo.su_kien_thanh_toan e
    JOIN @payments p ON p.ma_giao_dich = e.ma_giao_dich;

    DELETE c
    FROM dbo.phan_chia_cuoc c
    JOIN @orders o ON o.ma_don = c.ma_don;

    DELETE g
    FROM dbo.giao_dich_nop_tien g
    JOIN @payments p ON p.ma_giao_dich = g.ma_giao_dich;

    DELETE pc
    FROM dbo.phan_cong_don_hang pc
    JOIN @orders o ON o.ma_don = pc.ma_don;

    DELETE log_row
    FROM dbo.nhat_ky_don_hang log_row
    JOIN @orders o ON o.ma_don = log_row.ma_don;

    DELETE surcharge
    FROM dbo.phu_thu_don_hang surcharge
    JOIN @orders o ON o.ma_don = surcharge.ma_don;

    DELETE parcel
    FROM dbo.chi_tiet_kien_hang parcel
    JOIN @orders o ON o.ma_don = parcel.ma_don;

    DELETE d
    FROM dbo.don_hang d
    JOIN @orders o ON o.ma_don = d.ma_don;

    DELETE audit_row
    FROM dbo.nhat_ky_kiem_toan audit_row
    WHERE audit_row.ma_tk = '10000000-0000-0000-0000-000000000102'
      AND audit_row.doi_tuong = 'SQL_DEMO'
      AND audit_row.ma_doi_tuong = '10000000-0000-0000-0000-000000000102'
      AND audit_row.hanh_dong = 'NAP_DU_LIEU'
      AND audit_row.noi_dung = N'{"accounts":8,"orders":30,"source":"SQL_INSERT_DEMO"}';

    -- V9 left two online demo drivers unavailable while their fixture assignments were open.
    UPDATE t
    SET ranh_tu = SYSUTCDATETIME()
    FROM dbo.tai_xe t
    WHERE t.ma_tx IN (
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000003'
    )
      AND t.trang_thai = 'ONLINE'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.phan_cong_don_hang active_assignment
          WHERE active_assignment.ma_tx = t.ma_tx AND active_assignment.ket_thuc_luc IS NULL
      );

    IF @division_trigger_disabled = 0
        ENABLE TRIGGER dbo.tr_chia_hop_le ON dbo.phan_chia_cuoc;
    IF @payment_trigger_disabled = 0
        ENABLE TRIGGER dbo.tr_gd_bao_ve ON dbo.giao_dich_nop_tien;

    IF EXISTS (SELECT 1 FROM dbo.don_hang d JOIN @orders o ON o.ma_don = d.ma_don)
       OR EXISTS (SELECT 1 FROM dbo.giao_dich_nop_tien g JOIN @payments p ON p.ma_giao_dich = g.ma_giao_dich)
       OR EXISTS (SELECT 1 FROM dbo.su_kien_thanh_toan e JOIN @payments p ON p.ma_giao_dich = e.ma_giao_dich)
        THROW 52415, N'V9 demo order/payment cleanup verification failed', 1;

    IF (
        SELECT COUNT(*) FROM dbo.tai_khoan
        WHERE username IN (
            N'0900000001', N'0900000002', N'0900000003', N'demo_dispatcher', N'demo_admin',
            N'0800000001', N'0800000002', N'0800000003'
        )
    ) <> 8
        THROW 52416, N'V20 must preserve all eight demo accounts', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
