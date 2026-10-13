package com.miniongvang.service;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dto.quote.FareDtos.Fare;
import com.miniongvang.dto.quote.QuoteDtos.MembershipView;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;
import com.miniongvang.dto.quote.QuoteDtos.Quote;
import com.miniongvang.dto.quote.QuoteDtos.CreateQuote;
import com.miniongvang.dto.route.RouteDtos.Route;

import com.miniongvang.dao.BaoGiaDAO;
import com.miniongvang.dao.KhachHangDAO;
import com.miniongvang.dao.BieuPhiDAO;
import com.miniongvang.dao.ChinhSachPhuThuDAO;
import com.miniongvang.entity.BaoGia;
import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.ChinhSachPhuThu;
import com.miniongvang.entity.ChinhSachThanhVien;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.MembershipTier;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Pattern;
import tools.jackson.databind.ObjectMapper;

public final class QuoteService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern WEIGHT = Pattern.compile("^(0\\.(0[1-9]|[1-9][0-9]?)|[1-9][0-9]{0,7}(\\.[0-9]{1,2})?)$");
    private final TransactionRunner transactions;
    private final RouteService routes;
    private final Clock clock;
    private final MembershipPolicyService membership;
    private final FareCalculator calculator = new FareCalculator();

    public QuoteService(EntityManagerFactory factory, RouteService routes) {
        this(factory, routes, Clock.systemUTC());
    }

    public QuoteService(EntityManagerFactory factory, RouteService routes, Clock clock) {
        this.transactions = new TransactionRunner(factory);
        this.routes = routes;
        this.clock = clock;
        this.membership = new MembershipPolicyService(clock);
    }

    public Quote create(ActorContext actor, String requestedCustomerId, String origin,
                        String destination, List<Parcel> parcels) {
        return create(actor, new CreateQuote(requestedCustomerId, origin, destination, parcels,
                "NGUOI_DAT", "TIEN_MAT"));
    }

    public Quote create(ActorContext actor, CreateQuote request) {
        String requestedCustomerId = request.maKh();
        String origin = request.diemLayHang();
        String destination = request.diemGiaoHang();
        List<Parcel> parcels = request.kienHang();
        String payer = choice(request.benThanhToan(), "NGUOI_DAT", "NGUOI_NHAN");
        String method = choice(request.phuongThucThanhToan(), "TIEN_MAT", "VNPAY_QR");
        if (actor == null) throw new SecurityException("Authentication required");
        String customerId;
        if (actor.vaiTro() == AccountRole.KHACH_HANG) {
            customerId = actor.maKh();
            if (customerId == null || (requestedCustomerId != null && !customerId.equals(requestedCustomerId)))
                throw new SecurityException("Customer mismatch");
        } else if (actor.vaiTro() == AccountRole.TONG_DAI) {
            customerId = requestedCustomerId;
            if (customerId == null || customerId.isBlank() || customerId.length() > 36)
                throw new IllegalArgumentException("maKh is required for dispatcher");
        } else throw new SecurityException("Role cannot quote");
        List<Parcel> normalizedParcels = normalizeParcels(parcels);
        // Network route lookup must finish before a database transaction begins.
        Route route = routes.estimate(origin, destination);
        Instant now = clock.instant();
        return transactions.run(em -> {
            EvaluationV1 evaluated = evaluateV1(em, customerId, route, normalizedParcels, now);
            BieuPhi tariff = evaluated.tariff();
            Fare fare = evaluated.fare();
            MembershipView tier = evaluated.tier();
            Instant expiry = now.plusSeconds(300);
            Quote result = new Quote(UUID.randomUUID().toString(), expiry.toString(), route, fare, tier);
            BaoGia stored = new BaoGia();
            stored.setId(result.maBaoGia()); stored.setMaKh(customerId); stored.setMaBieuPhi(tariff.getId());
            stored.setTaoLuc(now); stored.setHetHanLuc(expiry);
            stored.setYeuCauJson(JSON.writeValueAsString(new FrozenRequest(customerId, route, normalizedParcels,
                    payer, method, cleanAddress(origin), cleanAddress(destination))));
            stored.setKetQuaJson(JSON.writeValueAsString(result));
            new BaoGiaDAO(em).persist(stored);
            return result;
        });
    }

    EvaluationV1 evaluateV1(jakarta.persistence.EntityManager em, String customerId,
                            Route route, Instant now) {
        return evaluateV1(em, customerId, route, List.of(), now);
    }

    EvaluationV1 evaluateV1(jakarta.persistence.EntityManager em, String customerId,
                            Route route, List<Parcel> parcels, Instant now) {
        BigDecimal km = new BigDecimal(route.quangDuongKm());
        BigDecimal kg = parcels.stream().map(p -> new BigDecimal(p.khoiLuongKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var customer = new KhachHangDAO(em).findWithAccount(customerId);
        if (customer == null) throw new NoSuchElementException("Customer not found");
        var matchingTariffs = new BieuPhiDAO(em).findApplicable(now, km);
        if (matchingTariffs.size() != 1) throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
        BieuPhi tariff = matchingTariffs.getFirst();
        List<ChinhSachPhuThu> extras = new ChinhSachPhuThuDAO(em).findApplicable(now);
        java.util.HashSet<String> types = new java.util.HashSet<>();
        for (ChinhSachPhuThu item : extras)
            if (!types.add(item.getMaLoaiPhuThu()))
                throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
        Fare before = calculator.calculateV1(km, kg, tariff, extras, BigDecimal.ZERO);
        BigDecimal subtotal = new BigDecimal(before.cuocGoc()).add(new BigDecimal(before.tienPhuThu()));
        MembershipPolicyService.Decision decision = membership.evaluate(em, customer, subtotal, now);
        Fare fare = calculator.calculateV1(km, kg, tariff, extras, decision.discount());
        ChinhSachThanhVien policy = decision.policy();
        MembershipView tier = customer.getMaHang() == MembershipTier.THUONG ? null
                : new MembershipView(customer.getMaHang().name(), customer.getMaHang().name(),
                        policy == null ? "0.00" : policy.getTyLeGiam().setScale(2).toPlainString(),
                        customer.getThanhVienDen() == null ? null
                                : customer.getThanhVienDen().minusMillis(1).atZone(VIETNAM).toLocalDate().toString(),
                        decision.active());
        return new EvaluationV1(tariff, fare, tier, extras, policy);
    }

    record EvaluationV1(BieuPhi tariff, Fare fare, MembershipView tier,
                        List<ChinhSachPhuThu> extras, ChinhSachThanhVien discountPolicy) {}

    static List<Parcel> normalizeParcels(List<Parcel> parcels) {
        if (parcels == null || parcels.isEmpty()) throw new IllegalArgumentException("kienHang is required");
        java.util.ArrayList<Parcel> normalized = new java.util.ArrayList<>();
        for (Parcel parcel : parcels) {
            if (parcel == null || parcel.loaiHangHoa() == null || parcel.loaiHangHoa().isBlank()
                    || parcel.khoiLuongKg() == null || !WEIGHT.matcher(parcel.khoiLuongKg()).matches())
                throw new IllegalArgumentException("Invalid parcel");
            String name = parcel.loaiHangHoa().strip().replaceAll("\\s+", " ");
            String note = parcel.ghiChuBaoQuan() == null ? null : parcel.ghiChuBaoQuan().strip();
            if (name.length() > 100 || note != null && note.length() > 500)
                throw new IllegalArgumentException("Invalid parcel");
            normalized.add(new Parcel(name, note, parcel.khoiLuongKg()));
        }
        return List.copyOf(normalized);
    }

    static String choice(String value, String first, String second) {
        if (!first.equals(value) && !second.equals(value)) throw new IllegalArgumentException("Invalid payment choice");
        return value;
    }

    static String cleanAddress(String value) {
        return value == null ? null : value.strip().replaceAll("\\s+", " ");
    }

    public record FrozenRequest(String maKh, Route loTrinh, List<Parcel> kienHang,
                                String benThanhToan, String phuongThucThanhToan,
                                String diaChiNhapLay, String diaChiNhapGiao) {}
}
