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

/** JDBC persistence operations for DesignV2 driver dispatch and location data. */
public final class DesignV2DispatchDAO {
    public List<Map<String, Object>> findActiveIncidents(Connection connection) throws SQLException {
        // Keep every report in the log; show only the latest alert per active order on the board.
        return rows(connection, "WITH incidents AS (SELECT n.ma_su_kien,n.ma_don,n.thoi_gian,n.ghi_chu,n.ma_tk,"
                + "ROW_NUMBER() OVER(PARTITION BY n.ma_don ORDER BY n.thoi_gian DESC,n.ma_su_kien DESC) rn "
                + "FROM dbo.nhat_ky_don_hang n JOIN dbo.don_hang d ON d.ma_don=n.ma_don "
                + "WHERE n.loai='SU_CO' AND d.trang_thai='DANG_GIAO') "
                + "SELECT i.ma_su_kien,i.ma_don,i.thoi_gian,i.ghi_chu,t.ma_tx,k.ho_ten,k.so_dien_thoai "
                + "FROM incidents i JOIN dbo.tai_khoan k ON k.ma_tk=i.ma_tk "
                + "LEFT JOIN dbo.tai_xe t ON t.ma_tk=i.ma_tk "
                + "WHERE i.rn=1 ORDER BY i.thoi_gian DESC,i.ma_su_kien DESC");
    }

    public List<Map<String, Object>> findCompanyDrivers(Connection connection) throws SQLException {
        return rows(connection, "SELECT x.ma_tx,x.ma_tk,k.username,k.ho_ten,k.so_dien_thoai,k.email,"
                + "k.trang_thai AS trang_thai_tai_khoan,k.auth_version,x.cccd,x.so_giay_phep,x.ngay_het_han_gplx,"
                + "x.trang_thai,x.ranh_tu,p.bien_so,p.loai_xe,p.mau_xe,p.dang_hoat_dong AS xe_hoat_dong,"
                + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang a WHERE a.ma_tx=x.ma_tx AND a.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=x.ma_tx ORDER BY k.ho_ten");
    }

    public List<Map<String, Object>> findDispatcherDrivers(Connection connection) throws SQLException {
        return rows(connection, "SELECT t.ma_tx,k.ho_ten,k.so_dien_thoai,t.trang_thai,t.ranh_tu,t.vi_tri_demo_dia_chi,t.vi_tri_demo_nguon,p.bien_so,p.loai_xe, "
                + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang pc WHERE pc.ma_tx=t.ma_tx AND pc.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx ORDER BY k.ho_ten");
    }

    public Map<String, Object> findDriverForAccount(Connection connection, String accountId) throws SQLException {
        return one(connection, "SELECT t.ma_tx,k.ho_ten,k.so_dien_thoai,t.trang_thai,t.ranh_tu,t.vi_tri_demo_dia_chi,t.vi_tri_demo_nguon,p.bien_so,p.loai_xe, "
                + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang pc WHERE pc.ma_tx=t.ma_tx AND pc.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx WHERE t.ma_tk=?", accountId);
    }

    public Map<String, Object> changeAvailability(Connection connection, String accountId, boolean online) throws SQLException {
        String sql = "BEGIN TRY BEGIN TRAN; DECLARE @rc INT; "
                + "EXEC @rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; "
                + "IF @rc<0 THROW 51100,N'Không lấy được khóa điều phối',1; "
                + "IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx "
                + "WHERE t.ma_tk=? AND p.ket_thuc_luc IS NULL) THROW 52203,N'Không đổi ca khi đang có phân công',1; "
                + "UPDATE dbo.tai_xe SET trang_thai=?,ranh_tu=CASE WHEN ?=1 THEN SYSUTCDATETIME() ELSE NULL END WHERE ma_tk=?; "
                + "IF @@ROWCOUNT<>1 THROW 51402,N'Thiếu hồ sơ tài xế',1; COMMIT; "
                + "END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, accountId);
            statement.setString(2, online ? "ONLINE" : "OFFLINE");
            statement.setBoolean(3, online);
            statement.setString(4, accountId);
            statement.execute();
        }
        return one(connection, "SELECT t.ma_tx,k.ho_ten,t.trang_thai,t.ranh_tu "
                + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk WHERE t.ma_tk=?", accountId);
    }

    public String findOrderPickup(Connection connection, String orderId) throws SQLException {
        Map<String, Object> order = one(connection, "SELECT diem_lay FROM dbo.don_hang WHERE ma_don=?", orderId);
        return order == null ? null : String.valueOf(order.get("diem_lay"));
    }

    public List<Map<String, Object>> findDriverSuggestionCandidates(Connection connection, String orderId) throws SQLException {
        return rows(connection, "SELECT s.ma_tx,s.ho_ten,s.ranh_tu,s.bien_so,t.vi_tri_demo_dia_chi,t.vi_tri_demo_lat,"
                + "t.vi_tri_demo_lng,t.vi_tri_demo_nguon "
                + "FROM dbo.v_tai_xe_san_sang s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx "
                + "WHERE NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p "
                + "WHERE p.ma_don=? AND p.ma_tx=s.ma_tx AND p.ket_qua='TU_CHOI')", orderId);
    }

    public boolean saveDriverPosition(Connection connection, String driverId, String address,
                                      BigDecimal latitude, BigDecimal longitude) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE dbo.tai_xe SET vi_tri_demo_dia_chi=?,vi_tri_demo_lat=?,vi_tri_demo_lng=?,"
                        + "vi_tri_demo_luc=SYSUTCDATETIME(),vi_tri_demo_nguon='DEMO_CO_DINH' WHERE ma_tx=?")) {
            statement.setString(1, address);
            statement.setBigDecimal(2, latitude);
            statement.setBigDecimal(3, longitude);
            statement.setString(4, driverId);
            return statement.executeUpdate() == 1;
        }
    }

    public Map<String, Object> findAssignedDriverRoute(Connection connection, String orderId, String accountId) throws SQLException {
        return one(connection, "SELECT t.ma_tx,t.vi_tri_demo_dia_chi,t.vi_tri_demo_lat,t.vi_tri_demo_lng,"
                + "d.diem_lay,d.diem_giao FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.don_hang d ON d.ma_don=p.ma_don "
                + "WHERE p.ma_don=? AND p.ma_tx=(SELECT ma_tx FROM dbo.tai_xe WHERE ma_tk=?) "
                + "AND (p.ket_thuc_luc IS NULL OR d.trang_thai='HOAN_TAT')", orderId, accountId);
    }

    public List<Map<String, Object>> findVehicles(Connection connection) throws SQLException {
        return rows(connection, "SELECT p.ma_tx,p.bien_so,p.loai_xe,p.mau_xe,p.dang_hoat_dong,t.ho_ten "
                + "FROM dbo.phuong_tien p JOIN dbo.tai_xe x ON x.ma_tx=p.ma_tx "
                + "JOIN dbo.tai_khoan t ON t.ma_tk=x.ma_tk ORDER BY t.ho_ten");
    }

    public void manageVehicle(Connection connection, String action, String driverId, String plate,
                              String type, String color, boolean active) throws SQLException {
        call(connection, "EXEC dbo.usp_quan_ly_phuong_tien ?,?,?,?,?,?", action, driverId, plate, type, color, active);
    }

    public List<Map<String, Object>> findVehicleRows(Connection connection) throws SQLException {
        return rows(connection, "SELECT ma_tx,bien_so,loai_xe,dang_hoat_dong FROM dbo.phuong_tien");
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
