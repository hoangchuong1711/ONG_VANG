package com.miniongvang.service;
import com.miniongvang.dto.quote.FareDtos.Fare;
import com.miniongvang.dto.quote.FareDtos.Surcharge;

import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.ChinhSachPhuThu;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Pure VND calculation shared by quotes and the later order confirmation flow. */
public final class FareCalculator {
    private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999.00");

    public Fare calculateV1(BigDecimal km, BieuPhi tariff, List<ChinhSachPhuThu> surcharges,
                            BigDecimal discount) {
        if (km == null || km.signum() <= 0) throw new IllegalArgumentException("Distance must be positive");
        if (tariff == null || tariff.getCuocCoBan() == null || tariff.getDonGiaKm() == null
                || tariff.getCuocCoBan().signum() < 0 || tariff.getDonGiaKm().signum() < 0)
            throw new FareConfigurationException();
        BigDecimal base = whole(tariff.getCuocCoBan().add(km.multiply(tariff.getDonGiaKm())));
        BigDecimal extras = BigDecimal.ZERO;
        List<Surcharge> lines = new ArrayList<>();
        for (ChinhSachPhuThu item : surcharges) {
            if (item.getSoTien() == null || item.getSoTien().signum() < 0)
                throw new FareConfigurationException();
            BigDecimal value = item.getSoTien();
            if (value.stripTrailingZeros().scale() > 0) throw new FareConfigurationException();
            extras = extras.add(value);
            lines.add(new Surcharge(item.getId(), item.getTenPhuThu(), money(value)));
        }
        BigDecimal subtotal = base.add(extras);
        BigDecimal appliedDiscount = discount == null ? BigDecimal.ZERO : discount;
        if (appliedDiscount.signum() < 0 || appliedDiscount.compareTo(subtotal) > 0
                || appliedDiscount.stripTrailingZeros().scale() > 0)
            throw new FareConfigurationException();
        BigDecimal total = subtotal.subtract(appliedDiscount);
        checkAmount(base); checkAmount(extras); checkAmount(appliedDiscount); checkAmount(total);
        return new Fare(money(base), money(extras), money(appliedDiscount), money(total),
                "VND", List.copyOf(lines));
    }

    public static BigDecimal whole(BigDecimal value) { return value.setScale(0, RoundingMode.HALF_UP); }
    private static String money(BigDecimal value) { return value.setScale(2, RoundingMode.UNNECESSARY).toPlainString(); }
    private static void checkAmount(BigDecimal amount) {
        if (amount.compareTo(MAX_MONEY) > 0) throw new FareConfigurationException();
    }

    public static final class FareConfigurationException extends RuntimeException {}
}
