package com.miniongvang.seed;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import com.miniongvang.entity.CauHinhCuoc;
import com.miniongvang.entity.CauHinhPhuThu;
import com.miniongvang.entity.ChiTietKienHang;
import com.miniongvang.entity.DieuPhoiVien;
import com.miniongvang.entity.DonHang;
import com.miniongvang.entity.HangThanhVien;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.KhachHangVip;
import com.miniongvang.entity.NhatKyTrangThai;
import com.miniongvang.entity.PaymentStatus;
import com.miniongvang.entity.PhanCongDonHang;
import com.miniongvang.entity.PhuThuDonHang;
import com.miniongvang.entity.PhuThuDonHangId;
import com.miniongvang.entity.PhuongTien;
import com.miniongvang.entity.SnapshotCuocDonHang;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.TaiXe;
import com.miniongvang.entity.ThanhToan;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;
import com.miniongvang.entity.enums.DriverStatus;
import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.entity.enums.PaymentMethod;
import com.miniongvang.service.PasswordHasher;
import com.miniongvang.service.TransactionRunner;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

/** Deterministic IDs and relationships; relative dates are refreshed only after an explicit reset. */
public final class DemoSeeder {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final TransactionRunner transactions;
    private final Clock clock;

    public DemoSeeder(EntityManagerFactory factory) { this(factory, Clock.systemUTC()); }
    public DemoSeeder(EntityManagerFactory factory, Clock clock) {
        this.transactions = new TransactionRunner(factory);
        this.clock = clock;
    }

    public void seed(String password) {
        if (password == null || password.isBlank()) throw new IllegalArgumentException("Demo password is required");
        transactions.run(em -> {
            long manifest = ((Number) em.createNativeQuery(
                    "SELECT count(*) FROM demo_seed_manifest WHERE seed_key = 't03-v1'").getSingleResult()).longValue();
            if (manifest != 0) {
                long accounts = ((Number) em.createQuery(
                        "select count(t) from TaiKhoan t where t.id like 'TK-DEMO-%'").getSingleResult()).longValue();
                if (accounts != 13) throw new IllegalStateException("Demo seed marker exists but accounts differ");
                return null;
            }
            long existing = ((Number) em.createQuery(
                    "select count(t) from TaiKhoan t where t.id like 'TK-DEMO-%'").getSingleResult()).longValue();
            if (existing != 0) throw new IllegalStateException("Partial demo accounts exist without seed marker");
            install(em, PasswordHasher.hash(password), clock.instant());
            em.createNativeQuery("INSERT INTO demo_seed_manifest(seed_key, seeded_at) VALUES ('t03-v1', :now)")
                    .setParameter("now", clock.instant()).executeUpdate();
            return null;
        });
    }

