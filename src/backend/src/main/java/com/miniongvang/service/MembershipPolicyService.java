package com.miniongvang.service;

import com.miniongvang.dao.ChinhSachThanhVienDAO;
import com.miniongvang.entity.ChinhSachThanhVien;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.enums.MembershipTier;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Objects;

/**
 * UC-05: applies the customer's stored tier, without awarding points or upgrading tiers.
 * A null expiry means unlimited validity; the expiry date itself is inclusive.
 * Spending thresholds belong to tier assignment, not the amount of an individual quote.
 */
public final class MembershipPolicyService {
    public MembershipPolicyService() {
        this(Clock.system(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    public MembershipPolicyService(Clock clock) {
        Objects.requireNonNull(clock, "clock");
    }

    /** Evaluates the customer's tier and the one published policy valid at the quote time. */
    public Decision evaluate(EntityManager em, KhachHang customer, BigDecimal subtotal, Instant at) {
        Objects.requireNonNull(em, "em");
        Objects.requireNonNull(customer, "customer");
        Objects.requireNonNull(at, "at");
        if (subtotal == null || subtotal.signum() < 0) throw new IllegalArgumentException("Invalid subtotal");
        MembershipTier tier = customer.getMaHang();
        boolean active = tier != null && tier != MembershipTier.THUONG
                && customer.getThanhVienTu() != null && !at.isBefore(customer.getThanhVienTu())
                && (customer.getThanhVienDen() == null || at.isBefore(customer.getThanhVienDen()));
        if (!active) return new Decision(null, BigDecimal.ZERO.setScale(2), false);
        var matching = new ChinhSachThanhVienDAO(em).findApplicable(tier, at);
        if (matching.size() > 1) throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
        if (matching.isEmpty()) return new Decision(null, BigDecimal.ZERO.setScale(2), false);
        ChinhSachThanhVien policy = matching.getFirst();
        BigDecimal discount = subtotal.multiply(policy.getTyLeGiam())
                .movePointLeft(2).setScale(0, RoundingMode.HALF_UP).min(subtotal)
                .setScale(2);
        return new Decision(policy, discount, true);
    }

    public record Decision(ChinhSachThanhVien policy, BigDecimal discount, boolean active) {}
}
