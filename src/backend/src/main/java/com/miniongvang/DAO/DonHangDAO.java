package com.miniongvang.DAO;

import java.time.Instant;
import java.util.List;

import com.miniongvang.entity.ChiTietKienHang;
import com.miniongvang.entity.DonHang;
import com.miniongvang.entity.NhatKyTrangThai;
import com.miniongvang.entity.PhuThuDonHang;
import com.miniongvang.entity.PhuThuDonHangId;
import com.miniongvang.entity.SnapshotCuocDonHang;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

public final class DonHangDAO extends BaseDAO<DonHang> {
    public DonHangDAO(EntityManager em) { super(em, DonHang.class); }

    public DonHang findForUpdate(String id) { return em.find(DonHang.class, id, LockModeType.PESSIMISTIC_WRITE); }

    public List<DonHang> findByCustomer(String customerId, Instant from, Instant to, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || from == null || to == null || !from.isBefore(to))
            throw new IllegalArgumentException("Invalid page, size or date range");
        return em.createQuery("""
            select d from DonHang d where d.khachHang.id = :id
              and d.thoiGianTao >= :from and d.thoiGianTao < :to
            order by d.thoiGianTao desc, d.id asc
            """, DonHang.class).setParameter("id", customerId)
                .setParameter("from", from).setParameter("to", to)
                .setFirstResult(Math.multiplyExact(page, size)).setMaxResults(size).getResultList();
    }

    public void persistAggregate(DonHang order, SnapshotCuocDonHang fare,
                                 List<ChiTietKienHang> parcels, List<PhuThuDonHang> surcharges,
                                 NhatKyTrangThai firstEvent) {
        if (fare == null || parcels == null || parcels.isEmpty() || firstEvent == null)
            throw new IllegalArgumentException("An order requires a fare snapshot, parcels and an initial event");
        java.math.BigDecimal extra = surcharges.stream().map(PhuThuDonHang::getSoTienTinh)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        if (extra.compareTo(fare.getTienPhuThu()) != 0)
            throw new IllegalArgumentException("Surcharge snapshot total does not match its details");
        em.persist(order);
        fare.setDonHang(order); em.persist(fare);
        for (ChiTietKienHang parcel : parcels) { parcel.setDonHang(order); em.persist(parcel); }
        for (PhuThuDonHang surcharge : surcharges) {
            surcharge.setDonHang(order);
            surcharge.setId(new PhuThuDonHangId(order.getId(), surcharge.getPhuThu().getId()));
            em.persist(surcharge);
        }
        firstEvent.setDonHang(order); em.persist(firstEvent);
    }

    public Details findDetails(String id) {
        DonHang order = find(id);
        if (order == null) return null;
        return new Details(order, em.find(SnapshotCuocDonHang.class, id),
                em.createQuery("from ChiTietKienHang k where k.donHang.id=:id order by k.id", ChiTietKienHang.class)
                        .setParameter("id", id).getResultList(),
                em.createQuery("from PhuThuDonHang p where p.donHang.id=:id order by p.id.maPhuThu", PhuThuDonHang.class)
                        .setParameter("id", id).getResultList(),
                em.createQuery("from NhatKyTrangThai n where n.donHang.id=:id order by n.thoiGianGhiNhan,n.id", NhatKyTrangThai.class)
                        .setParameter("id", id).getResultList());
    }

    public record Details(DonHang order, SnapshotCuocDonHang fare,
                          List<ChiTietKienHang> parcels, List<PhuThuDonHang> surcharges,
                          List<NhatKyTrangThai> events) {}
}
