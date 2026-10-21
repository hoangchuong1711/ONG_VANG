package com.miniongvang.service;

import com.miniongvang.dao.DesignV2OrderDAO;
import com.miniongvang.dto.route.RouteDtos.Route;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Order and quote use cases for DesignV2. Persistence is delegated to DesignV2OrderDAO. */
public final class DesignV2OrderService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> ORDER_STATUSES = Set.of(
            "CHO_GAN", "DA_GAN", "DA_LAY_HANG", "DANG_GIAO", "HOAN_TAT", "DA_HUY");
    private final DesignV2OrderDAO orders;

    public DesignV2OrderService() { this(new DesignV2OrderDAO()); }

    public DesignV2OrderService(DesignV2OrderDAO orders) { this.orders = orders; }

    public Map<String, Object> quote(Connection connection, JsonNode data, String accountId, String role,
                                     RouteService routes) throws Exception {
        Route route = routes.estimate(required(data, "diemLay"), required(data, "diemGiao"));
        String customer = customerId(connection, data, accountId, role);
        JsonNode parcels = data.path("kienHang");
        if (!parcels.isArray() || parcels.isEmpty())
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Cần ít nhất một kiện hàng");
        BigDecimal weight = BigDecimal.ZERO;
        for (JsonNode parcel : parcels) {
            String type = required(parcel, "loaiHang");
            if (type.length() > 100) throw new DesignV2Problem(400, "VALIDATION_ERROR", "Loại hàng quá dài");
            BigDecimal kg = new BigDecimal(required(parcel, "kg"));
            if (kg.signum() <= 0) throw new DesignV2Problem(400, "VALIDATION_ERROR", "Khối lượng không hợp lệ");
            weight = weight.add(kg);
        }
        BigDecimal km = new BigDecimal(route.quangDuongKm());
        List<Map<String, Object>> fares = orders.findActiveFares(connection);
        if (fares.size() != 1)
            throw new DesignV2Problem(503, "FARE_CONFIG_MISSING", "Cần đúng một biểu phí hiệu lực");
        Map<String, Object> fare = fares.get(0);
        if (km.compareTo(decimal(fare, "km_toi_thieu")) < 0
                || km.compareTo(decimal(fare, "km_toi_da")) > 0
                || weight.compareTo(decimal(fare, "kg_toi_da")) > 0)
            throw new DesignV2Problem(422, "OUT_OF_SERVICE_AREA", "Đơn ngoài phạm vi km/kg");
        Map<String, Object> values = orders.calculateFare(connection, decimal(fare, "cuoc_co_ban"), km,
                decimal(fare, "don_gia_km"), weight, decimal(fare, "kg_bao_gom"), decimal(fare, "don_gia_kg"));
        BigDecimal kmFare = decimal(values, "cuoc_km"), kgFare = decimal(values, "cuoc_kg");

        List<String> optional = optionalSurcharges(data);
        if (new HashSet<>(optional).size() != optional.size())
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Phụ thu được chọn trùng");
        BigDecimal surcharge = BigDecimal.ZERO;
        Set<String> matchedOptional = new HashSet<>(), selectedTypes = new HashSet<>();
        for (Map<String, Object> item : orders.findActiveSurcharges(connection)) {
            boolean mandatory = Boolean.TRUE.equals(item.get("bat_buoc"));
            String id = item.get("ma_phu_thu").toString();
            if (optional.contains(id) && mandatory)
                throw new DesignV2Problem(400, "VALIDATION_ERROR", "Không chọn phụ thu bắt buộc như tùy chọn");
            if (mandatory || optional.contains(id)) {
                if (!selectedTypes.add(item.get("ma_loai").toString()))
                    throw new DesignV2Problem(409, "SURCHARGE_CONFLICT", "Phụ thu trùng loại");
                surcharge = surcharge.add(decimal(item, "so_tien"));
                if (!mandatory) matchedOptional.add(id);
            }
        }
        if (matchedOptional.size() != optional.size())
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Phụ thu tùy chọn không hiệu lực");

        BigDecimal discount = BigDecimal.ZERO;
        Map<String, Object> tier = orders.findActiveMembership(connection, customer);
        if (tier != null && !"THUONG".equals(tier.get("ma_hang"))) {
            List<Map<String, Object>> membershipPolicies = orders.findActiveMembershipDiscount(
                    connection, tier.get("ma_hang").toString());
            if (membershipPolicies.size() != 1)
                throw new DesignV2Problem(503, "MEMBERSHIP_POLICY_MISSING", "Cần đúng một chính sách thành viên");
            BigDecimal percent = decimal(membershipPolicies.get(0), "ty_le_giam");
            discount = kmFare.add(kgFare).add(surcharge).multiply(percent)
                    .divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("maKh", customer);
        result.put("diemLay", route.diemLayHang());
        result.put("diemGiao", route.diemGiaoHang());
        result.put("km", route.quangDuongKm());
        result.put("giay", route.thoiGianDuKienGiay());
        result.put("nguon", "FAKE".equals(route.nguon()) ? "DEMO" : "GOONG");
        result.put("cuocKm", kmFare.toPlainString());
        result.put("cuocKg", kgFare.toPlainString());
        result.put("phuThu", surcharge.toPlainString());
        result.put("giamGia", discount.toPlainString());
        result.put("tongCuoc", kmFare.add(kgFare).add(surcharge).subtract(discount).toPlainString());
        return result;
    }

    public Map<String, Object> create(Connection connection, JsonNode data, String accountId, String role,
            String idempotencyKey, RouteService routes) throws Exception {
        String agreed = required(data, "giaDaDongY");
        String customer = customerId(connection, data, accountId, role);
        List<Map<String, Object>> parcels = new ArrayList<>();
        int index = 1;
        for (JsonNode item : data.path("kienHang"))
            parcels.add(Map.of("thu_tu", index++, "loai_hang", required(item, "loaiHang"), "kg", required(item, "kg")));
        List<String> surcharges = optionalSurcharges(data);
        String parcelsJson = JSON.writeValueAsString(parcels);
        String surchargeJson = JSON.writeValueAsString(surcharges);
        String requestContent = JSON.writeValueAsString(List.of(customer, required(data, "diemLay"),
                required(data, "diemGiao"), required(data, "tenNguoiNhan"), required(data, "sdtNguoiNhan"),
                parcels, surcharges));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(requestContent.getBytes(StandardCharsets.UTF_8));
        Map<String, Object> existing = orders.findExistingOrder(connection, accountId, idempotencyKey);
        if (existing != null) {
            if (!Arrays.equals(hash, (byte[]) existing.get("hash_yeu_cau")))
                throw new DesignV2Problem(409, "IDEMPOTENCY_CONFLICT", "Khóa tạo đơn đã dùng cho nội dung khác");
            return findOrder(connection, existing.get("ma_don").toString());
        }
        Map<String, Object> preview = quote(connection, data, accountId, role, routes);
        String createdId = orders.createOrder(connection, preview.get("maKh").toString(), idempotencyKey, hash,
                preview.get("diemLay").toString(), preview.get("diemGiao").toString(),
                required(data, "tenNguoiNhan"), required(data, "sdtNguoiNhan"),
                decimal(preview, "km"), Integer.parseInt(preview.get("giay").toString()),
                preview.get("nguon").toString(), parcelsJson, surchargeJson, new BigDecimal(agreed));
        if (createdId == null) throw new SQLException("Order procedure returned no ID");
        return findOrder(connection, createdId);
    }

    public Map<String, Object> findOrders(Connection connection, String status, int page, int size) throws SQLException {
        validatePage(page, size);
        if (status != null && !ORDER_STATUSES.contains(status))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Trạng thái đơn không hợp lệ");
        DesignV2OrderDAO.OrderPage result = orders.findOrderPage(connection, status, page, size);
        addAssignments(connection, result.items());
        return Map.of("items", result.items(), "totalElements", result.total(),
                "totalPages", (result.total() + size - 1) / size, "page", page, "size", size);
    }

    public Map<String, Object> findAdminOrders(Connection connection, String status, String search, int page, int size) throws SQLException {
        validatePage(page, size);
        if (status != null && !ORDER_STATUSES.contains(status))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Trạng thái đơn không hợp lệ");
        DesignV2OrderDAO.OrderPage result = orders.findAdminOrderPage(connection, status, search, page, size);
        addAssignments(connection, result.items());
        return Map.of("items", result.items(), "total", result.total(), "page", page, "size", size);
    }

    public Map<String, Object> findOrder(Connection connection, String id) throws SQLException {
        Map<String, Object> found = orders.findOrder(connection, id);
        if (found == null) throw new DesignV2Problem(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn");
        found.put("phan_cong", orders.findAssignment(connection, found.get("ma_don")));
        found.put("kien_hang", orders.findParcels(connection, id));
        found.put("nhat_ky", orders.findOrderEvents(connection, id));
        found.put("lich_su_phan_cong", orders.findAssignmentHistory(connection, id));
        return found;
    }

    public void assign(Connection connection, String orderId, String driverId) throws SQLException {
        orders.assign(connection, orderId, driverId);
    }

    public void progress(Connection connection, String orderId, String action, String note) throws SQLException {
        orders.progress(connection, orderId, action, note);
    }

    public void complete(Connection connection, String orderId, boolean collectionConfirmed) throws SQLException {
        if (!collectionConfirmed)
            throw new DesignV2Problem(400, "COLLECTION_CONFIRMATION_REQUIRED",
                    "Cần xác nhận đã giao và thu đủ cước");
        orders.complete(connection, orderId);
    }

    public void cancel(Connection connection, String orderId, String reason) throws SQLException {
        orders.cancel(connection, orderId, reason);
    }

    private String customerId(Connection connection, JsonNode data, String accountId, String role) throws SQLException {
        if ("KHACH_HANG".equals(role)) {
            String customer = orders.findCustomerIdForAccount(connection, accountId);
            if (customer == null) throw new DesignV2Problem(403, "FORBIDDEN", "Thiếu hồ sơ khách hàng");
            return customer;
        }
        return required(data, "maKh");
    }

    private static List<String> optionalSurcharges(JsonNode data) {
        JsonNode input = data.path("phuThuIds");
        List<String> ids = new ArrayList<>();
        if (input.isMissingNode()) return ids;
        if (!input.isArray()) throw new DesignV2Problem(400, "VALIDATION_ERROR", "phuThuIds phải là mảng");
        for (JsonNode item : input) ids.add(UUID.fromString(item.asText()).toString());
        ids.sort(String::compareTo);
        return ids;
    }

    private void addAssignments(Connection connection, List<Map<String, Object>> items) throws SQLException {
        for (Map<String, Object> item : items)
            item.put("phan_cong", orders.findAssignment(connection, item.get("ma_don")));
    }

    private static void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Phân trang không hợp lệ");
    }

    private static BigDecimal decimal(Map<String, Object> row, String key) {
        return new BigDecimal(row.get(key).toString());
    }

    private static String required(JsonNode data, String key) {
        JsonNode value = data.path(key);
        String text = value.isMissingNode() || value.isNull() ? null : value.asText();
        if (text == null || text.isBlank())
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Thiếu " + key);
        return text.strip();
    }
}
