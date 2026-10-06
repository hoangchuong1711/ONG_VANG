package com.miniongvang.DAO;

import com.miniongvang.entity.PhanCongDonHang;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public final class PhanCongDonHangDAO extends BaseDAO<PhanCongDonHang> {
    public PhanCongDonHangDAO(EntityManager em) { super(em, PhanCongDonHang.class); }

    public Optional<PhanCongDonHang> findActiveByDriver(String driverId) {
        return em.createQuery("from PhanCongDonHang p where p.taiXe.id = :id and p.ketThucLuc is null",
                PhanCongDonHang.class).setParameter("id", driverId).getResultStream().findFirst();
    }

    public java.util.List<PhanCongDonHang> findHistory(String orderId) {
        return em.createQuery("from PhanCongDonHang p join fetch p.taiXe where p.donHang.id=:id order by p.batDauLuc,p.id",
                PhanCongDonHang.class).setParameter("id", orderId).getResultList();
    }
}
