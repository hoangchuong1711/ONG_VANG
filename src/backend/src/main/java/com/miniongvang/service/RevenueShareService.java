package com.miniongvang.service;

import com.miniongvang.entity.DonHang;
import com.miniongvang.dao.RevenueShareDAO;
import com.miniongvang.entity.PhanCongDonHang;
import com.miniongvang.entity.XacNhanThanhToanDonHang;
import com.miniongvang.entity.enums.OrderStatus;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/** One immutable 20/80 snapshot per completed and fully collected order. */
public final class RevenueShareService {
    private RevenueShareService() {}

    public static void record(EntityManager em, DonHang order) {
        if (order.getTrangThai() != OrderStatus.HOAN_TAT || order.getThoiGianHoanTat() == null) return;
        var dao = new RevenueShareDAO(em);
        if (dao.exists(order.getId())) return;
        BigDecimal fare = PaymentService.fare(em, order.getId()).setScale(2);
        XacNhanThanhToanDonHang confirmation = em.find(XacNhanThanhToanDonHang.class, order.getId());
        if (fare.signum() > 0 && (confirmation == null || confirmation.getLanThanhToan().getThuLuc() == null)) return;
        PhanCongDonHang assignment = dao.completedAssignment(order.getId());
        if (assignment == null) return;
        BigDecimal company = fare.multiply(new BigDecimal("0.20")).setScale(0, RoundingMode.HALF_UP).setScale(2);
        Instant recorded = order.getThoiGianHoanTat();
        if (confirmation != null && confirmation.getLanThanhToan().getThuLuc().isAfter(recorded))
            recorded = confirmation.getLanThanhToan().getThuLuc();
        dao.insert(order.getId(), assignment.getId(), confirmation == null ? null : confirmation.getLanThanhToan().getId(), fare, company, recorded);
    }
}
