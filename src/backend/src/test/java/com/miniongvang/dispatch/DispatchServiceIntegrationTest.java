package com.miniongvang.dispatch;

import com.miniongvang.DAO.*;
import com.miniongvang.config.*;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import com.miniongvang.seed.DemoSeeder;
import com.miniongvang.service.*;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.IntFunction;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class DispatchServiceIntegrationTest {
    static final Instant NOW=Instant.parse("2026-10-05T03:00:00Z");
    static final Clock CLOCK=Clock.fixed(NOW,ZoneOffset.UTC);
    static PersistenceContext db;
    static TransactionRunner tx;
    static DispatchService service;
    static AuthService.User dispatcher() { return new AuthService.User("TK-DEMO-NV","Dispatcher",AccountRole.TONG_DAI,null,null,"NV-DEMO-1"); }
    static AuthService.User customer(int n) { return new AuthService.User("TK-DEMO-KH-"+n,"Customer",AccountRole.KHACH_HANG,"KH-DEMO-"+n,null,null); }
    static AuthService.User driver(int n) { return new AuthService.User("TK-DEMO-TX-"+n,"Driver",AccountRole.TAI_XE,null,"TX-DEMO-"+n,null); }
    @BeforeAll static void start() throws Exception {
        String url=System.getenv("TEST_DB_URL");
        boolean configured=url!=null && !url.isBlank();
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertTrue(configured);
        assumeTrue(configured,"Dedicated PostgreSQL test DB required");
        assertTrue(url.matches("jdbc:postgresql://[^/]+/mini_ong_vang_test"));
        try(var c=DriverManager.getConnection(url,System.getenv("TEST_DB_USER"),System.getenv("TEST_DB_PASSWORD"));
            var s=c.createStatement();var r=s.executeQuery("select current_database()")) {
            assertTrue(r.next());assertEquals("mini_ong_vang_test",r.getString(1));
        }
        db=PersistenceContext.start(url,System.getenv("TEST_DB_USER"),System.getenv("TEST_DB_PASSWORD"));
        tx=new TransactionRunner(db.entityManagerFactory());service=new DispatchService(db.entityManagerFactory(),CLOCK);
    }
    @BeforeEach void reset() {
        tx.run(em->{em.createNativeQuery("TRUNCATE tai_khoan,cau_hinh_cuoc,cau_hinh_phu_thu,hang_thanh_vien,demo_seed_manifest CASCADE").executeUpdate();return null;});
        new DemoSeeder(db.entityManagerFactory(),CLOCK).seed("dispatch-test-only-password");
    }
    @AfterAll static void close() { if(db!=null) db.close(); }
    static void conflict(String code,org.junit.jupiter.api.function.Executable action) {
        assertEquals(code,assertThrows(DispatchService.Conflict.class,action).getMessage());
    }
    static long active(String field,String id) {
        return tx.run(em->em.createQuery("select count(p) from PhanCongDonHang p where p."+field+".id=:id and p.ketThucLuc is null",Long.class)
                .setParameter("id",id).getSingleResult());
    }
    static long events(String id) { return tx.run(em->(long)new DonHangDAO(em).findDetails(id).events().size()); }
    static String newOrder() {
        var routes=RouteConfiguration.from(Map.of());
        var parcels=List.of(new QuoteService.Parcel("Hoa",null,"1.00"));
        var q=new QuoteService(db.entityManagerFactory(),routes,CLOCK).create(customer(1),null,"Điểm mẫu A","Điểm mẫu B",parcels);
        return new OrderService(db.entityManagerFactory(),routes,CLOCK).create(customer(1),UUID.randomUUID().toString(),
                new OrderService.CreateOrder(q.maBaoGia(),null,"Điểm mẫu A","Điểm mẫu B","0901234567",null,parcels)).maDon();
    }
    @Test void suggestionsUseLongestIdleThenIdAndExcludeIneligibleDrivers() {
        assertEquals(List.of("TX-DEMO-2","TX-DEMO-1"),service.suggestions(dispatcher(),"DH-DEMO-WAIT",0,20).items().stream().map(DispatchService.Driver::maTx).toList());
        tx.run(em->{em.find(TaiXe.class,"TX-DEMO-1").setRanhTu(NOW);em.find(TaiXe.class,"TX-DEMO-2").setRanhTu(NOW);return null;});
        var first=service.suggestions(dispatcher(),"DH-DEMO-WAIT",0,1);
        assertEquals("TX-DEMO-1",first.items().getFirst().maTx()); assertEquals(2,first.totalElements());assertEquals(2,first.totalPages());
        assertEquals("TX-DEMO-2",service.suggestions(dispatcher(),"DH-DEMO-WAIT",1,1).items().getFirst().maTx());
        assertNotNull(first.items().getFirst().phuongTien());
    }
    @Test void noAvailableDriversReturnsEmptyPage() {
        tx.run(em->{em.createQuery("update TaiXe set trangThai=:s where id in ('TX-DEMO-1','TX-DEMO-2')").setParameter("s",DriverStatus.OFFLINE).executeUpdate();return null;});
        var result=service.suggestions(dispatcher(),"DH-DEMO-WAIT",0,20);
        assertTrue(result.items().isEmpty());assertEquals(0,result.totalElements());assertEquals(0,result.totalPages());
    }
    @Test void driverListFiltersBusyStatusAndNeverIncludesLockedAccounts() {
        var free=service.drivers(dispatcher(),0,20,DriverStatus.ONLINE,false);
        assertEquals(2,free.totalElements());assertTrue(free.items().stream().noneMatch(DispatchService.Driver::dangBanChuyen));
        assertEquals(3,service.drivers(dispatcher(),0,20,DriverStatus.ONLINE,true).totalElements());
        assertEquals(7,service.drivers(dispatcher(),0,20,null,null).totalElements());
        assertEquals(1,service.drivers(dispatcher(),0,20,DriverStatus.NGHI,false).totalElements());
    }
    @Test void assignmentCommitsDriverOrderHistoryAndAuditWithoutChangingFare() {
        var before=service.order(dispatcher(),"DH-DEMO-WAIT");long events=events(before.maDon());
        var assigned=service.assign(dispatcher(),before.maDon(),"TX-DEMO-1");
        assertEquals("DA_GAN",assigned.trangThai());assertEquals("TX-DEMO-1",assigned.maTx());
        assertEquals(before.cuoc(),assigned.cuoc());assertEquals(before.kienHang(),assigned.kienHang());
        assertEquals(1,active("donHang",before.maDon()));assertEquals(1,active("taiXe","TX-DEMO-1"));
        assertEquals(events+1,events(before.maDon()));
        tx.run(em->{assertNull(em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());
            var history=new PhanCongDonHangDAO(em).findHistory(before.maDon());assertEquals("TK-DEMO-NV",history.getFirst().getTaiKhoanDieuPhoi().getId());return null;});
        assertEquals(assigned,service.order(driver(1),before.maDon()));
    }
    @Test void unavailableDriversMissingResourcesAndWrongOrderStatesAreRejected() {
        for(String id:List.of("TX-DEMO-3","TX-DEMO-4","TX-DEMO-5","TX-DEMO-6","TX-DEMO-7","TX-DEMO-8"))
            conflict("DRIVER_UNAVAILABLE",()->service.assign(dispatcher(),"DH-DEMO-WAIT",id));
        for(String id:List.of("DH-DEMO-ASSIGNED","DH-DEMO-PICKED","DH-DEMO-DELIVERING","DH-DEMO-CANCELLED","DH-DEMO-PAID-CASH")) {
            conflict("ORDER_STATE_CONFLICT",()->service.assign(dispatcher(),id,"TX-DEMO-1"));
            conflict("ORDER_STATE_CONFLICT",()->service.suggestions(dispatcher(),id,0,20));
        }
        assertThrows(NoSuchElementException.class,()->service.assign(dispatcher(),"missing","TX-DEMO-1"));
        assertThrows(NoSuchElementException.class,()->service.assign(dispatcher(),"DH-DEMO-WAIT","missing"));
        assertEquals(0,active("donHang","DH-DEMO-WAIT"));
    }
    @Test void rejectionReleasesDriverAndRecordsReasonAndExcludesReassignment() {
        service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1");
        var result=service.reject(driver(1),"DH-DEMO-WAIT","  Xe gặp sự cố  ");
        assertEquals("CHO_GAN",result.trangThai());assertNull(result.maTx());
        assertEquals(0,active("taiXe","TX-DEMO-1"));
        tx.run(em->{var h=new PhanCongDonHangDAO(em).findHistory(result.maDon()).getFirst();
            assertEquals("Xe gặp sự cố",h.getLyDoKetThuc());assertTrue(h.isTuChoi());assertEquals(NOW,h.getKetThucLuc());
            assertEquals(NOW,em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());
            var audit=new DonHangDAO(em).findDetails(result.maDon()).events().stream().filter(n->"Xe gặp sự cố".equals(n.getGhiChuSuCo())).findFirst().orElseThrow();
            assertEquals("TK-DEMO-TX-1",audit.getTaiKhoanThucHien().getId());return null;});
        assertEquals(List.of("TX-DEMO-2"),service.suggestions(dispatcher(),result.maDon(),0,20).items().stream().map(DispatchService.Driver::maTx).toList());
        conflict("DRIVER_UNAVAILABLE",()->service.assign(dispatcher(),result.maDon(),"TX-DEMO-1"));
        assertThrows(NoSuchElementException.class,()->service.order(driver(1),result.maDon()));
        assertEquals("DA_GAN",service.assign(dispatcher(),result.maDon(),"TX-DEMO-2").trangThai());
        assertEquals("DA_GAN",service.assign(dispatcher(),newOrder(),"TX-DEMO-1").trangThai());
    }
    @Test void rejectionRequiresOwnerAssignedStateAndReasonBoundaries() {
        service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1");
        for(String reason:Arrays.asList(null,"","  ","x".repeat(501)))
            assertThrows(IllegalArgumentException.class,()->service.reject(driver(1),"DH-DEMO-WAIT",reason));
        assertThrows(NoSuchElementException.class,()->service.reject(driver(2),"DH-DEMO-WAIT","no"));
        conflict("ORDER_STATE_CONFLICT",()->service.reject(driver(4),"DH-DEMO-PICKED","no"));
        assertEquals(1,active("donHang","DH-DEMO-WAIT"));
        assertEquals("CHO_GAN",service.reject(driver(1),"DH-DEMO-WAIT","x".repeat(500)).trangThai());
    }
    @Test void roleAndProfileSpoofingAreDenied() {
        assertThrows(SecurityException.class,()->service.assign(customer(1),"DH-DEMO-WAIT","TX-DEMO-1"));
        assertThrows(SecurityException.class,()->service.reject(dispatcher(),"DH-DEMO-ASSIGNED","no"));
        assertThrows(SecurityException.class,()->service.drivers(driver(1),0,20,null,null));
        var spoof=new AuthService.User("TK-DEMO-TX-1","Driver",AccountRole.TAI_XE,null,"TX-DEMO-3",null);
        assertThrows(SecurityException.class,()->service.reject(spoof,"DH-DEMO-ASSIGNED","no"));
        assertThrows(NoSuchElementException.class,()->service.order(customer(2),"DH-DEMO-WAIT"));
        assertThrows(NoSuchElementException.class,()->service.order(driver(1),"DH-DEMO-WAIT"));
    }
    @Test void ordersRespectOwnershipPaginationFullSummaryAndVietnamDates() {
        var all=service.orders(dispatcher(),0,1,null,null,null);
        assertEquals(10,all.totalElements());assertEquals(10,all.summary().tongSoDon());assertEquals(10,all.totalPages());
        var whole=service.orders(dispatcher(),0,20,null,null,null);
        assertEquals(whole.summary(),all.summary());
        var mine=service.orders(customer(1),0,20,null,null,null);
        assertTrue(mine.items().stream().allMatch(o->o.maKh().equals("KH-DEMO-1")));
        var assigned=service.orders(driver(3),0,20,null,null,OrderStatus.DA_GAN);
        assertEquals(1,assigned.items().size());assertEquals("DH-DEMO-ASSIGNED",assigned.items().getFirst().maDon());
        var day=service.orders(dispatcher(),0,20,LocalDate.of(2026,10,5),LocalDate.of(2026,10,6),OrderStatus.CHO_GAN);
        assertEquals(1,day.totalElements());
        tx.run(em->{em.find(DonHang.class,"DH-DEMO-WAIT").setThoiGianTao(Instant.parse("2026-10-04T17:00:00Z"));return null;});
        assertEquals(1,service.orders(dispatcher(),0,20,LocalDate.of(2026,10,5),LocalDate.of(2026,10,6),OrderStatus.CHO_GAN).totalElements());
        var empty=service.orders(dispatcher(),0,20,LocalDate.of(2026,10,6),null,null);
        assertEquals(0,empty.totalElements());assertEquals("0.00",empty.summary().tongCuoc());
        assertThrows(DispatchService.DateRangeInvalid.class,()->service.orders(dispatcher(),0,20,LocalDate.of(2026,10,5),LocalDate.of(2026,10,5),null));
        assertThrows(IllegalArgumentException.class,()->service.orders(dispatcher(),-1,20,null,null,null));
        assertThrows(IllegalArgumentException.class,()->service.drivers(dispatcher(),0,101,null,null));
    }
    @Test void currentOrderReadsSnapshotAndPaymentState() {
        assertEquals("DA_THANH_TOAN",service.order(customer(1),"DH-DEMO-PAID-CASH").thanhToan().trangThai());
        assertEquals("0.00",service.order(customer(1),"DH-DEMO-PAID-CASH").thanhToan().soTienConPhaiThu());
        assertEquals("MIEN_CUOC",service.order(customer(2),"DH-DEMO-FREE").thanhToan().trangThai());
        assertEquals("DANG_XU_LY",service.order(customer(3),"DH-DEMO-PENDING").thanhToan().trangThai());
    }
    @Test void staleSuggestionsDoNotReserveDriversOrBypassEligibility() {
        var ids=service.suggestions(dispatcher(),"DH-DEMO-WAIT",0,20).items().stream().map(DispatchService.Driver::maTx).toList();
        assertTrue(ids.contains("TX-DEMO-1"));
        tx.run(em->{em.find(TaiXe.class,"TX-DEMO-1").setTrangThai(DriverStatus.OFFLINE);return null;});
        conflict("DRIVER_UNAVAILABLE",()->service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1"));
        tx.run(em->{em.find(TaiXe.class,"TX-DEMO-1").setTrangThai(DriverStatus.ONLINE);em.find(TaiKhoan.class,"TK-DEMO-TX-1").setTrangThai(AccountStatus.KHOA);return null;});
        conflict("DRIVER_UNAVAILABLE",()->service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1"));
        tx.run(em->{em.find(TaiKhoan.class,"TK-DEMO-TX-1").setTrangThai(AccountStatus.HOAT_DONG);return null;});
        service.assign(dispatcher(),newOrder(),"TX-DEMO-1");
        conflict("DRIVER_UNAVAILABLE",()->service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1"));
        assertEquals("CHO_GAN",service.order(dispatcher(),"DH-DEMO-WAIT").trangThai());
        assertEquals(1,events("DH-DEMO-WAIT"));assertEquals(0,active("donHang","DH-DEMO-WAIT"));
    }
    @Test void historyRemainsVisibleAfterCompletedOrderReleasesCurrentDriver() {
        tx.run(em->{em.find(DonHang.class,"DH-DEMO-PAID-CASH").setTaiXe(null);return null;});
        assertEquals("DH-DEMO-PAID-CASH",service.order(driver(1),"DH-DEMO-PAID-CASH").maDon());
        assertTrue(service.orders(driver(1),0,20,null,null,null).items().stream().anyMatch(d->d.maDon().equals("DH-DEMO-PAID-CASH")));
        assertThrows(NoSuchElementException.class,()->service.order(driver(2),"DH-DEMO-PAID-CASH"));
    }
    @Test void suggestionsPutUnknownIdleTimeLastAndAllowMissingVehicle() {
        tx.run(em->{em.find(TaiXe.class,"TX-DEMO-2").setRanhTu(null);
            em.createQuery("delete from PhuongTien where taiXe.id='TX-DEMO-2'").executeUpdate();return null;});
        var result=service.suggestions(dispatcher(),"DH-DEMO-WAIT",0,20);
        assertEquals(List.of("TX-DEMO-1","TX-DEMO-2"),result.items().stream().map(DispatchService.Driver::maTx).toList());
        assertNull(result.items().getLast().phuongTien());
    }
    @Test void assignmentRacingCancellationTransactionNeverLeavesAnActiveDriver() throws Exception {
        // The cancellation endpoint belongs to T13. This fixture exercises its DB
        // write contract (order -> driver locks), not an unimplemented HTTP API.
        var results=race(2,n->n==0?service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1").trangThai():tx.run(em->{
            DonHang order=new DonHangDAO(em).findForUpdate("DH-DEMO-WAIT");
            if (order.getTaiXe()!=null) {
                TaiXe driver=new TaiXeDAO(em).findForUpdate(order.getTaiXe().getId());
                var assignment=new DispatchDAO(em).activeOrder(order.getId());
                assignment.setKetThucLuc(NOW);assignment.setLyDoKetThuc("Cancellation fixture");
                driver.setRanhTu(NOW);order.setTaiXe(null);
            }
            order.setTrangThai(OrderStatus.DA_HUY);order.setThoiGianHuy(NOW);order.setLyDoHuy("Cancellation fixture");
            return "DA_HUY";
        }));
        assertTrue(results.contains("DA_HUY"));assertTrue(results.contains("DA_GAN") || results.contains("ORDER_STATE_CONFLICT"));
        var saved=service.order(dispatcher(),"DH-DEMO-WAIT");assertEquals("DA_HUY",saved.trangThai());assertNull(saved.maTx());
        assertEquals(0,active("donHang","DH-DEMO-WAIT"));assertEquals(0,active("taiXe","TX-DEMO-1"));
        assertEquals(2,service.drivers(dispatcher(),0,20,DriverStatus.ONLINE,false).totalElements());
    }
    static List<String> race(int count,IntFunction<String> work) throws Exception {
        var start=new CountDownLatch(1);var ready=new CountDownLatch(count);
        var pool=Executors.newFixedThreadPool(count);
        try {
            List<Future<String>> tasks=new ArrayList<>();
            for(int i=0;i<count;i++) {int n=i; tasks.add(pool.submit(()->{ready.countDown();start.await();try{return work.apply(n);}catch(DispatchService.Conflict c){return c.getMessage();}}));}
            assertTrue(ready.await(10,TimeUnit.SECONDS),"All workers must be ready before releasing the race");
            start.countDown();List<String> results=new ArrayList<>();
            for(var task:tasks) results.add(task.get(30,TimeUnit.SECONDS));return results;
        } finally {
            start.countDown();pool.shutdownNow();
            assertTrue(pool.awaitTermination(10,TimeUnit.SECONDS),"Concurrent workers did not finish");
        }
    }
    @Test void eightConcurrentAssignmentsToSameOrderHaveExactlyOneWinner() throws Exception {
        long before=events("DH-DEMO-WAIT");
        var results=race(8,n->service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-"+(n%2+1)).trangThai());
        assertEquals(1,Collections.frequency(results,"DA_GAN"));assertEquals(7,Collections.frequency(results,"ORDER_STATE_CONFLICT"));
        assertEquals(1,active("donHang","DH-DEMO-WAIT"));assertEquals(before+1,events("DH-DEMO-WAIT"));
        assertEquals(1,service.drivers(dispatcher(),0,20,DriverStatus.ONLINE,false).totalElements());
    }
    @Test void eightDifferentOrdersCompetingForOneDriverHaveOneWinner() throws Exception {
        List<String> ids=new ArrayList<>();for(int i=0;i<8;i++) ids.add(newOrder());
        var results=race(8,n->service.assign(dispatcher(),ids.get(n),"TX-DEMO-1").trangThai());
        assertEquals(1,Collections.frequency(results,"DA_GAN"));assertEquals(7,Collections.frequency(results,"DRIVER_UNAVAILABLE"));
        assertEquals(1,active("taiXe","TX-DEMO-1"));
        long linked=tx.run(em->em.createQuery("select count(d) from DonHang d where d.taiXe.id='TX-DEMO-1' and d.trangThai=:s",Long.class).setParameter("s",OrderStatus.DA_GAN).getSingleResult());
        assertEquals(1,linked);
        for(String id:ids) {
            var saved=service.order(dispatcher(),id);
            boolean winner=saved.maTx()!=null;
            assertEquals(winner?"DA_GAN":"CHO_GAN",saved.trangThai());
            assertEquals(winner?1:0,active("donHang",id));
            assertEquals(winner?2:1,events(id),"Failed assignment must not leave an audit event");
        }
    }
    @Test void simultaneousRejectionAndAssignmentPreserveActiveUniqueness() throws Exception {
        service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1");
        var results=race(2,n->n==0?service.reject(driver(1),"DH-DEMO-WAIT","Xe hỏng").trangThai():service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-2").trangThai());
        assertTrue(results.contains("CHO_GAN"));
        assertTrue(results.contains("DA_GAN") || results.contains("ORDER_STATE_CONFLICT"));
        assertEquals(0,active("taiXe","TX-DEMO-1"));
        var finalOrder=service.order(dispatcher(),"DH-DEMO-WAIT");
        assertEquals(finalOrder.maTx()==null?0:1,active("donHang",finalOrder.maDon()));
        assertEquals(finalOrder.maTx()==null?"CHO_GAN":"DA_GAN",finalOrder.trangThai());
    }
    @Test void lateAuditFailureRollsBackAssignmentAndRejection() {
        long before=events("DH-DEMO-WAIT");
        Instant idle=tx.run(em->em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());
        installFailure();
        try {auditFailure(()->service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1"));}
        finally {removeFailure();}
        assertEquals(0,active("donHang","DH-DEMO-WAIT"));assertEquals(before,events("DH-DEMO-WAIT"));
        assertEquals("CHO_GAN",service.order(dispatcher(),"DH-DEMO-WAIT").trangThai());
        assertEquals(idle,tx.run(em->em.find(TaiXe.class,"TX-DEMO-1").getRanhTu()));
        service.assign(dispatcher(),"DH-DEMO-WAIT","TX-DEMO-1");installFailure();
        try {auditFailure(()->service.reject(driver(1),"DH-DEMO-WAIT","no"));}
        finally {removeFailure();}
        assertEquals(1,active("donHang","DH-DEMO-WAIT"));assertEquals("DA_GAN",service.order(driver(1),"DH-DEMO-WAIT").trangThai());
        assertEquals(before+1,events("DH-DEMO-WAIT"));
        tx.run(em->{var assignment=new DispatchDAO(em).activeOrder("DH-DEMO-WAIT");
            assertFalse(assignment.isTuChoi());assertNull(assignment.getKetThucLuc());assertNull(assignment.getLyDoKetThuc());
            assertNull(em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());return null;});
    }
    static void auditFailure(org.junit.jupiter.api.function.Executable work) {
        Throwable error=assertThrows(RuntimeException.class,work);
        while(error.getCause()!=null) error=error.getCause();
        assertInstanceOf(java.sql.SQLException.class,error);
        assertEquals("P0001",((java.sql.SQLException)error).getSQLState());
        assertTrue(error.getMessage().contains("test audit failure"),"Failure must come from the audit trigger, not an earlier check");
    }
    static void installFailure() {tx.run(em->{em.createNativeQuery("CREATE FUNCTION t11_fail_event() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''test audit failure''; END'").executeUpdate();em.createNativeQuery("CREATE TRIGGER t11_fail_event BEFORE INSERT ON nhat_ky_trang_thai FOR EACH ROW EXECUTE FUNCTION t11_fail_event()").executeUpdate();return null;});}
    static void removeFailure() {tx.run(em->{em.createNativeQuery("DROP TRIGGER t11_fail_event ON nhat_ky_trang_thai").executeUpdate();em.createNativeQuery("DROP FUNCTION t11_fail_event()").executeUpdate();return null;});}
}
