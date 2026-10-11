package com.miniongvang.DAO;

import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.enums.PolicyStatus;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

public final class BieuPhiDAO extends BaseDAO<BieuPhi> {
    public BieuPhiDAO(EntityManager em) { super(em, BieuPhi.class); }

    /** Caller must reject zero or multiple matches as a configuration error. */
    public List<BieuPhi> findApplicable(Instant at, BigDecimal km) {
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(km, "km");
        return em.createQuery("""
                select b from BieuPhi b
                where b.trangThai = :published
                  and b.hieuLucTu <= :at
                  and (b.hieuLucDen is null or b.hieuLucDen > :at)
                  and b.kmToiThieu <= :km
                  and (b.kmToiDa is null or b.kmToiDa >= :km)
                order by b.hieuLucTu desc, b.id
                """, BieuPhi.class)
                .setParameter("published", PolicyStatus.CONG_BO)
                .setParameter("at", at)
                .setParameter("km", km)
                .getResultList();
    }
}