    private static void install(EntityManager em, String hash, Instant now) {
        LocalDate today = now.atZone(VIETNAM).toLocalDate();
        TaiKhoan[] customerAccounts = new TaiKhoan[3];
        KhachHang[] customers = new KhachHang[3];
        for (int i = 0; i < 3; i++) {
            customerAccounts[i] = account(em, "TK-DEMO-KH-" + (i + 1), "09" + String.format("%08d", i + 1),
                    "Khách demo " + (i + 1), AccountRole.KHACH_HANG, AccountStatus.HOAT_DONG, hash, now);
            KhachHang c = new KhachHang();
            c.setId("KH-DEMO-" + (i + 1)); c.setTaiKhoan(customerAccounts[i]);
            c.setHoTen(customerAccounts[i].getHoTen()); c.setSoDienThoai("09" + String.format("%08d", i + 1));
            c.setDiaChiMacDinh("Quận 1, TP.HCM");
            em.persist(c); customers[i] = c;
        }
        HangThanhVien gold = new HangThanhVien();
        gold.setId("HANG-DEMO-VIP"); gold.setTenHang("VIP demo");
        gold.setPhanTramGiamGia(money("10")); gold.setNguongChiTieu(money("100000"));
        em.persist(gold);
        vip(em, customers[1], gold, "VIP-DEMO-2", today.plusDays(30), today);
        vip(em, customers[2], gold, "VIP-DEMO-3", today.minusDays(1), today.minusYears(1));

        TaiKhoan dispatcherAccount = account(em, "TK-DEMO-NV", "demo_dispatcher", "Điều phối demo",
                AccountRole.TONG_DAI, AccountStatus.HOAT_DONG, hash, now);
        DieuPhoiVien dispatcher = new DieuPhoiVien(); dispatcher.setId("NV-DEMO-1");
        dispatcher.setTaiKhoan(dispatcherAccount); dispatcher.setHoTen(dispatcherAccount.getHoTen());
        dispatcher.setCaTruc("Sáng"); em.persist(dispatcher);
        account(em, "TK-DEMO-ADMIN", "demo_admin", "Chủ đội xe demo",
                AccountRole.CHU_DOI_XE, AccountStatus.HOAT_DONG, hash, now);

        TaiXe[] drivers = new TaiXe[7];
        for (int i = 0; i < drivers.length; i++) {
            TaiKhoan account = account(em, "TK-DEMO-TX-" + (i + 1),
                    "08" + String.format("%08d", i + 1), "Tài xế demo " + (i + 1),
                    AccountRole.TAI_XE, i == 5 ? AccountStatus.KHOA : AccountStatus.HOAT_DONG, hash, now);
            TaiXe d = new TaiXe(); d.setId("TX-DEMO-" + (i + 1)); d.setTaiKhoan(account);
            d.setHoTen(account.getHoTen()); d.setSoDienThoai("08" + String.format("%08d", i + 1));
            d.setCccd(String.format("%012d", 700000000001L + i));
            d.setTrangThai(i == 6 ? DriverStatus.OFFLINE : DriverStatus.ONLINE);
            d.setRanhTu(i < 2 ? now.minusSeconds((i + 1) * 3600L) : now.minusSeconds(600));
            em.persist(d); drivers[i] = d;
            PhuongTien vehicle = new PhuongTien(); vehicle.setId("XE-DEMO-" + (i + 1));
            vehicle.setTaiXe(d); vehicle.setBienSoXe("59-A" + String.format("%05d", i + 1));
            vehicle.setLoaiXe("Xe máy"); vehicle.setTinhTrangHoatDong(true);
            em.persist(vehicle);
        }
        TaiKhoan leaveAccount = account(em, "TK-DEMO-TX-8", "0800000008", "Tài xế nghỉ demo",
                AccountRole.TAI_XE, AccountStatus.HOAT_DONG, hash, now);
        TaiXe leave = new TaiXe(); leave.setId("TX-DEMO-8"); leave.setTaiKhoan(leaveAccount);
        leave.setHoTen(leaveAccount.getHoTen()); leave.setSoDienThoai("0800000008");
        leave.setCccd("700000000008"); leave.setTrangThai(DriverStatus.NGHI);
        em.persist(leave);

        CauHinhCuoc fare = new CauHinhCuoc(); fare.setId("CUOC-DEMO-1");
        fare.setTenBieuPhi("Biểu phí demo"); fare.setCuocCoBan(money("20000"));
        fare.setDonGiaKm(money("5000")); fare.setKmToiThieu(money("0"));
        fare.setKmToiDa(money("30")); fare.setNgayBatDau(today.minusDays(30));
        fare.setDangKichHoat(true); em.persist(fare);
        CauHinhCuoc freeFare = new CauHinhCuoc(); freeFare.setId("CUOC-DEMO-FREE");
        freeFare.setTenBieuPhi("Biểu phí miễn cước lịch sử"); freeFare.setCuocCoBan(money("0"));
        freeFare.setDonGiaKm(money("0")); freeFare.setKmToiThieu(money("0"));
        freeFare.setKmToiDa(money("30")); freeFare.setNgayBatDau(today.minusDays(30));
        freeFare.setDangKichHoat(false); em.persist(freeFare);
        CauHinhPhuThu surcharge = new CauHinhPhuThu(); surcharge.setId("PHU-DEMO-1");
        surcharge.setTenPhuThu("Phụ thu demo"); surcharge.setSoTienPhuThu(money("5000"));
        surcharge.setDangKichHoat(true); em.persist(surcharge);
        CauHinhPhuThu inactive = new CauHinhPhuThu(); inactive.setId("PHU-DEMO-OFF");
        inactive.setTenPhuThu("Phụ thu tắt demo"); inactive.setSoTienPhuThu(money("3000"));
        inactive.setDangKichHoat(false); em.persist(inactive);

        DonHang waiting = order(em, "DH-DEMO-WAIT", customers[0], dispatcher, fare,
                OrderStatus.CHO_GAN, now.minusSeconds(60), null, money("30000"), money("5000"), money("0"));
        surcharge(em, waiting, surcharge, now);
        parcel(em, waiting, "KIEN-DEMO-1", "Tài liệu");
        DonHang assigned = order(em, "DH-DEMO-ASSIGNED", customers[1], null, fare,
                OrderStatus.DA_GAN, now.minusSeconds(600), drivers[2], money("40000"), money("0"), money("4000"));
        DonHang picked = order(em, "DH-DEMO-PICKED", customers[0], dispatcher, fare,
                OrderStatus.DA_LAY_HANG, now.minusSeconds(1200), drivers[3], money("45000"), money("0"), money("0"));
        DonHang delivering = order(em, "DH-DEMO-DELIVERING", customers[2], null, fare,
                OrderStatus.DANG_GIAO, now.minusSeconds(1800), drivers[4], money("50000"), money("0"), money("0"));
        assign(em, assigned, drivers[2], dispatcherAccount, now.minusSeconds(500), null, null, "PC-DEMO-1");
        assign(em, picked, drivers[3], dispatcherAccount, now.minusSeconds(1100), null, null, "PC-DEMO-2");
        assign(em, delivering, drivers[4], dispatcherAccount, now.minusSeconds(1700), null, null, "PC-DEMO-3");
        DonHang completed = order(em, "DH-DEMO-PAID-CASH", customers[0], null, fare,
                OrderStatus.HOAN_TAT, now.minusSeconds(86400), null, money("35000"), money("0"), money("0"));
        completed.setThoiGianHoanTat(now.minusSeconds(83000));
        assign(em, completed, drivers[0], dispatcherAccount, now.minusSeconds(86000), now.minusSeconds(83000),
                "Hoàn tất", "PC-DEMO-4");
        payment(em, completed, "GD-DEMO-CASH", PaymentMethod.TIEN_MAT, PaymentStatus.THANH_CONG,
                money("35000"), now.minusSeconds(82000), dispatcherAccount);
        DonHang online = order(em, "DH-DEMO-PAID-ONLINE", customers[1], null, fare,
                OrderStatus.HOAN_TAT, now.minusSeconds(172800), null, money("40000"), money("0"), money("4000"));
        online.setThoiGianHoanTat(now.minusSeconds(170000));
        payment(em, online, "GD-DEMO-FAILED", PaymentMethod.VNPAY_QR, PaymentStatus.THAT_BAI,
                money("36000"), now.minusSeconds(168000), null);
        payment(em, online, "GD-DEMO-SUCCESS", PaymentMethod.VNPAY_QR, PaymentStatus.THANH_CONG,
                money("36000"), now.minusSeconds(167000), null);
        DonHang pending = order(em, "DH-DEMO-PENDING", customers[2], null, fare,
                OrderStatus.HOAN_TAT, now.minusSeconds(25000), null, money("30000"), money("0"), money("0"));
        pending.setThoiGianHoanTat(now.minusSeconds(22000));
        payment(em, pending, "GD-DEMO-PENDING", PaymentMethod.VNPAY_QR, PaymentStatus.CHO_XU_LY,
                money("30000"), now.minusSeconds(21000), null);
        DonHang unpaid = order(em, "DH-DEMO-UNPAID", customers[0], null, fare,
                OrderStatus.HOAN_TAT, now.minusSeconds(20000), null, money("30000"), money("0"), money("0"));
        unpaid.setThoiGianHoanTat(now.minusSeconds(18000));
        DonHang free = order(em, "DH-DEMO-FREE", customers[1], null, freeFare,
                OrderStatus.HOAN_TAT, now.minusSeconds(14000), null, money("0"), money("0"), money("0"));
        free.setThoiGianHoanTat(now.minusSeconds(12000));
        DonHang cancelled = order(em, "DH-DEMO-CANCELLED", customers[0], dispatcher, fare,
                OrderStatus.DA_HUY, now.minusSeconds(10000), null, money("30000"), money("0"), money("0"));
        cancelled.setThoiGianHuy(now.minusSeconds(9900)); cancelled.setLyDoHuy("Khách đổi ý");
        assign(em, cancelled, drivers[1], dispatcherAccount, now.minusSeconds(9970),
                now.minusSeconds(9900), "Khách hủy", "PC-DEMO-5");
        assign(em, completed, drivers[1], dispatcherAccount, now.minusSeconds(86300), now.minusSeconds(86100),
                "Tài xế từ chối: xe gặp sự cố", "PC-DEMO-REJECTED");
        completed.setTaiXe(drivers[0]);
        assign(em, online, drivers[0], dispatcherAccount, now.minusSeconds(172000), now.minusSeconds(170000), "Hoàn tất", "PC-DEMO-6");
        assign(em, pending, drivers[0], dispatcherAccount, now.minusSeconds(24500), now.minusSeconds(22000), "Hoàn tất", "PC-DEMO-7");
        assign(em, unpaid, drivers[0], dispatcherAccount, now.minusSeconds(19500), now.minusSeconds(18000), "Hoàn tất", "PC-DEMO-8");
        assign(em, free, drivers[0], dispatcherAccount, now.minusSeconds(13500), now.minusSeconds(12000), "Hoàn tất", "PC-DEMO-9");
        for (DonHang o : new DonHang[]{completed, online, pending, unpaid, free}) {
            event(em, o, OrderStatus.HOAN_TAT, o.getThoiGianHoanTat(), o.getTaiXe().getTaiKhoan(), "NK-END-" + o.getId());
        }
        event(em, cancelled, OrderStatus.DA_HUY, cancelled.getThoiGianHuy(), dispatcherAccount, "NK-END-CANCELLED");
        parcel(em, waiting, "KIEN-DEMO-2", "Hàng nhẹ");
    }

