package com.miniongvang.dao;

import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.enums.AccountStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;

/** Customer selection for dispatcher orders; only active accounts can be selected. */
public final class CustomerDAO {
    private final EntityManager em;

    public CustomerDAO(EntityManager em) { this.em = em; }

    public Customers search(String query, int page, int size) {
        String where = " where k.taiKhoan.trangThai=:active";
        if (query != null) where += " and (lower(k.taiKhoan.hoTen) like :query escape '!'"
                + " or k.taiKhoan.soDienThoai like :query escape '!')";
        TypedQuery<Long> count = em.createQuery("select count(k) from KhachHang k" + where, Long.class)
                .setParameter("active", AccountStatus.HOAT_DONG);
        TypedQuery<KhachHang> items = em.createQuery("from KhachHang k" + where
                + " order by k.taiKhoan.hoTen,k.id", KhachHang.class)
                .setParameter("active", AccountStatus.HOAT_DONG);
        if (query != null) {
            String pattern = "%" + query.toLowerCase(java.util.Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            count.setParameter("query", pattern);
            items.setParameter("query", pattern);
        }
        return new Customers(items.setFirstResult(Math.multiplyExact(page, size))
                .setMaxResults(size).getResultList(), count.getSingleResult());
    }

    public record Customers(List<KhachHang> items, long total) {}
}
