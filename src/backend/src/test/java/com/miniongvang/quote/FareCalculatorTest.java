package com.miniongvang.quote;

import com.miniongvang.dto.MembershipDiscountResponse;
import com.miniongvang.entity.CauHinhCuoc;
import com.miniongvang.entity.CauHinhPhuThu;
import com.miniongvang.service.FareCalculator;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FareCalculatorTest {
    private final FareCalculator calculator = new FareCalculator();

    @Test void roundsBreakdownAndCapsDiscount() {
        CauHinhCuoc tariff = tariff("10.25", "2.05");
        CauHinhPhuThu extra = extra("0.50");
        FareCalculator.Fare regular = calculator.calculate(new BigDecimal("1.50"), tariff, List.of(extra), null);
        assertEquals("13.00", regular.cuocGoc());
        assertEquals("1.00", regular.tienPhuThu());
        assertEquals("14.00", regular.tongCuoc());
        assertEquals(regular.tienPhuThu(), regular.phuThu().getFirst().soTienTinh());
        var vip = new MembershipDiscountResponse("VIP", "VIP", null, true,
                new BigDecimal("100.00"), new BigDecimal("1000"));
        FareCalculator.Fare free = calculator.calculate(new BigDecimal("1.50"), tariff, List.of(extra), vip);
        assertEquals("14.00", free.tienGiamGia());
        assertEquals("0.00", free.tongCuoc());
    }

    @Test void rejectsInvalidDistanceAndBrokenFare() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculate(BigDecimal.ZERO, tariff("10", "2"), List.of(), null));
        assertThrows(FareCalculator.FareConfigurationException.class,
                () -> calculator.calculate(BigDecimal.ONE, tariff("-1", "2"), List.of(), null));
        assertThrows(FareCalculator.FareConfigurationException.class,
                () -> calculator.calculate(new BigDecimal("1000"), tariff("0", "9999999999999"), List.of(), null));
    }

    private static CauHinhCuoc tariff(String base, String perKm) {
        CauHinhCuoc result = new CauHinhCuoc();
        result.setCuocCoBan(new BigDecimal(base)); result.setDonGiaKm(new BigDecimal(perKm));
        return result;
    }
    private static CauHinhPhuThu extra(String amount) {
        CauHinhPhuThu result = new CauHinhPhuThu();
        result.setId("EXTRA"); result.setTenPhuThu("Sample"); result.setSoTienPhuThu(new BigDecimal(amount));
        return result;
    }
}
