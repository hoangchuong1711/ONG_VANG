package com.miniongvang.quote;

import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.ChinhSachPhuThu;
import com.miniongvang.service.FareCalculator;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class FareCalculatorTest {
    private final FareCalculator calculator = new FareCalculator();

    @Test void roundsOnceAndAppliesPublishedFixedSurchargeAndDiscount() {
        BieuPhi tariff = tariff("10.25", "2.05");
        ChinhSachPhuThu extra = extra("1.00");
        var fare = calculator.calculateV1(new BigDecimal("1.50"), tariff,
                List.of(extra), new BigDecimal("2.00"));
        assertEquals("13.00", fare.cuocGoc());
        assertEquals("1.00", fare.tienPhuThu());
        assertEquals("2.00", fare.tienGiamGia());
        assertEquals("12.00", fare.tongCuoc());
        assertEquals("1.00", fare.phuThu().getFirst().soTienTinh());
    }

    @Test void rejectsInvalidAmountAndOverflow() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateV1(BigDecimal.ZERO, tariff("10", "2"), List.of(), BigDecimal.ZERO));
        assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
                () -> calculator.calculateV1(BigDecimal.ONE, tariff("-1", "2"), List.of(), BigDecimal.ZERO));
        assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
                () -> calculator.calculateV1(BigDecimal.ONE, tariff("10", "2"), List.of(), new BigDecimal("100")));
        assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
                () -> calculator.calculateV1(new BigDecimal("1000"), tariff("0", "9999999999999"),
                        List.of(), BigDecimal.ZERO));
    }

    @Test void pricesWeightBoundariesAndAppliesDiscountAfterSurcharge() {
        BieuPhi tariff = tariff("20000", "5000");
        tariff.setId("POLICY-1");
        tariff.setPhienBan(2);
        tariff.setKgBaoGom(new BigDecimal("1.00"));
        tariff.setDonGiaKg(new BigDecimal("3000.00"));
        tariff.setKgToiDa(new BigDecimal("30.00"));
        var included = calculator.calculateV1(new BigDecimal("5.00"), new BigDecimal("1.00"),
                tariff, List.of(extra("5000")), new BigDecimal("5000"));
        assertEquals("45000.00", included.cuocKm());
        assertEquals("0.00", included.cuocKhoiLuong());
        assertEquals("45000.00", included.tongCuoc());
        var heavy = calculator.calculateV1(new BigDecimal("5.00"), new BigDecimal("1.01"),
                tariff, List.of(), BigDecimal.ZERO);
        assertEquals("30.00", heavy.cuocKhoiLuong());
        assertEquals("POLICY-1", heavy.maBieuPhi());
        assertEquals(2, heavy.phienBanBieuPhi());
        assertDoesNotThrow(() -> calculator.calculateV1(BigDecimal.ONE, new BigDecimal("30.00"),
                tariff, List.of(), BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateV1(BigDecimal.ONE,
                new BigDecimal("30.01"), tariff, List.of(), BigDecimal.ZERO));
    }

    @Test void zeroFareHasNoNegativeBalance() {
        BieuPhi tariff = tariff("0", "0");
        tariff.setDonGiaKg(BigDecimal.ZERO);
        var fare = calculator.calculateV1(BigDecimal.ONE, BigDecimal.ONE, tariff, List.of(), BigDecimal.ZERO);
        assertEquals("0.00", fare.tongCuoc());
    }

    private static BieuPhi tariff(String base, String perKm) {
        BieuPhi value = new BieuPhi();
        value.setCuocCoBan(new BigDecimal(base)); value.setDonGiaKm(new BigDecimal(perKm));
        return value;
    }
    private static ChinhSachPhuThu extra(String amount) {
        ChinhSachPhuThu value = new ChinhSachPhuThu();
        value.setId("EXTRA"); value.setTenPhuThu("Sample"); value.setSoTien(new BigDecimal(amount));
        return value;
    }
}