    private static TaiKhoan account(EntityManager em, String id, String username, String name,
                                    AccountRole role, AccountStatus status, String hash, Instant now) {
        TaiKhoan a = new TaiKhoan(); a.setId(id); a.setUsername(username);
        a.setHoTen(name); a.setVaiTro(role); a.setTrangThai(status);
        a.setMatKhauHash(hash); a.setNgayTao(now.minusSeconds(2592000));
        em.persist(a); return a;
    }

    private static void vip(EntityManager em, KhachHang customer, HangThanhVien tier,
                            String card, LocalDate expires, LocalDate starts) {
        KhachHangVip v = new KhachHangVip(); v.setKhachHang(customer);
        v.setHang(tier); v.setMaTheVip(card); v.setDiemTichLuy(0);
        v.setNgayHetHan(expires); v.setNgayDangKy(starts); em.persist(v);
    }

    private static DonHang order(EntityManager em, String id, KhachHang customer,
                                 DieuPhoiVien dispatcher, CauHinhCuoc fare, OrderStatus status,
                                 Instant created, TaiXe driver, BigDecimal base, BigDecimal extra, BigDecimal discount) {
        DonHang o = new DonHang(); o.setId(id); o.setKhachHang(customer); o.setDieuPhoiVien(dispatcher);
        o.setBieuPhi(fare); o.setTaiXe(driver); o.setThoiGianTao(created);
        // Shared-PK snapshot persistence can insert the parent immediately.
        // Set its final state together with final timestamps below in this transaction.
        o.setTrangThai(OrderStatus.CHO_GAN); o.setDiemLayHang("Quận 1, TP.HCM");
        o.setDiemGiaoHang("Quận 3, TP.HCM"); o.setSdtNguoiNhan("0900000000");
        o.setQuangDuongKm(fare.getDonGiaKm().signum() == 0 ? money("2")
                : base.subtract(fare.getCuocCoBan()).divide(fare.getDonGiaKm(), 2, java.math.RoundingMode.UNNECESSARY));
        em.persist(o);
        SnapshotCuocDonHang s = new SnapshotCuocDonHang(); s.setDonHang(o);
        s.setTenBieuPhi(fare.getTenBieuPhi()); s.setCuocGoc(base);
        s.setTienPhuThu(extra); s.setTienGiamGia(discount);
        s.setTongCuoc(base.add(extra).subtract(discount)); s.setDonViTien("VND");
        if (discount.signum() > 0) { s.setTenHangApDung("VIP demo"); s.setPhanTramGiamGia(money("10")); }
        em.persist(s);
        parcel(em, o, "KIEN-" + id, "Hàng mẫu");
        event(em, o, OrderStatus.CHO_GAN, created,
                dispatcher == null ? customer.getTaiKhoan() : dispatcher.getTaiKhoan(), "NK-" + id);
        if (driver != null) event(em, o, status, created.plusSeconds(100), driver.getTaiKhoan(), "NK-ACTIVE-" + id);
        o.setTrangThai(status);
        return o;
    }

