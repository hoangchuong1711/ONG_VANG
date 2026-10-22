package com.miniongvang.service;

import com.miniongvang.integration.GoongRouteProvider;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DriverSuggestionRoutingTest {
    @Test void routesUnrelatedAddressesAndSeparatesFallbackFromRoadDistance() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger pickupLookups = new AtomicInteger();
        AtomicInteger failure = new AtomicInteger();
        server.createContext("/geocode", e -> {
            String query = URLDecoder.decode(e.getRequestURI().getRawQuery(), StandardCharsets.UTF_8);
            int lat = query.contains("address=pickup") ? 10 : query.contains("address=near") ? 11 : 12;
            if (lat == 10) pickupLookups.incrementAndGet();
            byte[] body = ("{\"results\":[{\"formatted_address\":\"resolved\",\"geometry\":{\"location\":{\"lat\":"
                    + lat + ",\"lng\":106}}}]}").getBytes(StandardCharsets.UTF_8);
            e.sendResponseHeaders(200, body.length); e.getResponseBody().write(body); e.close();
        });
        server.createContext("/direction", e -> {
            String query = URLDecoder.decode(e.getRequestURI().getRawQuery(), StandardCharsets.UTF_8);
            boolean near = query.contains("origin=11.0,106.0");
            int status = failure.get() == 1 && near ? 429 : 200;
            byte[] body = ("{\"routes\":[{\"overview_polyline\":{\"points\":\"abc\"},\"legs\":[{\"distance\":{\"value\":"
                    + (near ? 1500 : 2500) + "},\"duration\":{\"value\":300}}]}]}").getBytes(StandardCharsets.UTF_8);
            e.sendResponseHeaders(status, body.length); e.getResponseBody().write(body); e.close();
        });
        server.start();
        try {
            var provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/"),
                    "test-key", Duration.ofSeconds(2));
            var candidates = new ArrayList<Map<String,Object>>();
            candidates.add(new HashMap<>(Map.of("vi_tri_demo_dia_chi", "far", "ranh_tu", "2026-01-01")));
            candidates.add(new HashMap<>(Map.of("vi_tri_demo_dia_chi", "near", "ranh_tu", "2026-01-02")));
            DriverSuggestionRouting.populate("pickup", candidates, provider);
            assertEquals(1, pickupLookups.get());
            assertEquals("near", candidates.get(0).get("vi_tri_demo_dia_chi"));
            assertEquals("1.50", candidates.get(0).get("km_den_diem_lay"));
            assertEquals("GOONG", candidates.get(0).get("nguon_dinh_tuyen"));
            failure.set(1);
            DriverSuggestionRouting.populate("pickup", candidates, provider);
            assertEquals("far", candidates.get(0).get("vi_tri_demo_dia_chi"));
            assertEquals("DEMO_KHOANG_CACH", candidates.get(1).get("nguon_dinh_tuyen"));
            assertNull(candidates.get(1).get("giay_den_diem_lay"));
        } finally { server.stop(0); }
    }
}
