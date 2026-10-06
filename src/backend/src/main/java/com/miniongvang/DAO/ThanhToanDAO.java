package com.miniongvang.DAO;

import com.miniongvang.entity.ThanhToan;
import jakarta.persistence.EntityManager;
import java.util.List;

public final class ThanhToanDAO extends BaseDAO<ThanhToan> {
    public ThanhToanDAO(EntityManager em) { super(em, ThanhToan.class); }

    public List<ThanhToan> findAttempts(String orderId) {
        return em.createQuery("from ThanhToan t where t.donHang.id = :id order by t.taoLuc desc, t.id asc",
                ThanhToan.class).setParameter("id", orderId).getResultList();
    }
}
