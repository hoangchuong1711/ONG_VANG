package com.miniongvang.controller;

import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.service.RouteService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebServlet("/api/routes/estimate")
public final class RouteServlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> FIELDS = Set.of("diemLayHang", "diemGiaoHang");

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
        for (String name : body.propertyNames()) {
            if (!FIELDS.contains(name)) { error(resp, 400, "VALIDATION_ERROR"); return; }
        }
        String origin = value(body, "diemLayHang"), destination = value(body, "diemGiaoHang");
        if (origin == null || destination == null) { error(resp, 400, "VALIDATION_ERROR"); return; }
        try {
            RouteService service = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
            send(resp, 200, service.estimate(origin, destination));
        } catch (IllegalArgumentException invalid) {
            error(resp, 400, "VALIDATION_ERROR");
        } catch (RouteFailure failure) {
            int status = switch (failure.kind()) {
                case ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID -> 422;
                case ROUTE_PROVIDER_ERROR -> 502;
                case ROUTE_PROVIDER_TIMEOUT -> 504;
            };
            error(resp, status, failure.kind().name());
        } catch (RuntimeException failure) {
            getServletContext().log("Route estimate failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private static String value(JsonNode body, String name) {
        JsonNode field = body.get(name);
        return field != null && field.isTextual() ? field.textValue() : null;
    }

    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(resp.getOutputStream(), body);
    }

    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        send(resp, status, new ApiError(code, "Không thể thực hiện yêu cầu: " + code,
                new Object[0], UUID.randomUUID().toString()));
    }

    private record ApiError(String code, String message, Object[] fieldErrors, String traceId) {}
}
