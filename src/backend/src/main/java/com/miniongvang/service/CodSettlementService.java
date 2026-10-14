package com.miniongvang.service;

import com.miniongvang.dao.CodSettlementDAO;
import com.miniongvang.entity.TaiXe;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.integration.VnpayGateway;
import com.miniongvang.security.ActorContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.TreeMap;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

/** COD is a settlement of freight cash already collected, never a second customer payment. */
public final class CodSettlementService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final TransactionRunner tx;
    private final VnpayGateway gateway;
    public CodSettlementService(EntityManagerFactory factory, VnpayGateway gateway) {
        tx = new TransactionRunner(factory); this.gateway = gateway;
    }

    public record Item(String maDon, String maGiaoDich, String soTien, String trangThaiDon) {}
    public record Driver(String maTx, String hoTen, String bienSoXe, String khuVuc,
                         String soTienDangGiu, String soTienDuDieuKienNop, String soTienCanDoiSoat,
                         int soDon, String maDotDangCho, List<Item> items) {}
    public record Batch(String maDot, String maTx, String soTien, String trangThai,
                        String paymentUrl, String maThamChieu, String taoLuc, String xacNhanLuc, List<Item> items) {}
    public record Callback(String code, String maDot) {}

    public List<Driver> drivers(ActorContext actor) {
        return tx.run(em -> {
            PaymentService.account(em, actor, AccountRole.TONG_DAI, AccountRole.CHU_DOI_XE);
            List<Driver> result = new ArrayList<>();
            var dao = new CodSettlementDAO(em);
            for (TaiXe driver : dao.drivers()) {
                List<Item> items = cashItems(em, driver.getId(), false);
                BigDecimal holding = items.stream().map(i -> new BigDecimal(i.soTien())).reduce(BigDecimal.ZERO, BigDecimal::add);
                List<Item> eligible = cashItems(em, driver.getId(), true);
                BigDecimal due = eligible.stream().map(i -> new BigDecimal(i.soTien())).reduce(BigDecimal.ZERO, BigDecimal::add);
                String pending = dao.pendingBatch(driver.getId());
                result.add(new Driver(driver.getId(), driver.getTaiKhoan().getHoTen(), dao.plate(driver.getId()),
                        driver.getViTriDemoDiaChi(), money(holding), money(due), money(holding.subtract(due)),
                        items.size(), pending, List.copyOf(items)));
            }
            return List.copyOf(result);
        });
    }

    public Batch create(ActorContext actor, String driverId, String key, String ip) {
        if (driverId == null || driverId.isBlank() || key == null || key.isBlank() || key.length() > 100)
            throw new IllegalArgumentException("Invalid COD request");
        return tx.run(em -> {
            PaymentService.account(em, actor, AccountRole.TONG_DAI);
            TaiXe driver = em.find(TaiXe.class, driverId, LockModeType.PESSIMISTIC_WRITE);
            if (driver == null) throw new NoSuchElementException("Driver not found");
            var dao = new CodSettlementDAO(em);
            String replay = dao.idempotentBatch(actor.maNguoiDung(), key);
            if (replay != null) {
                Batch batch = batch(em, replay);
                if (!batch.maTx().equals(driverId)) throw new PaymentService.Conflict("IDEMPOTENCY_CONFLICT");
                return batch;
            }
            String pending = dao.pendingBatch(driverId);
            if (pending != null) return batch(em, pending);
            String failed = dao.failedBatch(driverId);
            if (failed != null) {
                String oldId = failed;
                Batch old = batch(em, oldId);
                dao.reopen(oldId);
                attempt(em, oldId, new BigDecimal(old.soTien()), Instant.now(), ip);
                return batch(em, oldId);
            }
            List<Item> items = cashItems(em, driverId, true).stream().filter(i -> !dao.batched(i.maGiaoDich())).toList();
            if (items.isEmpty()) throw new PaymentService.Conflict("COD_EMPTY");
            BigDecimal total = items.stream().map(i -> new BigDecimal(i.soTien())).reduce(BigDecimal.ZERO, BigDecimal::add);
            String id = UUID.randomUUID().toString();
            Instant now = Instant.now();
            dao.insertBatch(id,driverId,actor.maNguoiDung(),key,now,total);
            for (Item item : items) dao.insertItem(id,item.maGiaoDich(),new BigDecimal(item.soTien()));
            attempt(em, id, total, now, ip);
            return batch(em, id);
        });
    }

    public Batch get(ActorContext actor, String id) {
        return tx.run(em -> {
            PaymentService.account(em, actor, AccountRole.TONG_DAI, AccountRole.CHU_DOI_XE);
            return batch(em, id);
        });
    }

    public Batch reconcile(ActorContext actor, String id) {
        Batch current = get(actor, id);
        if (actor.vaiTro() != AccountRole.TONG_DAI) throw new SecurityException("Dispatcher required");
        if (current.maThamChieu() == null || "THANH_CONG".equals(current.trangThai())) return current;
        Instant created = Instant.parse(current.taoLuc());
        Map<String,String> query = gateway.query(current.maThamChieu(), created, "127.0.0.1");
        apply("VNPAY_QUERY", query);
        return get(actor, id);
    }

    public Callback callback(String source, String raw) {
        try { return apply(source, gateway.parseQuery(raw)); }
        catch (IllegalArgumentException invalid) { return new Callback("97", null); }
    }

    public Callback apply(String source, Map<String,String> fields) {
        if (fields == null || fields.size() > 50 || !List.of("VNPAY_IPN", "VNPAY_RETURN", "VNPAY_QUERY").contains(source))
            return new Callback("97", null);
        boolean signed = "VNPAY_QUERY".equals(source) ? gateway.verifyQuery(fields) : gateway.verifyCallback(fields);
        String reference = fields.get("vnp_TxnRef");
        String hash = digest(JSON.writeValueAsString(new TreeMap<>(fields)));
        return tx.run(em -> {
            var dao = new CodSettlementDAO(em);
            String batchId = reference == null ? null : dao.batchByReference(reference);
            if (batchId != null) em.find(TaiXe.class, dao.batchDriver(batchId), LockModeType.PESSIMISTIC_WRITE);
            if (dao.hasEvent(source, hash)) return new Callback("02", batchId);
            String result = "KHONG_KHOP";
            if (!signed) result = "KHONG_HOP_LE";
            else if (batchId != null) {
                Batch batch = batch(em, batchId);
                boolean info = "VNPAY_QUERY".equals(source) || VnpayGateway.codOrderInfo(batchId).equals(fields.get("vnp_OrderInfo"));
                boolean amount = new BigDecimal(batch.soTien()).movePointRight(2).toBigInteger().toString().equals(fields.get("vnp_Amount"));
                if (info && amount) {
                    if ("VNPAY_RETURN".equals(source)) result = "HIEN_THI";
                    else if ("00".equals(fields.get("vnp_ResponseCode")) && "00".equals(fields.get("vnp_TransactionStatus"))
                            && fields.get("vnp_TransactionNo") != null && !fields.get("vnp_TransactionNo").isBlank()) {
                        if ("THANH_CONG".equals(batch.trangThai())) result = "CAN_DOI_SOAT";
                        else {
                            dao.markOtherAttemptsForReview(batchId, reference);
                            dao.settle(batchId, reference, new BigDecimal(batch.soTien()), fields.get("vnp_TransactionNo"), Instant.now());
                            result = "DA_AP_DUNG";
                        }
                    } else if ("VNPAY_QUERY".equals(source) || "VNPAY_IPN".equals(source)) {
                        result = "KHONG_THAY_DOI";
                        if (!"THANH_CONG".equals(batch.trangThai()) && "02".equals(fields.get("vnp_TransactionStatus"))) {
                            dao.fail(batchId, reference);
                        }
                    }
                }
            }
            Map<String,String> safe = new TreeMap<>(fields); safe.remove("vnp_SecureHash");
            dao.event(reference, source, hash, signed, result, JSON.writeValueAsString(safe), Instant.now());
            return new Callback("KHONG_HOP_LE".equals(result) ? "97" : "KHONG_KHOP".equals(result) ? "01" : "00", batchId);
        });
    }

    private void attempt(EntityManager em, String batchId, BigDecimal total, Instant now, String ip) {
        String reference = "COD" + UUID.randomUUID().toString().replace("-", "");
        String url = gateway.codPaymentUrl(reference, batchId, total, now, ip);
        new CodSettlementDAO(em).insertAttempt(batchId, reference, url, now);
    }

    private static Batch batch(EntityManager em, String id) {
        var dao = new CodSettlementDAO(em);
        var row = dao.batch(id);
        if (row == null) throw new NoSuchElementException("Batch not found");
        List<Item> items = dao.batchItems(id).stream()
                .map(v -> new Item(v.orderId(), v.paymentId(), money(v.amount()), v.orderStatus())).toList();
        return new Batch(id, row.driverId(), money(row.total()), row.status(), row.paymentUrl(), row.reference(),
                row.created().toString(), row.confirmed() == null ? null : row.confirmed().toString(), items);
    }

    private static List<Item> cashItems(EntityManager em, String driverId, boolean completedOnly) {
        return new CodSettlementDAO(em).cashItems(driverId, completedOnly).stream()
                .map(v -> new Item(v.orderId(), v.paymentId(), money(v.amount()), v.orderStatus())).toList();
    }
    private static String money(BigDecimal value) { return value.setScale(2).toPlainString(); }
    private static String digest(String data) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception impossible) { throw new IllegalStateException(impossible); }
    }
}
