package com.miniongvang.controller;

import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.service.RouteService;
import com.miniongvang.dto.route.RouteDtos.EstimateRequest;
import com.miniongvang.web.JsonRequests;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import tools.jackson.databind.JsonNode;

@WebServlet("/api/routes/estimate")
public final class RouteServlet extends HttpServlet {
    private static final Set<String> FIELDS = Set.of("diemLayHang", "diemGiaoHang");

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        JsonNode body;
        try { body = JsonRequests.object(req); }
        catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
        if (!JsonRequests.allowed(body, FIELDS)) { error(resp, 400, "VALIDATION_ERROR"); return; }
        String origin = value(body, "diemLayHang"), destination = value(body, "diemGiaoHang");
        if (origin == null || destination == null) { error(resp, 400, "VALIDATION_ERROR"); return; }
        try {
            RouteService service = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
            send(resp, 200, service.estimate(new EstimateRequest(origin, destination)));
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
        return JsonRequests.text(body, name);
    }

    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        com.miniongvang.web.WebResponses.json(resp, status, body);
    }

    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        com.miniongvang.web.WebResponses.error(resp, status, code);
    }
}
