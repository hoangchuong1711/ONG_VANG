package com.miniongvang.service;

import com.miniongvang.dao.KhachHangDAO;
import com.miniongvang.dao.TaiKhoanDAO;
import com.miniongvang.dto.auth.AuthDtos.LoginRequest;
import com.miniongvang.dto.auth.AuthDtos.RegisterRequest;
import com.miniongvang.dto.auth.AuthDtos.User;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;
import com.miniongvang.security.ActorContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.util.UUID;
import java.util.logging.Logger;
import java.util.regex.Pattern;

public final class AuthService {
    private static final Pattern PHONE = Pattern.compile("0[0-9]{9}");
    private static final Logger LOG = Logger.getLogger(AuthService.class.getName());
    private final EntityManagerFactory factory;
    private final EmailSender mail;

    public AuthService(EntityManagerFactory factory) { this(factory, BrevoEmailSender.fromEnvironment()); }
    public AuthService(EntityManagerFactory factory, EmailSender mail) { this.factory = factory; this.mail = mail; }

    public static String normalizePhone(String input) {
        if (input == null) return null;
        String value = input.trim();
        if (value.matches("\\+84[0-9]{9}")) value = "0" + value.substring(3);
        return PHONE.matcher(value).matches() ? value : null;
    }

    public User register(RegisterRequest request) {
        return register(request.hoTen(), request.soDienThoai(), request.password(),
                request.email(), request.diaChiMacDinh());
    }

    public User register(String name, String phone, String password, String email, String address) {
        String normalized = normalizePhone(phone);
        if (normalized == null) throw new IllegalArgumentException("soDienThoai");
        try {
            User created = new TransactionRunner(factory).run(em -> {
                TaiKhoanDAO accounts = new TaiKhoanDAO(em);
                if (accounts.findByUsername(normalized).isPresent())
                    throw new AccountExistsException();
                TaiKhoan account = newCustomerAccount(name, normalized, password, email);
                accounts.persist(account);
                KhachHang customer = newCustomerProfile(account, address);
                new KhachHangDAO(em).persist(customer);
                return new User(account.getId(), name, AccountRole.KHACH_HANG,
                        customer.getId(), null);
            });
            sendWelcomeEmail(email, name);
            return created;
        } catch (PersistenceException failure) {
            if (isUniqueViolation(failure)) throw new AccountExistsException();
            throw failure;
        }
    }

    private static TaiKhoan newCustomerAccount(String name, String phone, String password, String email) {
        TaiKhoan account = new TaiKhoan();
        account.setId(UUID.randomUUID().toString());
        account.setUsername(phone);
        account.setHoTen(name);
        account.setSoDienThoai(phone);
        account.setEmail(email);
        account.setMatKhauHash(PasswordHasher.hash(password));
        account.setVaiTro(AccountRole.KHACH_HANG);
        account.setTrangThai(AccountStatus.HOAT_DONG);
        account.setNgayTao(Instant.now());
        return account;
    }

    private static KhachHang newCustomerProfile(TaiKhoan account, String address) {
        KhachHang customer = new KhachHang();
        customer.setId(UUID.randomUUID().toString());
        customer.setTaiKhoan(account);
        customer.setDiaChiMacDinh(address);
        return customer;
    }

    private void sendWelcomeEmail(String email, String name) {
        if (email == null || email.isBlank()) return;
        try { mail.welcome(email, name); }
        catch (RuntimeException failure) { LOG.warning("Welcome email delivery failed"); }
    }

    public LoginResult login(String username, String password) {
        String phone = normalizePhone(username);
        String login = phone == null ? username.trim() : phone;
        return new TransactionRunner(factory).run(em -> {
            TaiKhoan account = new TaiKhoanDAO(em).findByUsername(login).orElse(null);
            if (account == null || !PasswordHasher.verify(password, account.getMatKhauHash()))
                return new LoginResult(LoginStatus.INVALID_CREDENTIALS, null, -1);
            if (account.getTrangThai() != AccountStatus.HOAT_DONG)
                return new LoginResult(LoginStatus.ACCOUNT_LOCKED, null, -1);
            account.setLanDangNhapCuoi(Instant.now());
            return new LoginResult(LoginStatus.SUCCESS, user(em, account), account.getAuthVersion());
        });
    }

    public LoginResult login(LoginRequest request) {
        return login(request.username(), request.password());
    }

    public User current(String id) {
        try (EntityManager em = factory.createEntityManager()) {
            TaiKhoan account = new TaiKhoanDAO(em).find(id);
            if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG) return null;
            return user(em, account);
        }
    }

    public boolean sessionValid(String id, Long version) {
        if (id == null || version == null) return false;
        try (EntityManager em = factory.createEntityManager()) {
            TaiKhoan account = new TaiKhoanDAO(em).find(id);
            return account != null && account.getTrangThai() == AccountStatus.HOAT_DONG
                    && account.getAuthVersion() == version;
        }
    }

    public ActorContext currentActor(String id) {
        User current = current(id);
        return current == null ? null : new ActorContext(current.maNguoiDung(), current.hoTen(),
                current.vaiTro(), current.maKh(), current.maTx());
    }

    private static User user(EntityManager em, TaiKhoan account) {
        String id = account.getId();
        TaiKhoanDAO accounts = new TaiKhoanDAO(em);
        String maKh = account.getVaiTro() == AccountRole.KHACH_HANG ? accounts.customerProfileId(id) : null;
        String maTx = account.getVaiTro() == AccountRole.TAI_XE ? accounts.driverProfileId(id) : null;
        return new User(id, account.getHoTen(), account.getVaiTro(), maKh, maTx);
    }

    public enum LoginStatus { SUCCESS, INVALID_CREDENTIALS, ACCOUNT_LOCKED }
    public record LoginResult(LoginStatus status, User user, long authVersion) {}

    private static boolean isUniqueViolation(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql && (sql.getErrorCode() == 2601 || sql.getErrorCode() == 2627)) return true;
        }
        return false;
    }

    public static final class AccountExistsException extends RuntimeException {}
}
