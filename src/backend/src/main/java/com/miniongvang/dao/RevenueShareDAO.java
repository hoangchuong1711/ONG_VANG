package com.miniongvang.dao;

import com.miniongvang.entity.PhanCongDonHang;
import com.miniongvang.entity.enums.AssignmentOutcome;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;

public final class RevenueShareDAO {
    private final EntityManager em;
    public RevenueShareDAO(EntityManager em) { this.em = em; }

    public boolean exists(String orderId) {
        return !em.createNativeQuery("select ma_don from dbo.phan_chia_cuoc where ma_don=:id")
                .setParameter("id", orderId).getResultList().isEmpty();
    }
    public PhanCongDonHang completedAssignment(String orderId) {
        return em.createQuery("select p from PhanCongDonHang p where p.donHang.id=:id and p.ketQuaKetThuc=:outcome", PhanCongDonHang.class)
                .setParameter("id", orderId).setParameter("outcome", AssignmentOutcome.HOAN_TAT)
                .getResultStream().findFirst().orElse(null);
    }
    public void insert(String orderId, String assignmentId, String paymentId, BigDecimal fare,
                       BigDecimal company, Instant recorded) {
        em.createNativeQuery("insert into dbo.phan_chia_cuoc (ma_don,ma_phan_cong,ma_giao_dich_cuoc,phien_ban_chinh_sach,ty_le_cong_ty,tong_cuoc,tien_cong_ty,tien_tai_xe,ghi_nhan_luc) values (:id,:assignment,:payment,1,0.20,:fare,:company,:driver,:recorded)")
                .setParameter("id", orderId).setParameter("assignment", assignmentId)
                .setParameter("payment", paymentId).setParameter("fare", fare)
                .setParameter("company", company).setParameter("driver", fare.subtract(company))
                .setParameter("recorded", Timestamp.from(recorded)).executeUpdate();
    }
}
