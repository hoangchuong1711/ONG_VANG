package com.miniongvang.DAO;

import com.miniongvang.entity.TaiKhoan;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public final class TaiKhoanDAO extends BaseDAO<TaiKhoan> {
    public TaiKhoanDAO(EntityManager em) { super(em, TaiKhoan.class); }

    public Optional<TaiKhoan> findByUsername(String username) {
        return em.createQuery("from TaiKhoan t where t.username = :username", TaiKhoan.class)
                .setParameter("username", username).getResultStream().findFirst();
    }
}
