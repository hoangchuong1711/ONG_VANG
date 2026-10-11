package com.miniongvang.service;

import com.miniongvang.DAO.DispatchDAO;
import com.miniongvang.DAO.DonHangDAO;
import com.miniongvang.DAO.LanThanhToanDAO;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/** UC-08 payment attempts and cash collection. VNPay authority is supplied by T15. */
public final class PaymentService {
    private final TransactionRunner transactions;
    private final Clock clock;

    public PaymentService(EntityManagerFactory factory) { this(factory, Clock.systemUTC()); }
    public PaymentService(EntityManagerFactory factory, Clock clock) {
        this.transactions = new TransactionRunner(factory);
        this.clock = clock;
    }

    public Payment createCash(AuthService.User actor, String orderId, String key) {
        id(orderId);
        if (key == null || key.isBlank() || key.length() > 100 || !key.equals(key.strip()))
            throw new IllegalArgumentException("Invalid Idempotency-Key");
        return transactions.run(em -> {
            account(em, actor, AccountRole.KHACH_HANG);
            DonHang order = new DonHangDAO(em).findForUpdate(orderId);
            if (order == null || !order.getKhachHang().getId().equals(actor.maKh()))
                throw new NoSuchElementException("Order not found");
            var payments = new LanThanhToanDAO(em);
            String reference = reference(actor.maNguoiDung(), key);
            LanThanhToan replay = payments.findByReference(reference);
            if (replay != null) {
                if (!replay.getDonHang().getId().equals(orderId) || replay.getPhuongThuc() != PaymentMethod.TIEN_MAT)
                    throw new Conflict("IDEMPOTENCY_CONFLICT");
                return view(em, replay);
            }
            if (order.getTrangThai() != OrderStatus.HOAN_TAT) throw new Conflict("ORDER_STATE_CONFLICT");
            BigDecimal due = fare(em, orderId);
            if (due.signum() == 0) throw new NotRequired();
            if (payments.confirmed(orderId)) throw new Conflict("PAYMENT_ALREADY_PAID");
            if (payments.hasUnresolved(orderId)) throw new Conflict("PAYMENT_PENDING");
            LanThanhToan payment = new LanThanhToan();
            payment.setId(UUID.randomUUID().toString());
            payment.setDonHang(order);
            payment.setMaThamChieu(reference);
            payment.setPhuongThuc(PaymentMethod.TIEN_MAT);
            payment.setTrangThai(PaymentStatus.CHO_XU_LY);
            payment.setTaoLuc(clock.instant());
            em.persist(payment);
            em.flush();
            return view(em, payment);
        });
    }

    public CashResult confirmCash(AuthService.User actor, String paymentId, BigDecimal received) {
        id(paymentId);
        if (received == null || received.signum() <= 0 || received.scale() > 2
                || received.stripTrailingZeros().scale() > 0
                || received.toBigInteger().toString().length() > 13)
            throw new IllegalArgumentException("Invalid received amount");
        return transactions.run(em -> {
            TaiKhoan confirmer = account(em, actor, AccountRole.TAI_XE, AccountRole.TONG_DAI);
            LanThanhToan existing = em.find(LanThanhToan.class, paymentId);
            if (existing == null) throw new NoSuchElementException("Payment not found");
            String orderId = existing.getDonHang().getId();
            DonHang order = new DonHangDAO(em).findForUpdate(orderId);
            LanThanhToan payment = em.find(LanThanhToan.class, paymentId);
            em.refresh(payment);
            if (payment.getPhuongThuc() != PaymentMethod.TIEN_MAT) throw new Conflict("PAYMENT_METHOD_CONFLICT");
            if (actor.vaiTro() == AccountRole.TAI_XE
                    && !new DispatchDAO(em).completedBy(orderId, actor.maTx()))
                throw new SecurityException("Wrong driver");
            if (order.getTrangThai() != OrderStatus.HOAN_TAT) throw new Conflict("ORDER_STATE_CONFLICT");
            BigDecimal due = fare(em, orderId);
            if (due.signum() == 0) throw new NotRequired();
            var payments = new LanThanhToanDAO(em);
            if (payment.getTrangThai() == PaymentStatus.THANH_CONG) {
                if (payment.getSoTienThucNhan().compareTo(received) != 0)
                    throw new Conflict("PAYMENT_AMOUNT_MISMATCH");
                return new CashResult(view(em, payment), !payments.confirmedBy(orderId, paymentId));
            }
            if (payment.getTrangThai() != PaymentStatus.CHO_XU_LY)
                throw new Conflict("PAYMENT_STATE_CONFLICT");
            Instant now = clock.instant();
            payment.setTrangThai(PaymentStatus.THANH_CONG);
            payment.setGiaiQuyetLuc(now);
            payment.setThuLuc(now);
            payment.setSoTienThucNhan(received.setScale(2));
            payment.setTaiKhoanXacNhan(confirmer);
            boolean reconcile = received.compareTo(due) != 0 || payments.confirmed(orderId);
            if (!reconcile) {
                XacNhanThanhToanDonHang confirmation = new XacNhanThanhToanDonHang();
                confirmation.setDonHang(order);
                confirmation.setLanThanhToan(payment);
                em.persist(confirmation);
            }
            em.flush();
            return new CashResult(view(em, payment), reconcile);
        });
    }

