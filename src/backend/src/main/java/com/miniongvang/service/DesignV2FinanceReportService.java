package com.miniongvang.service;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

/** Read-only designV2 settlement report. Periods are [from, until) in Vietnam time. */
public final class DesignV2FinanceReportService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    public record DriverLine(String maTx, String hoTen, BigDecimal congTyPhatSinh,
            BigDecimal thuNhapTaiXePhatSinh, BigDecimal daNhanVnpay,
            BigDecimal conPhaiNopCuoiKy) {}

    public record Report(String tuNgay, String denNgayKhongGom, String muiGio,
            BigDecimal congTyPhatSinh, BigDecimal thuNhapTaiXePhatSinh,
            BigDecimal daNhanVnpay, BigDecimal conPhaiNopCuoiKy,
            List<DriverLine> taiXe) {}

    public Report load(Connection connection, LocalDate from, LocalDate until) throws SQLException {
        if (from == null || until == null || !until.isAfter(from))
            throw new IllegalArgumentException("Khoảng ngày không hợp lệ");
        Timestamp startUtc = Timestamp.from(from.atStartOfDay(VIETNAM).toInstant());
        Timestamp endUtc = Timestamp.from(until.atStartOfDay(VIETNAM).toInstant());
        String sql = "SELECT t.ma_tx,k.ho_ten,"
                + "COALESCE(p.cong_ty_phat_sinh,0) cong_ty_phat_sinh,"
                + "COALESCE(p.thu_nhap_tai_xe_phat_sinh,0) thu_nhap_tai_xe_phat_sinh,"
                + "COALESCE(g.da_nhan_vnpay,0) da_nhan_vnpay,"
                + "COALESCE(p.cong_ty_luy_ke,0)-COALESCE(g.da_nhan_luy_ke,0) con_phai_nop_cuoi_ky "
                + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "LEFT JOIN (SELECT ma_tx,"
                + "SUM(CASE WHEN ghi_nhan_luc>=? THEN tien_cong_ty ELSE 0 END) cong_ty_phat_sinh,"
                + "SUM(CASE WHEN ghi_nhan_luc>=? THEN tien_tai_xe ELSE 0 END) thu_nhap_tai_xe_phat_sinh,"
                + "SUM(tien_cong_ty) cong_ty_luy_ke FROM dbo.v_chia_cuoc "
                + "WHERE ghi_nhan_luc<? GROUP BY ma_tx) p ON p.ma_tx=t.ma_tx "
                + "LEFT JOIN (SELECT ma_tx,"
                + "SUM(CASE WHEN giai_quyet_luc>=? THEN so_tien_thuc_nhan ELSE 0 END) da_nhan_vnpay,"
                + "SUM(so_tien_thuc_nhan) da_nhan_luy_ke FROM dbo.giao_dich_nop_tien "
                + "WHERE trang_thai='THANH_CONG' AND giai_quyet_luc<? GROUP BY ma_tx) g ON g.ma_tx=t.ma_tx "
                + "ORDER BY k.ho_ten,t.ma_tx";
        List<DriverLine> drivers = new ArrayList<>();
        BigDecimal company = ZERO, income = ZERO, received = ZERO, balance = ZERO;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            statement.setTimestamp(1, startUtc, utc);
            statement.setTimestamp(2, startUtc, utc);
            statement.setTimestamp(3, endUtc, utc);
            statement.setTimestamp(4, startUtc, utc);
            statement.setTimestamp(5, endUtc, utc);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    DriverLine driver = new DriverLine(rows.getString("ma_tx"), rows.getString("ho_ten"),
                            rows.getBigDecimal("cong_ty_phat_sinh"),
                            rows.getBigDecimal("thu_nhap_tai_xe_phat_sinh"),
                            rows.getBigDecimal("da_nhan_vnpay"),
                            rows.getBigDecimal("con_phai_nop_cuoi_ky"));
                    drivers.add(driver);
                    company = company.add(driver.congTyPhatSinh());
                    income = income.add(driver.thuNhapTaiXePhatSinh());
                    received = received.add(driver.daNhanVnpay());
                    balance = balance.add(driver.conPhaiNopCuoiKy());
                }
            }
        }
        return new Report(from.toString(), until.toString(), VIETNAM.getId(),
                company, income, received, balance, List.copyOf(drivers));
    }
}
