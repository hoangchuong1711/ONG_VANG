package com.miniongvang.service;

import com.miniongvang.dao.DesignV2FinanceReportDAO;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/** Read-only designV2 settlement report. Periods are [from, until) in Vietnam time. */
public final class DesignV2FinanceReportService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private final DesignV2FinanceReportDAO reports = new DesignV2FinanceReportDAO();

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
        List<DesignV2FinanceReportDAO.DriverBalance> balances = reports.findDriverBalances(connection, startUtc, endUtc);
        List<DriverLine> drivers = new java.util.ArrayList<>(balances.size());
        BigDecimal company = ZERO, income = ZERO, received = ZERO, balance = ZERO;
        for (DesignV2FinanceReportDAO.DriverBalance item : balances) {
            DriverLine driver = new DriverLine(item.maTx(), item.hoTen(), item.congTyPhatSinh(),
                    item.thuNhapTaiXePhatSinh(), item.daNhanVnpay(), item.conPhaiNopCuoiKy());
            drivers.add(driver);
            company = company.add(driver.congTyPhatSinh());
            income = income.add(driver.thuNhapTaiXePhatSinh());
            received = received.add(driver.daNhanVnpay());
            balance = balance.add(driver.conPhaiNopCuoiKy());
        }
        return new Report(from.toString(), until.toString(), VIETNAM.getId(),
                company, income, received, balance, List.copyOf(drivers));
    }
}
