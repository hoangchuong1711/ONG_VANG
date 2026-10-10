package com.miniongvang.service;

import com.miniongvang.DAO.BaoGiaDAO;
import com.miniongvang.DAO.KhachHangDAO;
import com.miniongvang.DAO.BieuPhiDAO;
import com.miniongvang.DAO.ChinhSachPhuThuDAO;
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
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Pattern;
import tools.jackson.databind.ObjectMapper;

public final class QuoteService {
    private static final ObjectMapper JSON = new ObjectMapper();
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

    public Quote create(AuthService.User actor, String requestedCustomerId, String origin,
                        String destination, List<Parcel> parcels) {
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
        RouteService.Route route = routes.estimate(origin, destination);
        Instant now = clock.instant();
        return transactions.run(em -> {
            EvaluationV1 evaluated = evaluateV1(em, customerId, route, now);
            BieuPhi tariff = evaluated.tariff();
            FareCalculator.Fare fare = evaluated.fare();
            MembershipView tier = evaluated.tier();
            Instant expiry = now.plusSeconds(300);
            Quote result = new Quote(UUID.randomUUID().toString(), expiry.toString(), route, fare, tier);
            BaoGia stored = new BaoGia();
            stored.setId(result.maBaoGia()); stored.setMaKh(customerId); stored.setMaBieuPhi(tariff.getId());
            stored.setTaoLuc(now); stored.setHetHanLuc(expiry);
            stored.setYeuCauJson(JSON.writeValueAsString(new FrozenRequest(customerId, route, normalizedParcels)));
            stored.setKetQuaJson(JSON.writeValueAsString(result));
            new BaoGiaDAO(em).persist(stored);
            return result;
        });
    }

    EvaluationV1 evaluateV1(jakarta.persistence.EntityManager em, String customerId,
                            RouteService.Route route, Instant now) {
        BigDecimal km = new BigDecimal(route.quangDuongKm());
        var customer = new KhachHangDAO(em).findWithAccount(customerId);
        if (customer == null) throw new NoSuchElementException("Customer not found");
        var matchingTariffs = new BieuPhiDAO(em).findApplicable(now, km);
        if (matchingTariffs.size() != 1) throw new FareCalculator.FareConfigurationException();
        BieuPhi tariff = matchingTariffs.getFirst();
        List<ChinhSachPhuThu> extras = new ChinhSachPhuThuDAO(em).findApplicable(now);
        java.util.HashSet<String> types = new java.util.HashSet<>();
        for (ChinhSachPhuThu item : extras)
            if (!types.add(item.getMaLoaiPhuThu()))
                throw new FareCalculator.FareConfigurationException();
        FareCalculator.Fare before = calculator.calculateV1(km, tariff, extras, BigDecimal.ZERO);
        BigDecimal subtotal = new BigDecimal(before.cuocGoc()).add(new BigDecimal(before.tienPhuThu()));
        MembershipPolicyService.Decision decision = membership.evaluate(em, customer, subtotal, now);
        FareCalculator.Fare fare = calculator.calculateV1(km, tariff, extras, decision.discount());
        ChinhSachThanhVien policy = decision.policy();
        MembershipView tier = customer.getMaHang() == MembershipTier.THUONG ? null
                : new MembershipView(customer.getMaHang().name(), customer.getMaHang().name(),
                        policy == null ? "0.00" : policy.getTyLeGiam().setScale(2).toPlainString(),
                        customer.getThanhVienDen() == null ? null : customer.getThanhVienDen().toString(),
                        decision.active());
        return new EvaluationV1(tariff, fare, tier, extras, policy);
    }

    record EvaluationV1(BieuPhi tariff, FareCalculator.Fare fare, MembershipView tier,
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

    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    public record Parcel(String loaiHangHoa, String ghiChuBaoQuan, String khoiLuongKg) {}
    public record MembershipView(String maHang, String tenHang, String phanTramGiamGia,
                                 String ngayHetHan, boolean conHieuLuc) {}
    public record Quote(String maBaoGia, String hetHanLuc, RouteService.Route loTrinh,
                        FareCalculator.Fare cuoc, MembershipView hangThanhVien) {}
    public record FrozenRequest(String maKh, RouteService.Route loTrinh, List<Parcel> kienHang) {}
}
