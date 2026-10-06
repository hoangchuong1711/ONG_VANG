package com.miniongvang.service;

import com.miniongvang.entity.HangThanhVien;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.KhachHangVip;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class MembershipPolicyServiceTest {
    private final MembershipPolicyService service = new MembershipPolicyService(
            Clock.fixed(Instant.parse("2026-10-05T18:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
    private final BigDecimal fare = new BigDecimal("50000.00");

    @Test
    void regularCustomerGetsNoDiscount() {
        var result = service.calculateDiscount(new KhachHang(), fare);
        assertFalse(result.conHieuLuc());
        assertNull(result.maHang());
        assertEquals(new BigDecimal("0.00"), result.tienGiamGia());
    }

    @Test
    void usesStoredTierEvenWhenFareIsBelowTierAssignmentThreshold() {
        var result = service.calculateDiscount(vip("10", null), fare);
        assertTrue(result.conHieuLuc());
        assertEquals("GOLD", result.maHang());
        assertMoney("5000", result.tienGiamGia());
    }

    @Test
    void expiryIsInclusiveAndUsesVietnamDate() {
        assertTrue(service.calculateDiscount(vip("10", LocalDate.of(2026, 10, 6)), fare).conHieuLuc());
        var expired = service.calculateDiscount(vip("10", LocalDate.of(2026, 10, 5)), fare);
        assertFalse(expired.conHieuLuc());
        assertEquals(new BigDecimal("0.00"), expired.tienGiamGia());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "100.01"})
    void invalidPercentageIsNotApplied(String percent) {
        var result = service.calculateDiscount(vip(percent, null), fare);
        assertFalse(result.conHieuLuc());
        assertEquals(new BigDecimal("0.00"), result.tienGiamGia());
    }

    @Test
    void missingTierOrPercentageIsNotApplied() {
        KhachHang customer = vip("10", null);
        customer.getVip().getHang().setPhanTramGiamGia(null);
        assertFalse(service.calculateDiscount(customer, fare).conHieuLuc());
        customer.getVip().setHang(null);
        assertEquals(new BigDecimal("0.00"), service.calculateDiscount(customer, fare).tienGiamGia());
    }

    @Test
    void registrationMustHaveStarted() {
        KhachHang customer = vip("10", null);
        customer.getVip().setNgayDangKy(LocalDate.of(2026, 10, 7));
        assertFalse(service.calculateDiscount(customer, fare).conHieuLuc());
        customer.getVip().setNgayDangKy(null);
        assertFalse(service.calculateDiscount(customer, fare).conHieuLuc());
    }

    @Test
    void percentageBoundariesAndZeroFare() {
        assertMoney("50000", service.calculateDiscount(vip("100", null), fare).tienGiamGia());
        assertMoney("0", service.calculateDiscount(vip("0", null), fare).tienGiamGia());
        assertMoney("0", service.calculateDiscount(vip("10", null), BigDecimal.ZERO).tienGiamGia());
    }

    @Test
    void preservesPrecisionUntilFinalQuoteRounding() {
        assertMoney("0.005",
                service.calculateDiscount(vip("10", null), new BigDecimal("0.05")).tienGiamGia());
    }

    @ParameterizedTest
    @CsvSource({"0, 0", "0.01, 5", "7.25, 3625", "10, 5000", "99.99, 49995", "100, 50000"})
    void readsConfiguredPercentage(String percent, String expected) {
        var result = service.calculateDiscount(vip(percent, null), fare);
        assertTrue(result.conHieuLuc());
        assertMoney(percent, result.phanTramGiamGia());
        assertMoney(expected, result.tienGiamGia());
    }

    @ParameterizedTest
    @ValueSource(strings = {"99999", "100000", "100001"})
    void crossingSpendingThresholdDoesNotChangeAssignedTierOrPoints(String amount) {
        KhachHang customer = vip("10", null);
        KhachHangVip membership = customer.getVip();
        HangThanhVien tier = membership.getHang();
        membership.setDiemTichLuy(999999);
        BigDecimal base = new BigDecimal(amount);
        var result = service.calculateDiscount(customer, base);
        assertMoney(base.movePointLeft(1).toPlainString(), result.tienGiamGia());
        assertSame(membership, customer.getVip());
        assertSame(tier, membership.getHang());
        assertEquals(999999, membership.getDiemTichLuy());
        assertEquals("GOLD", result.maHang());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "0.001", "0.005", "0.99", "50000.55", "9999999999999.99"})
    void discountNeverExceedsUnroundedFare(String value) {
        BigDecimal base = new BigDecimal(value);
        for (String percent : new String[]{"0", "7.25", "99.99", "100", "101", "-1"}) {
            var result = service.calculateDiscount(vip(percent, null), base);
            assertTrue(result.tienGiamGia().signum() >= 0);
            assertTrue(result.tienGiamGia().compareTo(base) <= 0);
            assertTrue(base.subtract(result.tienGiamGia()).signum() >= 0);
        }
    }

    @Test
    void injectedUtcClockStillUsesVietnamExpiryBoundary() {
        var utcService = new MembershipPolicyService(
                Clock.fixed(Instant.parse("2026-10-05T18:00:00Z"), ZoneId.of("UTC")));
        assertFalse(utcService.calculateDiscount(vip("10", LocalDate.of(2026, 10, 5)), fare).conHieuLuc());
        assertTrue(utcService.calculateDiscount(vip("10", LocalDate.of(2026, 10, 6)), fare).conHieuLuc());
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }

    @Test
    void rejectsInvalidFare() {
        assertThrows(IllegalArgumentException.class, () -> service.calculateDiscount(new KhachHang(), null));
        assertThrows(IllegalArgumentException.class,
                () -> service.calculateDiscount(new KhachHang(), new BigDecimal("-0.001")));
    }

    private KhachHang vip(String percent, LocalDate expiry) {
        HangThanhVien tier = new HangThanhVien();
        tier.setId("GOLD");
        tier.setTenHang("Gold");
        tier.setPhanTramGiamGia(new BigDecimal(percent));
        tier.setNguongChiTieu(new BigDecimal("100000"));
        KhachHang customer = new KhachHang();
        KhachHangVip membership = new KhachHangVip();
        membership.setKhachHang(customer);
        membership.setHang(tier);
        membership.setNgayDangKy(LocalDate.of(2026, 1, 1));
        membership.setNgayHetHan(expiry);
        customer.setVip(membership);
        return customer;
    }
}
