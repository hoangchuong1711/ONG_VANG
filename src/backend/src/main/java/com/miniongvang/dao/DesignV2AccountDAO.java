package com.miniongvang.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** JDBC persistence operations for DesignV2 accounts and the SQL Server actor context. */
public final class DesignV2AccountDAO {
    public Map<String, Object> findActiveAccount(Connection connection, String accountId) throws SQLException {
        return one(connection,
                "SELECT ho_ten,vai_tro,auth_version FROM dbo.tai_khoan WHERE ma_tk=? AND trang_thai='HOAT_DONG'",
                accountId);
    }

    public Map<String, Object> findLoginAccount(Connection connection, String username) throws SQLException {
        return one(connection,
                "SELECT ma_tk,mat_khau_hash,ho_ten,vai_tro,auth_version,trang_thai FROM dbo.tai_khoan WHERE username=?",
                username);
    }

    public String findPasswordHash(Connection connection, String accountId) throws SQLException {
        Map<String, Object> row = one(connection,
                "SELECT mat_khau_hash FROM dbo.tai_khoan WHERE ma_tk=?", accountId);
        return row == null || row.get("mat_khau_hash") == null ? null : row.get("mat_khau_hash").toString();
    }

    public String registerCustomer(Connection connection, String username, String passwordHash, String name,
                                   String phone, String email) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("EXEC dbo.usp_dang_ky_khach ?,?,?,?,?")) {
            statement.setString(1, username);
            statement.setString(2, passwordHash);
            statement.setString(3, name);
            statement.setString(4, phone);
            statement.setString(5, email);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }

    public void changePassword(Connection connection, String passwordHash, long authVersion) throws SQLException {
        execute(connection, "EXEC dbo.usp_doi_mat_khau_tai_khoan ?,?", passwordHash, authVersion);
    }

    public void setActorContext(Connection connection, String accountId) throws SQLException {
        execute(connection, "EXEC sys.sp_set_session_context @key=N'ma_tk', @value=?", accountId);
    }

    private static void execute(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
            statement.execute();
        }
    }

    private static Map<String, Object> one(Connection connection, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? map(result) : null;
            }
        }
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
