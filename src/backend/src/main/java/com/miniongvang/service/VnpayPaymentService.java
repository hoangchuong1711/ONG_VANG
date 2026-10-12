package com.miniongvang.service;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dto.payment.PaymentDtos.Payment;

import com.miniongvang.dao.DonHangDAO;
import com.miniongvang.dao.LanThanhToanDAO;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import com.miniongvang.integration.VnpayGateway;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.TreeMap;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

/** Stores every provider observation before changing a payment, under the order lock. */
public final class VnpayPaymentService {
    private static final ObjectMapper JSON=new ObjectMapper();
    private static final DateTimeFormatter PAY_DATE=DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private final TransactionRunner transactions;
    private final VnpayGateway gateway;
    private final Clock clock;

    public VnpayPaymentService(EntityManagerFactory factory,VnpayGateway gateway) {
        this(factory,gateway,Clock.systemUTC());
    }
    public VnpayPaymentService(EntityManagerFactory factory,VnpayGateway gateway,Clock clock) {
        this.transactions=new TransactionRunner(factory); this.gateway=gateway; this.clock=clock;
    }

    public Result ipn(String raw) { return callback(PaymentEventSource.VNPAY_IPN,raw); }
    public Result browserReturn(String raw) { return callback(PaymentEventSource.VNPAY_RETURN,raw); }

    private Result callback(PaymentEventSource source,String raw) {
        Map<String,String> fields;
        try { fields=gateway.parseQuery(raw); }
        catch (IllegalArgumentException invalid) {
            String evidence=raw==null?"":raw.substring(0,Math.min(raw.length(),8192));
            return recordMalformed(source,evidence);
        }
        if (fields.size()>50 || fields.toString().length()>16384)
            return recordMalformed(source,raw.substring(0,Math.min(raw.length(),8192)));
        return apply(source,fields);
    }

    private Result recordMalformed(PaymentEventSource source,String evidence) {
        return transactions.run(em -> {
            String hash=digest(evidence);
            SuKienThanhToan previous=findEvent(em,source,hash);
            if (previous!=null) return new Result(previous.getKetQuaXuLy(),true);
            event(em,source,hash,null,false,PaymentEventResult.KHONG_HOP_LE,Map.of("raw",evidence));
            return new Result(PaymentEventResult.KHONG_HOP_LE,false);
        });
    }

    public Result apply(PaymentEventSource source,Map<String,String> fields) {
        if (fields==null || fields.size()>50 || fields.toString().length()>16384)
            throw new IllegalArgumentException("Invalid provider message");
        Map<String,String> snapshot=new TreeMap<>(fields);
        String hash=digest(JSON.writeValueAsString(snapshot));
        boolean signature=source==PaymentEventSource.VNPAY_QUERY
                ?gateway.verifyQuery(snapshot):gateway.verifyCallback(snapshot);
        return transactions.run(em -> {
            String reference=snapshot.get("vnp_TxnRef");
            LanThanhToan payment=reference==null?null:new LanThanhToanDAO(em).findByReference(reference);
            if (payment!=null) {
                new DonHangDAO(em).findForUpdate(payment.getDonHang().getId());
                em.refresh(payment);
            }
            SuKienThanhToan previous=findEvent(em,source,hash);
            if (previous!=null) return new Result(previous.getKetQuaXuLy(),true);
            PaymentEventResult result;
            if (!signature) result=PaymentEventResult.KHONG_HOP_LE;
            else if (source==PaymentEventSource.VNPAY_RETURN) result=PaymentEventResult.KHONG_THAY_DOI;
            else result=verified(em,payment,snapshot,source);
            event(em,source,hash,payment,signature,result,snapshot);
            em.flush();
            return new Result(result,false);
        });
    }

