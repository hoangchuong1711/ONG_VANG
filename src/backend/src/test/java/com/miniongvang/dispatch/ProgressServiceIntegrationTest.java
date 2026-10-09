package com.miniongvang.dispatch;

import com.miniongvang.DAO.*;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import com.miniongvang.service.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import static com.miniongvang.dispatch.DispatchServiceIntegrationTest.*;

class ProgressServiceIntegrationTest {
    static final String ORDER="DH-DEMO-WAIT";
    @BeforeAll static void startDb() throws Exception { start(); }
    @BeforeEach void seed() { new DispatchServiceIntegrationTest().reset(); }
    @AfterAll static void closeDb() { close(); }
    void assigned() { service.assign(dispatcher(),ORDER,"TX-DEMO-1"); }
    void delivering() {
        assigned();
        service.transition(driver(1),ORDER,OrderStatus.DA_LAY_HANG);
        service.transition(driver(1),ORDER,OrderStatus.DANG_GIAO);
    }
    @Test void completeAtomicallyPreservesFarePaymentHistoryAndAllowsNextAssignment() {
        delivering(); var before=service.order(driver(1),ORDER); long count=events(ORDER);
        var done=service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT);
        assertEquals("HOAN_TAT",done.trangThai()); assertEquals(NOW.toString(),done.hoanTatLuc());
        assertEquals(before.cuoc(),done.cuoc()); assertEquals(before.thanhToan(),done.thanhToan());
        assertEquals(before.kienHang(),done.kienHang()); assertEquals("TX-DEMO-1",done.maTx());
        assertEquals(0,active("donHang",ORDER)); assertEquals(0,active("taiXe","TX-DEMO-1"));
        assertEquals(count+1,events(ORDER));
        tx.run(em->{
            var history=new PhanCongDonHangDAO(em).findHistory(ORDER).getFirst();
            assertEquals(NOW,history.getKetThucLuc()); assertFalse(history.isTuChoi());
            assertEquals("HOAN_TAT",history.getLyDoKetThuc());
            assertEquals(NOW,em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());
            assertFalse(new DispatchDAO(em).busy("TX-DEMO-1"));
            var audit=new DonHangDAO(em).findDetails(ORDER).events().stream()
                    .filter(e->e.getTrangThai()==OrderStatus.HOAN_TAT).findFirst().orElseThrow();
            assertEquals("TK-DEMO-TX-1",audit.getTaiKhoanThucHien().getId());
            assertEquals("TAI_XE",audit.getVaiTroThucHien()); assertEquals(NOW,audit.getThoiGianGhiNhan());
            assertTrue(new ThanhToanDAO(em).findAttempts(ORDER).isEmpty()); return null;
        });
        String next=newOrder(); service.assign(dispatcher(),next,"TX-DEMO-1");
        var later=new DispatchService(db.entityManagerFactory(),Clock.fixed(NOW.plusSeconds(60),ZoneOffset.UTC));
        assertEquals(done,later.transition(driver(1),ORDER,OrderStatus.HOAN_TAT));
        assertEquals(count+1,events(ORDER)); assertEquals(1,active("taiXe","TX-DEMO-1"));
        tx.run(em->{assertNull(em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());return null;});
        // Completed ownership remains valid via assignment history if a future workflow clears ma_tx.
        tx.run(em->{em.find(DonHang.class,ORDER).setTaiXe(null);return null;});
        assertEquals("HOAN_TAT",service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT).trangThai());
        assertEquals(count+1,service.events(driver(1),ORDER,0,100).totalElements());
    }
    @Test void everyCurrentStateOnlyAllowsNextStepOrReplay() {
        assigned();
        for (OrderStatus current:List.of(OrderStatus.DA_GAN,OrderStatus.DA_LAY_HANG,OrderStatus.DANG_GIAO,OrderStatus.HOAN_TAT)) {
            for (OrderStatus target:List.of(OrderStatus.DA_LAY_HANG,OrderStatus.DANG_GIAO,OrderStatus.HOAN_TAT)) {
                boolean next=(current==OrderStatus.DA_GAN && target==OrderStatus.DA_LAY_HANG)
                        || (current==OrderStatus.DA_LAY_HANG && target==OrderStatus.DANG_GIAO)
                        || (current==OrderStatus.DANG_GIAO && target==OrderStatus.HOAN_TAT);
                if (next) continue;
                long count=events(ORDER);
                if (target==current) assertEquals(current.name(),service.transition(driver(1),ORDER,target).trangThai());
                else conflict("ORDER_STATE_CONFLICT",()->service.transition(driver(1),ORDER,target));
                assertEquals(count,events(ORDER));
            }
            switch(current) {
                case DA_GAN -> service.transition(driver(1),ORDER,OrderStatus.DA_LAY_HANG);
                case DA_LAY_HANG -> service.transition(driver(1),ORDER,OrderStatus.DANG_GIAO);
                case DANG_GIAO -> service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT);
                default -> { }
            }
        }
        for (OrderStatus invalid:Arrays.asList(null,OrderStatus.CHO_GAN,OrderStatus.DA_GAN,OrderStatus.DA_HUY))
            assertThrows(IllegalArgumentException.class,()->service.transition(driver(1),ORDER,invalid));
        assertThrows(NoSuchElementException.class,()->service.transition(driver(1),"missing",OrderStatus.DA_LAY_HANG));
    }
    @Test void unauthorizedActorsAndSpoofedProfilesCannotReadOrWrite() {
        delivering(); long count=events(ORDER);
        for (var actor:List.of(customer(1),dispatcher())) {
            assertThrows(SecurityException.class,()->service.transition(actor,ORDER,OrderStatus.HOAN_TAT));
            assertThrows(SecurityException.class,()->service.incident(actor,ORDER,IncidentType.TU_CHOI_NHAN,"no"));
        }
        var spoof=new AuthService.User("TK-DEMO-TX-2","Driver",AccountRole.TAI_XE,null,"TX-DEMO-1",null);
        assertThrows(SecurityException.class,()->service.transition(spoof,ORDER,OrderStatus.HOAN_TAT));
        assertThrows(NoSuchElementException.class,()->service.transition(driver(2),ORDER,OrderStatus.HOAN_TAT));
        assertThrows(NoSuchElementException.class,()->service.incident(driver(2),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
        assertThrows(NoSuchElementException.class,()->service.events(driver(2),ORDER,0,20));
        assertThrows(NoSuchElementException.class,()->service.events(customer(2),ORDER,0,20));
        tx.run(em->{em.find(TaiKhoan.class,"TK-DEMO-TX-1").setTrangThai(AccountStatus.KHOA);return null;});
        assertThrows(SecurityException.class,()->service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT));
        assertEquals(count,events(ORDER));
    }
    @Test void incidentsPreserveBusyStateAndPersistTypeReasonActorAndServerTime() {
        assigned();
        conflict("ORDER_STATE_CONFLICT",()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
        service.transition(driver(1),ORDER,OrderStatus.DA_LAY_HANG);
        conflict("ORDER_STATE_CONFLICT",()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
        service.transition(driver(1),ORDER,OrderStatus.DANG_GIAO);
        long count=events(ORDER);
        for (var type:IncidentType.values()) {
            var event=service.incident(driver(1),ORDER,type,"  " + "x".repeat(500) + "  ");
            assertEquals(type,event.loaiSuCo()); assertEquals("x".repeat(500),event.ghiChuSuCo());
            assertEquals(NOW.toString(),event.thoiGianGhiNhan()); assertEquals("DANG_GIAO",event.tenTrangThai());
            tx.run(em->{var saved=em.find(NhatKyTrangThai.class,event.maNhatKy());
                assertEquals(type,saved.getLoaiSuCo());assertEquals("TK-DEMO-TX-1",saved.getTaiKhoanThucHien().getId());return null;});
        }
        assertEquals(count+2,events(ORDER));
        assertEquals("DANG_GIAO",service.order(driver(1),ORDER).trangThai());
        assertNull(service.order(driver(1),ORDER).hoanTatLuc()); assertEquals(1,active("taiXe","TX-DEMO-1"));
        for(String reason:Arrays.asList(null,"","  ","x".repeat(501)))
            assertThrows(IllegalArgumentException.class,()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,reason));
        assertThrows(IllegalArgumentException.class,()->service.incident(driver(1),ORDER,null,"no"));
        service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT);
        conflict("ORDER_STATE_CONFLICT",()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
    }
    @Test void missingOrMismatchedActiveAssignmentRejectsWritesIncludingReplay() {
        delivering();
        tx.run(em->{new DispatchDAO(em).activeOrder(ORDER).setKetThucLuc(NOW);return null;});
        conflict("ORDER_STATE_CONFLICT",()->service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT));
        conflict("ORDER_STATE_CONFLICT",()->service.transition(driver(1),ORDER,OrderStatus.DANG_GIAO));
        conflict("ORDER_STATE_CONFLICT",()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
    }
    @Test void eventPagesAreStableScopedAndValidatePagination() {
        delivering(); service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no");
        var whole=service.events(customer(1),ORDER,0,100);
        var sorted=whole.items().stream().sorted(Comparator.comparing(DispatchService.Event::thoiGianGhiNhan)
                .thenComparing(DispatchService.Event::maNhatKy)).toList();
        assertEquals(sorted,whole.items());
        for(int i=0;i<whole.items().size();i++) {
            var page=service.events(driver(1),ORDER,i,1);
            assertEquals(whole.items().get(i),page.items().getFirst());
            assertEquals(whole.totalElements(),page.totalPages());
        }
        assertTrue(service.events(dispatcher(),ORDER,100,1).items().isEmpty());
        assertThrows(IllegalArgumentException.class,()->service.events(driver(1),ORDER,-1,20));
        assertThrows(IllegalArgumentException.class,()->service.events(driver(1),ORDER,0,101));
        assertThrows(IllegalArgumentException.class,()->service.events(driver(1),ORDER,Integer.MAX_VALUE,100));
    }
    @Test void concurrentReplaysOnlyAppendOneEventAtEachStep() throws Exception {
        assigned();
        for(var target:List.of(OrderStatus.DA_LAY_HANG,OrderStatus.DANG_GIAO,OrderStatus.HOAN_TAT)) {
            long count=events(ORDER);
            var results=race(8,n->service.transition(driver(1),ORDER,target).trangThai());
            assertEquals(8,Collections.frequency(results,target.name())); assertEquals(count+1,events(ORDER));
        }
        assertEquals(0,active("taiXe","TX-DEMO-1"));
    }
    @Test void completionRacingIncidentNeverCreatesIncidentAfterCompletion() throws Exception {
        delivering(); long count=events(ORDER);
        var results=race(2,n->n==0?service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT).trangThai()
                :service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no").tenTrangThai());
        assertTrue(results.contains("HOAN_TAT"));
        assertEquals(count+(results.contains("DANG_GIAO")?2:1),events(ORDER));
        assertEquals(0,active("donHang",ORDER));
    }
    @Test void auditFailureRollsBackCompletionAndIncident() {
        delivering(); long count=events(ORDER); installFailure();
        try {
            auditFailure(()->service.transition(driver(1),ORDER,OrderStatus.HOAN_TAT));
            auditFailure(()->service.incident(driver(1),ORDER,IncidentType.TU_CHOI_NHAN,"no"));
        } finally { removeFailure(); }
        assertEquals(count,events(ORDER)); assertEquals("DANG_GIAO",service.order(driver(1),ORDER).trangThai());
        assertNull(service.order(driver(1),ORDER).hoanTatLuc()); assertEquals(1,active("donHang",ORDER));
        tx.run(em->{assertNull(em.find(TaiXe.class,"TX-DEMO-1").getRanhTu());
            assertNull(new DispatchDAO(em).activeOrder(ORDER).getLyDoKetThuc());return null;});
    }
}
