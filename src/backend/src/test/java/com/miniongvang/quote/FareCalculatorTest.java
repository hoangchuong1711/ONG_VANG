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
