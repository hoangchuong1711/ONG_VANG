package com.miniongvang.service;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.dao.DesignV2PaymentDAO;
import com.miniongvang.integration.VnpayGateway;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import tools.jackson.databind.ObjectMapper;

/** Driver settlement and finance read/write use cases backed by the V2 payment ledger. */
public final class DesignV2PaymentService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    public record PaymentPage(List<Map<String, Object>> items, long total) {}
    private final DesignV2PaymentDAO payments;
    private final DesignV2AccountService accounts;

    public DesignV2PaymentService() { this(new DesignV2PaymentDAO(), new DesignV2AccountService()); }
    public DesignV2PaymentService(DesignV2PaymentDAO payments) { this(payments, new DesignV2AccountService()); }
    public DesignV2PaymentService(DesignV2PaymentDAO payments, DesignV2AccountService accounts) {
        this.payments = payments;
        this.accounts = accounts;
    }

    public Map<String, Object> findDriverFinance(Connection c, String accountId) throws SQLException {
        return payments.findDriverFinance(c, accountId);
    }
    public Map<String, Object> findEarnings(Connection c, Timestamp from, Timestamp until) throws SQLException {
        return payments.findEarnings(c, from, until);
    }
    public Map<String, Object> beginSettlement(Connection c, String key) throws SQLException {
        return payments.beginSettlement(c, key);
    }
    public void savePaymentUrlIfAbsent(Connection c, String id, String url) throws SQLException {
        payments.savePaymentUrlIfAbsent(c, id, url);
    }
    public String findPaymentUrl(Connection c, String id) throws SQLException { return payments.findPaymentUrl(c, id); }
    public Map<String, Object> findPaymentByReference(Connection c, String reference) throws SQLException {
        return payments.findPaymentByReference(c, reference);
    }
    public Map<String, Object> findPendingPaymentForAccount(Connection c, String accountId) throws SQLException {
        return payments.findPendingPaymentForAccount(c, accountId);
    }
    public List<Map<String, Object>> findExpiredPendingAccounts(Connection c) throws SQLException {
        return payments.findExpiredPendingAccounts(c);
    }
    public PaymentPage findAdminPayments(Connection c, String status, int page, int size) throws SQLException {
        DesignV2PaymentDAO.PaymentPage result = payments.findAdminPayments(c, status, page, size);
        return new PaymentPage(result.items(), result.total());
    }
    public boolean paymentExists(Connection c, String id) throws SQLException { return payments.paymentExists(c, id); }
    public List<Map<String, Object>> findPaymentEvents(Connection c, String id) throws SQLException {
        return payments.findPaymentEvents(c, id);
    }
    public void applyPaymentResult(Connection c, String reference, String source, byte[] hash, String payload,
            boolean success, BigDecimal amount, String partner) throws SQLException {
        payments.applyPaymentResult(c, reference, source, hash, payload, success, amount, partner);
    }
    public void recordObservation(Connection c, String reference, String source, byte[] hash,
            boolean valid, String result, String payload) throws SQLException {
        payments.recordObservation(c, reference, source, hash, valid, result, payload);
    }
    public Map<String, Object> findCompanySettlementReport(Connection c) throws SQLException {
        return payments.findCompanySettlementReport(c);
    }

    public Map<String, Object> finance(Connection c, String accountId) throws SQLException {
        Map<String, Object> result = payments.findDriverFinance(c, accountId);
        if (result == null) throw new DesignV2Problem(404, "RESOURCE_NOT_FOUND", "Thiếu hồ sơ tài xế");
        return result;
    }

    public Map<String, Object> earnings(Connection c, String accountId, LocalDate start, LocalDate end) throws SQLException {
        if (start == null || end == null || !end.isAfter(start))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Khoảng ngày không hợp lệ");
        Timestamp from = Timestamp.from(start.atStartOfDay(VIETNAM).toInstant());
        Timestamp until = Timestamp.from(end.plusDays(1).atStartOfDay(VIETNAM).toInstant());
        Map<String, Object> income = payments.findEarnings(c, from, until);
        if (income == null) income = Map.of();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("tu", start.toString());
        response.put("den", end.toString());
        response.put("thu_nhap_trong_ky", income);
        response.put("con_phai_nop_toan_lich_su", finance(c, accountId).get("con_phai_nop"));
        return response;
    }

    public Map<String, Object> beginSettlement(Connection c, String key, String ip) throws Exception {
        Map<String, Object> settlement = payments.beginSettlement(c, key);
        if (settlement == null) throw new SQLException("Settlement procedure returned no row");
        if (!"CHO_XU_LY".equals(settlement.get("trang_thai"))
                && !"CHUA_RO_KET_QUA".equals(settlement.get("trang_thai"))) return settlement;
        Instant created = Instant.parse((String) settlement.get("tao_luc"));
        if (created.plusSeconds(15 * 60).isBefore(Instant.now())) {
            settlement.put("payment_url", null);
            settlement.put("can_tra_cuu", true);
            return settlement;
        }
        String url = (String) settlement.get("payment_url");
        if (url == null) {
            VnpayGateway gateway = VnpayGateway.fromEnvironment();
            url = gateway.settlementPaymentUrl((String) settlement.get("ma_tham_chieu"),
                    new BigDecimal(settlement.get("so_tien_yeu_cau").toString()), created, ip);
            payments.savePaymentUrlIfAbsent(c, (String) settlement.get("ma_giao_dich"), url);
            String persisted = payments.findPaymentUrl(c, (String) settlement.get("ma_giao_dich"));
            if (persisted != null) url = persisted;
        }
        settlement.put("payment_url", url);
        return settlement;
    }

    public Map<String, String> handleIpn(PersistenceContext persistence, String queryString) throws Exception {
        VnpayGateway gateway = VnpayGateway.fromEnvironment();
        Map<String, String> fields;
        try { fields = gateway.parseQuery(queryString); }
        catch (IllegalArgumentException invalid) { return response("97", "Invalid message"); }
        if (!gateway.verifyCallback(fields)) {
            recordPaymentObservation(persistence, fields, "IPN", "KHONG_HOP_LE", false);
            return response("97", "Invalid signature");
        }
        String reference = fields.get("vnp_TxnRef");
        try (Connection c = persistence.dataSource().getConnection()) {
            Map<String, Object> payment = payments.findPaymentByReference(c, reference);
            if (payment == null) {
                recordPaymentObservation(persistence, fields, "IPN", "KHONG_KHOP", true);
                return response("01", "Unknown payment");
            }
            BigDecimal expected = decimal(payment, "so_tien_yeu_cau").movePointRight(2);
            String currency = fields.get("vnp_CurrCode");
            BigDecimal actualAmount;
            try { actualAmount = new BigDecimal(fields.get("vnp_Amount")); }
            catch (RuntimeException invalid) { actualAmount = null; }
            if ((currency != null && !"VND".equals(currency)) || actualAmount == null
                    || expected.compareTo(actualAmount) != 0
                    || !("Nop tien cong ty " + reference).equals(fields.get("vnp_OrderInfo"))) {
                recordPaymentObservation(persistence, fields, "IPN", "KHONG_KHOP", true);
                return response("04", "Payment mismatch");
            }
            if ("00".equals(fields.get("vnp_ResponseCode")) && "00".equals(fields.get("vnp_TransactionStatus"))) {
                String partner = fields.get("vnp_TransactionNo");
                if (partner == null || partner.isBlank()) return response("04", "Missing transaction");
                applyPayment(c, fields, "IPN", true, partner);
                return response("00", "Confirm Success");
            }
            recordPaymentObservation(persistence, fields, "IPN", "KHONG_THAY_DOI", true);
            return response("00", "Pending reconciliation");
        }
    }

    public Map<String, Object> reconcile(Connection c, String accountId) throws Exception {
        Map<String, Object> payment = payments.findPendingPaymentForAccount(c, accountId);
        if (payment == null) return finance(c, accountId);
        VnpayGateway gateway = VnpayGateway.fromEnvironment();
        Map<String, String> reply = gateway.query(payment.get("ma_tham_chieu").toString(),
                Instant.parse(payment.get("tao_luc").toString()),
                System.getenv().getOrDefault("VNPAY_QUERY_IP", "127.0.0.1"));
        if (!gateway.verifyQuery(reply) || !payment.get("ma_tham_chieu").equals(reply.get("vnp_TxnRef")))
            throw new DesignV2Problem(502, "VNPAY_QUERY_INVALID", "Kết quả tra cứu VNPay không hợp lệ");
        String code = reply.get("vnp_ResponseCode"), status = reply.get("vnp_TransactionStatus");
        if ("00".equals(code) && "00".equals(status)) {
            if (decimal(payment, "so_tien_yeu_cau").compareTo(new BigDecimal(reply.get("vnp_Amount")).movePointLeft(2)) != 0)
                throw new DesignV2Problem(409, "PAYMENT_AMOUNT_MISMATCH", "Số tiền VNPay không khớp");
            applyPayment(c, reply, "QUERY", true, reply.get("vnp_TransactionNo"));
        } else if ("91".equals(code) || ("00".equals(code) && "02".equals(status))) {
            applyPayment(c, reply, "QUERY", false, null);
        }
        return finance(c, accountId);
    }

    public int reconcilePending(PersistenceContext persistence) throws Exception {
        int processed = 0;
        try (Connection c = persistence.dataSource().getConnection()) {
            List<Map<String, Object>> pending = payments.findExpiredPendingAccounts(c);
            for (Map<String, Object> driver : pending) {
                String id = driver.get("ma_tk").toString();
                try {
                    accounts.setActorContext(c, id);
                    reconcile(c, id);
                    processed++;
                } catch (Exception failure) {
                    java.util.logging.Logger.getLogger(DesignV2PaymentService.class.getName())
                            .warning("VNPay reconciliation deferred: " + failure.getClass().getSimpleName());
                } finally {
                    accounts.setActorContext(c, null);
                }
            }
        }
        return processed;
    }

    public Map<String, Object> report(Connection c) throws SQLException { return findCompanySettlementReport(c); }

    private void applyPayment(Connection c, Map<String, String> fields, String source, boolean success, String partner)
            throws Exception {
        String reference = fields.get("vnp_TxnRef");
        Map<String, Object> payment = payments.findPaymentByReference(c, reference);
        if (payment == null) throw new DesignV2Problem(404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
        String json = JSON.writeValueAsString(new TreeMap<>(fields));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest((source + json).getBytes(StandardCharsets.UTF_8));
        payments.applyPaymentResult(c, reference, source, hash, json, success, decimal(payment, "so_tien_yeu_cau"), partner);
    }

    private void recordPaymentObservation(PersistenceContext persistence, Map<String, String> fields, String source,
            String result, boolean signatureValid) throws Exception {
        String json = JSON.writeValueAsString(new TreeMap<>(fields));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest((source + json).getBytes(StandardCharsets.UTF_8));
        try (Connection c = persistence.dataSource().getConnection()) {
            payments.recordObservation(c, fields.get("vnp_TxnRef"), source, hash, signatureValid, result, json);
        }
    }

    private static Map<String, String> response(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }

    private static BigDecimal decimal(Map<String, Object> row, String key) {
        return new BigDecimal(row.get(key).toString());
    }
}
