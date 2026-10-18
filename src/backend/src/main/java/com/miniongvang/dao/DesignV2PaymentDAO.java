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

/** JDBC persistence operations for DesignV2 driver settlement and VNPay events. */
public final class DesignV2PaymentDAO {
    public record PaymentPage(List<Map<String, Object>> items, long total) {}

    public Map<String, Object> findDriverFinance(Connection connection, String accountId) throws SQLException {
        Map<String, Object> balance = one(connection,
                "SELECT s.* FROM dbo.v_so_du_tai_xe s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx WHERE t.ma_tk=?", accountId);
        if (balance != null) balance.put("giao_dich_dang_cho", one(connection,
                "SELECT g.ma_giao_dich,g.trang_thai,g.so_tien_yeu_cau,g.payment_url,g.tao_luc "
                        + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                        + "WHERE t.ma_tk=? AND g.giai_quyet_luc IS NULL", accountId));
        return balance;
    }

    public Map<String, Object> findEarnings(Connection connection, Timestamp from, Timestamp until) throws SQLException {
        return one(connection, "EXEC dbo.usp_thu_nhap_cua_toi ?,?", from, until);
    }

    public Map<String, Object> beginSettlement(Connection connection, String idempotencyKey) throws SQLException {
        return one(connection, "EXEC dbo.usp_bat_dau_thanh_toan ?", idempotencyKey);
    }

    public void savePaymentUrlIfAbsent(Connection connection, String paymentId, String paymentUrl) throws SQLException {
        call(connection, "UPDATE dbo.giao_dich_nop_tien SET payment_url=? "
                + "WHERE ma_giao_dich=? AND payment_url IS NULL AND giai_quyet_luc IS NULL", paymentUrl, paymentId);
    }

    public String findPaymentUrl(Connection connection, String paymentId) throws SQLException {
        Map<String, Object> row = one(connection,
                "SELECT payment_url FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=?", paymentId);
        return row == null || row.get("payment_url") == null ? null : row.get("payment_url").toString();
    }

    public Map<String, Object> findPaymentByReference(Connection connection, String reference) throws SQLException {
        return one(connection, "SELECT ma_giao_dich,so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=?", reference);
    }

    public Map<String, Object> findPendingPaymentForAccount(Connection connection, String accountId) throws SQLException {
        return one(connection, "SELECT TOP (1) g.ma_tham_chieu,g.tao_luc,g.so_tien_yeu_cau "
                + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                + "WHERE t.ma_tk=? AND g.giai_quyet_luc IS NULL ORDER BY g.tao_luc DESC", accountId);
    }

    public List<Map<String, Object>> findExpiredPendingAccounts(Connection connection) throws SQLException {
        return rows(connection, "SELECT DISTINCT t.ma_tk,k.ho_ten "
                + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "WHERE g.giai_quyet_luc IS NULL AND g.tao_luc<DATEADD(MINUTE,-15,SYSUTCDATETIME())");
    }

    public PaymentPage findAdminPayments(Connection connection, String status, int page, int size) throws SQLException {
        String reconciliation = "EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan x WHERE x.ma_giao_dich=g.ma_giao_dich "
                + "AND x.ket_qua IN ('CAN_DOI_SOAT','KHONG_KHOP'))";
        String filter = status == null ? "" : status.equals("CAN_DOI_SOAT")
                ? " WHERE " + reconciliation : " WHERE g.trang_thai=?";
        Map<String, Object> count = status == null || status.equals("CAN_DOI_SOAT")
                ? one(connection, "SELECT COUNT_BIG(*) AS total FROM dbo.giao_dich_nop_tien g" + filter)
                : one(connection, "SELECT COUNT_BIG(*) AS total FROM dbo.giao_dich_nop_tien g" + filter, status);
        String sql = "SELECT g.ma_giao_dich,g.ma_tx,k.ho_ten,g.ma_tham_chieu,"
                + "g.trang_thai,g.so_tien_yeu_cau,g.so_tien_thuc_nhan,g.tao_luc,g.giai_quyet_luc,"
                + "g.so_don_dang_lien_ket,g.tong_khoan_lien_ket,e.nguon AS nguon_xac_minh,"
                + "e.ket_qua AS ket_qua_xac_minh,e.nhan_luc AS xac_minh_luc,"
                + "CAST(CASE WHEN " + reconciliation + " THEN 1 ELSE 0 END AS bit) can_doi_soat "
                + "FROM dbo.v_giao_dich_nop g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk OUTER APPLY "
                + "(SELECT TOP (1) nguon,ket_qua,nhan_luc FROM dbo.su_kien_thanh_toan x "
                + "WHERE x.ma_giao_dich=g.ma_giao_dich ORDER BY x.nhan_luc DESC,x.ma_su_kien DESC) e "
                + filter + " ORDER BY g.tao_luc DESC,g.ma_giao_dich DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        List<Map<String, Object>> items = status == null || status.equals("CAN_DOI_SOAT")
                ? rows(connection, sql, (long) page * size, size)
                : rows(connection, sql, status, (long) page * size, size);
        return new PaymentPage(List.copyOf(items), ((Number) count.get("total")).longValue());
    }

