package com.miniongvang.DAO;

import com.miniongvang.entity.ChinhSachThanhVien;
import com.miniongvang.entity.enums.MembershipTier;
import com.miniongvang.entity.enums.PolicyStatus;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

public final class ChinhSachThanhVienDAO extends BaseDAO<ChinhSachThanhVien> {
    public ChinhSachThanhVienDAO(EntityManager em) { super(em, ChinhSachThanhVien.class); }

    /** More than one published result is an overlap error, never a reason to pick the first row. */
    public List<ChinhSachThanhVien> findApplicable(MembershipTier tier, Instant at) {
        Objects.requireNonNull(tier, "tier");
        Objects.requireNonNull(at, "at");
        return em.createQuery("""
                select p from ChinhSachThanhVien p
                where p.hang = :tier and p.trangThai = :published
                  and p.hieuLucTu <= :at
                  and (p.hieuLucDen is null or p.hieuLucDen > :at)
                order by p.hieuLucTu desc, p.id
                """, ChinhSachThanhVien.class)
                .setParameter("tier", tier)
                .setParameter("published", PolicyStatus.CONG_BO)
                .setParameter("at", at)
                .getResultList();
    }
}