    private PaymentEventResult verified(EntityManager em,LanThanhToan payment,Map<String,String> message,
                                        PaymentEventSource source) {
        if (payment==null) return PaymentEventResult.KHONG_KHOP;
        String orderId=payment.getDonHang().getId();
        if (payment.getPhuongThuc()!=PaymentMethod.VNPAY_QR
                || !payment.getMaThamChieu().equals(message.get("vnp_TxnRef"))
                || !message.getOrDefault("vnp_OrderInfo","").equals(source==PaymentEventSource.VNPAY_QUERY
                        ? "Query "+payment.getMaThamChieu() : VnpayGateway.orderInfo(orderId)))
            return PaymentEventResult.KHONG_KHOP;
        BigDecimal received;
        try {
            String raw=message.get("vnp_Amount");
            if (raw==null || !raw.matches("[0-9]{1,12}")) return PaymentEventResult.KHONG_KHOP;
            received=new BigDecimal(raw).movePointLeft(2);
        } catch (ArithmeticException invalid) { return PaymentEventResult.KHONG_KHOP; }
        String response=message.get("vnp_ResponseCode"), status=message.get("vnp_TransactionStatus");
        if (response==null || status==null) return PaymentEventResult.KHONG_KHOP;
        if (message.containsKey("vnp_Command") && !"querydr".equals(message.get("vnp_Command")))
            return PaymentEventResult.KHONG_KHOP;
        if (message.containsKey("vnp_TransactionType") && !"01".equals(message.get("vnp_TransactionType")))
            return PaymentEventResult.CAN_DOI_SOAT;
        if (source==PaymentEventSource.VNPAY_QUERY) {
            if (!"00".equals(response)) return PaymentEventResult.KHONG_THAY_DOI;
            if ("01".equals(status) || "05".equals(status)) return PaymentEventResult.KHONG_THAY_DOI;
        } else if ("00".equals(response)!= "00".equals(status)) return PaymentEventResult.CAN_DOI_SOAT;
        var dao=new LanThanhToanDAO(em);
        if ("00".equals(status)) {
            String partner=message.get("vnp_TransactionNo");
            if (partner==null || partner.isBlank() || partner.length()>100 || received.signum()<=0)
                return PaymentEventResult.KHONG_KHOP;
            if (payment.getTrangThai()==PaymentStatus.THANH_CONG) {
                return partner.equals(payment.getMaGiaoDichDoiTac())
                        && received.compareTo(payment.getSoTienThucNhan())==0
                        ?PaymentEventResult.KHONG_THAY_DOI:PaymentEventResult.CAN_DOI_SOAT;
            }
            if (payment.getMaGiaoDichDoiTac()!=null && !partner.equals(payment.getMaGiaoDichDoiTac()))
                return PaymentEventResult.CAN_DOI_SOAT;
            Instant collected=payTime(message.get("vnp_PayDate"));
            Instant resolved=clock.instant();
            if (resolved.isBefore(payment.getTaoLuc())) resolved=payment.getTaoLuc();
            payment.setTrangThai(PaymentStatus.THANH_CONG);
            payment.setGiaiQuyetLuc(resolved); payment.setThuLuc(collected);
            payment.setSoTienThucNhan(received); payment.setMaGiaoDichDoiTac(partner);
            BigDecimal due=PaymentService.fare(em,orderId);
            boolean reconcile=received.compareTo(due)!=0 || dao.confirmed(orderId);
            if (!reconcile) {
                XacNhanThanhToanDonHang confirmation=new XacNhanThanhToanDonHang();
                confirmation.setDonHang(payment.getDonHang()); confirmation.setLanThanhToan(payment);
                em.persist(confirmation);
            }
            return reconcile?PaymentEventResult.CAN_DOI_SOAT:PaymentEventResult.DA_AP_DUNG;
        }
        if (payment.getTrangThai()==PaymentStatus.THANH_CONG) return PaymentEventResult.CAN_DOI_SOAT;
        if (source==PaymentEventSource.VNPAY_QUERY && !"02".equals(status))
            return PaymentEventResult.CAN_DOI_SOAT;
        if (payment.getTrangThai()==PaymentStatus.THAT_BAI || payment.getTrangThai()==PaymentStatus.DA_HUY)
            return PaymentEventResult.KHONG_THAY_DOI;
        Instant resolved=clock.instant();
        if (resolved.isBefore(payment.getTaoLuc())) resolved=payment.getTaoLuc();
        payment.setTrangThai("24".equals(response)?PaymentStatus.DA_HUY:PaymentStatus.THAT_BAI);
        payment.setGiaiQuyetLuc(resolved);
        return PaymentEventResult.DA_AP_DUNG;
    }

