package com.miniongvang.service;

import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.dao.DesignV2DispatchDAO;
import com.miniongvang.dto.route.RouteDtos.Route;
import com.miniongvang.integration.GoongRouteProvider;
import com.miniongvang.integration.RouteFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Driver availability, position, vehicle, and dispatch read/write use cases. */
public final class DesignV2DispatchService {
    private final DesignV2DispatchDAO dispatch;

    public DesignV2DispatchService() { this(new DesignV2DispatchDAO()); }
    public DesignV2DispatchService(DesignV2DispatchDAO dispatch) { this.dispatch = dispatch; }

    public List<Map<String, Object>> findCompanyDrivers(Connection c) throws SQLException { return dispatch.findCompanyDrivers(c); }
    public List<Map<String, Object>> findDispatcherDrivers(Connection c) throws SQLException { return dispatch.findDispatcherDrivers(c); }
    public Map<String, Object> findDriverForAccount(Connection c, String id) throws SQLException {
        return dispatch.findDriverForAccount(c, id);
    }
    public Map<String, Object> changeAvailability(Connection c, String id, boolean online) throws SQLException {
        return dispatch.changeAvailability(c, id, online);
    }
    public String findOrderPickup(Connection c, String id) throws SQLException { return dispatch.findOrderPickup(c, id); }
    public List<Map<String, Object>> findDriverSuggestionCandidates(Connection c, String id) throws SQLException {
        return dispatch.findDriverSuggestionCandidates(c, id);
    }
    public boolean saveDriverPosition(Connection c, String id, String address, BigDecimal latitude, BigDecimal longitude)
            throws SQLException { return dispatch.saveDriverPosition(c, id, address, latitude, longitude); }
    public Map<String, Object> findAssignedDriverRoute(Connection c, String orderId, String accountId) throws SQLException {
        return dispatch.findAssignedDriverRoute(c, orderId, accountId);
    }
    public List<Map<String, Object>> findVehicles(Connection c) throws SQLException { return dispatch.findVehicles(c); }
    public void manageVehicle(Connection c, String action, String driverId, String plate, String type,
            String color, boolean active) throws SQLException { dispatch.manageVehicle(c, action, driverId, plate, type, color, active); }
    public List<Map<String, Object>> findVehicleRows(Connection c) throws SQLException { return dispatch.findVehicleRows(c); }

