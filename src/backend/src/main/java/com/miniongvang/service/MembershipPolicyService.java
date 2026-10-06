package com.miniongvang.service;

import com.miniongvang.DAO.KhachHangDAO;
import com.miniongvang.dto.MembershipDiscountResponse;
import com.miniongvang.entity.HangThanhVien;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.KhachHangVip;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.NoSuchElementException;
import java.util.Objects;

/**
 * UC-05: applies the customer's stored tier, without awarding points or upgrading tiers.
 * A null expiry means unlimited validity; the expiry date itself is inclusive.
 * Spending thresholds belong to tier assignment, not the amount of an individual quote.
 */
public final class MembershipPolicyService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal MAX_PERCENT = new BigDecimal("100");
    private final Clock clock;

    public MembershipPolicyService() {
        this(Clock.system(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    public MembershipPolicyService(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    /** The caller owns the DAO's EntityManager and transaction. */
    public MembershipDiscountResponse calculateDiscount(
            KhachHangDAO customers, String customerId, BigDecimal fare) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("Customer ID is required");
        }
        KhachHang customer = Objects.requireNonNull(customers, "customers").findWithVip(customerId);
        if (customer == null) {
            throw new NoSuchElementException("Customer not found: " + customerId);
        }
        return calculateDiscount(customer, fare);
    }

    /** Load VIP and tier before calling this overload if the customer is detached. */
    public MembershipDiscountResponse calculateDiscount(KhachHang customer, BigDecimal fare) {
        Objects.requireNonNull(customer, "customer");
        if (fare == null || fare.signum() < 0) {
            throw new IllegalArgumentException("Fare must be non-negative");
        }
        // T09 rounds the final quote to whole VND; do not round intermediate amounts here.
        BigDecimal amount = fare;
        KhachHangVip vip = customer.getVip();
        HangThanhVien tier = vip == null ? null : vip.getHang();
        LocalDate expiry = vip == null ? null : vip.getNgayHetHan();
        LocalDate today = LocalDate.now(clock);
        BigDecimal percent = tier == null ? null : tier.getPhanTramGiamGia();
        boolean valid = vip != null && tier != null
                && vip.getNgayDangKy() != null && !vip.getNgayDangKy().isAfter(today)
                && (expiry == null || !expiry.isBefore(today))
                && percent != null && percent.signum() >= 0
                && percent.compareTo(MAX_PERCENT) <= 0;
        BigDecimal appliedPercent = valid ? percent : ZERO;
        BigDecimal discount = valid
                ? amount.multiply(appliedPercent).movePointLeft(2).min(amount)
                : ZERO;
        return new MembershipDiscountResponse(
                tier == null ? null : tier.getId(),
                tier == null ? null : tier.getTenHang(),
                expiry, valid, appliedPercent, discount);
    }
}