    public Payment get(AuthService.User actor, String paymentId) {
        id(paymentId);
        return transactions.run(em -> {
            account(em, actor, AccountRole.KHACH_HANG, AccountRole.TAI_XE, AccountRole.TONG_DAI);
            LanThanhToan payment = em.find(LanThanhToan.class, paymentId);
            if (payment == null || !visible(em, actor, payment.getDonHang()))
                throw new NoSuchElementException("Payment not found");
            return view(em, payment);
        });
    }

    public PaymentPage list(AuthService.User actor, String orderId, int page, int size) {
        id(orderId);
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw new IllegalArgumentException("Invalid pagination");
        return transactions.run(em -> {
            account(em, actor, AccountRole.KHACH_HANG, AccountRole.TAI_XE, AccountRole.TONG_DAI);
            DonHang order = new DonHangDAO(em).find(orderId);
            if (order == null || !visible(em, actor, order)) throw new NoSuchElementException("Order not found");
            var dao = new LanThanhToanDAO(em);
            long total = dao.countAttempts(orderId);
            List<Payment> items = dao.findAttempts(orderId, page, size).stream().map(p -> view(em, p)).toList();
            return new PaymentPage(items, page, size, total, (total + size - 1) / size);
        });
    }

    private static BigDecimal fare(EntityManager em, String orderId) {
        var details = new DonHangDAO(em).findDetailsV1(orderId);
        if (details == null || details.fare() == null) throw new IllegalStateException("Order fare missing");
        BigDecimal extras = details.surcharges().stream()
                .map(p -> p.getChinhSachPhuThu().getSoTien()).reduce(BigDecimal.ZERO, BigDecimal::add);
        return details.fare().getCuocGoc().add(extras).subtract(details.fare().getTienGiamGia());
    }

    private static Payment view(EntityManager em, LanThanhToan payment) {
        String orderId = payment.getDonHang().getId();
        boolean confirmed = new LanThanhToanDAO(em).confirmedBy(orderId, payment.getId());
        return new Payment(payment.getId(), orderId, fare(em, orderId).setScale(2).toPlainString(),
                payment.getPhuongThuc(), payment.getTrangThai(), payment.getMaGiaoDichDoiTac(),
                payment.getTaoLuc().toString(), payment.getThuLuc() == null ? null : payment.getThuLuc().toString(),
                null, confirmed, payment.getSoTienThucNhan() == null ? null
                : payment.getSoTienThucNhan().setScale(2).toPlainString(),
                payment.getTrangThai() == PaymentStatus.THANH_CONG && !confirmed);
    }

    private static boolean visible(EntityManager em, AuthService.User actor, DonHang order) {
        return switch (actor.vaiTro()) {
            case TONG_DAI -> true;
            case KHACH_HANG -> order.getKhachHang().getId().equals(actor.maKh());
            case TAI_XE -> new DispatchDAO(em).relatedDriver(order.getId(), actor.maTx());
            default -> false;
        };
    }

    private static TaiKhoan account(EntityManager em, AuthService.User actor, AccountRole... roles) {
        if (actor == null) throw new SecurityException("Missing actor");
        boolean allowed = false;
        for (AccountRole role : roles) if (role == actor.vaiTro()) allowed = true;
        if (!allowed) throw new SecurityException("Role not allowed");
        TaiKhoan account = em.find(TaiKhoan.class, actor.maNguoiDung());
        if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG
                || account.getVaiTro() != actor.vaiTro()) throw new SecurityException("Account unavailable");
        String bound = switch (actor.vaiTro()) {
            case TONG_DAI -> account.getId();
            case KHACH_HANG -> { KhachHang p = actor.maKh() == null ? null : em.find(KhachHang.class, actor.maKh());
                yield p == null ? null : p.getTaiKhoan().getId(); }
            case TAI_XE -> { TaiXe p = actor.maTx() == null ? null : em.find(TaiXe.class, actor.maTx());
                yield p == null ? null : p.getTaiKhoan().getId(); }
            default -> null;
        };
        if (!account.getId().equals(bound)) throw new SecurityException("Profile mismatch");
        return account;
    }

    private static String reference(String actorId, String key) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((actorId + "\u0000createPayment\u0000" + key).getBytes(StandardCharsets.UTF_8));
            return "CASH-" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }

    private static void id(String id) {
        if (id == null || id.isBlank() || id.length() > 36 || !id.equals(id.strip()))
            throw new IllegalArgumentException("Invalid id");
    }

    public record Payment(String maGiaoDich, String maDon, String soTien, PaymentMethod phuongThuc,
                          PaymentStatus trangThai, String maGiaoDichDoiTac, String taoLuc,
                          String thoiGianThanhToan, String paymentUrl, boolean daXacNhanDu,
                          String soTienThucNhan, boolean canDoiSoat) {}
    public record PaymentPage(List<Payment> items, int page, int size, long totalElements, long totalPages) {}
    public record CashResult(Payment payment, boolean canDoiSoat) {}
    public static final class Conflict extends RuntimeException { public Conflict(String code) { super(code); } }
    public static final class NotRequired extends RuntimeException {}
}
