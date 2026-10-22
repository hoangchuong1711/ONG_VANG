package com.miniongvang.service;

import com.miniongvang.integration.GoongRouteProvider;
import com.miniongvang.integration.RouteFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Road distances to the order pickup, independent of demo addresses and quote distances. */
public final class DriverSuggestionRouting {
    private DriverSuggestionRouting() {}

    public static void populate(String pickupAddress, List<Map<String, Object>> candidates,
            GoongRouteProvider goong) {
        if (candidates.isEmpty()) return;
        // Geocode exactly once, using the order address, not a matching driver's position.
        var pickup = goong.geocodeAddress(pickupAddress);
        for (var candidate : candidates) {
            candidate.remove("loi_dinh_tuyen");
            candidate.put("km_den_diem_lay", null);
            candidate.put("giay_den_diem_lay", null);
            candidate.put("nguon_dinh_tuyen", "DU_PHONG_RANH_TU");
            Object address = candidate.get("vi_tri_demo_dia_chi");
            if (address == null || address.toString().isBlank()) continue;
            GoongRouteProvider.GeocodedAddress origin;
            try {
                // Resolve the current address, including positions edited directly in demo SQL.
                origin = goong.geocodeAddress(address.toString());
            } catch (RouteFailure failure) {
                candidate.put("loi_dinh_tuyen", failure.kind().name());
                continue;
            }
            try {
                if (origin.latitude().compareTo(pickup.latitude()) == 0
                        && origin.longitude().compareTo(pickup.longitude()) == 0) {
                    candidate.put("km_den_diem_lay", "0.00");
                    candidate.put("giay_den_diem_lay", 0L);
                } else {
                    var route = goong.routeGeometry(origin.latitude().doubleValue(), origin.longitude().doubleValue(),
                            pickup.latitude().doubleValue(), pickup.longitude().doubleValue());
                    candidate.put("km_den_diem_lay", BigDecimal.valueOf(route.meters())
                            .divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP).toPlainString());
                    candidate.put("giay_den_diem_lay", route.seconds());
                }
                candidate.put("nguon_dinh_tuyen", "GOONG");
            } catch (RouteFailure failure) {
                candidate.put("km_den_diem_lay", straightLineKm(origin, pickup));
                candidate.put("nguon_dinh_tuyen", "DEMO_KHOANG_CACH");
                candidate.put("loi_dinh_tuyen", failure.kind().name());
            }
        }
        // Do not rank approximate straight-line distances ahead of verified road routes.
        candidates.sort(Comparator.<Map<String, Object>, Integer>comparing(item ->
                "GOONG".equals(item.get("nguon_dinh_tuyen")) ? 0
                        : item.get("km_den_diem_lay") != null ? 1 : 2)
                .thenComparing(item -> item.get("km_den_diem_lay") == null ? BigDecimal.ZERO
                        : new BigDecimal(item.get("km_den_diem_lay").toString()))
                .thenComparing(item -> String.valueOf(item.get("ranh_tu"))));
    }

    private static String straightLineKm(GoongRouteProvider.GeocodedAddress a,
            GoongRouteProvider.GeocodedAddress b) {
        double lat1 = Math.toRadians(a.latitude().doubleValue());
        double lat2 = Math.toRadians(b.latitude().doubleValue());
        double dLat = lat2 - lat1;
        double dLng = Math.toRadians(b.longitude().doubleValue() - a.longitude().doubleValue());
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2);
        h = Math.min(1, Math.max(0, h));
        return BigDecimal.valueOf(6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)))
                .setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
