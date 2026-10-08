package com.miniongvang.service;

import com.miniongvang.DAO.BaoGiaDAO;
import com.miniongvang.DAO.CauHinhCuocDAO;
import com.miniongvang.DAO.CauHinhPhuThuDAO;
import com.miniongvang.DAO.KhachHangDAO;
import com.miniongvang.dto.MembershipDiscountResponse;
import com.miniongvang.entity.BaoGia;
import com.miniongvang.entity.CauHinhCuoc;
import com.miniongvang.entity.CauHinhPhuThu;
import com.miniongvang.entity.enums.AccountRole;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
        BigDecimal km = new BigDecimal(route.quangDuongKm());
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, VIETNAM);
        return transactions.run(em -> {
            var customers = new KhachHangDAO(em);
            var customer = customers.findWithVip(customerId);
            if (customer == null) throw new NoSuchElementException("Customer not found");
            CauHinhCuoc tariff = new CauHinhCuocDAO(em).findActiveOn(today).stream()
                    .filter(t -> t.getKmToiThieu() != null && t.getKmToiThieu().compareTo(km) <= 0
                            && (t.getKmToiDa() == null || t.getKmToiDa().compareTo(km) >= 0))
                    .findFirst().orElseThrow(FareCalculator.FareConfigurationException::new);
            // Region-specific rules need an explicit region policy; T09 demo uses global rows only.
            List<CauHinhPhuThu> extras = new CauHinhPhuThuDAO(em).findActive().stream()
                    .filter(p -> p.getKhuVucApDung() == null || p.getKhuVucApDung().isBlank()).toList();
            FareCalculator.Fare fullFare = calculator.calculate(km, tariff, extras, null);
            BigDecimal beforeDiscount = new BigDecimal(fullFare.cuocGoc())
                    .add(new BigDecimal(fullFare.tienPhuThu()));
            MembershipDiscountResponse discount = membership.calculateDiscount(customer, beforeDiscount);
            FareCalculator.Fare fare = calculator.calculate(km, tariff, extras, discount);
            MembershipView tier = discount.maHang() == null ? null : new MembershipView(
                    discount.maHang(), discount.tenHang(), discount.phanTramGiamGia().setScale(2).toPlainString(),
                    discount.ngayHetHan() == null ? null : discount.ngayHetHan().toString(), discount.conHieuLuc());
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

    private static List<Parcel> normalizeParcels(List<Parcel> parcels) {
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

    public record Parcel(String loaiHangHoa, String ghiChuBaoQuan, String khoiLuongKg) {}
    public record MembershipView(String maHang, String tenHang, String phanTramGiamGia,
                                 String ngayHetHan, boolean conHieuLuc) {}
    public record Quote(String maBaoGia, String hetHanLuc, RouteService.Route loTrinh,
                        FareCalculator.Fare cuoc, MembershipView hangThanhVien) {}
    public record FrozenRequest(String maKh, RouteService.Route loTrinh, List<Parcel> kienHang) {}
}
