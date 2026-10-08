package com.miniongvang.service;

import com.miniongvang.DAO.TaiKhoanDAO;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

public final class AuthService {
    private static final Pattern PHONE = Pattern.compile("0[0-9]{9}");
    private final EntityManagerFactory factory;

    public AuthService(EntityManagerFactory factory) { this.factory = factory; }

    public record User(String maNguoiDung, String hoTen, AccountRole vaiTro,
                       String maKh, String maTx, String maNv) {}

    public static String normalizePhone(String input) {
        if (input == null) return null;
        String value = input.trim();
        if (value.matches("\\+84[0-9]{9}")) value = "0" + value.substring(3);
        return PHONE.matcher(value).matches() ? value : null;
    }

    public User register(String name, String phone, String password, String email, String address) {
        String normalized = normalizePhone(phone);
        if (normalized == null) throw new IllegalArgumentException("soDienThoai");
        try {
            return new TransactionRunner(factory).run(em -> {
                if (new TaiKhoanDAO(em).findByUsername(normalized).isPresent())
                    throw new AccountExistsException();
                TaiKhoan account = new TaiKhoan();
                account.setId(UUID.randomUUID().toString());
                account.setUsername(normalized);
                account.setHoTen(name);
                account.setEmail(email);
                account.setMatKhauHash(PasswordHasher.hash(password));
                account.setVaiTro(AccountRole.KHACH_HANG);
                account.setTrangThai(AccountStatus.HOAT_DONG);
                account.setNgayTao(Instant.now());
                em.persist(account);
                KhachHang customer = new KhachHang();
                customer.setId(UUID.randomUUID().toString());
                customer.setTaiKhoan(account);
                customer.setHoTen(name);
                customer.setSoDienThoai(normalized);
                customer.setDiaChiMacDinh(address);
                em.persist(customer);
                return new User(account.getId(), name, AccountRole.KHACH_HANG,
                        customer.getId(), null, null);
            });
        } catch (PersistenceException failure) {
            if (isUniqueViolation(failure)) throw new AccountExistsException();
            throw failure;
        }
    }

    public TaiKhoan authenticate(String username, String password) {
        String phone = normalizePhone(username);
        String login = phone == null ? username.trim() : phone;
        try (EntityManager em = factory.createEntityManager()) {
            TaiKhoan account = new TaiKhoanDAO(em).findByUsername(login).orElse(null);
            if (account == null || !PasswordHasher.verify(password, account.getMatKhauHash())) return null;
            return account;
        }
    }

    public void recordLogin(String id) {
        new TransactionRunner(factory).run(em -> {
            TaiKhoan account = em.find(TaiKhoan.class, id);
            if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG)
                throw new IllegalStateException("Account became unavailable during login");
            account.setLanDangNhapCuoi(Instant.now());
            return null;
        });
    }

    public User current(String id) {
        try (EntityManager em = factory.createEntityManager()) {
            TaiKhoan account = em.find(TaiKhoan.class, id);
            if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG) return null;
            String maKh = null, maTx = null, maNv = null;
            switch (account.getVaiTro()) {
                case KHACH_HANG -> maKh = em.createQuery("select k.id from KhachHang k where k.taiKhoan.id = :id", String.class)
                        .setParameter("id", id).getResultStream().findFirst().orElse(null);
                case TAI_XE -> maTx = em.createQuery("select t.id from TaiXe t where t.taiKhoan.id = :id", String.class)
                        .setParameter("id", id).getResultStream().findFirst().orElse(null);
                case TONG_DAI -> maNv = em.createQuery("select d.id from DieuPhoiVien d where d.taiKhoan.id = :id", String.class)
                        .setParameter("id", id).getResultStream().findFirst().orElse(null);
                default -> { }
            }
            return new User(id, account.getHoTen(), account.getVaiTro(), maKh, maTx, maNv);
        }
    }

    private static boolean isUniqueViolation(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql && "23505".equals(sql.getSQLState())) return true;
        }
        return false;
    }

    public static final class AccountExistsException extends RuntimeException {}
}
