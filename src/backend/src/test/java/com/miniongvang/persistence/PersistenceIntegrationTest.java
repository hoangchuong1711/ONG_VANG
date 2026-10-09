package com.miniongvang.persistence;

import com.miniongvang.DAO.*;
import com.miniongvang.config.PersistenceContext;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.entity.enums.PaymentMethod;
import com.miniongvang.seed.DemoSeeder;
import com.miniongvang.service.TransactionRunner;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.mindrot.jbcrypt.BCrypt;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class PersistenceIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-05T03:00:00Z");
    private static final String PASSWORD = "test-only-not-a-deployed-secret";
    private static PersistenceContext persistence;
    private static TransactionRunner transactions;
    private static DemoSeeder seeder;

    @BeforeAll static void start() throws Exception {
        String url = System.getenv("TEST_DB_URL");
        boolean configured = url != null && !url.isBlank();
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB")))
            assertTrue(configured, "CI requires TEST_DB_URL");
        assumeTrue(configured, "Set TEST_DB_URL for PostgreSQL integration tests");
        assertTrue(url.matches("jdbc:postgresql://[^/]+/mini_ong_vang_test"), "Dedicated test DB only");
        // Verify the actual target before migration or reset.
        try (var c = java.sql.DriverManager.getConnection(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
             var s = c.createStatement(); var r = s.executeQuery("select current_database()")) {
            assertTrue(r.next()); assertEquals("mini_ong_vang_test", r.getString(1));
        }
        persistence = PersistenceContext.start(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
        transactions = new TransactionRunner(persistence.entityManagerFactory());
        seeder = new DemoSeeder(persistence.entityManagerFactory(), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @BeforeEach void reset() {
        transactions.run(em -> {
            em.createNativeQuery("""
                TRUNCATE TABLE bao_gia, danh_gia_chuyen_di, thanh_toan, nhat_ky_trang_thai,
                chi_tiet_kien_hang, phu_thu_don_hang, snapshot_cuoc_don_hang,
                phan_cong_don_hang, don_hang, khach_hang_vip, phuong_tien,
                dieu_phoi_vien, tai_xe, khach_hang, cau_hinh_phu_thu,
                cau_hinh_cuoc, hang_thanh_vien, tai_khoan, demo_seed_manifest
                """).executeUpdate();
            return null;
        });
        seeder.seed(PASSWORD);
    }

    @AfterAll static void close() {
        if (persistence != null) {
            persistence.close();
            assertFalse(persistence.entityManagerFactory().isOpen());
            assertTrue(persistence.dataSource().isClosed());
        }
    }

    @Test void migrationRerunAndSeedRerunPreserveData() {
        int applied = Flyway.configure().dataSource(persistence.dataSource()).load().migrate().migrationsExecuted;
        assertEquals(0, applied);
        seeder.seed(PASSWORD);
        transactions.run(em -> {
            assertEquals(13L, em.createQuery("select count(t) from TaiKhoan t", Long.class).getSingleResult());
            assertEquals(10L, em.createQuery("select count(d) from DonHang d", Long.class).getSingleResult());
            TaiKhoan account = new TaiKhoanDAO(em).findByUsername("0900000001").orElseThrow();
            assertTrue(BCrypt.checkpw(PASSWORD, account.getMatKhauHash()));
            assertEquals("Khách demo 1", account.getHoTen());
            assertEquals(4L, em.createQuery("select count(distinct t.vaiTro) from TaiKhoan t", Long.class).getSingleResult());
            return null;
        });
    }

    @Test void sharedPrimaryKeyAndCompositeKeyRoundTrip() {
        transactions.run(em -> {
            KhachHang customer = new KhachHangDAO(em).findWithVip("KH-DEMO-2");
            assertEquals("KH-DEMO-2", customer.getVip().getId());
            assertEquals("VIP demo", customer.getVip().getHang().getTenHang());
            assertEquals(LocalDate.of(2026, 11, 4), customer.getVip().getNgayHetHan());
            assertNull(new KhachHangDAO(em).findWithVip("KH-DEMO-1").getVip());
            PhuThuDonHang surcharge = em.find(PhuThuDonHang.class,
                    new PhuThuDonHangId("DH-DEMO-WAIT", "PHU-DEMO-1"));
            assertEquals(new BigDecimal("5000.00"), surcharge.getSoTienTinh());
            assertEquals("DH-DEMO-WAIT", surcharge.getDonHang().getId());
            assertEquals("TX-DEMO-1", em.find(PhuongTien.class, "XE-DEMO-1").getTaiXe().getId());
            assertEquals(NOW.minusSeconds(60), em.find(DonHang.class, "DH-DEMO-WAIT").getThoiGianTao());
            return null;
        });
    }

    @Test void availableDriversExcludeBusyLockedOfflineAndLeave() {
        transactions.run(em -> {
            assertEquals(List.of("TX-DEMO-2", "TX-DEMO-1"), new TaiXeDAO(em).findAvailable(20)
                    .stream().map(TaiXe::getId).toList());
            assertEquals(1, new CauHinhCuocDAO(em).findActiveOn(LocalDate.of(2026, 10, 5)).size());
            assertEquals(1, new CauHinhPhuThuDAO(em).findActive().size());
            assertEquals(2, new PhanCongDonHangDAO(em).findHistory("DH-DEMO-PAID-CASH").size());
            return null;
        });
    }

    @Test void orderPaginationAndPaymentsDoNotDuplicateOrders() {
        transactions.run(em -> {
            List<DonHang> first = new DonHangDAO(em).findByCustomer("KH-DEMO-1", NOW.minusSeconds(500000), NOW, 0, 2);
            assertEquals(2, first.size());
            assertEquals("DH-DEMO-WAIT", first.getFirst().getId());
            assertEquals(2, new ThanhToanDAO(em).findAttempts("DH-DEMO-PAID-ONLINE").size());
            assertTrue(new ThanhToanDAO(em).findAttempts("DH-DEMO-FREE").isEmpty());
            return null;
        });
    }

    @Test void changingConfigurationDoesNotChangeSnapshot() {
        transactions.run(em -> {
            em.find(CauHinhCuoc.class, "CUOC-DEMO-1").setTenBieuPhi("Giá mới");
            em.find(CauHinhCuoc.class, "CUOC-DEMO-1").setCuocCoBan(new BigDecimal("999999"));
            em.find(CauHinhPhuThu.class, "PHU-DEMO-1").setTenPhuThu("Phụ thu mới");
            return null;
        });
        transactions.run(em -> {
            SnapshotCuocDonHang snapshot = em.find(SnapshotCuocDonHang.class, "DH-DEMO-WAIT");
            assertEquals("Biểu phí demo", snapshot.getTenBieuPhi());
            assertEquals(new BigDecimal("35000.00"), snapshot.getTongCuoc());
            assertEquals("Phụ thu demo", em.find(PhuThuDonHang.class,
                    new PhuThuDonHangId("DH-DEMO-WAIT", "PHU-DEMO-1")).getTenPhuThuSnapshot());
            return null;
        });
    }

    @Test void lateConstraintFailureRollsBackWholeOrderAggregate() {
        assertThrows(RuntimeException.class, () -> transactions.run(em -> {
            DonHang order = newOrder(em, "TEST-ROLLBACK");
            em.flush();
            ChiTietKienHang parcel = new ChiTietKienHang(); parcel.setId("TEST-PARCEL");
            parcel.setDonHang(order); parcel.setLoaiHangHoa("Invalid"); parcel.setKhoiLuongKg(new BigDecimal("-1"));
            em.persist(parcel);
            return null;
        }));
        transactions.run(em -> {
            assertNull(em.find(DonHang.class, "TEST-ROLLBACK"));
            assertNull(em.find(ChiTietKienHang.class, "TEST-PARCEL"));
            return null;
        });
    }

    @Test void constraintsRejectOrphansDuplicateReferencesAndInvalidValues() {
        rejectSql("UPDATE khach_hang SET ma_tk='MISSING' WHERE ma_kh='KH-DEMO-1'");
        rejectSql("UPDATE khach_hang SET ma_tk='TK-DEMO-TX-1' WHERE ma_kh='KH-DEMO-1'");
        rejectSql("UPDATE tai_khoan SET username='0900000002' WHERE ma_tk='TK-DEMO-KH-1'");
        rejectSql("UPDATE tai_khoan SET trang_thai='UNKNOWN' WHERE ma_tk='TK-DEMO-KH-1'");
        rejectSql("UPDATE phuong_tien SET ma_tx='TX-DEMO-2' WHERE ma_phuong_tien='XE-DEMO-1'");
        rejectSql("UPDATE khach_hang_vip SET diem_tich_luy=-1 WHERE ma_kh='KH-DEMO-2'");
        rejectSql("UPDATE snapshot_cuoc_don_hang SET tong_cuoc=-1 WHERE ma_don='DH-DEMO-WAIT'");
        rejectSql("UPDATE chi_tiet_kien_hang SET khoi_luong_kg=NULL WHERE ma_kien_hang='KIEN-DEMO-1'");
        rejectSql("UPDATE thanh_toan SET ma_tham_chieu='REF-GD-DEMO-CASH' WHERE ma_giao_dich='GD-DEMO-SUCCESS'");
    }

    @Test void paymentAllowsRetriesButPreventsTwoSuccessesOrPendingOnlineAttempts() {
        assertThrows(RuntimeException.class, () -> transactions.run(em -> {
            ThanhToan second = payment(em, "TEST-SECOND-SUCCESS", "DH-DEMO-PAID-ONLINE", PaymentStatus.THANH_CONG);
            em.persist(second); return null;
        }));
        assertThrows(RuntimeException.class, () -> transactions.run(em -> {
            em.persist(payment(em, "TEST-SECOND-PENDING", "DH-DEMO-PENDING", PaymentStatus.CHO_XU_LY)); return null;
        }));
        transactions.run(em -> {
            assertEquals(2, new ThanhToanDAO(em).findAttempts("DH-DEMO-PAID-ONLINE").size());
            assertNull(new ThanhToanDAO(em).findAttempts("DH-DEMO-PENDING").getFirst().getThoiGianThanhToan());
            return null;
        });
    }

    @Test void deletingOrderCascadesOwnedChildrenButProtectsPaymentAndAssignments() {
        rejectSql("DELETE FROM don_hang WHERE ma_don='DH-DEMO-PAID-CASH'");
        transactions.run(em -> {
            em.remove(em.find(DonHang.class, "DH-DEMO-WAIT")); return null;
        });
        transactions.run(em -> {
            assertNull(em.find(SnapshotCuocDonHang.class, "DH-DEMO-WAIT"));
            assertNull(em.find(PhuThuDonHang.class, new PhuThuDonHangId("DH-DEMO-WAIT", "PHU-DEMO-1")));
            assertNotNull(em.find(KhachHang.class, "KH-DEMO-1"));
            assertNotNull(em.find(CauHinhPhuThu.class, "PHU-DEMO-1"));
            return null;
        });
    }

    @Test void staleOrderVersionFailsInsteadOfOverwriting() {
        try (EntityManager first = persistence.entityManagerFactory().createEntityManager();
             EntityManager second = persistence.entityManagerFactory().createEntityManager()) {
            first.getTransaction().begin(); second.getTransaction().begin();
            DonHang a = first.find(DonHang.class, "DH-DEMO-WAIT");
            DonHang b = second.find(DonHang.class, "DH-DEMO-WAIT");
            a.setGhiChuGiaoHang("first"); first.getTransaction().commit();
            b.setGhiChuGiaoHang("second");
            assertThrows(RuntimeException.class, () -> second.getTransaction().commit());
            if (second.getTransaction().isActive()) second.getTransaction().rollback();
        }
    }

    @Test void concurrentAssignmentHasOneWinnerAndRollsBackLoserOrderChange() throws Exception {
        transactions.run(em -> { newOrder(em, "TEST-RACE-1"); newOrder(em, "TEST-RACE-2"); return null; });
        CyclicBarrier barrier = new CyclicBarrier(2);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> one = executor.submit(() -> assignRacing("TEST-RACE-1", barrier));
            Future<Boolean> two = executor.submit(() -> assignRacing("TEST-RACE-2", barrier));
            assertNotEquals(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS));
        }
        transactions.run(em -> {
            long assigned = em.createQuery("select count(d) from DonHang d where d.id like 'TEST-RACE-%' and d.trangThai = :s", Long.class)
                    .setParameter("s", OrderStatus.DA_GAN).getSingleResult();
            assertEquals(1, assigned);
            assertEquals(1L, em.createQuery("select count(p) from PhanCongDonHang p where p.id like 'TEST-RACE-%'", Long.class).getSingleResult());
            return null;
        });
    }

    private boolean assignRacing(String orderId, CyclicBarrier barrier) {
        try {
            transactions.run(em -> {
                DonHang order = em.find(DonHang.class, orderId);
                try { barrier.await(5, TimeUnit.SECONDS); }
                catch (Exception failure) { throw new IllegalStateException(failure); }
                PhanCongDonHang assignment = new PhanCongDonHang(); assignment.setId(orderId);
                assignment.setDonHang(order); assignment.setTaiXe(em.find(TaiXe.class, "TX-DEMO-1"));
                assignment.setBatDauLuc(NOW); em.persist(assignment);
                order.setTaiXe(assignment.getTaiXe()); order.setTrangThai(OrderStatus.DA_GAN);
                return null;
            });
            return true;
        } catch (jakarta.persistence.PersistenceException conflict) { return false; }
    }

    private static DonHang newOrder(EntityManager em, String id) {
        DonHang order = new DonHang(); order.setId(id);
        order.setKhachHang(em.find(KhachHang.class, "KH-DEMO-1"));
        order.setBieuPhi(em.find(CauHinhCuoc.class, "CUOC-DEMO-1"));
        order.setThoiGianTao(NOW); order.setTrangThai(OrderStatus.CHO_GAN);
        order.setDiemLayHang("Điểm A"); order.setDiemGiaoHang("Điểm B");
        order.setSdtNguoiNhan("0900000000"); order.setQuangDuongKm(new BigDecimal("2.00"));
        new DonHangDAO(em).persist(order); return order;
    }

    private static ThanhToan payment(EntityManager em, String id, String orderId, PaymentStatus status) {
        ThanhToan payment = new ThanhToan(); payment.setId(id);
        payment.setDonHang(em.find(DonHang.class, orderId)); payment.setSoTien(new BigDecimal("36000.00"));
        payment.setPhuongThuc(PaymentMethod.VNPAY_QR); payment.setTrangThai(status);
        payment.setMaThamChieu("REF-" + id); payment.setTaoLuc(NOW);
        if (status == PaymentStatus.THANH_CONG) payment.setThoiGianThanhToan(NOW);
        return payment;
    }

    private static void rejectSql(String sql) {
        assertThrows(RuntimeException.class, () -> transactions.run(em -> {
            em.createNativeQuery(sql).executeUpdate(); return null;
        }));
    }

    @Test void upgradePreservesCompatibleV1Profiles() throws Exception {
        String schema = "t03_upgrade_" + java.util.UUID.randomUUID().toString().replace("-", "");
        try {
            Flyway.configure().dataSource(persistence.dataSource()).schemas(schema).defaultSchema(schema)
                    .target("1").load().migrate();
            try (var c = persistence.dataSource().getConnection(); var s = c.createStatement()) {
                s.execute("INSERT INTO " + schema + ".tai_khoan VALUES ('OLD-TK','old',NULL,'hash','KHACH_HANG','HOAT_DONG','2026-10-05 10:00:00',NULL)");
                s.execute("INSERT INTO " + schema + ".khach_hang VALUES ('OLD-KH','OLD-TK','Tên cũ','0909999999',NULL)");
            }
            Flyway.configure().dataSource(persistence.dataSource()).schemas(schema).defaultSchema(schema).load().migrate();
            try (var c = persistence.dataSource().getConnection(); var s = c.createStatement();
                 var r = s.executeQuery("SELECT ho_ten,ngay_tao FROM " + schema + ".tai_khoan WHERE ma_tk='OLD-TK'")) {
                assertTrue(r.next()); assertEquals("Tên cũ", r.getString(1));
                assertEquals(NOW, r.getTimestamp(2).toInstant());
            }
        } finally {
            try (var c = persistence.dataSource().getConnection(); var s = c.createStatement()) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test void aggregatePersistsAndLateEventFailureRollsBackAllChildren() {
        transactions.run(em -> {
            persistAggregate(em, "TEST-AGG-OK", false); return null;
        });
        transactions.run(em -> {
            var detail = new DonHangDAO(em).findDetails("TEST-AGG-OK");
            assertEquals(1, detail.parcels().size());
            assertEquals(1, detail.events().size());
            assertEquals(new BigDecimal("30000.00"), detail.fare().getTongCuoc());
            return null;
        });
        assertThrows(RuntimeException.class, () -> transactions.run(em -> {
            persistAggregate(em, "TEST-AGG-FAIL", true); return null;
        }));
        transactions.run(em -> {
            assertNull(em.find(DonHang.class, "TEST-AGG-FAIL"));
            assertNull(em.find(SnapshotCuocDonHang.class, "TEST-AGG-FAIL"));
            assertNull(em.find(ChiTietKienHang.class, "K-TEST-AGG-FAIL"));
            return null;
        });
    }

    private void persistAggregate(EntityManager em, String id, boolean invalidEvent) {
        DonHang order = newOrder(em, id);
        SnapshotCuocDonHang fare = new SnapshotCuocDonHang();
        fare.setTenBieuPhi("Test"); fare.setCuocGoc(new BigDecimal("30000.00"));
        fare.setTienPhuThu(BigDecimal.ZERO); fare.setTienGiamGia(BigDecimal.ZERO);
        fare.setTongCuoc(new BigDecimal("30000.00")); fare.setDonViTien("VND");
        ChiTietKienHang parcel = new ChiTietKienHang(); parcel.setId("K-" + id);
        parcel.setLoaiHangHoa("Tài liệu"); parcel.setKhoiLuongKg(BigDecimal.ONE);
        NhatKyTrangThai event = new NhatKyTrangThai(); event.setId("N-" + id);
        event.setTrangThai(OrderStatus.CHO_GAN); event.setThoiGianGhiNhan(NOW);
        if (invalidEvent) event.setTaiKhoanThucHien(em.getReference(TaiKhoan.class, "MISSING-ACTOR"));
        new DonHangDAO(em).persistAggregate(order, fare, List.of(parcel), List.of(), event);
    }

    @Test void nestedTransactionIsRejectedAndOuterWorkRollsBack() {
        assertThrows(IllegalStateException.class, () -> transactions.run(em -> {
            newOrder(em, "TEST-NESTED");
            return new TransactionRunner(persistence.entityManagerFactory()).run(inner -> null);
        }));
        transactions.run(em -> { assertNull(em.find(DonHang.class, "TEST-NESTED")); return null; });
    }

    @Test void schemaValidationFailsForMissingTables() {
        assertThrows(jakarta.persistence.PersistenceException.class, () -> {
            try (var ignored = jakarta.persistence.Persistence.createEntityManagerFactory("mini-ong-vang",
                    java.util.Map.of("jakarta.persistence.nonJtaDataSource", persistence.dataSource(),
                            "hibernate.default_schema", "t03_missing_schema"))) {
                // validate must fail rather than silently create tables.
            }
        });
    }

    @Test void vipDatesCanRepresentTodayAndNoExpiryAndSeedPreservesEditedOrders() {
        transactions.run(em -> {
            em.find(KhachHangVip.class, "KH-DEMO-2").setNgayHetHan(LocalDate.of(2026, 10, 5));
            em.find(KhachHangVip.class, "KH-DEMO-3").setNgayHetHan(null);
            em.find(DonHang.class, "DH-DEMO-WAIT").setGhiChuGiaoHang("Edited after seed");
            return null;
        });
        seeder.seed(PASSWORD);
        transactions.run(em -> {
            assertEquals(LocalDate.of(2026, 10, 5), em.find(KhachHangVip.class, "KH-DEMO-2").getNgayHetHan());
            assertNull(em.find(KhachHangVip.class, "KH-DEMO-3").getNgayHetHan());
            assertEquals("Edited after seed", em.find(DonHang.class, "DH-DEMO-WAIT").getGhiChuGiaoHang());
            return null;
        });
    }
}
