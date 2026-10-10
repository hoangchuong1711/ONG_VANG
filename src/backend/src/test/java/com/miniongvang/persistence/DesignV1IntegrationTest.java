package com.miniongvang.persistence;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.entity.CuocDonHang;
import com.miniongvang.entity.DonHang;
import com.miniongvang.entity.PhanCongDonHang;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.integration.FakeRouteProvider;
import com.miniongvang.seed.DesignV1DemoSeeder;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.DispatchService;
import com.miniongvang.service.OrderService;
import com.miniongvang.service.QuoteService;
import com.miniongvang.service.RouteService;
import com.miniongvang.service.TransactionRunner;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Checks the new schema through the real SQL Server, JPA mapping and current service flow. */
class DesignV1IntegrationTest {
    private static PersistenceContext db;
    private static TransactionRunner tx;
    private static QuoteService quotes;
    private static OrderService orders;
    private static DispatchService dispatch;
    private static String url;

    private static AuthService.User customer(int n) {
        return new AuthService.User("TK-DEMO-KH-" + n, "Customer", AccountRole.KHACH_HANG,
                "KH-DEMO-" + n, null, null);
    }
    private static AuthService.User dispatcher() {
        return new AuthService.User("TK-DEMO-NV", "Dispatcher", AccountRole.TONG_DAI,
                null, null, null);
    }
    private static AuthService.User driver() {
        return new AuthService.User("TK-DEMO-TX-1", "Driver", AccountRole.TAI_XE,
                null, "TX-DEMO-1", null);
    }
    private static List<QuoteService.Parcel> parcels() {
        return List.of(new QuoteService.Parcel("Tài liệu", null, "1.00"));
    }
    private static String newOrder() {
        var parcel = parcels();
        var quote = quotes.create(customer(1), null, "Quận 1", "Quận 3", parcel);
        return orders.create(customer(1), UUID.randomUUID().toString(),
                new OrderService.CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
                        "0901234567", null, parcel)).maDon();
    }

    @BeforeAll static void start() throws Exception {
        url = System.getenv("TEST_DB_URL");
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
        assumeTrue(url != null && url.matches("jdbc:sqlserver://[^;]+;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true"));
        try (var connection = DriverManager.getConnection(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
             var statement = connection.createStatement(); var result = statement.executeQuery("SELECT DB_NAME()")) {
            assertTrue(result.next());
            assertEquals("mini_ong_vang_test", result.getString(1));
        }
        db = PersistenceContext.start(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
        tx = new TransactionRunner(db.entityManagerFactory());
        var routes = new RouteService(new FakeRouteProvider(), 30_000);
        quotes = new QuoteService(db.entityManagerFactory(), routes);
        orders = new OrderService(db.entityManagerFactory(), routes);
        dispatch = new DispatchService(db.entityManagerFactory());
    }

    @AfterAll static void stop() { if (db != null) db.close(); }

    @BeforeEach void resetFixture() throws Exception {
        try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            for (String table : List.of("yeu_cau_tao_don", "bao_gia", "su_kien_thanh_toan",
                    "xac_nhan_thanh_toan_don_hang", "thanh_toan", "nhat_ky_don_hang",
                    "chi_tiet_kien_hang", "phu_thu_don_hang", "cuoc_don_hang",
                    "phan_cong_don_hang", "don_hang", "phuong_tien", "tai_xe",
                    "khach_hang", "nhat_ky_kiem_toan", "cau_hinh_phu_thu",
                    "cau_hinh_cuoc", "chinh_sach_thanh_vien", "tai_khoan",
                    "demo_seed_manifest")) statement.executeUpdate("DELETE FROM dbo.[" + table + "]");
            connection.commit();
        }
        new DesignV1DemoSeeder(db.entityManagerFactory()).seed("design-v1-test-password");
    }

    @Test void migratedSchemaHasNineteenDomainTablesAndTrustedConstraints() throws Exception {
        try (var connection = db.dataSource().getConnection();
             var statement = connection.createStatement();
             var result = statement.executeQuery("""
                     SELECT (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo')
                             AND name NOT IN ('flyway_schema_history','demo_seed_manifest')),
                            (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1),
                            (SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
                     """)) {
            assertTrue(result.next());
            assertEquals(19, result.getInt(1));
            assertEquals(0, result.getInt(2));
            assertEquals(0, result.getInt(3));
        }
    }

    @Test void quoteAndOrderKeepVersionedFareAndReplayResponse() {
        var parcel = parcels();
        var regularQuote = quotes.create(customer(1), null, "Quận 1", "Quận 3", parcel);
        var memberQuote = quotes.create(customer(2), null, "Quận 1", "Quận 3", parcel);
        assertEquals("0.00", regularQuote.cuoc().tienGiamGia());
        assertTrue(new BigDecimal(memberQuote.cuoc().tienGiamGia()).signum() > 0);
        String key = UUID.randomUUID().toString();
        var request = new OrderService.CreateOrder(memberQuote.maBaoGia(), null,
                "Quận 1", "Quận 3", "0901234567", null, parcel);
        var created = orders.create(customer(2), key, request);
        assertEquals(created, orders.create(customer(2), key, request));
        assertEquals("IDEMPOTENCY_CONFLICT", assertThrows(OrderService.Conflict.class,
                () -> orders.create(customer(2), key, new OrderService.CreateOrder(memberQuote.maBaoGia(), null,
                        "Quận 1", "Quận 3", "0909999999", null, parcel))).getMessage());
        tx.run(em -> {
            DonHang order = em.find(DonHang.class, created.maDon());
            CuocDonHang fare = em.find(CuocDonHang.class, created.maDon());
            assertEquals("TK-DEMO-KH-2", order.getTaiKhoanTao().getId());
            assertEquals("CUOC-DEMO-1", fare.getBieuPhi().getId());
            assertEquals("TV-DEMO-VANG-1", fare.getChinhSachGiam().getId());
            assertEquals(new BigDecimal(created.cuoc().tienGiamGia()), fare.getTienGiamGia());
            return null;
        });
    }

    @Test void dispatchLifecycleDerivesDriverAndRecordsOrderedEvents() {
        String id = newOrder();
        assertEquals(OrderStatus.CHO_GAN.name(), dispatch.order(customer(1), id).trangThai());
        assertEquals("TX-DEMO-1", dispatch.assign(dispatcher(), id, "TX-DEMO-1").maTx());
        dispatch.transition(driver(), id, OrderStatus.DA_LAY_HANG);
        dispatch.transition(driver(), id, OrderStatus.DANG_GIAO);
        assertEquals(OrderStatus.HOAN_TAT.name(), dispatch.transition(driver(), id, OrderStatus.HOAN_TAT).trangThai());
        assertEquals(5, dispatch.events(customer(1), id, 0, 20).items().size());
        tx.run(em -> {
            PhanCongDonHang assignment = em.createQuery(
                    "select p from PhanCongDonHang p where p.donHang.id=:id", PhanCongDonHang.class)
                    .setParameter("id", id).getSingleResult();
            assertNotNull(assignment.getKetThucLuc());
            assertEquals(OrderStatus.HOAN_TAT, em.find(DonHang.class, id).getTrangThai());
            return null;
        });
    }

    @Test void rejectedDriverCannotBeAssignedAgainToSameOrder() {
        String id = newOrder();
        dispatch.assign(dispatcher(), id, "TX-DEMO-1");
        assertEquals(OrderStatus.CHO_GAN.name(), dispatch.reject(driver(), id, "Xe hỏng").trangThai());
        assertEquals("DRIVER_UNAVAILABLE", assertThrows(DispatchService.Conflict.class,
                () -> dispatch.assign(dispatcher(), id, "TX-DEMO-1")).getMessage());
        assertEquals("TX-DEMO-2", dispatch.assign(dispatcher(), id, "TX-DEMO-2").maTx());
    }

    @Test void concurrentAssignmentsLeaveOnlyOneActiveDriver() throws Exception {
        String id = newOrder();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> assignOrConflict(id, "TX-DEMO-1"));
            var second = executor.submit(() -> assignOrConflict(id, "TX-DEMO-2"));
            assertEquals(1, (first.get(20, TimeUnit.SECONDS) ? 1 : 0)
                    + (second.get(20, TimeUnit.SECONDS) ? 1 : 0));
        }
        tx.run(em -> {
            assertEquals(1L, em.createQuery("select count(p) from PhanCongDonHang p "
                    + "where p.donHang.id=:id and p.ketThucLuc is null", Long.class)
                    .setParameter("id", id).getSingleResult());
            return null;
        });
    }
    private static boolean assignOrConflict(String id, String driver) {
        try { dispatch.assign(dispatcher(), id, driver); return true; }
        catch (DispatchService.Conflict conflict) { return false; }
    }

    @Test void paymentIndexRejectsSecondPendingAttemptOfSameState() {
        String id = newOrder();
        tx.run(em -> {
            em.createNativeQuery("""
                    INSERT INTO thanh_toan(ma_giao_dich,ma_don,ma_tham_chieu,phuong_thuc,trang_thai,tao_luc)
                    VALUES (:id,:orderId,:reference,'TIEN_MAT','CHO_XU_LY',SYSUTCDATETIME())
                    """).setParameter("id", UUID.randomUUID().toString()).setParameter("orderId", id)
                    .setParameter("reference", UUID.randomUUID().toString()).executeUpdate();
            return null;
        });
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("""
                    INSERT INTO thanh_toan(ma_giao_dich,ma_don,ma_tham_chieu,phuong_thuc,trang_thai,tao_luc)
                    VALUES (:id,:orderId,:reference,'VNPAY_QR','CHO_XU_LY',SYSUTCDATETIME())
                    """).setParameter("id", UUID.randomUUID().toString()).setParameter("orderId", id)
                    .setParameter("reference", UUID.randomUUID().toString()).executeUpdate();
            return null;
        }));
    }

    @Test void databaseRejectsBrokenForeignKeyAndNegativeFare() {
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("UPDATE khach_hang SET ma_tk='MISSING' WHERE ma_kh='KH-DEMO-1'")
                    .executeUpdate(); return null;
        }));
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("UPDATE cau_hinh_cuoc SET cuoc_co_ban=-1 WHERE ma_bieu_phi='CUOC-DEMO-1'")
                    .executeUpdate(); return null;
        }));
    }
}
