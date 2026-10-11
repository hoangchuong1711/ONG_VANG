package com.miniongvang.seed;

import com.miniongvang.entity.BieuPhi;
import com.miniongvang.entity.ChinhSachPhuThu;
import com.miniongvang.entity.ChinhSachThanhVien;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.PhuongTien;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.TaiXe;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;
import com.miniongvang.entity.enums.DriverStatus;
import com.miniongvang.entity.enums.MembershipTier;
import com.miniongvang.entity.enums.PolicyStatus;
import com.miniongvang.service.PasswordHasher;
import com.miniongvang.service.TransactionRunner;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Small, repeatable designV1 fixture for exercising the current backend flows. */
public final class DesignV1DemoSeeder {
    private static final String KEY = "design-v1";
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final TransactionRunner transactions;
    private final Clock clock;

    public DesignV1DemoSeeder(EntityManagerFactory factory) { this(factory, Clock.systemUTC()); }
    public DesignV1DemoSeeder(EntityManagerFactory factory, Clock clock) {
        transactions = new TransactionRunner(factory);
        this.clock = clock;
    }

    public void seed(String password) {
        if (password == null || password.isBlank()) throw new IllegalArgumentException("Demo password is required");
        transactions.run(em -> {
            Number marked = (Number) em.createNativeQuery(
                    "SELECT count(*) FROM dbo.demo_seed_manifest WHERE seed_key=:key")
                    .setParameter("key", KEY).getSingleResult();
            if (marked.longValue() != 0) return null;
            Number existing = (Number) em.createQuery(
                    "select count(a) from TaiKhoan a where a.id like 'TK-DEMO-%'").getSingleResult();
            if (existing.longValue() != 0)
                throw new IllegalStateException("Demo accounts exist without designV1 marker");
            Instant now = clock.instant();
            install(em, PasswordHasher.hash(password), now);
            em.createNativeQuery("""
                    INSERT INTO dbo.demo_seed_manifest(seed_key,seed_version,seeded_at)
                    VALUES (:key,:version,:now)
                    """).setParameter("key", KEY).setParameter("version", "1")
                    .setParameter("now", now).executeUpdate();
            return null;
        });
    }

    private static void install(EntityManager em, String hash, Instant now) {
        TaiKhoan customer1 = account(em, "TK-DEMO-KH-1", "0900000001", "0900000001",
                "Khách thường", AccountRole.KHACH_HANG, hash, now);
        TaiKhoan customer2 = account(em, "TK-DEMO-KH-2", "0900000002", "0900000002",
                "Khách hạng Vàng", AccountRole.KHACH_HANG, hash, now);
        customer(em, "KH-DEMO-1", customer1, MembershipTier.THUONG, null, null);
        customer(em, "KH-DEMO-2", customer2, MembershipTier.VANG,
                now.minusSeconds(7 * 86400L), now.plusSeconds(30 * 86400L));
        account(em, "TK-DEMO-NV", "demo_dispatcher", null,
                "Tổng đài demo", AccountRole.TONG_DAI, hash, now);
        account(em, "TK-DEMO-ADMIN", "demo_admin", null,
                "Chủ đội xe demo", AccountRole.CHU_DOI_XE, hash, now);

        for (int i = 1; i <= 2; i++) {
            String number = "080000000" + i;
            TaiKhoan account = account(em, "TK-DEMO-TX-" + i, number, number,
                    "Tài xế demo " + i, AccountRole.TAI_XE, hash, now);
            TaiXe driver = new TaiXe();
            driver.setId("TX-DEMO-" + i);
            driver.setTaiKhoan(account);
            driver.setCccd("70000000000" + i);
            driver.setSoGiayPhep("GPLX-DEMO-" + i);
            driver.setNgayHetHanGplx(LocalDate.ofInstant(now, VIETNAM).plusYears(1));
            driver.setTrangThai(DriverStatus.ONLINE);
            driver.setRanhTu(now.minusSeconds(i * 3600L));
            em.persist(driver);
            PhuongTien vehicle = new PhuongTien();
            vehicle.setId("XE-DEMO-" + i);
            vehicle.setTaiXe(driver);
            vehicle.setBienSoXe("59A0000" + i);
            vehicle.setLoaiXe("Xe máy");
            vehicle.setDangHoatDong(true);
            em.persist(vehicle);
        }

        ChinhSachThanhVien member = new ChinhSachThanhVien();
        member.setId("TV-DEMO-VANG-1");
        member.setHang(MembershipTier.VANG);
        member.setTyLeGiam(new BigDecimal("10.00"));
        member.setHieuLucTu(now.minusSeconds(30 * 86400L));
        member.setTrangThai(PolicyStatus.CONG_BO);
        em.persist(member);

        BieuPhi fare = new BieuPhi();
        fare.setId("CUOC-DEMO-1");
        fare.setTenBieuPhi("Biểu phí giao hàng demo");
        fare.setCuocCoBan(new BigDecimal("20000.00"));
        fare.setDonGiaKm(new BigDecimal("5000.00"));
        fare.setKmToiThieu(new BigDecimal("0.00"));
        fare.setKmToiDa(new BigDecimal("30.00"));
        fare.setHieuLucTu(now.minusSeconds(30 * 86400L));
        fare.setTrangThai(PolicyStatus.CONG_BO);
        em.persist(fare);

        ChinhSachPhuThu extra = new ChinhSachPhuThu();
        extra.setId("PHU-DEMO-1");
        extra.setMaLoaiPhuThu("DICH_VU");
        extra.setTenPhuThu("Phụ thu dịch vụ");
        extra.setSoTien(new BigDecimal("5000.00"));
        extra.setHieuLucTu(now.minusSeconds(30 * 86400L));
        extra.setTrangThai(PolicyStatus.CONG_BO);
        em.persist(extra);
    }

    private static TaiKhoan account(EntityManager em, String id, String username, String phone,
                                    String name, AccountRole role, String hash, Instant now) {
        TaiKhoan account = new TaiKhoan();
        account.setId(id);
        account.setUsername(username);
        account.setSoDienThoai(phone);
        account.setHoTen(name);
        account.setVaiTro(role);
        account.setTrangThai(AccountStatus.HOAT_DONG);
        account.setMatKhauHash(hash);
        account.setNgayTao(now.minusSeconds(30 * 86400L));
        em.persist(account);
        return account;
    }

    private static void customer(EntityManager em, String id, TaiKhoan account, MembershipTier tier,
                                 Instant from, Instant to) {
        KhachHang customer = new KhachHang();
        customer.setId(id);
        customer.setTaiKhoan(account);
        customer.setDiaChiMacDinh("Quận 1, TP.HCM");
        customer.setMaHang(tier);
        customer.setThanhVienTu(from);
        customer.setThanhVienDen(to);
        em.persist(customer);
    }
}
