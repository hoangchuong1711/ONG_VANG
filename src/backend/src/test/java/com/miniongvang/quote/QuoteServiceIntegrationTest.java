package com.miniongvang.quote;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.entity.BaoGia;
import com.miniongvang.entity.CauHinhCuoc;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.seed.DemoSeeder;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.FareCalculator;
import com.miniongvang.service.QuoteService;
import com.miniongvang.service.TransactionRunner;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class QuoteServiceIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-05T03:00:00Z");
    private static PersistenceContext persistence;
    private static QuoteService quotes;

    @BeforeAll static void start() throws Exception {
        String url = System.getenv("TEST_DB_URL");
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
        assumeTrue(url != null && url.matches("jdbc:sqlserver://[^;]+;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true"));
        try (var c = DriverManager.getConnection(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
             var s = c.createStatement(); var r = s.executeQuery("select DB_NAME()")) {
            assertTrue(r.next()); assertEquals("mini_ong_vang_test", r.getString(1));
        }
        persistence = PersistenceContext.start(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        new DemoSeeder(persistence.entityManagerFactory(), clock).seed("quote-test-password");
        quotes = new QuoteService(persistence.entityManagerFactory(), RouteConfiguration.from(java.util.Map.of()), clock);
    }

    @AfterAll static void stop() { if (persistence != null) persistence.close(); }

    @Test void storesFrozenRegularAndVipQuotesForLaterOrderCheck() {
        QuoteService.Quote regular = quotes.create(customer("KH-DEMO-1"), null,
                "Điểm mẫu A", "Điểm mẫu B", parcels());
        assertEquals("5.00", regular.loTrinh().quangDuongKm());
        assertEquals("45000.00", regular.cuoc().cuocGoc());
        assertEquals("5000.00", regular.cuoc().tienPhuThu());
        assertEquals("0.00", regular.cuoc().tienGiamGia());
        assertEquals("50000.00", regular.cuoc().tongCuoc());
        assertNull(regular.hangThanhVien());
        assertEquals(NOW.plusSeconds(300).toString(), regular.hetHanLuc());
        QuoteService.Quote vip = quotes.create(customer("KH-DEMO-2"), null,
                "Điểm mẫu A", "Điểm mẫu B", parcels());
        assertEquals("5000.00", vip.cuoc().tienGiamGia());
        assertEquals("45000.00", vip.cuoc().tongCuoc());
        assertTrue(vip.hangThanhVien().conHieuLuc());
        new TransactionRunner(persistence.entityManagerFactory()).run(em -> {
            BaoGia saved = em.find(BaoGia.class, vip.maBaoGia());
            assertEquals("KH-DEMO-2", saved.getMaKh());
            assertEquals("CUOC-DEMO-1", saved.getMaBieuPhi());
            assertEquals(NOW.plusSeconds(300), saved.getHetHanLuc());
            assertTrue(saved.getYeuCauJson().contains("1.00"));
            assertTrue(saved.getKetQuaJson().contains("45000.00"));
            return null;
        });
    }

    @Test void rejectsWrongCustomerAndMissingFare() {
        assertThrows(SecurityException.class, () -> quotes.create(customer("KH-DEMO-1"), "KH-DEMO-2",
                "Điểm mẫu A", "Điểm mẫu B", parcels()));
        assertThrows(IllegalArgumentException.class, () -> quotes.create(
                new AuthService.User("TK-DEMO-NV", "Dispatcher", AccountRole.TONG_DAI, null, null, "NV-DEMO-1"),
                null, "Điểm mẫu A", "Điểm mẫu B", parcels()));
        TransactionRunner tx = new TransactionRunner(persistence.entityManagerFactory());
        tx.run(em -> { em.find(CauHinhCuoc.class, "CUOC-DEMO-1").setDangKichHoat(false); return null; });
        try {
            assertThrows(FareCalculator.FareConfigurationException.class,
                    () -> quotes.create(customer("KH-DEMO-1"), null, "Điểm mẫu A", "Điểm mẫu B", parcels()));
        } finally {
            tx.run(em -> { em.find(CauHinhCuoc.class, "CUOC-DEMO-1").setDangKichHoat(true); return null; });
        }
    }

    private static AuthService.User customer(String id) {
        return new AuthService.User("TK-" + id, "Customer", AccountRole.KHACH_HANG, id, null, null);
    }
    private static List<QuoteService.Parcel> parcels() {
        return List.of(new QuoteService.Parcel("Hoa", null, "1.00"));
    }
}