    public List<Map<String, Object>> suggestDrivers(Connection c, String orderId) throws Exception {
        String pickup = dispatch.findOrderPickup(c, orderId);
        if (pickup == null) throw new DesignV2Problem(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn hàng");
        List<Map<String, Object>> candidates = dispatch.findDriverSuggestionCandidates(c, orderId);
        RouteService routes = RouteConfiguration.fromEnvironment();
        Double pickupLat = null, pickupLng = null;
        for (Map<String, Object> candidate : candidates) {
            if (pickup.equalsIgnoreCase(String.valueOf(candidate.get("vi_tri_demo_dia_chi")))
                    && number(candidate.get("vi_tri_demo_lat")) != null
                    && number(candidate.get("vi_tri_demo_lng")) != null) {
                pickupLat = number(candidate.get("vi_tri_demo_lat"));
                pickupLng = number(candidate.get("vi_tri_demo_lng"));
                break;
            }
        }
        boolean routed = false;
        for (Map<String, Object> candidate : candidates) {
            String address = candidate.get("vi_tri_demo_dia_chi") == null
                    ? null : String.valueOf(candidate.get("vi_tri_demo_dia_chi"));
            if (address == null || address.isBlank()) {
                candidate.put("km_den_diem_lay", null);
                candidate.put("giay_den_diem_lay", null);
                candidate.put("nguon_dinh_tuyen", "DU_PHONG_RANH_TU");
                continue;
            }
            try {
                if (address.strip().equalsIgnoreCase(pickup.strip())) {
                    candidate.put("km_den_diem_lay", "0.00");
                    candidate.put("giay_den_diem_lay", 0);
                    candidate.put("nguon_dinh_tuyen", "GOONG");
                } else {
                    Route route = routes.estimate(address, pickup);
                    candidate.put("km_den_diem_lay", route.quangDuongKm());
                    candidate.put("giay_den_diem_lay", route.thoiGianDuKienGiay());
                    candidate.put("nguon_dinh_tuyen", route.nguon());
                }
                routed = true;
            } catch (RouteFailure | IllegalArgumentException failure) {
                Double lat = number(candidate.get("vi_tri_demo_lat"));
                Double lng = number(candidate.get("vi_tri_demo_lng"));
                if (pickupLat != null && lat != null && lng != null) {
                    candidate.put("km_den_diem_lay", straightLineKm(lat, lng, pickupLat, pickupLng));
                    candidate.put("giay_den_diem_lay", null);
                    candidate.put("nguon_dinh_tuyen", "DEMO_KHOANG_CACH");
                    routed = true;
                } else {
                    candidate.put("km_den_diem_lay", null);
                    candidate.put("giay_den_diem_lay", null);
                    candidate.put("nguon_dinh_tuyen", "DU_PHONG_RANH_TU");
                }
            }
        }
        if (routed) candidates.sort(Comparator.comparing(
                item -> item.get("km_den_diem_lay") == null
                        ? new BigDecimal("999999") : new BigDecimal(String.valueOf(item.get("km_den_diem_lay")))));
        else candidates.sort(Comparator.comparing(item -> String.valueOf(item.get("ranh_tu"))));
        return candidates;
    }

    public Map<String, Object> configurePosition(Connection c, String driverId, String address) throws Exception {
        if (address == null || address.isBlank() || address.length() > 255)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Địa chỉ vị trí không hợp lệ");
        GoongRouteProvider goong = goongProvider();
        GoongRouteProvider.GeocodedAddress location = goong.geocodeAddress(address.strip());
        if (!dispatch.saveDriverPosition(c, driverId, location.address(), location.latitude(), location.longitude()))
            throw new DesignV2Problem(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài xế");
        return Map.of("maTx", driverId, "diaChi", location.address(), "lat", location.latitude(),
                "lng", location.longitude(), "nguon", "DEMO_CO_DINH");
    }

    public Map<String, Object> driverRoute(Connection c, String accountId, String orderId) throws Exception {
        Map<String, Object> route = dispatch.findAssignedDriverRoute(c, orderId, accountId);
        if (route == null) throw new DesignV2Problem(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn được phân công");
        if (route.get("vi_tri_demo_lat") == null || route.get("vi_tri_demo_lng") == null)
            throw new DesignV2Problem(409, "DEMO_POSITION_MISSING", "Tài xế chưa có địa chỉ cố định");
        GoongRouteProvider goong = goongProvider();
        GoongRouteProvider.GeocodedAddress pickup = goong.geocodeAddress(route.get("diem_lay").toString());
        GoongRouteProvider.GeocodedAddress dropoff = goong.geocodeAddress(route.get("diem_giao").toString());
        GoongRouteProvider.Geometry toPickup = goong.routeGeometry(
                Double.parseDouble(route.get("vi_tri_demo_lat").toString()),
                Double.parseDouble(route.get("vi_tri_demo_lng").toString()),
                pickup.latitude().doubleValue(), pickup.longitude().doubleValue());
        GoongRouteProvider.Geometry toDropoff = goong.routeGeometry(
                pickup.latitude().doubleValue(), pickup.longitude().doubleValue(),
                dropoff.latitude().doubleValue(), dropoff.longitude().doubleValue());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taiXe", Map.of("diaChi", route.get("vi_tri_demo_dia_chi"), "lat", route.get("vi_tri_demo_lat"),
                "lng", route.get("vi_tri_demo_lng"), "nguon", "DEMO_CO_DINH"));
        result.put("diemLay", Map.of("diaChi", pickup.address(), "lat", pickup.latitude(), "lng", pickup.longitude(), "nguon", "GOONG"));
        result.put("diemGiao", Map.of("diaChi", dropoff.address(), "lat", dropoff.latitude(), "lng", dropoff.longitude(), "nguon", "GOONG"));
        result.put("denDiemLay", mapLeg(toPickup));
        result.put("denDiemGiao", mapLeg(toDropoff));
        result.put("nguon", "GOONG");
        return result;
    }

    private static GoongRouteProvider goongProvider() {
        String key = System.getenv("GOONG_API_KEY");
        if (key == null || key.isBlank())
            throw new DesignV2Problem(503, "ROUTE_PROVIDER_ERROR", "Chưa cấu hình dịch vụ bản đồ");
        return new GoongRouteProvider(key, Duration.ofMillis(
                Long.parseLong(System.getenv().getOrDefault("GOONG_TIMEOUT_MS", "5000"))),
                System.getenv().getOrDefault("GOONG_VEHICLE", "car"));
    }

    private static String straightLineKm(double lat1, double lng1, double lat2, double lng2) {
        double earthRadiusKm = 6371.0088;
        double dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return BigDecimal.valueOf(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
                .setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static Double number(Object value) {
        if (value == null) return null;
        try { return Double.valueOf(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private static Map<String, Object> mapLeg(GoongRouteProvider.Geometry leg) {
        return Map.of("polyline", leg.polyline(), "quangDuongKm",
                BigDecimal.valueOf(leg.meters()).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP).toPlainString(),
                "thoiGianDuKienGiay", leg.seconds(), "nguon", "GOONG");
    }
}
