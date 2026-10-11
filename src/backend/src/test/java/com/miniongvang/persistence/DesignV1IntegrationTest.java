package com.miniongvang.persistence;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.entity.CuocDonHang;
import com.miniongvang.entity.ChinhSachThanhVien;
import com.miniongvang.entity.ChinhSachPhuThu;
import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.DonHang;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.PhanCongDonHang;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.OrderEventType;
import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.entity.enums.MembershipTier;
import com.miniongvang.entity.enums.PolicyStatus;
import com.miniongvang.integration.FakeRouteProvider;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.seed.DesignV1DemoSeeder;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.DispatchService;
import com.miniongvang.service.OrderService;
import com.miniongvang.service.MembershipPolicyService;
import com.miniongvang.service.PolicyPublicationService;
import com.miniongvang.service.QuoteService;
import com.miniongvang.service.RouteService;
import com.miniongvang.service.TransactionRunner;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
                "KH-DEMO-" + n, null);
    }
    private static AuthService.User dispatcher() {
        return new AuthService.User("TK-DEMO-NV", "Dispatcher", AccountRole.TONG_DAI,
                null, null);
    }
    private static AuthService.User driver() {
        return new AuthService.User("TK-DEMO-TX-1", "Driver", AccountRole.TAI_XE,
                null, "TX-DEMO-1");
    }
    private static AuthService.User admin() {
        return new AuthService.User("TK-DEMO-ADMIN", "Administrator", AccountRole.CHU_DOI_XE, null, null);
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
            statement.execute("DISABLE TRIGGER dbo.trg_membership_policy_immutable ON dbo.chinh_sach_thanh_vien");
            statement.execute("DISABLE TRIGGER dbo.trg_fare_policy_immutable ON dbo.cau_hinh_cuoc");
            statement.execute("DISABLE TRIGGER dbo.trg_surcharge_policy_immutable ON dbo.cau_hinh_phu_thu");
            for (String table : List.of("yeu_cau_tao_don", "bao_gia", "su_kien_thanh_toan",
                    "xac_nhan_thanh_toan_don_hang", "thanh_toan", "nhat_ky_don_hang",
                    "chi_tiet_kien_hang", "phu_thu_don_hang", "cuoc_don_hang",
                    "phan_cong_don_hang", "don_hang", "phuong_tien", "tai_xe",
                    "khach_hang", "nhat_ky_kiem_toan", "cau_hinh_phu_thu",
                    "cau_hinh_cuoc", "chinh_sach_thanh_vien", "tai_khoan",
                    "demo_seed_manifest")) statement.executeUpdate("DELETE FROM dbo.[" + table + "]");
            statement.execute("ENABLE TRIGGER dbo.trg_membership_policy_immutable ON dbo.chinh_sach_thanh_vien");
            statement.execute("ENABLE TRIGGER dbo.trg_fare_policy_immutable ON dbo.cau_hinh_cuoc");
            statement.execute("ENABLE TRIGGER dbo.trg_surcharge_policy_immutable ON dbo.cau_hinh_phu_thu");
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
        assertNotNull(memberQuote.hangThanhVien());
        assertTrue(memberQuote.hangThanhVien().ngayHetHan().matches("\\d{4}-\\d{2}-\\d{2}"));
        String key = UUID.randomUUID().toString();
        var request = new OrderService.CreateOrder(memberQuote.maBaoGia(), null,
                "Quận 1", "Quận 3", "0901234567", null, parcel);
        var created = orders.create(customer(2), key, request);
        assertEquals("TK-DEMO-KH-2", created.maTkTao());
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

    @Test void membershipWindowAndZeroOrFullDiscountUseExactBoundaries() {
        Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        Instant end = start.plusSeconds(300);
        tx.run(em -> {
            KhachHang customer = em.find(KhachHang.class, "KH-DEMO-2");
            customer.setThanhVienTu(start); customer.setThanhVienDen(end);
            var membership = new MembershipPolicyService();
            BigDecimal subtotal = new BigDecimal("100.00");
            assertEquals(BigDecimal.ZERO.setScale(2),
                    membership.evaluate(em, customer, subtotal, start.minusMillis(1)).discount());
            assertEquals(new BigDecimal("10.00"),
                    membership.evaluate(em, customer, subtotal, start).discount());
            assertEquals(new BigDecimal("10.00"),
                    membership.evaluate(em, customer, subtotal, end.minusMillis(1)).discount());
            assertEquals(BigDecimal.ZERO.setScale(2),
                    membership.evaluate(em, customer, subtotal, end).discount());
            for (var tier : List.of(MembershipTier.BAC, MembershipTier.KIM_CUONG)) {
                var policy = new ChinhSachThanhVien();
                policy.setId(UUID.randomUUID().toString()); policy.setHang(tier);
                policy.setTyLeGiam(tier == MembershipTier.BAC ? BigDecimal.ZERO : new BigDecimal("100.00"));
                policy.setHieuLucTu(start.minusSeconds(60)); policy.setTrangThai(PolicyStatus.CONG_BO);
                em.persist(policy);
            }
            em.flush();
            customer.setMaHang(MembershipTier.BAC);
            assertEquals(BigDecimal.ZERO.setScale(2), membership.evaluate(em, customer, subtotal, start).discount());
            customer.setMaHang(MembershipTier.KIM_CUONG);
            assertEquals(new BigDecimal("100.00"), membership.evaluate(em, customer, subtotal, start).discount());
            return null;
        });
    }

    @Test void quoteExpiresAtExactlyThreeHundredSeconds() {
        Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        var route = new RouteService(new FakeRouteProvider(), 30_000);
        var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
                .create(customer(1), null, "Quận 1", "Quận 3", parcels());
        var request = new OrderService.CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
                "0901234567", null, parcels());
        var justBefore = new OrderService(db.entityManagerFactory(), route,
                Clock.fixed(start.plusMillis(299_999), ZoneOffset.UTC));
        assertNotNull(justBefore.create(customer(1), UUID.randomUUID().toString(), request).maDon());
        var atExpiry = new OrderService(db.entityManagerFactory(), route,
                Clock.fixed(start.plusSeconds(300), ZoneOffset.UTC));
        assertEquals("QUOTE_EXPIRED", assertThrows(OrderService.Conflict.class,
                () -> atExpiry.create(customer(1), UUID.randomUUID().toString(), request)).getMessage());
    }

    @Test void committedOrderReplaysWithoutRouteProviderOrLiveQuote() {
        Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        var route = new RouteService(new FakeRouteProvider(), 30_000);
        var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
                .create(customer(1), null, "Quận 1", "Quận 3", parcels());
        var request = new OrderService.CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
                "0901234567", null, parcels());
        String key = UUID.randomUUID().toString();
        var created = new OrderService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
                .create(customer(1), key, request);
        var unavailableRoute = new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.TIMEOUT), 30_000);
        var replayService = new OrderService(db.entityManagerFactory(), unavailableRoute,
                Clock.fixed(start.plusSeconds(301), ZoneOffset.UTC));
        assertEquals(created, replayService.create(customer(1), key, request));
        assertThrows(RouteFailure.class, () -> replayService.create(customer(1), UUID.randomUUID().toString(), request));
    }

    @Test void failedIdempotencyWriteRollsBackWholeOrderAggregate() throws Exception {
        var quote = quotes.create(customer(1), null, "Quận 1", "Quận 3", parcels());
        var request = new OrderService.CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
                "0901234567", null, parcels());
        String[] tables = {"don_hang", "cuoc_don_hang", "chi_tiet_kien_hang",
                "phu_thu_don_hang", "nhat_ky_don_hang", "yeu_cau_tao_don"};
        long[] before = tableCounts(tables);
        try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE TRIGGER dbo.trg_test_order_rollback ON dbo.yeu_cau_tao_don "
                    + "AFTER INSERT AS BEGIN THROW 51070, 'Injected request failure', 1; END");
        }
        try {
            assertThrows(RuntimeException.class, () -> orders.create(customer(1), UUID.randomUUID().toString(), request));
        } finally {
            try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
                statement.execute("DROP TRIGGER dbo.trg_test_order_rollback");
            }
        }
        assertArrayEquals(before, tableCounts(tables));
    }

    private static long[] tableCounts(String[] tables) {
        return tx.run(em -> {
            long[] counts = new long[tables.length];
            for (int i = 0; i < tables.length; i++)
                counts[i] = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM dbo.[" + tables[i] + "]")
                        .getSingleResult()).longValue();
            return counts;
        });
    }

    @Test void dispatchLifecycleDerivesDriverAndRecordsOrderedEvents() {
        String id = newOrder();
        assertEquals(OrderStatus.CHO_GAN.name(), dispatch.order(customer(1), id).trangThai());
        assertEquals("TX-DEMO-1", dispatch.assign(dispatcher(), id, "TX-DEMO-1").maTx());
        dispatch.transition(driver(), id, OrderStatus.DA_LAY_HANG);
        dispatch.transition(driver(), id, OrderStatus.DANG_GIAO);
        assertEquals(OrderStatus.HOAN_TAT.name(), dispatch.transition(driver(), id, OrderStatus.HOAN_TAT).trangThai());
        var events = dispatch.events(customer(1), id, 0, 20).items();
        assertEquals(5, events.size());
        assertEquals(1, events.get(0).thuTu());
        assertEquals(OrderEventType.TAO_DON, events.get(0).loaiSuKien());
        assertNull(events.get(0).trangThaiTruoc());
        assertEquals(OrderStatus.CHO_GAN, events.get(0).trangThaiSau());
        assertEquals("TK-DEMO-KH-1", events.get(0).maTkThucHien());
        assertEquals(5, events.get(4).thuTu());
        assertEquals(OrderStatus.HOAN_TAT, events.get(4).trangThaiSau());
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

    @Test void assignmentRechecksAccountAndVehicleAfterConcurrentChange() throws Exception {
        assertAssignmentWaitsForChange(
                "UPDATE tai_khoan SET trang_thai='KHOA' WHERE ma_tk='TK-DEMO-TX-1'",
                "UPDATE tai_khoan SET trang_thai='HOAT_DONG' WHERE ma_tk='TK-DEMO-TX-1'");
        assertAssignmentWaitsForChange(
                "UPDATE phuong_tien SET dang_hoat_dong=0 WHERE ma_phuong_tien='XE-DEMO-1'",
                "UPDATE phuong_tien SET dang_hoat_dong=1 WHERE ma_phuong_tien='XE-DEMO-1'");
    }

    private static void assertAssignmentWaitsForChange(String change, String restore) throws Exception {
        String id = newOrder();
        try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement();
             var executor = Executors.newSingleThreadExecutor()) {
            connection.setAutoCommit(false);
            assertEquals(1, statement.executeUpdate(change));
            var future = executor.submit(() -> {
                try { dispatch.assign(dispatcher(), id, "TX-DEMO-1"); return "ASSIGNED"; }
                catch (DispatchService.Conflict conflict) { return conflict.getMessage(); }
            });
            assertThrows(java.util.concurrent.TimeoutException.class, () -> future.get(250, TimeUnit.MILLISECONDS));
            connection.commit();
            assertEquals("DRIVER_UNAVAILABLE", future.get(20, TimeUnit.SECONDS));
        }
        tx.run(em -> { em.createNativeQuery(restore).executeUpdate(); return null; });
        assertEquals(OrderStatus.CHO_GAN.name(), dispatch.order(customer(1), id).trangThai());
    }

    @Test void concurrentPolicyPublicationSerializesEmptyScopeAndAuditsWinner() throws Exception {
        Instant start = Instant.now().plusSeconds(3600).truncatedTo(ChronoUnit.MILLIS);
        String first = UUID.randomUUID().toString(), second = UUID.randomUUID().toString();
        tx.run(em -> {
            for (String id : List.of(first, second)) {
                var policy = new ChinhSachThanhVien();
                policy.setId(id); policy.setHang(MembershipTier.BAC);
                policy.setTyLeGiam(new BigDecimal("5.00"));
                Instant begins = id.equals(first) ? start : start.plusSeconds(1);
                policy.setHieuLucTu(begins); policy.setHieuLucDen(start.plusSeconds(86400));
                policy.setTrangThai(PolicyStatus.NHAP); em.persist(policy);
            }
            return null;
        });
        var publication = new PolicyPublicationService(db.entityManagerFactory());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> publishOrConflict(publication, first));
            var b = executor.submit(() -> publishOrConflict(publication, second));
            assertEquals(1, (a.get(20, TimeUnit.SECONDS) ? 1 : 0)
                    + (b.get(20, TimeUnit.SECONDS) ? 1 : 0));
        }
        tx.run(em -> {
            assertEquals(1L, em.createQuery("select count(p) from ChinhSachThanhVien p "
                    + "where p.hang=:tier and p.trangThai=:status", Long.class)
                    .setParameter("tier", MembershipTier.BAC)
                    .setParameter("status", PolicyStatus.CONG_BO).getSingleResult());
            assertEquals(1L, em.createQuery("select count(a) from NhatKyKiemToan a "
                    + "where a.loaiDoiTuong='chinh_sach_thanh_vien' and a.hanhDong=:action", Long.class)
                    .setParameter("action", com.miniongvang.entity.enums.AuditAction.CONG_BO).getSingleResult());
            return null;
        });
    }

    @Test void auditFailureRollsBackPolicyPublication() throws Exception {
        String id = UUID.randomUUID().toString();
        tx.run(em -> {
            var policy = new ChinhSachThanhVien();
            policy.setId(id); policy.setHang(MembershipTier.BAC);
            policy.setTyLeGiam(new BigDecimal("5.00"));
            policy.setHieuLucTu(Instant.now().plusSeconds(3600).truncatedTo(ChronoUnit.MILLIS));
            policy.setTrangThai(PolicyStatus.NHAP); em.persist(policy);
            return null;
        });
        try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE TRIGGER dbo.trg_test_policy_audit_rollback ON dbo.nhat_ky_kiem_toan "
                    + "AFTER INSERT AS BEGIN THROW 51071, 'Injected audit failure', 1; END");
        }
        try {
            var publication = new PolicyPublicationService(db.entityManagerFactory());
            assertThrows(RuntimeException.class, () -> publication.publishMembership(admin(), id));
        } finally {
            try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
                statement.execute("DROP TRIGGER dbo.trg_test_policy_audit_rollback");
            }
        }
        tx.run(em -> {
            assertEquals(PolicyStatus.NHAP, em.find(ChinhSachThanhVien.class, id).getTrangThai());
            assertEquals(0L, em.createQuery("select count(a) from NhatKyKiemToan a "
                    + "where a.maDoiTuong=:id", Long.class).setParameter("id", id).getSingleResult());
            return null;
        });
    }

    private static boolean publishOrConflict(PolicyPublicationService publication, String id) {
        try { publication.publishMembership(admin(), id); return true; }
        catch (IllegalStateException conflict) { return false; }
    }

    @Test void publishedPoliciesRejectDirectMutationAndControlledSuccessorsDoNotOverlap() {
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("UPDATE chinh_sach_thanh_vien SET ty_le_giam=20 WHERE ma_chinh_sach='TV-DEMO-VANG-1'")
                    .executeUpdate(); return null;
        }));
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("UPDATE cau_hinh_cuoc SET ten_bieu_phi=N'Changed' WHERE ma_bieu_phi='CUOC-DEMO-1'")
                    .executeUpdate(); return null;
        }));
        assertThrows(RuntimeException.class, () -> tx.run(em -> {
            em.createNativeQuery("UPDATE cau_hinh_phu_thu SET so_tien=9000 WHERE ma_phu_thu='PHU-DEMO-1'")
                    .executeUpdate(); return null;
        }));
        var publication = new PolicyPublicationService(db.entityManagerFactory());
        Instant boundary = Instant.now().plusSeconds(120).truncatedTo(ChronoUnit.MILLIS);
        publication.closeFare(admin(), "CUOC-DEMO-1", boundary);
        publication.closeSurcharge(admin(), "PHU-DEMO-1", boundary);
        String fareId = UUID.randomUUID().toString(), surchargeId = UUID.randomUUID().toString();
        tx.run(em -> {
            var fare = new BieuPhi();
            fare.setId(fareId); fare.setTenBieuPhi("Biểu phí kế tiếp");
            fare.setCuocCoBan(new BigDecimal("22000.00")); fare.setDonGiaKm(new BigDecimal("5000.00"));
            fare.setKmToiThieu(BigDecimal.ZERO); fare.setHieuLucTu(boundary);
            fare.setTrangThai(PolicyStatus.NHAP); em.persist(fare);
            var extra = new ChinhSachPhuThu();
            extra.setId(surchargeId); extra.setMaLoaiPhuThu("DICH_VU");
            extra.setTenPhuThu("Phụ thu kế tiếp"); extra.setSoTien(new BigDecimal("6000.00"));
            extra.setHieuLucTu(boundary); extra.setTrangThai(PolicyStatus.NHAP); em.persist(extra);
            return null;
        });
        publication.publishFare(admin(), fareId);
        publication.publishSurcharge(admin(), surchargeId);
        assertThrows(IllegalStateException.class, () -> publication.closeFare(admin(), "CUOC-DEMO-1", boundary.plusSeconds(1)));
        tx.run(em -> {
            assertEquals(4L, em.createQuery("select count(a) from NhatKyKiemToan a", Long.class).getSingleResult());
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
