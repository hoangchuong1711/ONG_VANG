package com.miniongvang.DAO;

import com.miniongvang.entity.CauHinhCuoc;
import jakarta.persistence.EntityManager;

public final class CauHinhCuocDAO extends BaseDAO<CauHinhCuoc> {
    public CauHinhCuocDAO(EntityManager em) { super(em, CauHinhCuoc.class); }

    public java.util.List<CauHinhCuoc> findActiveOn(java.time.LocalDate date) {
        return em.createQuery("from CauHinhCuoc c where c.dangKichHoat=true and c.ngayBatDau<=:date "
                + "and (c.ngayKetThuc is null or c.ngayKetThuc>=:date) order by c.ngayBatDau desc,c.id", CauHinhCuoc.class)
                .setParameter("date", date).getResultList();
    }
}
