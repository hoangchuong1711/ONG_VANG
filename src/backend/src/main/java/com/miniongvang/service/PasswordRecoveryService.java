package com.miniongvang.service;

import com.miniongvang.dao.TaiKhoanDAO;
import com.miniongvang.entity.PasswordResetChallenge;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.enums.AccountStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.LockModeType;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.logging.Logger;

public final class PasswordRecoveryService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Logger LOG = Logger.getLogger(PasswordRecoveryService.class.getName());
    private final EntityManagerFactory factory;
    private final EmailSender mail;
    private final Clock clock;
    private final PasswordResetRateLimiter rateLimiter;

    public PasswordRecoveryService(EntityManagerFactory factory, EmailSender mail, Clock clock) {
        this.factory = factory; this.mail = mail; this.clock = clock;
        this.rateLimiter = new PasswordResetRateLimiter(factory, clock);
    }
    public void request(String rawPhone, String rawEmail, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (!mail.enabled()) throw new RecoveryException(503, "MAIL_UNAVAILABLE");
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        String hash = PasswordHasher.hash(code);
        boolean issued = new TransactionRunner(factory).run(em -> {
            rateLimiter.checkRequest(em, phone, email, ip);
            return issueChallenge(em, phone, email, hash);
        });
        if (!issued) return;
        try { mail.otp(email, code); }
        catch (RuntimeException failure) { handleDeliveryFailure(phone, email, ip, hash, failure); }
    }

    private boolean issueChallenge(EntityManager em, String phone, String email, String hash) {
        TaiKhoan account = account(em, phone, email);
        if (account == null) return false;
        PasswordResetChallenge challenge = em.find(PasswordResetChallenge.class, account.getId());
        boolean fresh = challenge == null;
        if (fresh) challenge = new PasswordResetChallenge(account.getId());
        challenge.setOtpHash(hash);
        challenge.setOtpExpiresAt(clock.instant().plusSeconds(300));
        challenge.setAttempts(0);
        challenge.setTokenHash(null);
        challenge.setTokenExpiresAt(null);
        challenge.setAuthVersion(account.getAuthVersion());
        if (fresh) em.persist(challenge);
        return true;
    }

    private void handleDeliveryFailure(String phone, String email, String ip, String hash, RuntimeException failure) {
        LOG.log(java.util.logging.Level.WARNING, "Password reset email delivery failed", failure);
        try { revokeChallenge(phone, email, hash); }
        catch (RuntimeException cleanupFailure) {
            LOG.log(java.util.logging.Level.WARNING, "Password reset challenge cleanup failed", cleanupFailure);
        }
        try { rateLimiter.refundRequest(phone, email, ip); }
        catch (RuntimeException cleanupFailure) {
            LOG.log(java.util.logging.Level.WARNING, "Password reset rate-limit cleanup failed", cleanupFailure);
        }
        throw new RecoveryException(503, "MAIL_UNAVAILABLE");
    }

    private void revokeChallenge(String phone, String email, String hash) {
        new TransactionRunner(factory).run(em -> {
            TaiKhoan account = account(em, phone, email);
            PasswordResetChallenge current = account == null ? null : em.find(PasswordResetChallenge.class, account.getId());
            if (current != null && hash.equals(current.getOtpHash())) em.remove(current);
            return null;
        });
    }
    public String verify(String rawPhone, String rawEmail, String otp, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (otp == null || !otp.matches("[0-9]{6}")) throw invalidOtp();
        rateLimiter.checkVerification(ip);
        String token = new TransactionRunner(factory).run(em -> verifyChallenge(em, phone, email, otp));
        if (token == null) throw invalidOtp();
        return token;
    }

    private String verifyChallenge(EntityManager em, String phone, String email, String otp) {
        PasswordResetChallenge challenge = active(em, account(em, phone, email));
        if (challenge == null || challenge.getOtpHash() == null || challenge.getAttempts() >= 5
                || !clock.instant().isBefore(challenge.getOtpExpiresAt())) return null;
        if (!PasswordHasher.verify(otp, challenge.getOtpHash())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            if (challenge.getAttempts() == 5) challenge.setOtpHash(null);
            return null;
        }
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        challenge.setOtpHash(null);
        challenge.setTokenHash(digest(token));
        challenge.setTokenExpiresAt(clock.instant().plusSeconds(300));
        return token;
    }
    public void reset(String rawPhone, String rawEmail, String token, String password, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (password == null || password.length() < 8 || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) throw new RecoveryException(400, "VALIDATION_ERROR");
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalidToken();
        rateLimiter.checkReset(ip);
        boolean changed = new TransactionRunner(factory).run(em -> changePassword(em, phone, email, token, password));
        if (!changed) throw invalidToken();
        try { mail.passwordChanged(email); }
        catch (RuntimeException failure) { LOG.warning("Password change email delivery failed"); }
    }

    private boolean changePassword(EntityManager em, String phone, String email, String token, String password) {
        TaiKhoan account = account(em, phone, email);
        PasswordResetChallenge challenge = active(em, account);
        if (challenge == null || challenge.getTokenHash() == null || challenge.getTokenExpiresAt() == null
                || !clock.instant().isBefore(challenge.getTokenExpiresAt())
                || !MessageDigest.isEqual(digest(token).getBytes(StandardCharsets.US_ASCII),
                        challenge.getTokenHash().getBytes(StandardCharsets.US_ASCII))) return false;
        account.setMatKhauHash(PasswordHasher.hash(password));
        account.setAuthVersion(account.getAuthVersion() + 1);
        em.remove(challenge);
        return true;
    }
    private TaiKhoan account(EntityManager em, String phone, String email) {
        TaiKhoan found = new TaiKhoanDAO(em).findByUsername(phone).orElse(null);
        if (found == null) return null;
        TaiKhoan locked = em.find(TaiKhoan.class, found.getId(), LockModeType.PESSIMISTIC_WRITE);
        return locked != null && locked.getTrangThai() == AccountStatus.HOAT_DONG
                && locked.getEmail() != null && locked.getEmail().trim().equalsIgnoreCase(email) ? locked : null;
    }
    private PasswordResetChallenge active(EntityManager em, TaiKhoan account) {
        if (account == null) return null;
        PasswordResetChallenge challenge = em.find(PasswordResetChallenge.class, account.getId());
        return challenge != null && challenge.getAuthVersion() == account.getAuthVersion() ? challenge : null;
    }
    private static String phone(String raw) {
        String result = AuthService.normalizePhone(raw);
        if (result == null) throw new RecoveryException(400, "VALIDATION_ERROR");
        return result;
    }
    private static String email(String raw) {
        String result = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (result.length() > 150 || !result.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new RecoveryException(400, "VALIDATION_ERROR");
        return result;
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException failure) { throw new IllegalStateException(failure); }
    }
    private static RecoveryException invalidOtp() { return new RecoveryException(400, "INVALID_OTP"); }
    private static RecoveryException invalidToken() { return new RecoveryException(400, "INVALID_RESET_TOKEN"); }
    public static final class RecoveryException extends RuntimeException {
        private final int status;
        private final String code;
        public RecoveryException(int status, String code) { this.status = status; this.code = code; }
        public int status() { return status; }
        public String code() { return code; }
    }
}
