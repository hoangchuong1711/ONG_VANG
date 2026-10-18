package com.miniongvang.dao;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** JDBC persistence operations for DesignV2 orders, quotes, and order policies. */
public final class DesignV2OrderDAO {
    public record OrderPage(List<Map<String, Object>> items, long total) {}

    public Map<String, Object> findExistingOrder(Connection connection, String creatorId, String idempotencyKey)
            throws SQLException {
        return one(connection,
                "SELECT ma_don,hash_yeu_cau FROM dbo.don_hang WHERE ma_tk_tao=? AND khoa_yeu_cau=?",
                creatorId, idempotencyKey);
    }

    public String findCustomerIdForAccount(Connection connection, String accountId) throws SQLException {
        Map<String, Object> customer = one(connection,
                "SELECT ma_kh FROM dbo.khach_hang WHERE ma_tk=?", accountId);
        return customer == null ? null : customer.get("ma_kh").toString();
    }

    public List<Map<String, Object>> findActiveFares(Connection connection) throws SQLException {
        return rows(connection, "SELECT ma_bieu_phi,cuoc_co_ban,don_gia_km,kg_bao_gom,don_gia_kg,kg_toi_da,km_toi_thieu,km_toi_da "
                + "FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())");
    }

    public Map<String, Object> calculateFare(Connection connection, BigDecimal base, BigDecimal distanceKm,
                                              BigDecimal ratePerKm, BigDecimal totalWeight,
                                              BigDecimal includedWeight, BigDecimal ratePerKg) throws SQLException {
        return one(connection, "SELECT dbo.fn_cuoc_km(?,?,?) cuoc_km,dbo.fn_cuoc_kg(?,?,?) cuoc_kg",
                base, distanceKm, ratePerKm, totalWeight, includedWeight, ratePerKg);
    }

    public List<Map<String, Object>> findActiveSurcharges(Connection connection) throws SQLException {
        return rows(connection, "SELECT ma_phu_thu,ma_loai,so_tien,bat_buoc FROM dbo.cau_hinh_phu_thu "
                + "WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())");
    }

    public Map<String, Object> findActiveMembership(Connection connection, String customerId) throws SQLException {
        return one(connection, "SELECT ma_hang FROM dbo.khach_hang WHERE ma_kh=? AND thanh_vien_tu<=SYSUTCDATETIME() "
                + "AND (thanh_vien_den IS NULL OR thanh_vien_den>SYSUTCDATETIME())", customerId);
    }

    public List<Map<String, Object>> findActiveMembershipDiscount(Connection connection, String tier) throws SQLException {
        return rows(connection, "SELECT ty_le_giam FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=? "
                + "AND trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())", tier);
    }

