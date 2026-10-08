package com.miniongvang.route;

import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.FakeRouteProvider;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.integration.RouteProvider;
import com.miniongvang.service.RouteService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RouteServiceTest {
    @Test void fixedRoutesAndAddressNormalization() {
        RouteService service = RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "fake"));
        RouteService.Route route = service.estimate("  QUẬN   1, TP.HCM  ", "  điểm mẫu b ");
        assertEquals("Quận 1, TP.HCM", route.diemLayHang());
        assertEquals("Quận 3, TP.HCM", route.diemGiaoHang());
        assertEquals("5.00", route.quangDuongKm());
        assertEquals(900, route.thoiGianDuKienGiay());
        assertEquals("GIA_LAP", route.nguon());
        assertTrue(route.trongPhamVi());
        assertEquals("5.40", service.estimate("Quận 3", "Quận 1").quangDuongKm());
    }

    @Test void rejectsBadAddressesAndOutOfArea() {
        RouteService service = RouteConfiguration.from(Map.of());
        assertThrows(IllegalArgumentException.class, () -> service.estimate(" ", "Quận 3"));
        assertThrows(IllegalArgumentException.class, () -> service.estimate("a".repeat(256), "Quận 3"));
        assertFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND, () -> service.estimate("Không có", "Quận 3"));
        assertFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA, () -> service.estimate("Hà Nội", "Quận 3"));
        assertFailure(RouteFailure.Kind.DISTANCE_INVALID, () -> service.estimate("Quận 1", "Điểm mẫu A"));
        RouteService shortRange = RouteConfiguration.from(Map.of("ROUTE_MAX_DISTANCE_KM", "4"));
        assertFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA,
                () -> shortRange.estimate("Quận 1", "Quận 3"));
    }

    @Test void controlledProviderErrorsAndConfiguration() {
        assertFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT,
                () -> new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.TIMEOUT), 30_000)
                        .estimate("Quận 1", "Quận 3"));
        assertFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR,
                () -> new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.ERROR), 30_000)
                        .estimate("Quận 1", "Quận 3"));
        assertThrows(IllegalArgumentException.class,
                () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "goong")));
        assertThrows(IllegalArgumentException.class,
                () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "unknown")));
        assertThrows(IllegalArgumentException.class,
                () -> RouteConfiguration.from(Map.of("ROUTE_MAX_DISTANCE_KM", "0")));
        assertThrows(IllegalArgumentException.class,
                () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "goong", "GOONG_API_KEY", "test", "GOONG_TIMEOUT_MS", "0")));
    }

    @Test void providerResultsAreValidatedBeforePublishing() {
        RouteProvider malformed = (a, b) -> new RouteProvider.RouteData(a, b, 0, 20, "TEST");
        assertFailure(RouteFailure.Kind.DISTANCE_INVALID,
                () -> new RouteService(malformed, 30_000).estimate("A", "B"));
    }

    private static void assertFailure(RouteFailure.Kind kind, Runnable call) {
        assertEquals(kind, assertThrows(RouteFailure.class, call::run).kind());
    }
}
