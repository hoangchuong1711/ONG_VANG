package com.miniongvang.service;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dao.PolicyPublicationDAO;

import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.LockModeType;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

/** Controlled internal publication path; every scope is serialized even when no published row exists. */
public final class PolicyPublicationService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final TransactionRunner transactions;
    private final Clock clock;

    public PolicyPublicationService(EntityManagerFactory factory) { this(factory, Clock.systemUTC()); }
    public PolicyPublicationService(EntityManagerFactory factory, Clock clock) {
        transactions = new TransactionRunner(factory);
        this.clock = clock;
    }

    public void publishMembership(ActorContext actor, String id) { change(actor, Kind.MEMBERSHIP, id, null); }
    public void publishFare(ActorContext actor, String id) { change(actor, Kind.FARE, id, null); }
    public void publishSurcharge(ActorContext actor, String id) { change(actor, Kind.SURCHARGE, id, null); }
    public void closeMembership(ActorContext actor, String id, Instant end) { change(actor, Kind.MEMBERSHIP, id, end); }
    public void closeFare(ActorContext actor, String id, Instant end) { change(actor, Kind.FARE, id, end); }
    public void closeSurcharge(ActorContext actor, String id, Instant end) { change(actor, Kind.SURCHARGE, id, end); }

    private void change(ActorContext actor, Kind kind, String id, Instant end) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Policy id required");
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        transactions.run(em -> {
            TaiKhoan admin = admin(em, actor);
            Object policy = em.find(kind.entity, id);
            if (policy == null) throw new IllegalArgumentException("Policy not found");
            String scope = kind.scope(policy);
            lockScope(em, kind.name() + ":" + scope.toUpperCase(Locale.ROOT));
            em.refresh(policy, LockModeType.PESSIMISTIC_WRITE);
            PolicyStatus status = kind.status(policy);
            Instant start = kind.start(policy);
            Instant oldEnd = kind.end(policy);
            String before = snapshot(kind, policy);
            if (end == null) {
                if (status != PolicyStatus.NHAP || start.isBefore(now))
                    throw new IllegalStateException("Policy is not an unpublished future draft");
                if (oldEnd != null && !oldEnd.isAfter(start))
                    throw new IllegalArgumentException("Invalid policy interval");
                if (overlaps(em, kind, policy, id, start, oldEnd))
                    throw new IllegalStateException("Published policy interval overlaps");
                kind.publish(policy);
            } else {
                Instant boundary = end.truncatedTo(ChronoUnit.MILLIS);
                if (status != PolicyStatus.CONG_BO || oldEnd != null || boundary.isBefore(now)
                        || !boundary.isAfter(start))
                    throw new IllegalStateException("Published policy cannot be closed at this boundary");
                kind.close(policy, boundary);
            }
            audit(em, admin, kind, id, end == null ? AuditAction.CONG_BO : AuditAction.SUA,
                    now, before, snapshot(kind, policy));
            return null;
        });
    }

    private static TaiKhoan admin(EntityManager em, ActorContext actor) {
        if (actor == null || actor.maNguoiDung() == null || actor.vaiTro() != AccountRole.CHU_DOI_XE)
            throw new SecurityException("Administrator required");
        TaiKhoan account = em.find(TaiKhoan.class, actor.maNguoiDung());
        if (account == null || account.getVaiTro() != AccountRole.CHU_DOI_XE
                || account.getTrangThai() != AccountStatus.HOAT_DONG)
            throw new SecurityException("Administrator unavailable");
        return account;
    }

    private static void lockScope(EntityManager em, String scope) {
        new PolicyPublicationDAO(em).lockScope(scope);
    }

    private static boolean overlaps(EntityManager em, Kind kind, Object policy, String id,
                                    Instant start, Instant end) {
        BieuPhi fare = kind == Kind.FARE ? (BieuPhi) policy : null;
        return new PolicyPublicationDAO(em).overlaps(kind.table, kind.scope(policy), id, start, end,
                fare == null ? null : fare.getKmToiThieu(), fare == null ? null : fare.getKmToiDa());
    }

    private static String snapshot(Kind kind, Object policy) {
        if (kind == Kind.MEMBERSHIP) {
            ChinhSachThanhVien p = (ChinhSachThanhVien) policy;
            return JSON.writeValueAsString(new MembershipSnapshot(p.getHang(), p.getTyLeGiam().toPlainString(),
                    p.getHieuLucTu().toString(), p.getHieuLucDen() == null ? null : p.getHieuLucDen().toString(), p.getTrangThai()));
        }
        if (kind == Kind.FARE) {
            BieuPhi p = (BieuPhi) policy;
            return JSON.writeValueAsString(new FareSnapshot(p.getTenBieuPhi(), p.getCuocCoBan().toPlainString(),
                    p.getDonGiaKm().toPlainString(), p.getKmToiThieu().toPlainString(),
                    p.getKmToiDa() == null ? null : p.getKmToiDa().toPlainString(),
                    p.getHieuLucTu().toString(), p.getHieuLucDen() == null ? null : p.getHieuLucDen().toString(), p.getTrangThai()));
        }
        ChinhSachPhuThu p = (ChinhSachPhuThu) policy;
        return JSON.writeValueAsString(new SurchargeSnapshot(p.getMaLoaiPhuThu(), p.getTenPhuThu(),
                p.getSoTien().toPlainString(), p.getHieuLucTu().toString(),
                p.getHieuLucDen() == null ? null : p.getHieuLucDen().toString(), p.getTrangThai()));
    }

    private static void audit(EntityManager em, TaiKhoan actor, Kind kind, String id, AuditAction action,
                              Instant now, String before, String after) {
        NhatKyKiemToan log = new NhatKyKiemToan();
        log.setId(UUID.randomUUID().toString()); log.setTaiKhoanThucHien(actor);
        log.setNguon(AuditSource.NGUOI_DUNG); log.setLoaiDoiTuong(kind.table.tableName());
        log.setMaDoiTuong(id); log.setHanhDong(action); log.setThoiGian(now);
        log.setTruocJson(before); log.setSauJson(after);
        em.persist(log);
    }

    private record MembershipSnapshot(MembershipTier tier, String rate, String start, String end, PolicyStatus status) {}
    private record FareSnapshot(String name, String base, String perKm, String minKm, String maxKm,
                                String start, String end, PolicyStatus status) {}
    private record SurchargeSnapshot(String type, String name, String amount, String start, String end, PolicyStatus status) {}

    private enum Kind {
        MEMBERSHIP(ChinhSachThanhVien.class, PolicyPublicationDAO.Table.MEMBERSHIP),
        FARE(BieuPhi.class, PolicyPublicationDAO.Table.FARE),
        SURCHARGE(ChinhSachPhuThu.class, PolicyPublicationDAO.Table.SURCHARGE);
        final Class<?> entity;
        final PolicyPublicationDAO.Table table;
        Kind(Class<?> entity, PolicyPublicationDAO.Table table) {
            this.entity = entity; this.table = table;
        }
        String scope(Object p) {
            return switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).getHang().name();
                case FARE -> "all";
                case SURCHARGE -> ((ChinhSachPhuThu) p).getMaLoaiPhuThu();
            };
        }
        PolicyStatus status(Object p) {
            return switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).getTrangThai();
                case FARE -> ((BieuPhi) p).getTrangThai();
                case SURCHARGE -> ((ChinhSachPhuThu) p).getTrangThai();
            };
        }
        Instant start(Object p) {
            return switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).getHieuLucTu();
                case FARE -> ((BieuPhi) p).getHieuLucTu();
                case SURCHARGE -> ((ChinhSachPhuThu) p).getHieuLucTu();
            };
        }
        Instant end(Object p) {
            return switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).getHieuLucDen();
                case FARE -> ((BieuPhi) p).getHieuLucDen();
                case SURCHARGE -> ((ChinhSachPhuThu) p).getHieuLucDen();
            };
        }
        void publish(Object p) {
            switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).setTrangThai(PolicyStatus.CONG_BO);
                case FARE -> ((BieuPhi) p).setTrangThai(PolicyStatus.CONG_BO);
                case SURCHARGE -> ((ChinhSachPhuThu) p).setTrangThai(PolicyStatus.CONG_BO);
            }
        }
        void close(Object p, Instant end) {
            switch (this) {
                case MEMBERSHIP -> ((ChinhSachThanhVien) p).setHieuLucDen(end);
                case FARE -> ((BieuPhi) p).setHieuLucDen(end);
                case SURCHARGE -> ((ChinhSachPhuThu) p).setHieuLucDen(end);
            }
        }
    }
}