    public String createOrder(Connection connection, String customerId, String idempotencyKey, byte[] requestHash,
                              String pickup, String dropoff, String recipientName, String recipientPhone,
                              BigDecimal distanceKm, int estimatedSeconds, String routeSource,
                              String parcelsJson, String surchargesJson, BigDecimal agreedPrice) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("EXEC dbo.usp_tao_don ?,?,?,?,?,?,?,?,?,?,?,?,?")) {
            statement.setString(1, customerId);
            statement.setString(2, idempotencyKey);
            statement.setBytes(3, requestHash);
            statement.setString(4, pickup);
            statement.setString(5, dropoff);
            statement.setString(6, recipientName);
            statement.setString(7, recipientPhone);
            statement.setBigDecimal(8, distanceKm);
            statement.setInt(9, estimatedSeconds);
            statement.setString(10, routeSource);
            statement.setString(11, parcelsJson);
            statement.setString(12, surchargesJson);
            statement.setBigDecimal(13, agreedPrice);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }

    public OrderPage findOrderPage(Connection connection, String status, int page, int size) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("EXEC dbo.usp_doc_don_trang ?,?,?")) {
            statement.setString(1, status);
            statement.setInt(2, page);
            statement.setInt(3, size);
            if (!statement.execute()) throw new SQLException("Order count missing");
            long total;
            try (ResultSet result = statement.getResultSet()) {
                if (!result.next()) throw new SQLException("Order count missing");
                total = result.getLong("total");
            }
            if (!statement.getMoreResults()) throw new SQLException("Order page missing");
            List<Map<String, Object>> items = new ArrayList<>();
            try (ResultSet result = statement.getResultSet()) {
                while (result.next()) items.add(map(result));
            }
            return new OrderPage(List.copyOf(items), total);
        }
    }

    public OrderPage findAdminOrderPage(Connection connection, String status, int page, int size) throws SQLException {
        String filter = status == null ? "" : " WHERE d.trang_thai=?";
        Map<String, Object> count = status == null
                ? one(connection, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang d")
                : one(connection, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang d" + filter, status);
        String sql = "SELECT d.*,v.tong_cuoc FROM dbo.don_hang d JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don"
                + filter + " ORDER BY d.tao_luc DESC,d.ma_don OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        List<Map<String, Object>> items = status == null
                ? rows(connection, sql, (long) page * size, size)
                : rows(connection, sql, status, (long) page * size, size);
        return new OrderPage(List.copyOf(items), ((Number) count.get("total")).longValue());
    }

    public void assign(Connection connection, String orderId, String driverId) throws SQLException {
        call(connection, "EXEC dbo.usp_phan_cong ?,?", orderId, driverId);
    }

    public void progress(Connection connection, String orderId, String action, String note) throws SQLException {
        call(connection, "EXEC dbo.usp_tien_trinh ?,?,?", orderId, action, note);
    }

    public void complete(Connection connection, String orderId) throws SQLException {
        call(connection, "EXEC dbo.usp_hoan_tat ?,1", orderId);
    }

    public void cancel(Connection connection, String orderId, String reason) throws SQLException {
        call(connection, "EXEC dbo.usp_huy_don ?,?", orderId, reason);
    }

    public Map<String, Object> findOrder(Connection connection, String orderId) throws SQLException {
        return one(connection, "EXEC dbo.usp_doc_don ?,0,1", orderId);
    }

    public List<Map<String, Object>> findParcels(Connection connection, String orderId) throws SQLException {
        return rows(connection, "SELECT thu_tu,loai_hang,khoi_luong_kg,ghi_chu FROM dbo.chi_tiet_kien_hang "
                + "WHERE ma_don=? ORDER BY thu_tu", orderId);
    }

    public List<Map<String, Object>> findOrderEvents(Connection connection, String orderId) throws SQLException {
        return rows(connection, "SELECT ma_su_kien,loai,trang_thai_sau,thoi_gian,ghi_chu FROM dbo.nhat_ky_don_hang "
                + "WHERE ma_don=? ORDER BY thoi_gian,ma_su_kien", orderId);
    }

    public List<Map<String, Object>> findAssignmentHistory(Connection connection, String orderId) throws SQLException {
        return rows(connection, "SELECT p.ma_phan_cong,p.bat_dau_luc,p.ket_thuc_luc,p.ket_qua,p.ly_do,"
                + "k.ho_ten AS tai_xe,pt.bien_so FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "LEFT JOIN dbo.phuong_tien pt ON pt.ma_tx=t.ma_tx WHERE p.ma_don=? "
                + "ORDER BY p.bat_dau_luc,p.ma_phan_cong", orderId);
    }

    public Map<String, Object> findAssignment(Connection connection, Object orderId) throws SQLException {
        return one(connection, "SELECT TOP (1) p.ma_tx,k.ho_ten,pt.bien_so FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "LEFT JOIN dbo.phuong_tien pt ON pt.ma_tx=t.ma_tx WHERE p.ma_don=? "
                + "ORDER BY CASE WHEN p.ket_thuc_luc IS NULL THEN 0 ELSE 1 END,p.bat_dau_luc DESC", orderId);
    }

    private static Map<String, Object> one(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? map(result) : null;
            }
        }
    }

    private static List<Map<String, Object>> rows(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet result = statement.executeQuery()) {
                List<Map<String, Object>> rows = new ArrayList<>();
                while (result.next()) rows.add(map(result));
                return rows;
            }
        }
    }

    private static void call(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, values);
            statement.execute();
        }
    }

    private static void bind(PreparedStatement statement, Object... values) throws SQLException {
        for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
    }

    private static Map<String, Object> map(ResultSet result) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int column = 1; column <= result.getMetaData().getColumnCount(); column++) {
            Object value = result.getObject(column);
            if (value instanceof Timestamp timestamp) value = timestamp.toInstant().toString();
            else if (value instanceof UUID id) value = id.toString();
            else if (value instanceof BigDecimal decimal) value = decimal.toPlainString();
            row.put(result.getMetaData().getColumnLabel(column), value);
        }
        return row;
    }
}
