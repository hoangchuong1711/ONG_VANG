package com.miniongvang.DAO;

import com.miniongvang.entity.TaiXe;
import com.miniongvang.entity.enums.AccountStatus;
import com.miniongvang.entity.enums.DriverStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;

public final class TaiXeDAO extends BaseDAO<TaiXe> {
    public TaiXeDAO(EntityManager em) { super(em, TaiXe.class); }

    public TaiXe findForUpdate(String id) { return em.find(TaiXe.class, id, LockModeType.PESSIMISTIC_WRITE); }

    public List<TaiXe> findAvailable(int limit) {
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit must be 1..100");
        return em.createQuery("""
            select t from TaiXe t join t.taiKhoan a
            where a.trangThai = :accountStatus
              and t.trangThai = :driverStatus
              and not exists (select p.id from PhanCongDonHang p
                              where p.taiXe = t and p.ketThucLuc is null)
            order by t.ranhTu asc nulls last, t.id asc
            """, TaiXe.class)
                .setParameter("accountStatus", AccountStatus.HOAT_DONG)
                .setParameter("driverStatus", DriverStatus.ONLINE)
                .setMaxResults(limit).getResultList();
    }
}
