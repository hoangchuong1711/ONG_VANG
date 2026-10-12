package com.miniongvang.dao;

import com.miniongvang.entity.TaiKhoan;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public final class TaiKhoanDAO extends BaseDAO<TaiKhoan> {
    public TaiKhoanDAO(EntityManager em) { super(em, TaiKhoan.class); }

    public Optional<TaiKhoan> findByUsername(String username) {
        return em.createQuery("from TaiKhoan t where t.username = :username", TaiKhoan.class)
                .setParameter("username", username).getResultStream().findFirst();
    }

    public String customerProfileId(String accountId) {
        return em.createQuery("select k.id from KhachHang k where k.taiKhoan.id = :id", String.class)
                .setParameter("id", accountId).getResultStream().findFirst().orElse(null);
    }

    public String driverProfileId(String accountId) {
        return em.createQuery("select t.id from TaiXe t where t.taiKhoan.id = :id", String.class)
                .setParameter("id", accountId).getResultStream().findFirst().orElse(null);
    }
}