    private static void event(EntityManager em, DonHang order, OrderStatus status, Instant time, TaiKhoan actor, String id) {
        NhatKyTrangThai log = new NhatKyTrangThai(); log.setId(id);
        log.setDonHang(order); log.setTrangThai(status); log.setThoiGianGhiNhan(time);
        log.setTaiKhoanThucHien(actor); log.setVaiTroThucHien(actor.getVaiTro().name());
        log.setNguoiThucHien(actor.getHoTen()); em.persist(log);
    }

    private static void parcel(EntityManager em, DonHang order, String id, String kind) {
        ChiTietKienHang p = new ChiTietKienHang(); p.setId(id);
        p.setDonHang(order); p.setLoaiHangHoa(kind); p.setKhoiLuongKg(money("1"));
        em.persist(p);
    }

    private static void surcharge(EntityManager em, DonHang order, CauHinhPhuThu config, Instant now) {
        PhuThuDonHang p = new PhuThuDonHang();
        p.setId(new PhuThuDonHangId(order.getId(), config.getId()));
        p.setDonHang(order); p.setPhuThu(config);
        p.setSoTienTinh(config.getSoTienPhuThu()); p.setTenPhuThuSnapshot(config.getTenPhuThu());
        p.setTrangThai("0"); p.setThoiGianApDung(now); em.persist(p);
    }

