-- Read-only reconciliation for the designV1 schema. Run with sqlcmd -b in the target DB.
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.flyway_schema_history WHERE version = '2' AND success = 1)
    THROW 51000, 'designV1: Flyway V2 has not been applied', 1;
IF (SELECT COUNT(*) FROM sys.triggers WHERE name IN
        (N'trg_membership_policy_immutable', N'trg_fare_policy_immutable', N'trg_surcharge_policy_immutable')
        AND is_disabled = 0) <> 3
    THROW 51009, 'designV1: published-policy protection triggers are missing or disabled', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.flyway_schema_history WHERE version='4' AND success=1)
    OR (SELECT COUNT(*) FROM sys.triggers WHERE name IN
        (N'trg_customer_profile_role',N'trg_driver_profile_role',N'trg_account_role_immutable') AND is_disabled=0) <> 3
    THROW 51014, 'designV1: profile-role protection V4 is missing or disabled', 1;

IF EXISTS (
    SELECT 1 FROM dbo.tai_khoan a
    LEFT JOIN dbo.khach_hang k ON k.ma_tk = a.ma_tk
    LEFT JOIN dbo.tai_xe x ON x.ma_tk = a.ma_tk
    WHERE (a.vai_tro = N'KHACH_HANG' AND (k.ma_kh IS NULL OR x.ma_tx IS NOT NULL))
       OR (a.vai_tro = N'TAI_XE' AND (x.ma_tx IS NULL OR k.ma_kh IS NOT NULL))
       OR (a.vai_tro NOT IN (N'KHACH_HANG', N'TAI_XE') AND (k.ma_kh IS NOT NULL OR x.ma_tx IS NOT NULL))
)
    THROW 51001, 'designV1: account role and profile disagree', 1;

IF EXISTS (
    SELECT 1 FROM dbo.don_hang d
    OUTER APPLY (SELECT COUNT(*) AS n FROM dbo.cuoc_don_hang c WHERE c.ma_don = d.ma_don) fare
    OUTER APPLY (SELECT COUNT(*) AS n FROM dbo.chi_tiet_kien_hang k WHERE k.ma_don = d.ma_don) parcels
    OUTER APPLY (SELECT COUNT(*) AS n FROM dbo.nhat_ky_don_hang e WHERE e.ma_don = d.ma_don) events
    WHERE fare.n <> 1 OR parcels.n < 1 OR events.n < 1
)
    THROW 51002, 'designV1: order aggregate is incomplete', 1;

IF EXISTS (
    SELECT 1 FROM dbo.don_hang d
    OUTER APPLY (
        SELECT SUM(CASE WHEN p.ket_thuc_luc IS NULL THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN p.ket_qua_ket_thuc = N'HOAN_TAT' THEN 1 ELSE 0 END) AS completed_count
        FROM dbo.phan_cong_don_hang p WHERE p.ma_don = d.ma_don
    ) a
    WHERE (d.trang_thai IN (N'CHO_GAN', N'DA_HUY')
           AND (COALESCE(a.active_count, 0) <> 0 OR COALESCE(a.completed_count, 0) <> 0))
       OR (d.trang_thai IN (N'DA_GAN', N'DA_LAY_HANG', N'DANG_GIAO')
           AND (COALESCE(a.active_count, 0) <> 1 OR COALESCE(a.completed_count, 0) <> 0))
       OR (d.trang_thai = N'HOAN_TAT'
           AND (COALESCE(a.active_count, 0) <> 0 OR COALESCE(a.completed_count, 0) <> 1))
)
    THROW 51003, 'designV1: order and assignment state disagree', 1;

IF EXISTS (
    SELECT 1 FROM dbo.don_hang d
    OUTER APPLY (
        SELECT TOP (1) e.loai_su_kien, e.trang_thai_sau
        FROM dbo.nhat_ky_don_hang e WHERE e.ma_don = d.ma_don ORDER BY e.thu_tu
    ) first_event
    OUTER APPLY (
        SELECT TOP (1) e.trang_thai_sau
        FROM dbo.nhat_ky_don_hang e WHERE e.ma_don = d.ma_don ORDER BY e.thu_tu DESC
    ) last_event
    WHERE first_event.loai_su_kien <> N'TAO_DON'
       OR first_event.loai_su_kien IS NULL
       OR last_event.trang_thai_sau <> d.trang_thai
       OR last_event.trang_thai_sau IS NULL
)
    THROW 51004, 'designV1: first/last order event is inconsistent', 1;

IF EXISTS (
    SELECT 1 FROM (
        SELECT e.ma_don, e.thu_tu,
               ROW_NUMBER() OVER (PARTITION BY e.ma_don ORDER BY e.thu_tu) AS expected_order,
               LAG(e.trang_thai_sau) OVER (PARTITION BY e.ma_don ORDER BY e.thu_tu) AS previous_status,
               e.trang_thai_truoc
        FROM dbo.nhat_ky_don_hang e
    ) sequence
    WHERE sequence.thu_tu <> sequence.expected_order
       OR (sequence.expected_order > 1 AND sequence.trang_thai_truoc <> sequence.previous_status)
       OR (sequence.expected_order > 1 AND sequence.trang_thai_truoc IS NULL)
)
    THROW 51005, 'designV1: event sequence has a gap or broken state chain', 1;

