package com.miniongvang.DAO;

import com.miniongvang.entity.CauHinhPhuThu;
import jakarta.persistence.EntityManager;

public final class CauHinhPhuThuDAO extends BaseDAO<CauHinhPhuThu> {
    public CauHinhPhuThuDAO(EntityManager em) { super(em, CauHinhPhuThu.class); }

    public java.util.List<CauHinhPhuThu> findActive() {
        return em.createQuery("from CauHinhPhuThu p where p.dangKichHoat=true order by p.id", CauHinhPhuThu.class)
                .getResultList();
    }
}
