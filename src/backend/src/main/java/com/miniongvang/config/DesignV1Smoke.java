package com.miniongvang.config;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dto.order.OrderDtos.CreateOrder;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;

import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.IncidentType;
import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.integration.FakeRouteProvider;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.DispatchService;
import com.miniongvang.service.OrderService;
import com.miniongvang.service.QuoteService;
import com.miniongvang.service.RouteService;
import jakarta.persistence.EntityManagerFactory;
import java.util.List;

/** Manual end-to-end check on the isolated designV1 database and demo fixture. */
public final class DesignV1Smoke {
    private DesignV1Smoke() {}

    public static void run(EntityManagerFactory factory) {
        var route = new RouteService(new FakeRouteProvider(), 30_000);
        var customer = new ActorContext("TK-DEMO-KH-1", "Khách thường",
                AccountRole.KHACH_HANG, "KH-DEMO-1", null);
        var dispatcher = new ActorContext("TK-DEMO-NV", "Tổng đài demo",
                AccountRole.TONG_DAI, null, null);
        var driver = new ActorContext("TK-DEMO-TX-1", "Tài xế demo 1",
                AccountRole.TAI_XE, null, "TX-DEMO-1");
        var parcel = new Parcel("Tài liệu", null, "1.00");
        var quote = new QuoteService(factory, route).create(customer, null,
                "Quận 1", "Quận 3", List.of(parcel));
        var order = new OrderService(factory, route).create(customer, "design-v1-smoke-1",
                new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
                        "0900000000", null, List.of(parcel)));
        var dispatch = new DispatchService(factory);
        var current = dispatch.order(customer, order.maDon());
        if (OrderStatus.HOAN_TAT.name().equals(current.trangThai())) {
            System.out.println("designV1 smoke order already completed");
            return;
        }
        if (!OrderStatus.CHO_GAN.name().equals(current.trangThai()))
            throw new IllegalStateException("Unexpected smoke order state: " + current.trangThai());
        var suggested = dispatch.suggestions(dispatcher, order.maDon(), 0, 10);
        if (suggested.items().stream().noneMatch(item -> "TX-DEMO-1".equals(item.maTx())))
            throw new IllegalStateException("Eligible demo driver not suggested");
        dispatch.assign(dispatcher, order.maDon(), "TX-DEMO-1");
        dispatch.transition(driver, order.maDon(), OrderStatus.DA_LAY_HANG);
        dispatch.transition(driver, order.maDon(), OrderStatus.DANG_GIAO);
        dispatch.incident(driver, order.maDon(), IncidentType.KHONG_LIEN_LAC_DUOC, "Chưa liên lạc được");
        var completed = dispatch.transition(driver, order.maDon(), OrderStatus.HOAN_TAT);
        if (!OrderStatus.HOAN_TAT.name().equals(completed.trangThai())
                || dispatch.events(customer, order.maDon(), 0, 20).items().size() != 6)
            throw new IllegalStateException("DesignV1 smoke lifecycle did not complete");
        System.out.println("designV1 quote -> create -> assign -> deliver -> complete succeeded");
    }
}