IF EXISTS (
    SELECT 1 FROM dbo.chinh_sach_thanh_vien a
    JOIN dbo.chinh_sach_thanh_vien b ON a.ma_chinh_sach < b.ma_chinh_sach
        AND a.ma_hang = b.ma_hang AND a.trang_thai = N'CONG_BO' AND b.trang_thai = N'CONG_BO'
        AND (a.hieu_luc_den IS NULL OR b.hieu_luc_tu < a.hieu_luc_den)
        AND (b.hieu_luc_den IS NULL OR a.hieu_luc_tu < b.hieu_luc_den)
)
    THROW 51006, 'designV1: published membership policies overlap', 1;

IF EXISTS (
    SELECT 1 FROM dbo.cau_hinh_phu_thu a
    JOIN dbo.cau_hinh_phu_thu b ON a.ma_phu_thu < b.ma_phu_thu
        AND a.ma_loai_phu_thu = b.ma_loai_phu_thu
        AND a.trang_thai = N'CONG_BO' AND b.trang_thai = N'CONG_BO'
        AND (a.hieu_luc_den IS NULL OR b.hieu_luc_tu < a.hieu_luc_den)
        AND (b.hieu_luc_den IS NULL OR a.hieu_luc_tu < b.hieu_luc_den)
)
    THROW 51007, 'designV1: published surcharge policies overlap', 1;

IF EXISTS (
    SELECT 1 FROM dbo.cau_hinh_cuoc a
    JOIN dbo.cau_hinh_cuoc b ON a.ma_bieu_phi < b.ma_bieu_phi
        AND a.trang_thai = N'CONG_BO' AND b.trang_thai = N'CONG_BO'
        AND (a.hieu_luc_den IS NULL OR b.hieu_luc_tu < a.hieu_luc_den)
        AND (b.hieu_luc_den IS NULL OR a.hieu_luc_tu < b.hieu_luc_den)
        AND (a.km_toi_da IS NULL OR b.km_toi_thieu <= a.km_toi_da)
        AND (b.km_toi_da IS NULL OR a.km_toi_thieu <= b.km_toi_da)
)
    THROW 51008, 'designV1: published fare policies overlap in time and km', 1;

-- Aggregate surcharge rows once per order; never join payment events into fare sums.
IF OBJECT_ID('tempdb..#t19_fare_totals') IS NOT NULL DROP TABLE #t19_fare_totals;
SELECT c.ma_don, c.cuoc_goc + COALESCE(SUM(s.so_tien), 0) - c.tien_giam_gia AS tong_cuoc
INTO #t19_fare_totals
FROM dbo.cuoc_don_hang c
LEFT JOIN dbo.phu_thu_don_hang link ON link.ma_don = c.ma_don
LEFT JOIN dbo.cau_hinh_phu_thu s ON s.ma_phu_thu = link.ma_phu_thu
GROUP BY c.ma_don, c.cuoc_goc, c.tien_giam_gia;

IF EXISTS (
    SELECT 1 FROM dbo.xac_nhan_thanh_toan_don_hang x
    JOIN dbo.thanh_toan p ON p.ma_giao_dich = x.ma_giao_dich
    JOIN dbo.don_hang d ON d.ma_don = x.ma_don
    JOIN #t19_fare_totals f ON f.ma_don = x.ma_don
    WHERE p.ma_don <> x.ma_don OR p.trang_thai <> N'THANH_CONG'
       OR f.tong_cuoc <= 0
       OR p.so_tien_thuc_nhan IS NULL OR p.so_tien_thuc_nhan <> f.tong_cuoc
)
    THROW 51010, 'designV1: payment confirmation disagrees with order or amount due', 1;

IF EXISTS (
    SELECT ma_don FROM dbo.thanh_toan
    WHERE trang_thai IN (N'CHO_XU_LY', N'CHUA_RO_KET_QUA')
    GROUP BY ma_don HAVING COUNT(*) > 1
)
    THROW 51011, 'designV1: more than one unresolved payment for an order', 1;

IF EXISTS (
    SELECT 1 FROM dbo.thanh_toan p
    JOIN dbo.don_hang d ON d.ma_don = p.ma_don
    JOIN #t19_fare_totals f ON f.ma_don = p.ma_don
    WHERE f.tong_cuoc <= 0 OR p.phuong_thuc <> d.phuong_thuc_thanh_toan
       OR NOT EXISTS (
           SELECT 1 FROM dbo.nhat_ky_don_hang e
           WHERE e.ma_don = d.ma_don AND e.thoi_gian <= p.tao_luc
             AND ((d.ben_thanh_toan = N'NGUOI_DAT' AND e.trang_thai_sau = N'DA_LAY_HANG')
               OR (d.ben_thanh_toan = N'NGUOI_NHAN' AND e.loai_su_kien = N'DEN_DIEM_NHAN'))
       )
)
    THROW 51012, 'designV1: payment created before collection milestone, wrong method or free order', 1;

IF EXISTS (
    SELECT 1 FROM dbo.su_kien_thanh_toan
    WHERE ket_qua_xu_ly = N'DA_AP_DUNG' AND (chu_ky_hop_le = 0 OR ma_giao_dich IS NULL)
)
    THROW 51013, 'designV1: applied callback lacks a valid signature or payment link', 1;

DROP TABLE #t19_fare_totals;

PRINT 'designV1 invariant reconciliation passed';
