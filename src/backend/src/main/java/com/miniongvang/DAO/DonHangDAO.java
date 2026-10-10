package com.miniongvang.DAO;

import java.time.Instant;
import java.util.List;

import com.miniongvang.entity.DonHang;
import com.miniongvang.entity.PhuThuDonHang;
import com.miniongvang.entity.PhuThuDonHangId;
import com.miniongvang.entity.CuocDonHang;
import com.miniongvang.entity.KienHang;
import com.miniongvang.entity.SuKienDonHang;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

public final class DonHangDAO extends BaseDAO<DonHang> {
    public DonHangDAO(EntityManager em) { super(em, DonHang.class); }

    public DonHang findForUpdate(String id) { return em.find(DonHang.class, id, LockModeType.PESSIMISTIC_WRITE); }

    public void persistAggregateV1(DonHang order, CuocDonHang fare,
                                   List<KienHang> parcels, List<PhuThuDonHang> surcharges,
                                   SuKienDonHang firstEvent) {
        if (order == null || fare == null || parcels == null || parcels.isEmpty()
                || surcharges == null || firstEvent == null || firstEvent.getThuTu() != 1)
            throw new IllegalArgumentException("Order, fare, parcels and creation event are required");
        em.persist(order);
        fare.setDonHang(order);
        em.persist(fare);
        for (KienHang parcel : parcels) {
            parcel.setDonHang(order);
            em.persist(parcel);
        }
        for (PhuThuDonHang surcharge : surcharges) {
            surcharge.setDonHang(order);
            surcharge.setId(new PhuThuDonHangId(order.getId(), surcharge.getChinhSachPhuThu().getId()));
            em.persist(surcharge);
        }
        firstEvent.setDonHang(order);
        em.persist(firstEvent);
    }

    public DetailsV1 findDetailsV1(String id) {
        DonHang order = find(id);
        if (order == null) return null;
        return new DetailsV1(order, em.find(CuocDonHang.class, id),
                em.createQuery("from KienHang k where k.donHang.id=:id order by k.thuTu", KienHang.class)
                        .setParameter("id", id).getResultList(),
                em.createQuery("from PhuThuDonHang p where p.donHang.id=:id order by p.id.maPhuThu", PhuThuDonHang.class)
                        .setParameter("id", id).getResultList(),
                em.createQuery("from SuKienDonHang e where e.donHang.id=:id order by e.thuTu", SuKienDonHang.class)
                        .setParameter("id", id).getResultList());
    }

    public record DetailsV1(DonHang order, CuocDonHang fare, List<KienHang> parcels,
                            List<PhuThuDonHang> surcharges, List<SuKienDonHang> events) {}

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

}
