package com.miniongvang.DAO;

import com.miniongvang.entity.LanThanhToan;
import com.miniongvang.entity.XacNhanThanhToanDonHang;
import com.miniongvang.entity.enums.PaymentStatus;
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

    public boolean confirmedBy(String orderId, String paymentId) {
        XacNhanThanhToanDonHang confirmation = em.find(XacNhanThanhToanDonHang.class, orderId);
        return confirmation != null && confirmation.getLanThanhToan().getId().equals(paymentId);
    }

    public LanThanhToan findByReference(String reference) {
        return em.createQuery("from LanThanhToan p where p.maThamChieu=:reference", LanThanhToan.class)
                .setParameter("reference", reference).getResultStream().findFirst().orElse(null);
    }

    public boolean hasUnresolved(String orderId) {
        return em.createQuery("""
                select count(p) from LanThanhToan p where p.donHang.id=:id and p.trangThai in :states
                """, Long.class).setParameter("id", orderId)
                .setParameter("states", List.of(PaymentStatus.CHO_XU_LY, PaymentStatus.CHUA_RO_KET_QUA))
                .getSingleResult() > 0;
    }

    public long countAttempts(String orderId) {
        return em.createQuery("select count(p) from LanThanhToan p where p.donHang.id=:id", Long.class)
                .setParameter("id", orderId).getSingleResult();
    }

    public List<LanThanhToan> findAttempts(String orderId, int page, int size) {
        return em.createQuery("""
                from LanThanhToan p where p.donHang.id=:id order by p.taoLuc desc,p.id
                """, LanThanhToan.class).setParameter("id", orderId)
                .setFirstResult(page * size).setMaxResults(size).getResultList();
    }
}
