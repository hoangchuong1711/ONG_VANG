package com.miniongvang.dao;

import com.miniongvang.entity.*;
import jakarta.persistence.EntityManager;
import java.util.List;

/** Separate child queries keep parcels, assignments and payments from multiplying fare rows. */
public final class OrderHistoryDAO {
    private final EntityManager em;
    public OrderHistoryDAO(EntityManager em) { this.em = em; }
    public CuocDonHang fare(String id) { return em.find(CuocDonHang.class, id); }
    public List<PhuThuDonHang> surcharges(String id) {
        return em.createQuery("from PhuThuDonHang p where p.donHang.id=:id order by p.id.maPhuThu", PhuThuDonHang.class)
                .setParameter("id", id).getResultList();
    }
    public List<PhanCongDonHang> assignments(String id) {
        return em.createQuery("from PhanCongDonHang p where p.donHang.id=:id order by p.batDauLuc,p.id", PhanCongDonHang.class)
                .setParameter("id", id).getResultList();
    }
    public XacNhanThanhToanDonHang confirmation(String id) { return em.find(XacNhanThanhToanDonHang.class, id); }
    public List<SuKienDonHang> events(String id) {
        return em.createQuery("from SuKienDonHang e where e.donHang.id=:id order by e.thuTu", SuKienDonHang.class)
                .setParameter("id", id).getResultList();
    }
}
