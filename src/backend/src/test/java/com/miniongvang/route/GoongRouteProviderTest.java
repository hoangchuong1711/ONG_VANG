package com.miniongvang.route;

import com.miniongvang.integration.GoongRouteProvider;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.integration.RouteProvider;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GoongRouteProviderTest {
    @Test void convertsGeocodeAndDirectionResponsesWithoutRealApiKey() throws Exception {
        AtomicInteger geocodes = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v2/geocode", exchange -> {
            geocodes.incrementAndGet();
            assertTrue(exchange.getRequestURI().getRawQuery().contains("api_key=test-key"));
            reply(exchange, 200, """
                    {"results":[{"formatted_address":"Quận 1, TP.HCM","geometry":{"location":{"lat":10.77,"lng":106.7}}}]}
                    """);
        });
        server.createContext("/v2/direction", exchange -> {
            assertTrue(exchange.getRequestURI().getRawQuery().contains("vehicle=car"));
            reply(exchange, 200, """
                    {"routes":[{"legs":[{"distance":{"value":2828},"duration":{"value":615}}]}]}
                    """);
        });
        server.start();
        try {
            RouteProvider provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            RouteProvider.RouteData route = provider.estimate("Quận 1", "Quận 3");
            assertEquals(2, geocodes.get());
            assertEquals(2828, route.distanceMeters());
            assertEquals(615, route.durationSeconds());
            assertEquals("GOONG", route.source());
        } finally { server.stop(0); }
    }

    @Test void missingGeocodeAndHttpFailureUseStableCodes() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger status = new AtomicInteger(200);
        server.createContext("/v2/geocode", exchange ->
                reply(exchange, status.get(), status.get() == 200 ? "{\"results\":[]}" : "error"));
        server.start();
        try {
            RouteProvider provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            assertEquals(RouteFailure.Kind.ADDRESS_NOT_FOUND,
                    assertThrows(RouteFailure.class, () -> provider.estimate("A", "B")).kind());
            status.set(503);
            assertEquals(RouteFailure.Kind.ROUTE_PROVIDER_ERROR,
                    assertThrows(RouteFailure.class, () -> provider.estimate("A", "B")).kind());
        } finally { server.stop(0); }
    }

    @Test void returnsPolylineAndLegMetricsForDriverMap() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v2/direction", exchange -> reply(exchange, 200, """
                {"routes":[{"overview_polyline":{"points":"_p~iF~ps|U_ulLnnqC_mqNvxq`@"},
                "legs":[{"distance":{"value":4200},"duration":{"value":720}}]}]}
                """));
        server.start();
        try {
            var provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            var leg = provider.routeGeometry(10.77,106.7,10.78,106.71);
            assertEquals("_p~iF~ps|U_ulLnnqC_mqNvxq`@",leg.polyline());
            assertEquals(4200,leg.meters());
            assertEquals(720,leg.seconds());
        } finally { server.stop(0); }
    }

    @Test void disambiguatesLegacyDemoAndRejectsWrongStreetInsteadOfFirstResult() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v2/geocode", exchange -> {
            String query = java.net.URLDecoder.decode(exchange.getRequestURI().getRawQuery(), StandardCharsets.UTF_8);
            assertTrue(query.contains("Quận 5"));
            reply(exchange, 200, """
                {"results":[
                  {"formatted_address":"227 Nguyễn Văn Cừ, Bình Dương","geometry":{"location":{"lat":11.3,"lng":106.7}}},
                  {"formatted_address":"227 Nguyễn Văn Cừ, Quận 5, Hồ Chí Minh","geometry":{"location":{"lat":10.76,"lng":106.68}}}
                ]}
                """);
        });
        server.start();
        try {
            var provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            var point = provider.geocodeAddress("227 Nguyễn Văn Cừ, TP.HCM,");
            assertEquals(10.76, point.latitude().doubleValue());
            assertTrue(point.address().contains("Quận 5"));
        } finally { server.stop(0); }
    }

    @Test void refusesNumberedAddressWhenOnlyAnotherStreetIsReturned() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v2/geocode", exchange -> reply(exchange, 200, """
            {"results":[{"formatted_address":"12 Đường Khác, Hồ Chí Minh",
              "geometry":{"location":{"lat":10.77,"lng":106.7}}}]}
            """));
        server.start();
        try {
            var provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            assertEquals(RouteFailure.Kind.ADDRESS_NOT_FOUND,
                    assertThrows(RouteFailure.class, () -> provider.geocodeAddress("69 Ngô Tất Tố, Hồ Chí Minh")).kind());
        } finally { server.stop(0); }
    }

    @Test void retriesNewWardNameWithoutPostalSuffixAndMatchesAlleyHouseFormatting() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger calls = new AtomicInteger();
        server.createContext("/v2/geocode", exchange -> {
            calls.incrementAndGet();
            String query = java.net.URLDecoder.decode(exchange.getRequestURI().getRawQuery(), StandardCharsets.UTF_8);
            assertFalse(query.contains("72300"));
            assertFalse(query.contains("Việt Nam"));
            if (query.contains("Gia Định")) {
                reply(exchange, 200, "{\"results\":[]}");
            } else {
                reply(exchange, 200, """
                    {"results":[
                      {"formatted_address":"162/4 Điện Biên Phủ, Hồ Chí Minh","geometry":{"location":{"lat":10.8,"lng":106.7}}},
                      {"formatted_address":"162/4 B Điện Biên Phủ, Bình Thạnh, Hồ Chí Minh","geometry":{"location":{"lat":10.79,"lng":106.71}}}
                    ]}
                    """);
            }
        });
        server.start();
        try {
            var provider = new GoongRouteProvider(HttpClient.newHttpClient(),
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v2/"),
                    "test-key", Duration.ofSeconds(2));
            var point = provider.geocodeAddress("162/4B Điện Biên Phủ, Gia Định, Hồ Chí Minh 72300, Việt Nam");
            assertEquals(2, calls.get());
            assertEquals(10.79, point.latitude().doubleValue());
            assertTrue(point.address().contains("162/4 B"));
        } finally { server.stop(0); }
    }

    private static void reply(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }
}
