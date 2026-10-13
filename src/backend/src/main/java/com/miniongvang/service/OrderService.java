package com.miniongvang.service;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dto.order.OrderDtos.CreateOrder;
import com.miniongvang.dto.order.OrderDtos.Order;
import com.miniongvang.dto.order.OrderDtos.PaymentSummary;
import com.miniongvang.dto.quote.QuoteDtos.Quote;
import com.miniongvang.dto.route.RouteDtos.Route;

import com.miniongvang.dao.*;
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
    private final QuoteService quotes;
    private final Clock clock;

    public OrderService(EntityManagerFactory factory, RouteService routes) {
        this(factory, routes, Clock.systemUTC());
    }
    public OrderService(EntityManagerFactory factory, RouteService routes, Clock clock) {
        transactions = new TransactionRunner(factory);
        this.clock = clock;
        quotes = new QuoteService(factory, routes, clock);
    }

    public Order create(ActorContext actor, String key, CreateOrder input) {
        if (actor == null || actor.maNguoiDung() == null) throw new SecurityException("Authentication required");
        String customerId;
        if (actor.vaiTro() == AccountRole.KHACH_HANG) {
            customerId = actor.maKh();
            if (customerId == null || input != null && input.maKh() != null && !customerId.equals(input.maKh()))
                throw new SecurityException("Customer mismatch");
        } else if (actor.vaiTro() == AccountRole.TONG_DAI) {
            customerId = input == null ? null : input.maKh();
        } else throw new SecurityException("Role cannot create orders");
        if (key == null || key.isBlank() || key.length() > 100 || key.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Idempotency-Key is required (1-100 characters)");
        CreateOrder request = normalize(input, customerId);
        String requestJson = JSON.writeValueAsString(request);
        String requestId = digest(actor.maNguoiDung() + "\ncreateOrder\n" + key);
        // Replay does not depend on quote expiry, current prices or provider availability.
        Order replay = transactions.run(em -> replay(new YeuCauTaoDonDAO(em).find(requestId), requestJson));
        if (replay != null) return replay;
        return transactions.run(em -> {
            var requests = new YeuCauTaoDonDAO(em);
            TaiKhoan account = requests.lockActor(actor.maNguoiDung());
            if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG
                    || account.getVaiTro() != actor.vaiTro()) throw new SecurityException("Account unavailable");
            YeuCauTaoDon saved = requests.find(requestId);
            Order repeated = replay(saved, requestJson);
            if (repeated != null) return repeated;
            var customer = new KhachHangDAO(em).findWithAccount(customerId);
            if (customer == null) throw new NoSuchElementException("Customer not found");
            if (actor.vaiTro() == AccountRole.KHACH_HANG
                    && !customer.getTaiKhoan().getId().equals(account.getId())) throw new SecurityException("Customer mismatch");
            BaoGia quote = new BaoGiaDAO(em).find(request.maBaoGia());
            if (quote == null) throw new NoSuchElementException("Quote not found");
            if (!customerId.equals(quote.getMaKh())) throw new SecurityException("Quote owner mismatch");
            Instant now = clock.instant();
            if (!now.isBefore(quote.getHetHanLuc())) throw new Conflict("QUOTE_EXPIRED");
            var frozen = JSON.readValue(quote.getYeuCauJson(), QuoteService.FrozenRequest.class);
            if (!customerId.equals(frozen.maKh())
                    || !request.kienHang().equals(frozen.kienHang())
                    || !request.diemLayHang().equals(frozen.diaChiNhapLay())
                    || !request.diemGiaoHang().equals(frozen.diaChiNhapGiao())
                    || !request.benThanhToan().equals(frozen.benThanhToan())
                    || !request.phuongThucThanhToan().equals(frozen.phuongThucThanhToan()))
                throw new Conflict("QUOTE_CHANGED");
            Route route = frozen.loTrinh();
            if (route == null) throw new Conflict("QUOTE_CHANGED");
            var old = JSON.readValue(quote.getKetQuaJson(), Quote.class);
            var evaluated = quotes.evaluateV1(em, customerId, route, request.kienHang(), now);
            if (!quote.getMaBieuPhi().equals(evaluated.tariff().getId())
                    || !old.cuoc().equals(evaluated.fare()) || !Objects.equals(old.hangThanhVien(), evaluated.tier()))
                throw new Conflict("QUOTE_CHANGED");

            DonHang order = new DonHang();
            order.setId(UUID.randomUUID().toString()); order.setKhachHang(customer);
            order.setTaiKhoanTao(account);
            order.setThoiGianTao(now); order.setTrangThai(OrderStatus.CHO_GAN);
            order.setDiemLayHang(route.diemLayHang()); order.setDiemGiaoHang(route.diemGiaoHang());
            order.setSdtNguoiNhan(request.sdtNguoiNhan()); order.setQuangDuongKm(new BigDecimal(route.quangDuongKm()));
            order.setTenNguoiNhan(request.tenNguoiNhan());
            order.setBenThanhToan(request.benThanhToan());
            order.setPhuongThucThanhToan(request.phuongThucThanhToan());
            if (route.thoiGianDuKienGiay() <= 0 || route.thoiGianDuKienGiay() > Integer.MAX_VALUE)
                throw new IllegalArgumentException("Invalid route duration");
            order.setThoiGianDuKienGiay((int) route.thoiGianDuKienGiay());
            order.setNguonLoTrinh(RouteSource.valueOf(route.nguon()));
            order.setGhiChuGiaoHang(request.ghiChuGiaoHang());
            var fare = evaluated.fare();
            CuocDonHang priced = new CuocDonHang();
            priced.setBieuPhi(evaluated.tariff());
            priced.setChinhSachGiam(evaluated.discountPolicy());
            priced.setCuocGoc(new BigDecimal(fare.cuocGoc()));
            priced.setCuocKm(new BigDecimal(fare.cuocKm()));
            priced.setCuocKhoiLuong(new BigDecimal(fare.cuocKhoiLuong()));
            priced.setTongKhoiLuongKg(new BigDecimal(fare.tongKhoiLuongKg()));
            priced.setPhienBanBieuPhi(fare.phienBanBieuPhi());
            priced.setTienGiamGia(new BigDecimal(fare.tienGiamGia()));
            List<KienHang> parcels = new ArrayList<>();
            for (int i = 0; i < request.kienHang().size(); i++) {
                var item = request.kienHang().get(i);
                KienHang parcel = new KienHang();
                parcel.setId(UUID.randomUUID().toString()); parcel.setThuTu(i + 1);
                parcel.setLoaiHangHoa(item.loaiHangHoa());
                parcel.setKhoiLuongKg(new BigDecimal(item.khoiLuongKg()));
                parcel.setGhiChuBaoQuan(item.ghiChuBaoQuan()); parcels.add(parcel);
            }
            List<PhuThuDonHang> extras = evaluated.extras().stream().map(policy -> {
                PhuThuDonHang extra = new PhuThuDonHang();
                extra.setChinhSachPhuThu(policy); return extra;
            }).toList();
            SuKienDonHang event = new SuKienDonHang(); event.setId(UUID.randomUUID().toString());
            event.setThuTu(1); event.setLoaiSuKien(OrderEventType.TAO_DON);
            event.setTrangThaiSau(OrderStatus.CHO_GAN); event.setThoiGian(now);
            event.setTaiKhoanThucHien(account);
            new DonHangDAO(em).persistAggregateV1(order, priced, parcels, extras, event);
            Order result = new Order(order.getId(), now.toString(), order.getDiemLayHang(), order.getDiemGiaoHang(),
                    order.getSdtNguoiNhan(), route.quangDuongKm(), order.getGhiChuGiaoHang(), "CHO_GAN",
                    customerId, null, account.getId(), fare, request.kienHang(),
                    new PaymentSummary(new BigDecimal(fare.tongCuoc()).signum() == 0 ? "MIEN_CUOC" : "CHUA_THANH_TOAN", fare.tongCuoc()),
                    null, null, request.tenNguoiNhan(), request.benThanhToan(), request.phuongThucThanhToan(), route.nguon());
            if (saved == null) { saved = new YeuCauTaoDon(); saved.setRequestId(requestId); }
            saved.setTaiKhoan(account); saved.setDonHang(order); saved.setRequestJson(requestJson);
            saved.setResponseJson(JSON.writeValueAsString(result)); saved.setExpiresAt(now.plusSeconds(86400));
            if (!em.contains(saved)) requests.persist(saved);
            return result;
        });
    }

    private Order replay(YeuCauTaoDon saved, String requestJson) {
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
        String recipient = input.tenNguoiNhan() == null ? null : input.tenNguoiNhan().strip();
        if (recipient != null && (recipient.isEmpty() || recipient.length() > 100))
            throw new IllegalArgumentException("Invalid recipient name");
        String payer = QuoteService.choice(input.benThanhToan(), "NGUOI_DAT", "NGUOI_NHAN");
        String method = QuoteService.choice(input.phuongThucThanhToan(), "TIEN_MAT", "VNPAY_QR");
        return new CreateOrder(input.maBaoGia(), customerId, address(input.diemLayHang()), address(input.diemGiaoHang()),
                phone, note, QuoteService.normalizeParcels(input.kienHang()), recipient, payer, method);
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

    public static final class Conflict extends RuntimeException {
        public Conflict(String code) { super(code); }
    }
}
