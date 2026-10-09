package com.miniongvang.order;

import com.miniongvang.DAO.DonHangDAO;
import com.miniongvang.config.*;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import com.miniongvang.integration.*;
import com.miniongvang.seed.DemoSeeder;
import com.miniongvang.service.*;
import java.math.BigDecimal;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class OrderServiceIntegrationTest {
    static final Instant NOW = Instant.parse("2026-10-05T03:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    static PersistenceContext db;
    static TransactionRunner tx;
    static RouteService routes;
    static QuoteService quotes;
    static OrderService orders;
    static AuthService.User customer(int n) {
        return new AuthService.User("TK-DEMO-KH-"+n, "Customer", AccountRole.KHACH_HANG, "KH-DEMO-"+n, null, null);
    }
    static AuthService.User dispatcher() {
        return new AuthService.User("TK-DEMO-NV", "Dispatcher", AccountRole.TONG_DAI, null, null, "NV-DEMO-1");
    }
    @BeforeAll static void start() throws Exception {
        String url=System.getenv("TEST_DB_URL");
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
        assumeTrue(url != null && url.matches("jdbc:postgresql://[^/]+/mini_ong_vang_test"));
        try (var c=DriverManager.getConnection(url,System.getenv("TEST_DB_USER"),System.getenv("TEST_DB_PASSWORD"));
             var s=c.createStatement(); var r=s.executeQuery("select current_database()")) {
            assertTrue(r.next()); assertEquals("mini_ong_vang_test",r.getString(1));
        }
        db=PersistenceContext.start(url,System.getenv("TEST_DB_USER"),System.getenv("TEST_DB_PASSWORD"));
        tx=new TransactionRunner(db.entityManagerFactory());
        new DemoSeeder(db.entityManagerFactory(),CLOCK).seed("order-test-password");
        routes=RouteConfiguration.from(Map.of());
        quotes=new QuoteService(db.entityManagerFactory(),routes,CLOCK);
        orders=new OrderService(db.entityManagerFactory(),routes,CLOCK);
    }
    @AfterAll static void stop() { if(db!=null) db.close(); }
    static List<QuoteService.Parcel> parcels() { return List.of(new QuoteService.Parcel("Hoa", "Tránh đè nén", "1.00")); }
    static OrderService.CreateOrder request(int n) {
        var q=quotes.create(customer(n),null,"Điểm mẫu A","Điểm mẫu B",parcels());
        return new OrderService.CreateOrder(q.maBaoGia(),"KH-DEMO-"+n,"Điểm mẫu A","Điểm mẫu B","0901234567",null,parcels());
    }
    static String key() { return UUID.randomUUID().toString(); }
    static OrderService.CreateOrder change(OrderService.CreateOrder r,String destination,String phone,List<QuoteService.Parcel> parcels) {
        return new OrderService.CreateOrder(r.maBaoGia(),r.maKh(),r.diemLayHang(),destination,phone,r.ghiChuGiaoHang(),parcels);
    }
    static long count(String entity) { return tx.run(em->em.createQuery("select count(x) from "+entity+" x",Long.class).getSingleResult()); }
    static List<Long> counts() {
        return List.of(count("DonHang"),count("ChiTietKienHang"),count("SnapshotCuocDonHang"),count("PhuThuDonHang"),count("NhatKyTrangThai"),count("OrderCreationRequest"));
    }
    static void conflict(String code, org.junit.jupiter.api.function.Executable action) {
        assertEquals(code,assertThrows(OrderService.Conflict.class,action).getMessage());
    }

    @Test void createsRegularVipAndExpiredVipWithCompleteAggregate() {
        for(int n=1;n<=3;n++) {
            var result=orders.create(customer(n),key(),request(n));
            assertEquals("CHO_GAN",result.trangThai()); assertNull(result.maTx()); assertNull(result.maNv());
            assertEquals(n==2?"45000.00":"50000.00",result.cuoc().tongCuoc());
            tx.run(em->{
                var saved=new DonHangDAO(em).findDetails(result.maDon());
                assertNotNull(saved); assertEquals(1,saved.parcels().size()); assertEquals(1,saved.surcharges().size());
                assertEquals(1,saved.events().size()); assertEquals(NOW,saved.order().getThoiGianTao());
                assertEquals(new BigDecimal(result.cuoc().tongCuoc()),saved.fare().getTongCuoc());
                assertEquals(saved.order().getKhachHang().getTaiKhoan().getId(),saved.events().getFirst().getTaiKhoanThucHien().getId());
                return null;
            });
        }
    }
    @Test void dispatcherUsesSelectedCustomerVipAndStoresCreator() {
        var result=orders.create(dispatcher(),key(),request(2));
        assertEquals("KH-DEMO-2",result.maKh()); assertEquals("NV-DEMO-1",result.maNv());
        assertEquals("45000.00",result.cuoc().tongCuoc());
        tx.run(em->{var event=new DonHangDAO(em).findDetails(result.maDon()).events().getFirst();
            assertEquals("TK-DEMO-NV",event.getTaiKhoanThucHien().getId()); assertEquals("TONG_DAI",event.getVaiTroThucHien()); return null;});
    }
    @Test void rejectsCustomerSpoofingWrongQuoteOwnerAndDriver() {
        var r=request(2);
        assertThrows(SecurityException.class,()->orders.create(customer(1),key(),r));
        var hidden=new OrderService.CreateOrder(r.maBaoGia(),null,r.diemLayHang(),r.diemGiaoHang(),r.sdtNguoiNhan(),null,r.kienHang());
        assertThrows(SecurityException.class,()->orders.create(customer(1),key(),hidden));
        assertThrows(SecurityException.class,()->orders.create(new AuthService.User("x","x",AccountRole.TAI_XE,null,"x",null),key(),r));
    }
    @Test void rejectsMissingDataInvalidPhonesAndParcelBoundaries() {
        var r=request(1); var before=counts();
        for(String phone:Arrays.asList(null,"","123","09012345678","090 1234567"))
            assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),key(),change(r,r.diemGiaoHang(),phone,r.kienHang())));
        for(String address:Arrays.asList(null," ","a".repeat(256)))
            assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),key(),change(r,address,r.sdtNguoiNhan(),r.kienHang())));
        assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),key(),change(r,r.diemGiaoHang(),r.sdtNguoiNhan(),List.of())));
        assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),key(),change(r,r.diemGiaoHang(),r.sdtNguoiNhan(),List.of(new QuoteService.Parcel("Hoa",null,"0")))));
        assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),null,r));
        assertThrows(IllegalArgumentException.class,()->orders.create(customer(1),"x".repeat(101),r));
        assertEquals(before,counts());
    }
    @Test void acceptsNormalizedInternationalPhone() {
        var r=request(1);
        assertEquals("0901234567",orders.create(customer(1),key(),change(r,r.diemGiaoHang()," +84901234567 ",r.kienHang())).sdtNguoiNhan());
    }
    @Test void rejectsOutsideAreaAndProviderTimeoutWithoutWrites() {
        var r=request(1); var before=counts();
        assertEquals(RouteFailure.Kind.OUT_OF_SERVICE_AREA,assertThrows(RouteFailure.class,
                ()->orders.create(customer(1),key(),change(r,"Hà Nội",r.sdtNguoiNhan(),r.kienHang()))).kind());
        var failing=new OrderService(db.entityManagerFactory(),new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.TIMEOUT),50000),CLOCK);
        assertEquals(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT,assertThrows(RouteFailure.class,()->failing.create(customer(1),key(),r)).kind());
        assertEquals(before,counts());
    }
    @Test void expiryAtExactly300SecondsAndSuccessAt299() {
        var r=request(1);
        new OrderService(db.entityManagerFactory(),routes,Clock.offset(CLOCK,Duration.ofSeconds(299))).create(customer(1),key(),r);
        for(int seconds:new int[]{300,301}) conflict("QUOTE_EXPIRED",()->new OrderService(db.entityManagerFactory(),routes,
                Clock.offset(CLOCK,Duration.ofSeconds(seconds))).create(customer(1),key(),r));
    }
    @Test void changedInputsAndRecomputedPriceRequireNewQuote() {
        var r=request(1); var before=counts();
        conflict("QUOTE_CHANGED",()->orders.create(customer(1),key(),change(r,"Điểm mẫu C",r.sdtNguoiNhan(),r.kienHang())));
        conflict("QUOTE_CHANGED",()->orders.create(customer(1),key(),change(r,r.diemGiaoHang(),r.sdtNguoiNhan(),List.of(new QuoteService.Parcel("Hoa",null,"2.00")))));
        var old=tx.run(em->{var t=em.find(CauHinhCuoc.class,"CUOC-DEMO-1");var value=t.getDonGiaKm();t.setDonGiaKm(value.add(BigDecimal.ONE));return value;});
        try { conflict("QUOTE_CHANGED",()->orders.create(customer(1),key(),r)); }
        finally { tx.run(em->{em.find(CauHinhCuoc.class,"CUOC-DEMO-1").setDonGiaKm(old);return null;}); }
        assertEquals(before,counts());
    }
    @Test void replaySurvivesExpiryAndProviderFailureButChangedPayloadConflicts() {
        var r=request(1); String key=key(); var result=orders.create(customer(1),key,r); var after=counts();
        var failing=new OrderService(db.entityManagerFactory(),new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.ERROR),50000),Clock.offset(CLOCK,Duration.ofHours(23)));
        assertEquals(result,failing.create(customer(1),key,r));
        conflict("IDEMPOTENCY_CONFLICT",()->orders.create(customer(1),key,change(r,r.diemGiaoHang(),"0901111111",r.kienHang())));
        assertEquals(after,counts());
    }
    @Test void concurrentRetriesCreateExactlyOneAggregate() throws Exception {
        var r=request(1); String key=key(); var before=counts(); var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(4)) {
            List<Future<OrderService.Order>> tasks=new ArrayList<>();
            for(int i=0;i<4;i++) tasks.add(pool.submit(()->{start.await();return orders.create(customer(1),key,r);}));
            start.countDown(); var first=tasks.getFirst().get(20,TimeUnit.SECONDS);
            for(var task:tasks) assertEquals(first,task.get(20,TimeUnit.SECONDS));
        }
        var after=counts(); for(int i=0;i<before.size();i++) assertEquals(before.get(i)+1,after.get(i));
    }
    @Test void rollbackOnLateDatabaseFailureAlsoReleasesIdempotencyKey() {
        var r=request(1); String key=key(); var before=counts();
        tx.run(em->{
            em.createNativeQuery("CREATE FUNCTION t10_fail_event() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''test event failure''; END'").executeUpdate();
            em.createNativeQuery("CREATE TRIGGER t10_fail_event BEFORE INSERT ON nhat_ky_trang_thai FOR EACH ROW EXECUTE FUNCTION t10_fail_event()").executeUpdate(); return null;
        });
        try { assertThrows(RuntimeException.class,()->orders.create(customer(1),key,r)); assertEquals(before,counts()); }
        finally { tx.run(em->{em.createNativeQuery("DROP TRIGGER t10_fail_event ON nhat_ky_trang_thai").executeUpdate();em.createNativeQuery("DROP FUNCTION t10_fail_event()").executeUpdate();return null;}); }
        assertNotNull(orders.create(customer(1),key,r));
    }
    @Test void idempotencyIsScopedToActorAndCanBeReusedAt24Hours() {
        var r=request(1); String key=key();
        var first=orders.create(customer(1),key,r);
        var onBehalf=orders.create(dispatcher(),key,r);
        assertNotEquals(first.maDon(),onBehalf.maDon());
        Clock later=Clock.offset(CLOCK,Duration.ofHours(24));
        var quote=new QuoteService(db.entityManagerFactory(),routes,later).create(customer(1),null,r.diemLayHang(),r.diemGiaoHang(),r.kienHang());
        var next=new OrderService.CreateOrder(quote.maBaoGia(),r.maKh(),r.diemLayHang(),r.diemGiaoHang(),r.sdtNguoiNhan(),null,r.kienHang());
        var newOrder=new OrderService(db.entityManagerFactory(),routes,later).create(customer(1),key,next);
        assertNotEquals(first.maDon(),newOrder.maDon());
        assertEquals(newOrder,new OrderService(db.entityManagerFactory(),routes,later).create(customer(1),key,next));
        tx.run(em->{assertNotNull(em.find(DonHang.class,first.maDon()));return null;});
    }
    @Test void changedVipAndMissingTariffDoNotCreateOrders() {
        var r=request(2); var before=counts();
        var expiry=tx.run(em->{var vip=em.find(KhachHangVip.class,"KH-DEMO-2");var old=vip.getNgayHetHan();vip.setNgayHetHan(LocalDate.of(2026,10,4));return old;});
        try { conflict("QUOTE_CHANGED",()->orders.create(customer(2),key(),r)); }
        finally {tx.run(em->{em.find(KhachHangVip.class,"KH-DEMO-2").setNgayHetHan(expiry);return null;});}
        tx.run(em->{em.find(CauHinhCuoc.class,"CUOC-DEMO-1").setDangKichHoat(false);return null;});
        try {assertThrows(FareCalculator.FareConfigurationException.class,()->orders.create(customer(2),key(),r));}
        finally {tx.run(em->{em.find(CauHinhCuoc.class,"CUOC-DEMO-1").setDangKichHoat(true);return null;});}
        assertEquals(before,counts());
    }

    @Test void freeFareStoresSnapshotWithoutCreatingPayment() {
        var price=tx.run(em->{var t=em.find(CauHinhCuoc.class,"CUOC-DEMO-1");var values=List.of(t.getCuocCoBan(),t.getDonGiaKm());
            t.setCuocCoBan(BigDecimal.ZERO); t.setDonGiaKm(BigDecimal.ZERO);
            em.createQuery("update CauHinhPhuThu set dangKichHoat=false where dangKichHoat=true").executeUpdate(); return values;});
        long payments=count("ThanhToan");
        try { var order=orders.create(customer(1),key(),request(1)); assertEquals("MIEN_CUOC",order.thanhToan().trangThai());assertEquals("0.00",order.cuoc().tongCuoc());assertEquals(payments,count("ThanhToan")); }
        finally {tx.run(em->{var t=em.find(CauHinhCuoc.class,"CUOC-DEMO-1");t.setCuocCoBan(price.get(0));t.setDonGiaKm(price.get(1));em.find(CauHinhPhuThu.class,"PHU-DEMO-1").setDangKichHoat(true);return null;});}
    }
}
