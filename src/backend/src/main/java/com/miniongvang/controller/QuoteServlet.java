package com.miniongvang.controller;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;
import com.miniongvang.dto.quote.QuoteDtos.CreateQuote;
import com.miniongvang.web.JsonRequests;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.FareCalculator;
import com.miniongvang.service.QuoteService;
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

@WebServlet("/api/quotes")
public final class QuoteServlet extends HttpServlet {
    private static final Set<String> FIELDS = Set.of("maKh", "diemLayHang", "diemGiaoHang", "kienHang",
            "benThanhToan", "phuongThucThanhToan");
    private static final Set<String> PARCEL_FIELDS = Set.of("loaiHangHoa", "ghiChuBaoQuan", "khoiLuongKg");

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        JsonNode body;
        try { body = JsonRequests.object(req); }
        catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
        if (!fields(body, FIELDS) || !textIfPresent(body, "maKh") || !textIfPresent(body, "diemLayHang")
                || !textIfPresent(body, "diemGiaoHang") || !textIfPresent(body, "benThanhToan")
                || !textIfPresent(body, "phuongThucThanhToan")) {
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
            QuoteService service = new QuoteService(persistence.entityManagerFactory(), routes);
            send(resp, 200, service.create(actor, new CreateQuote(maKh == null ? null : maKh.strip(),
                    value(body, "diemLayHang"), value(body, "diemGiaoHang"), parcels,
                    value(body, "benThanhToan") == null ? "NGUOI_DAT" : value(body, "benThanhToan"),
                    value(body, "phuongThucThanhToan") == null ? "TIEN_MAT" : value(body, "phuongThucThanhToan"))));
        } catch (FareCalculator.WeightLimitExceededException heavy) { error(resp, 422, "WEIGHT_LIMIT_EXCEEDED"); }
        catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
        catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
        catch (NoSuchElementException missing) { error(resp, 404, "RESOURCE_NOT_FOUND"); }
        catch (RouteFailure failure) {
            int status = switch (failure.kind()) {
                case ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID -> 422;
                case ROUTE_PROVIDER_ERROR -> 502;
                case ROUTE_PROVIDER_TIMEOUT -> 504;
                case ROUTE_PROVIDER_QUOTA -> 429;
            };
            error(resp, status, failure.kind().name());
        } catch (com.miniongvang.service.FareCalculator.FareConfigurationException missing) { error(resp, 503, "FARE_CONFIG_MISSING"); }
        catch (RuntimeException failure) {
            getServletContext().log("Quote failed", failure);
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