    private static void assign(EntityManager em, DonHang order, TaiXe driver, TaiKhoan dispatcher,
                               Instant start, Instant end, String reason, String id) {
        PhanCongDonHang a = new PhanCongDonHang(); a.setId(id);
        a.setDonHang(order); a.setTaiXe(driver); a.setTaiKhoanDieuPhoi(dispatcher);
        a.setBatDauLuc(start); a.setKetThucLuc(end); a.setLyDoKetThuc(reason);
        order.setTaiXe(driver);
        if (end == null) driver.setRanhTu(null);
        em.persist(a);
    }

    private static void payment(EntityManager em, DonHang order, String id, PaymentMethod method,
                                PaymentStatus status, BigDecimal amount, Instant time, TaiKhoan confirmedBy) {
        ThanhToan p = new ThanhToan(); p.setId(id); p.setDonHang(order);
        p.setPhuongThuc(method); p.setTrangThai(status); p.setSoTien(amount);
        p.setMaThamChieu("REF-" + id); p.setTaoLuc(time.minusSeconds(60));
        p.setThoiGianThanhToan(status == PaymentStatus.THANH_CONG ? time : null);
        p.setTaiKhoanXacNhan(confirmedBy); em.persist(p);
    }

    private static BigDecimal money(String value) { return new BigDecimal(value).setScale(2); }
}
