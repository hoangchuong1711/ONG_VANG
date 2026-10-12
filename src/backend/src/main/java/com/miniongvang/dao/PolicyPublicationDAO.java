package com.miniongvang.dao;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.time.Instant;
import org.hibernate.Session;

/** SQL Server policy locking and overlap queries; transaction ownership stays with the service. */
public final class PolicyPublicationDAO {
    private final EntityManager em;

    public PolicyPublicationDAO(EntityManager em) { this.em = em; }

    public void lockScope(String scope) {
        em.unwrap(Session.class).doWork(connection -> {
            try (CallableStatement call = connection.prepareCall("{? = call sp_getapplock(?, ?, ?, ?)}")) {
                call.registerOutParameter(1, java.sql.Types.INTEGER);
                call.setString(2, "designV1:policy:" + scope);
                call.setString(3, "Exclusive");
                call.setString(4, "Transaction");
                call.setInt(5, 10_000);
                call.execute();
                if (call.getInt(1) < 0) throw new java.sql.SQLException("Policy publication lock unavailable");
            }
        });
    }

    public boolean overlaps(Table table, String scope, String id, Instant start, Instant end,
                            BigDecimal minKm, BigDecimal maxKm) {
        String sql = "SELECT COUNT(*) FROM dbo.[" + table.name + "] WITH (UPDLOCK, HOLDLOCK) "
                + "WHERE [trang_thai]=N'CONG_BO' AND [" + table.idColumn + "]<>:id "
                + table.scopeClause + " AND ([hieu_luc_den] IS NULL OR [hieu_luc_den]>:start)";
        if (end != null) sql += " AND [hieu_luc_tu]<:end";
        if (table == Table.FARE) {
            if (maxKm != null) sql += " AND [km_toi_thieu]<=:maxKm";
            if (minKm != null) sql += " AND ([km_toi_da] IS NULL OR [km_toi_da]>=:minKm)";
        }
        var query = em.createNativeQuery(sql).setParameter("id", id).setParameter("start", start);
        if (end != null) query.setParameter("end", end);
        if (table != Table.FARE) query.setParameter("scope", scope);
        if (table == Table.FARE) {
            if (maxKm != null) query.setParameter("maxKm", maxKm);
            if (minKm != null) query.setParameter("minKm", minKm);
        }
        return ((Number) query.getSingleResult()).longValue() != 0;
    }

    public enum Table {
        MEMBERSHIP("chinh_sach_thanh_vien", "ma_chinh_sach", "AND [ma_hang]=:scope"),
        FARE("cau_hinh_cuoc", "ma_bieu_phi", ""),
        SURCHARGE("cau_hinh_phu_thu", "ma_phu_thu", "AND [ma_loai_phu_thu]=:scope");

        private final String name, idColumn, scopeClause;
        Table(String name, String idColumn, String scopeClause) {
            this.name = name; this.idColumn = idColumn; this.scopeClause = scopeClause;
        }
        public String tableName() { return name; }
    }
}
