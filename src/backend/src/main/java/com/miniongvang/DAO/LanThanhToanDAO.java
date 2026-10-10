package com.miniongvang.DAO;

import com.miniongvang.entity.LanThanhToan;
import com.miniongvang.entity.XacNhanThanhToanDonHang;
import jakarta.persistence.EntityManager;
import java.util.List;

public final class LanThanhToanDAO extends BaseDAO<LanThanhToan> {
    public LanThanhToanDAO(EntityManager em) { super(em, LanThanhToan.class); }

    public List<LanThanhToan> findAttempts(String orderId) {
        return em.createQuery("""
                from LanThanhToan p where p.donHang.id=:id order by p.taoLuc desc,p.id
                """, LanThanhToan.class).setParameter("id", orderId).getResultList();
    }

    public boolean confirmed(String orderId) {
        return em.find(XacNhanThanhToanDonHang.class, orderId) != null;
    }
}
