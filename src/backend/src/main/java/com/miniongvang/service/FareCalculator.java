package com.miniongvang.service;

import com.miniongvang.dto.MembershipDiscountResponse;
import com.miniongvang.entity.CauHinhCuoc;
import com.miniongvang.entity.CauHinhPhuThu;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Pure VND calculation shared by quotes and the later order confirmation flow. */
public final class FareCalculator {
    private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999.00");

    public Fare calculate(BigDecimal km, CauHinhCuoc tariff, List<CauHinhPhuThu> surcharges,
                          MembershipDiscountResponse membership) {
        if (km == null || km.signum() <= 0) throw new IllegalArgumentException("Distance must be positive");
        if (tariff == null || tariff.getCuocCoBan() == null || tariff.getDonGiaKm() == null
                || tariff.getCuocCoBan().signum() < 0 || tariff.getDonGiaKm().signum() < 0)
            throw new FareConfigurationException();
        BigDecimal base = whole(tariff.getCuocCoBan().add(km.multiply(tariff.getDonGiaKm())));
        List<Surcharge> lines = new ArrayList<>();
        BigDecimal extras = BigDecimal.ZERO;
        for (CauHinhPhuThu item : surcharges) {
            if (item.getSoTienPhuThu() == null || item.getSoTienPhuThu().signum() < 0)
                throw new FareConfigurationException();
            BigDecimal value = whole(item.getSoTienPhuThu());
            extras = extras.add(value);
            lines.add(new Surcharge(item.getId(), item.getTenPhuThu(), money(value)));
        }
        BigDecimal beforeDiscount = base.add(extras);
        BigDecimal rawDiscount = membership == null ? BigDecimal.ZERO : membership.tienGiamGia();
        if (rawDiscount == null || rawDiscount.signum() < 0) throw new FareConfigurationException();
        BigDecimal discount = whole(rawDiscount.min(beforeDiscount));
        BigDecimal total = beforeDiscount.subtract(discount).max(BigDecimal.ZERO);
        checkAmount(base); checkAmount(extras); checkAmount(discount); checkAmount(total);
        return new Fare(money(base), money(extras), money(discount), money(total), "VND", List.copyOf(lines));
    }

    public static BigDecimal whole(BigDecimal value) { return value.setScale(0, RoundingMode.HALF_UP); }
    private static String money(BigDecimal value) { return value.setScale(2, RoundingMode.UNNECESSARY).toPlainString(); }
    private static void checkAmount(BigDecimal amount) {
        if (amount.compareTo(MAX_MONEY) > 0) throw new FareConfigurationException();
    }

    public record Surcharge(String maPhuThu, String tenPhuThu, String soTienTinh) {}
    public record Fare(String cuocGoc, String tienPhuThu, String tienGiamGia,
                       String tongCuoc, String donViTien, List<Surcharge> phuThu) {}
    public static final class FareConfigurationException extends RuntimeException {}
}
