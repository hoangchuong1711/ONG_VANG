package com.miniongvang.controller;
import com.miniongvang.dto.auth.AuthDtos.User;
import com.miniongvang.dto.order.OrderDtos.CreateOrder;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;
import com.miniongvang.web.JsonRequests;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.FareCalculator;
import com.miniongvang.service.QuoteService;
import com.miniongvang.service.OrderService;
import com.miniongvang.service.RouteService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import tools.jackson.databind.JsonNode;

@WebServlet("/api/orders")
public final class OrderServlet extends HttpServlet {
    private static final Set<String> FIELDS = Set.of("maBaoGia", "maKh", "diemLayHang", "diemGiaoHang", "sdtNguoiNhan", "ghiChuGiaoHang", "kienHang");
    private static final Set<String> PARCEL_FIELDS = Set.of("loaiHangHoa", "ghiChuBaoQuan", "khoiLuongKg");

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        com.miniongvang.web.DispatchEndpoint.handle(req,resp);
    }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        JsonNode body;
        try { body = JsonRequests.object(req); }
        catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
        if (!fields(body, FIELDS) || !textIfPresent(body, "maKh") || !textIfPresent(body, "diemLayHang")
                || !textIfPresent(body, "diemGiaoHang") || !textIfPresent(body, "maBaoGia")
                || !textIfPresent(body, "sdtNguoiNhan") || !textIfPresent(body, "ghiChuGiaoHang")) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        String maKh = value(body, "maKh");
        if (maKh != null && (maKh.isBlank() || maKh.strip().length() > 36)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        JsonNode packages = body.path("kienHang");
        if (!packages.isArray() || packages.isEmpty()) { error(resp, 400, "VALIDATION_ERROR"); return; }
        List<Parcel> parcels = new ArrayList<>();
        for (JsonNode item : packages) {
            if (!item.isObject() || !fields(item, PARCEL_FIELDS)
                    || !textIfPresent(item, "loaiHangHoa") || !textIfPresent(item, "ghiChuBaoQuan")
                    || !textIfPresent(item, "khoiLuongKg")) {
                error(resp, 400, "VALIDATION_ERROR"); return;
            }
            parcels.add(new Parcel(value(item, "loaiHangHoa"), value(item, "ghiChuBaoQuan"),
                    value(item, "khoiLuongKg")));
        }
        try {
            PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            RouteService routes = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
            HttpSession session = req.getSession(false);
            String id = session == null ? null : (String) session.getAttribute("auth.userId");
            com.miniongvang.security.ActorContext actor = id == null ? null : new AuthService(persistence.entityManagerFactory()).currentActor(id);
            OrderService service = new OrderService(persistence.entityManagerFactory(), routes);
            send(resp, 201, service.create(actor, req.getHeader("Idempotency-Key"),
                    new CreateOrder(value(body, "maBaoGia"), maKh == null ? null : maKh.strip(),
                            value(body, "diemLayHang"), value(body, "diemGiaoHang"), value(body, "sdtNguoiNhan"),
                            value(body, "ghiChuGiaoHang"), parcels)));
        } catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
        catch (OrderService.Conflict conflict) { error(resp, 409, conflict.getMessage()); }
        catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
        catch (NoSuchElementException missing) { error(resp, 404, "RESOURCE_NOT_FOUND"); }
        catch (RouteFailure failure) {
            int status = switch (failure.kind()) {
                case ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID -> 422;
                case ROUTE_PROVIDER_ERROR -> 502;
                case ROUTE_PROVIDER_TIMEOUT -> 504;
            };
            error(resp, status, failure.kind().name());
        } catch (com.miniongvang.service.FareCalculator.FareConfigurationException missing) { error(resp, 503, "FARE_CONFIG_MISSING"); }
        catch (RuntimeException failure) {
            getServletContext().log("Order creation failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private static boolean fields(JsonNode object, Set<String> allowed) {
        return JsonRequests.allowed(object, allowed);
    }
    private static boolean textIfPresent(JsonNode object, String name) {
        return JsonRequests.textIfPresent(object, name);
    }
    private static String value(JsonNode object, String name) {
        return JsonRequests.text(object, name);
    }
    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        com.miniongvang.web.WebResponses.json(resp, status, body);
    }
    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        com.miniongvang.web.WebResponses.error(resp, status, code);
    }
}
