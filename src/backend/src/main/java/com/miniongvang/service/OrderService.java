package com.miniongvang.service;

import com.miniongvang.DAO.*;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

public final class OrderService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final TransactionRunner transactions;
    private final RouteService routes;
    private final QuoteService quotes;
    private final Clock clock;

    public OrderService(EntityManagerFactory factory, RouteService routes) {
        this(factory, routes, Clock.systemUTC());
    }
    public OrderService(EntityManagerFactory factory, RouteService routes, Clock clock) {
        transactions = new TransactionRunner(factory);
        this.routes = routes;
        this.clock = clock;
        quotes = new QuoteService(factory, routes, clock);
    }

    public Order create(AuthService.User actor, String key, CreateOrder input) {
        if (actor == null || actor.maNguoiDung() == null) throw new SecurityException("Authentication required");
        String customerId;
        if (actor.vaiTro() == AccountRole.KHACH_HANG) {
            customerId = actor.maKh();
            if (customerId == null || input != null && input.maKh() != null && !customerId.equals(input.maKh()))
                throw new SecurityException("Customer mismatch");
        } else if (actor.vaiTro() == AccountRole.TONG_DAI) {
            if (actor.maNv() == null) throw new SecurityException("Dispatcher profile required");
            customerId = input == null ? null : input.maKh();
        } else throw new SecurityException("Role cannot create orders");
        if (key == null || key.isBlank() || key.length() > 100 || key.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Idempotency-Key is required (1-100 characters)");
        CreateOrder request = normalize(input, customerId);
        String requestJson = JSON.writeValueAsString(request);
        String requestId = digest(actor.maNguoiDung() + "\ncreateOrder\n" + key);
        // Replay does not depend on quote expiry, current prices or provider availability.
        Order replay = transactions.run(em -> replay(new OrderCreationRequestDAO(em).find(requestId), requestJson));
        if (replay != null) return replay;
        RouteService.Route route = routes.estimate(request.diemLayHang(), request.diemGiaoHang());
        return transactions.run(em -> {
            var requests = new OrderCreationRequestDAO(em);
            TaiKhoan account = requests.lockActor(actor.maNguoiDung());
            if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG
                    || account.getVaiTro() != actor.vaiTro()) throw new SecurityException("Account unavailable");
            OrderCreationRequest saved = requests.find(requestId);
            Order repeated = replay(saved, requestJson);
            if (repeated != null) return repeated;
            var customer = new KhachHangDAO(em).findWithVip(customerId);
            if (customer == null) throw new NoSuchElementException("Customer not found");
            if (actor.vaiTro() == AccountRole.KHACH_HANG
                    && !customer.getTaiKhoan().getId().equals(account.getId())) throw new SecurityException("Customer mismatch");
            DieuPhoiVien dispatcher = actor.maNv() == null ? null : em.find(DieuPhoiVien.class, actor.maNv());
            if (actor.vaiTro() == AccountRole.TONG_DAI && (dispatcher == null
                    || !dispatcher.getTaiKhoan().getId().equals(account.getId()))) throw new SecurityException("Dispatcher mismatch");
            BaoGia quote = new BaoGiaDAO(em).find(request.maBaoGia());
            if (quote == null) throw new NoSuchElementException("Quote not found");
            if (!customerId.equals(quote.getMaKh())) throw new SecurityException("Quote owner mismatch");
            Instant now = clock.instant();
            if (!now.isBefore(quote.getHetHanLuc())) throw new Conflict("QUOTE_EXPIRED");
            var frozen = JSON.readValue(quote.getYeuCauJson(), QuoteService.FrozenRequest.class);
            if (!customerId.equals(frozen.maKh()) || !route.equals(frozen.loTrinh())
                    || !request.kienHang().equals(frozen.kienHang())) throw new Conflict("QUOTE_CHANGED");
            var old = JSON.readValue(quote.getKetQuaJson(), QuoteService.Quote.class);
            var evaluated = quotes.evaluate(em, customerId, route, now);
            if (!quote.getMaBieuPhi().equals(evaluated.tariff().getId())
                    || !old.cuoc().equals(evaluated.fare()) || !Objects.equals(old.hangThanhVien(), evaluated.tier()))
                throw new Conflict("QUOTE_CHANGED");

            DonHang order = new DonHang();
            order.setId(UUID.randomUUID().toString()); order.setKhachHang(customer);
            order.setDieuPhoiVien(dispatcher); order.setBieuPhi(evaluated.tariff());
            order.setThoiGianTao(now); order.setTrangThai(OrderStatus.CHO_GAN);
            order.setDiemLayHang(route.diemLayHang()); order.setDiemGiaoHang(route.diemGiaoHang());
            order.setSdtNguoiNhan(request.sdtNguoiNhan()); order.setQuangDuongKm(new BigDecimal(route.quangDuongKm()));
            order.setGhiChuGiaoHang(request.ghiChuGiaoHang());
            var fare = evaluated.fare();
            SnapshotCuocDonHang snapshot = new SnapshotCuocDonHang();
            snapshot.setTenBieuPhi(evaluated.tariff().getTenBieuPhi());
            snapshot.setCuocGoc(new BigDecimal(fare.cuocGoc())); snapshot.setTienPhuThu(new BigDecimal(fare.tienPhuThu()));
            snapshot.setTienGiamGia(new BigDecimal(fare.tienGiamGia())); snapshot.setTongCuoc(new BigDecimal(fare.tongCuoc()));
            snapshot.setDonViTien(fare.donViTien());
            var tier = evaluated.tier();
            if (tier != null && tier.conHieuLuc()) {
                snapshot.setTenHangApDung(tier.tenHang()); snapshot.setPhanTramGiamGia(new BigDecimal(tier.phanTramGiamGia()));
            }
            List<ChiTietKienHang> parcels = request.kienHang().stream().map(item -> {
                ChiTietKienHang parcel = new ChiTietKienHang(); parcel.setId(UUID.randomUUID().toString());
                parcel.setLoaiHangHoa(item.loaiHangHoa()); parcel.setKhoiLuongKg(new BigDecimal(item.khoiLuongKg()));
                parcel.setGhiChuBaoQuan(item.ghiChuBaoQuan()); return parcel;
            }).toList();
            List<PhuThuDonHang> extras = fare.phuThu().stream().map(item -> {
                PhuThuDonHang extra = new PhuThuDonHang();
                extra.setPhuThu(em.getReference(CauHinhPhuThu.class, item.maPhuThu()));
                extra.setTenPhuThuSnapshot(item.tenPhuThu()); extra.setSoTienTinh(new BigDecimal(item.soTienTinh()));
                extra.setTrangThai("0"); extra.setThoiGianApDung(now); return extra;
            }).toList();
            NhatKyTrangThai event = new NhatKyTrangThai(); event.setId(UUID.randomUUID().toString());
            event.setTrangThai(OrderStatus.CHO_GAN); event.setThoiGianGhiNhan(now);
            event.setTaiKhoanThucHien(account); event.setNguoiThucHien(account.getHoTen());
            event.setVaiTroThucHien(account.getVaiTro().name());
            new DonHangDAO(em).persistAggregate(order, snapshot, parcels, extras, event);
            Order result = new Order(order.getId(), now.toString(), order.getDiemLayHang(), order.getDiemGiaoHang(),
                    order.getSdtNguoiNhan(), route.quangDuongKm(), order.getGhiChuGiaoHang(), "CHO_GAN",
                    customerId, null, dispatcher == null ? null : dispatcher.getId(), fare, request.kienHang(),
                    new PaymentSummary(snapshot.getTongCuoc().signum() == 0 ? "MIEN_CUOC" : "CHUA_THANH_TOAN", fare.tongCuoc()), null, null);
            if (saved == null) { saved = new OrderCreationRequest(); saved.setId(requestId); }
            saved.setActorId(account.getId()); saved.setOrderId(order.getId()); saved.setRequestJson(requestJson);
            saved.setResponseJson(JSON.writeValueAsString(result)); saved.setExpiresAt(now.plusSeconds(86400));
            if (!em.contains(saved)) requests.persist(saved);
            return result;
        });
    }

    private Order replay(OrderCreationRequest saved, String requestJson) {
        if (saved == null || !clock.instant().isBefore(saved.getExpiresAt())) return null;
        if (!saved.getRequestJson().equals(requestJson)) throw new Conflict("IDEMPOTENCY_CONFLICT");
        return JSON.readValue(saved.getResponseJson(), Order.class);
    }
    private static CreateOrder normalize(CreateOrder input, String customerId) {
        if (input == null || customerId == null || customerId.isBlank() || customerId.length() > 36
                || input.maBaoGia() == null || input.maBaoGia().isBlank() || input.maBaoGia().length() > 36)
            throw new IllegalArgumentException("Customer and quote required");
        String phone = AuthService.normalizePhone(input.sdtNguoiNhan());
        if (phone == null) throw new IllegalArgumentException("Invalid recipient phone");
        String note = input.ghiChuGiaoHang() == null ? null : input.ghiChuGiaoHang().strip();
        if (note != null && note.length() > 500) throw new IllegalArgumentException("Delivery note too long");
        return new CreateOrder(input.maBaoGia(), customerId, address(input.diemLayHang()), address(input.diemGiaoHang()),
                phone, note, QuoteService.normalizeParcels(input.kienHang()));
    }
    private static String address(String value) {
        if (value == null) throw new IllegalArgumentException("Address required");
        String result = value.strip().replaceAll("\\s+", " ");
        if (result.isEmpty() || result.length() > 255) throw new IllegalArgumentException("Invalid address");
        return result;
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    public record CreateOrder(String maBaoGia, String maKh, String diemLayHang, String diemGiaoHang,
                              String sdtNguoiNhan, String ghiChuGiaoHang, List<QuoteService.Parcel> kienHang) {}
    public record PaymentSummary(String trangThai, String soTienConPhaiThu) {}
    public record Order(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
                        String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx, String maNv,
                        FareCalculator.Fare cuoc, List<QuoteService.Parcel> kienHang, PaymentSummary thanhToan,
                        String hoanTatLuc, String huyLuc) {}
    public static final class Conflict extends RuntimeException {
        public Conflict(String code) { super(code); }
    }
}
