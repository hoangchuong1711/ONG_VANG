package com.miniongvang.DAO;

import com.miniongvang.entity.ChinhSachPhuThu;
import com.miniongvang.entity.enums.PolicyStatus;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

public final class ChinhSachPhuThuDAO extends BaseDAO<ChinhSachPhuThu> {
    public ChinhSachPhuThuDAO(EntityManager em) { super(em, ChinhSachPhuThu.class); }

    /** Caller must reject duplicate active versions of the same surcharge type. */
    public List<ChinhSachPhuThu> findApplicable(Instant at) {
        Objects.requireNonNull(at, "at");
        return em.createQuery("""
                select p from ChinhSachPhuThu p
                where p.trangThai = :published
                  and p.hieuLucTu <= :at
                  and (p.hieuLucDen is null or p.hieuLucDen > :at)
                order by p.maLoaiPhuThu, p.hieuLucTu desc, p.id
                """, ChinhSachPhuThu.class)
                .setParameter("published", PolicyStatus.CONG_BO)
                .setParameter("at", at)
                .getResultList();
    }
}
