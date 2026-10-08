package com.miniongvang.service;

import com.miniongvang.integration.RouteFailure;
import com.miniongvang.integration.RouteProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;

public final class RouteService {
    private final RouteProvider provider;
    private final long maxDistanceMeters;

    public RouteService(RouteProvider provider, long maxDistanceMeters) {
        if (provider == null || maxDistanceMeters <= 0) throw new IllegalArgumentException("Invalid route configuration");
        this.provider = provider;
        this.maxDistanceMeters = maxDistanceMeters;
    }

    public Route estimate(String origin, String destination) {
        String start = normalize(origin), end = normalize(destination);
        if (start == null || end == null) throw new IllegalArgumentException("Invalid address");
        if (start.equalsIgnoreCase(end)) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
        RouteProvider.RouteData data = provider.estimate(start, end);
        if (data.distanceMeters() <= 0 || data.durationSeconds() < 0
                || data.origin() == null || data.destination() == null
                || data.origin().isBlank() || data.destination().isBlank()
                || data.origin().length() > 255 || data.destination().length() > 255)
            throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
        if (data.distanceMeters() > maxDistanceMeters)
            throw new RouteFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA);
        String km = BigDecimal.valueOf(data.distanceMeters()).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP).toPlainString();
        return new Route(data.origin(), data.destination(), km, data.durationSeconds(), true, data.source());
    }

    private static String normalize(String raw) {
        if (raw == null) return null;
        String value = raw.strip().replaceAll("\\s+", " ");
        return value.isEmpty() || value.length() > 255 ? null : value;
    }

    public record Route(String diemLayHang, String diemGiaoHang, String quangDuongKm,
                        long thoiGianDuKienGiay, boolean trongPhamVi, String nguon) {}
}