    public Payment reconcile(ActorContext actor,String paymentId) {
        if (paymentId==null || paymentId.isBlank() || paymentId.length()>36)
            throw new IllegalArgumentException("Invalid payment ID");
        // Read and call the gateway without holding an order/database lock.
        ReconcileTarget target=transactions.run(em -> {
            PaymentService.account(em,actor,AccountRole.KHACH_HANG,AccountRole.TONG_DAI);
            LanThanhToan payment=em.find(LanThanhToan.class,paymentId);
            if (payment==null) throw new NoSuchElementException("Payment not found");
            if (actor.vaiTro()==AccountRole.KHACH_HANG
                    && !payment.getDonHang().getKhachHang().getId().equals(actor.maKh()))
                throw new NoSuchElementException("Payment not found");
            if (payment.getPhuongThuc()!=PaymentMethod.VNPAY_QR)
                throw new PaymentService.Conflict("PAYMENT_METHOD_CONFLICT");
            return new ReconcileTarget(PaymentService.view(em,payment),payment.getMaThamChieu(),payment.getTaoLuc());
        });
        if (target.payment().trangThai()==PaymentStatus.THANH_CONG) return target.payment();
        Map<String,String> query;
        try {
            String serverIp=System.getenv("VNPAY_QUERY_IP");
            query=gateway.query(target.reference(),target.created(),
                    serverIp==null || serverIp.isBlank()?"127.0.0.1":serverIp);
        } catch (IllegalStateException unavailable) {
            transactions.run(em -> {
                LanThanhToan attempt=em.find(LanThanhToan.class,paymentId);
                new DonHangDAO(em).findForUpdate(attempt.getDonHang().getId());
                em.refresh(attempt);
                if (attempt.getTrangThai()==PaymentStatus.CHO_XU_LY)
                    attempt.setTrangThai(PaymentStatus.CHUA_RO_KET_QUA);
                return null;
            });
            return transactions.run(em -> PaymentService.view(em,em.find(LanThanhToan.class,paymentId)));
        }
        apply(PaymentEventSource.VNPAY_QUERY,query);
        markUnknown(paymentId);
        return transactions.run(em -> PaymentService.view(em,em.find(LanThanhToan.class,paymentId)));
    }

    private record ReconcileTarget(Payment payment,String reference,Instant created) {}

    private void markUnknown(String paymentId) {
        transactions.run(em -> {
            LanThanhToan attempt=em.find(LanThanhToan.class,paymentId);
            new DonHangDAO(em).findForUpdate(attempt.getDonHang().getId());
            em.refresh(attempt);
            if (attempt.getTrangThai()==PaymentStatus.CHO_XU_LY)
                attempt.setTrangThai(PaymentStatus.CHUA_RO_KET_QUA);
            return null;
        });
    }

    private Instant payTime(String raw) {
        try { return LocalDateTime.parse(raw,PAY_DATE).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant(); }
        catch (Exception invalid) { return clock.instant(); }
    }

    private static SuKienThanhToan findEvent(EntityManager em,PaymentEventSource source,String hash) {
        return new LanThanhToanDAO(em).findEvent(source, hash);
    }
    private void event(EntityManager em,PaymentEventSource source,String hash,LanThanhToan payment,
                       boolean valid,PaymentEventResult result,Map<String,String> message) {
        SuKienThanhToan event=new SuKienThanhToan();
        event.setId(UUID.randomUUID().toString()); event.setLanThanhToan(payment);
        event.setNguon(source); event.setKhoaSuKien(hash); event.setNhanLuc(clock.instant());
        event.setChuKyHopLe(valid); event.setKetQuaXuLy(result);
        Map<String,String> safe=new LinkedHashMap<>(message);
        safe.remove("vnp_SecureHash");
        event.setNoiDungJson(JSON.writeValueAsString(safe));
        em.persist(event);
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception impossible) { throw new IllegalStateException(impossible); }
    }
    public record Result(PaymentEventResult result,boolean duplicate) {}
}