    public boolean paymentExists(Connection connection, String paymentId) throws SQLException {
        return one(connection, "SELECT ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=?", paymentId) != null;
    }

    public List<Map<String, Object>> findPaymentEvents(Connection connection, String paymentId) throws SQLException {
        return rows(connection, "SELECT ma_su_kien,nguon,chu_ky_hop_le,ket_qua,nhan_luc "
                + "FROM dbo.su_kien_thanh_toan WHERE ma_giao_dich=? "
                + "ORDER BY nhan_luc DESC,ma_su_kien DESC", paymentId);
    }

    public void applyPaymentResult(Connection connection, String reference, String source, byte[] eventHash,
                                   String payload, boolean success, BigDecimal amount, String partnerReference)
            throws SQLException {
        call(connection, "EXEC dbo.usp_ap_dung_ket_qua_nop ?,?,?,?,?,?,?",
                reference, source, eventHash, payload, success, amount, partnerReference);
    }

    public void recordObservation(Connection connection, String reference, String source, byte[] eventHash,
                                  boolean signatureValid, String result, String payload) throws SQLException {
        call(connection, "IF NOT EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan WHERE nguon=? AND khoa_su_kien=?) "
                        + "INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json) "
                        + "VALUES((SELECT ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=?),?,?,?,?,?)",
                source, eventHash, reference, source, eventHash, signatureValid, result, payload);
    }

    public Map<String, Object> findCompanySettlementReport(Connection connection) throws SQLException {
        Map<String, Object> totals = one(connection, "SELECT COALESCE(SUM(cong_ty_duoc_huong),0) cong_ty_duoc_huong, "
                + "COALESCE(SUM(da_nop),0) da_nop,COALESCE(SUM(con_phai_nop),0) con_phai_nop,"
                + "COALESCE(SUM(thu_nhap_tai_xe),0) thu_nhap_tai_xe,"
                + "COALESCE(SUM(dang_thanh_toan),0) dang_thanh_toan,"
                + "COALESCE(SUM(chua_dua_vao_thanh_toan),0) chua_dua_vao_thanh_toan FROM dbo.v_so_du_tai_xe");
        Map<String, Object> received = one(connection, "SELECT COALESCE(SUM(so_tien_thuc_nhan),0) da_nop "
                + "FROM dbo.giao_dich_nop_tien WHERE trang_thai='THANH_CONG'");
        totals.put("da_nop", received.get("da_nop"));
        totals.put("tai_xe", rows(connection, "SELECT t.ma_tx,k.ho_ten,s.thu_nhap_tai_xe,s.cong_ty_duoc_huong,"
                + "s.con_phai_nop,s.dang_thanh_toan,s.chua_dua_vao_thanh_toan,COALESCE(g.da_nop,0) da_nop "
                + "FROM dbo.v_so_du_tai_xe s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx "
                + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN "
                + "(SELECT ma_tx,SUM(so_tien_thuc_nhan) da_nop FROM dbo.giao_dich_nop_tien "
                + "WHERE trang_thai='THANH_CONG' GROUP BY ma_tx) g ON g.ma_tx=t.ma_tx ORDER BY k.ho_ten,t.ma_tx"));
        return totals;
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
