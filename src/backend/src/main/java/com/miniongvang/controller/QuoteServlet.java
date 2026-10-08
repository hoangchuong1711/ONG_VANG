package com.miniongvang.controller;

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
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebServlet("/api/quotes")
public final class QuoteServlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> FIELDS = Set.of("maKh", "diemLayHang", "diemGiaoHang", "kienHang");
    private static final Set<String> PARCEL_FIELDS = Set.of("loaiHangHoa", "ghiChuBaoQuan", "khoiLuongKg");

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        if (req.getContentType() == null || !req.getContentType().toLowerCase(java.util.Locale.ROOT).startsWith("application/json")) {
            error(resp, 400, "JSON_INVALID"); return;
        }
        JsonNode body;
        try {
            body = JSON.readTree(req.getInputStream());
            if (body == null || !body.isObject()) { error(resp, 400, "JSON_INVALID"); return; }
        } catch (Exception invalid) { error(resp, 400, "JSON_INVALID"); return; }
        if (!fields(body, FIELDS) || !textIfPresent(body, "maKh") || !textIfPresent(body, "diemLayHang")
                || !textIfPresent(body, "diemGiaoHang")) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        String maKh = value(body, "maKh");
        if (maKh != null && (maKh.isBlank() || maKh.strip().length() > 36)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        JsonNode packages = body.path("kienHang");
        if (!packages.isArray() || packages.isEmpty()) { error(resp, 400, "VALIDATION_ERROR"); return; }
        List<QuoteService.Parcel> parcels = new ArrayList<>();
        for (JsonNode item : packages) {
            if (!item.isObject() || !fields(item, PARCEL_FIELDS)
                    || !textIfPresent(item, "loaiHangHoa") || !textIfPresent(item, "ghiChuBaoQuan")
                    || !textIfPresent(item, "khoiLuongKg")) {
                error(resp, 400, "VALIDATION_ERROR"); return;
            }
            parcels.add(new QuoteService.Parcel(value(item, "loaiHangHoa"), value(item, "ghiChuBaoQuan"),
                    value(item, "khoiLuongKg")));
        }
        try {
            PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            RouteService routes = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
            HttpSession session = req.getSession(false);
            String id = session == null ? null : (String) session.getAttribute("auth.userId");
            AuthService.User actor = id == null ? null : new AuthService(persistence.entityManagerFactory()).current(id);
            QuoteService service = new QuoteService(persistence.entityManagerFactory(), routes);
            send(resp, 200, service.create(actor, maKh == null ? null : maKh.strip(), value(body, "diemLayHang"),
                    value(body, "diemGiaoHang"), parcels));
        } catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
        catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
        catch (NoSuchElementException missing) { error(resp, 404, "RESOURCE_NOT_FOUND"); }
        catch (RouteFailure failure) {
            int status = switch (failure.kind()) {
                case ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID -> 422;
                case ROUTE_PROVIDER_ERROR -> 502;
                case ROUTE_PROVIDER_TIMEOUT -> 504;
            };
            error(resp, status, failure.kind().name());
        } catch (FareCalculator.FareConfigurationException missing) { error(resp, 503, "FARE_CONFIG_MISSING"); }
        catch (RuntimeException failure) {
            getServletContext().log("Quote failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private static boolean fields(JsonNode object, Set<String> allowed) {
        for (String name : object.propertyNames()) if (!allowed.contains(name)) return false;
        return true;
    }
    private static boolean textIfPresent(JsonNode object, String name) {
        JsonNode value = object.get(name);
        return value == null || value.isTextual();
    }
    private static String value(JsonNode object, String name) {
        JsonNode value = object.get(name);
        return value == null ? null : value.textValue();
    }
    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status); resp.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(resp.getOutputStream(), body);
    }
    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        send(resp, status, new ApiError(code, "Không thể thực hiện yêu cầu: " + code,
                new Object[0], UUID.randomUUID().toString()));
    }
    private record ApiError(String code, String message, Object[] fieldErrors, String traceId) {}
}
