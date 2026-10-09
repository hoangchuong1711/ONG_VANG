package com.miniongvang.DAO;

import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/** Query predicates are shared by page, count and summary; no multiplying joins. */
public final class DispatchDAO {
    private final EntityManager em;
    public DispatchDAO(EntityManager em) { this.em = em; }

    public boolean relatedDriver(String order, String driver) {
        return em.createQuery("select count(p) from PhanCongDonHang p where p.donHang.id=:order "
                + "and p.taiXe.id=:driver and p.tuChoi=false", Long.class)
                .setParameter("order", order).setParameter("driver", driver).getSingleResult() > 0;
    }
    public boolean rejected(String order, String driver) {
        return em.createQuery("select count(p) from PhanCongDonHang p where p.donHang.id=:order "
                + "and p.taiXe.id=:driver and p.tuChoi=true", Long.class)
                .setParameter("order", order).setParameter("driver", driver).getSingleResult() > 0;
    }
    public PhanCongDonHang activeOrder(String order) {
        return em.createQuery("from PhanCongDonHang p where p.donHang.id=:id and p.ketThucLuc is null",
                PhanCongDonHang.class).setParameter("id", order).getResultStream().findFirst().orElse(null);
    }

    // Also recognize active orders, protecting eligibility if imported data lacks assignment history.
    private static final String BUSY = "(exists (select p.id from PhanCongDonHang p where p.taiXe=t and p.ketThucLuc is null) "
            + "or exists (select d.id from DonHang d where d.taiXe=t and d.trangThai in "
            + "(com.miniongvang.entity.enums.OrderStatus.DA_GAN, com.miniongvang.entity.enums.OrderStatus.DA_LAY_HANG, "
            + "com.miniongvang.entity.enums.OrderStatus.DANG_GIAO)))";
    public boolean busy(String driver) {
        return em.createQuery("select count(t) from TaiXe t where t.id=:id and " + BUSY, Long.class)
                .setParameter("id", driver).getSingleResult() > 0;
    }
    public Drivers drivers(DriverStatus status, Boolean busy, String order, int page, int size) {
        Map<String,Object> params = new HashMap<>();
        String where = " where t.taiKhoan.trangThai=:active";
        params.put("active", AccountStatus.HOAT_DONG);
        if (status != null) { where += " and t.trangThai=:status"; params.put("status",status); }
        if (busy != null) where += " and " + (busy ? BUSY : "not " + BUSY);
        if (order != null) {
            where += " and not exists (select r.id from PhanCongDonHang r where r.donHang.id=:order "
                    + "and r.taiXe=t and r.tuChoi=true)";
            params.put("order",order);
        }
        long count = bind(em.createQuery("select count(t) from TaiXe t" + where, Long.class),params).getSingleResult();
        String sort = order == null ? "t.hoTen,t.id" : "t.ranhTu asc nulls last,t.id";
        var items = bind(em.createQuery("from TaiXe t" + where + " order by " + sort,TaiXe.class),params)
                .setFirstResult(Math.multiplyExact(page,size)).setMaxResults(size).getResultList();
        return new Drivers(items,count);
    }
    public PhuongTien vehicle(String driver) {
        return em.createQuery("from PhuongTien p where p.taiXe.id=:id",PhuongTien.class)
                .setParameter("id",driver).getResultStream().findFirst().orElse(null);
    }
    public Orders orders(AccountRole role, String profile, OrderStatus status, Instant from, Instant to, int page, int size) {
        Map<String,Object> params = new HashMap<>();
        String where = " where 1=1";
        if (role == AccountRole.KHACH_HANG) {
            where += " and d.khachHang.id=:profile"; params.put("profile",profile);
        } else if (role == AccountRole.TAI_XE) {
            where += " and (d.taiXe.id=:profile or exists (select p.id from PhanCongDonHang p "
                    + "where p.donHang=d and p.taiXe.id=:profile and p.tuChoi=false))";
            params.put("profile",profile);
        }
        if (status != null) { where += " and d.trangThai=:status"; params.put("status",status); }
        if (from != null) { where += " and d.thoiGianTao>=:from"; params.put("from",from); }
        if (to != null) { where += " and d.thoiGianTao<:to"; params.put("to",to); }
        long count = bind(em.createQuery("select count(d) from DonHang d" + where,Long.class),params).getSingleResult();
        BigDecimal total = bind(em.createQuery("select sum(s.tongCuoc) from SnapshotCuocDonHang s "
                + "join s.donHang d" + where,BigDecimal.class),params).getSingleResult();
        var items = bind(em.createQuery("from DonHang d" + where + " order by d.thoiGianTao desc,d.id",DonHang.class),params)
                .setFirstResult(Math.multiplyExact(page,size)).setMaxResults(size).getResultList();
        return new Orders(items,count,total == null ? BigDecimal.ZERO : total);
    }
    private static <T> TypedQuery<T> bind(TypedQuery<T> query, Map<String,Object> params) {
        params.forEach(query::setParameter); return query;
    }
    public record Drivers(List<TaiXe> items,long total) {}
    public record Orders(List<DonHang> items,long total,BigDecimal fare) {}
}
