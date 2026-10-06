package com.miniongvang.DAO;

import com.miniongvang.entity.KhachHang;
import jakarta.persistence.EntityManager;

public final class KhachHangDAO extends BaseDAO<KhachHang> {
    public KhachHangDAO(EntityManager em) { super(em, KhachHang.class); }

    public KhachHang findWithVip(String id) {
        return em.createQuery("select k from KhachHang k join fetch k.taiKhoan left join fetch k.vip v left join fetch v.hang where k.id = :id", KhachHang.class)
                .setParameter("id", id).getResultStream().findFirst().orElse(null);
    }
}
