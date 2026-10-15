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
import java.time.Instant;
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

    public PasswordRecoveryService(EntityManagerFactory factory, EmailSender mail, Clock clock) {
        this.factory = factory; this.mail = mail; this.clock = clock;
    }
    public void request(String rawPhone, String rawEmail, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (!mail.enabled()) throw new RecoveryException(503, "MAIL_UNAVAILABLE");
        String ipBucket = "request-ip:" + ip;
        String hourBucket = "request-account-hour:" + phone + ":" + email;
        String minuteBucket = "request-account-minute:" + phone + ":" + email;
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        String hash = PasswordHasher.hash(code);
        boolean issued = new TransactionRunner(factory).run(em -> {
            if (!consume(em, ipBucket, 3600, 20)
                    || !consume(em, hourBucket, 3600, 5)
                    || !consume(em, minuteBucket, 60, 1)) throw new RecoveryException(429, "RATE_LIMITED");
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
        });
        if (issued) try { mail.otp(email, code); }
        catch (RuntimeException failure) {
            LOG.log(java.util.logging.Level.WARNING, "Password reset email delivery failed", failure);
            try {
                new TransactionRunner(factory).run(em -> {
                    TaiKhoan account = account(em, phone, email);
                    PasswordResetChallenge current = account == null ? null : em.find(PasswordResetChallenge.class, account.getId());
                    if (current != null && hash.equals(current.getOtpHash())) em.remove(current);
                    return null;
                });
            } catch (RuntimeException cleanupFailure) {
                LOG.log(java.util.logging.Level.WARNING, "Password reset challenge cleanup failed", cleanupFailure);
            }
            try { refund(ipBucket, hourBucket, minuteBucket); }
            catch (RuntimeException cleanupFailure) {
                LOG.log(java.util.logging.Level.WARNING, "Password reset rate-limit cleanup failed", cleanupFailure);
            }
            throw new RecoveryException(503, "MAIL_UNAVAILABLE");
        }
    }
    public String verify(String rawPhone, String rawEmail, String otp, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (otp == null || !otp.matches("[0-9]{6}")) throw invalidOtp();
        limit("verify-ip:" + ip, 300, 60);
        record Verification(String token, boolean valid) {}
        Verification result = new TransactionRunner(factory).run(em -> {
            TaiKhoan account = account(em, phone, email);
            PasswordResetChallenge challenge = active(em, account);
            if (challenge == null || challenge.getOtpHash() == null || challenge.getAttempts() >= 5
                    || !clock.instant().isBefore(challenge.getOtpExpiresAt())) return new Verification(null, false);
            if (!PasswordHasher.verify(otp, challenge.getOtpHash())) {
                challenge.setAttempts(challenge.getAttempts() + 1);
                if (challenge.getAttempts() == 5) challenge.setOtpHash(null);
                return new Verification(null, false);
            }
            byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            challenge.setOtpHash(null);
            challenge.setTokenHash(digest(token));
            challenge.setTokenExpiresAt(clock.instant().plusSeconds(300));
            return new Verification(token, true);
        });
        if (!result.valid()) throw invalidOtp();
        return result.token();
    }
    public void reset(String rawPhone, String rawEmail, String token, String password, String ip) {
        String phone = phone(rawPhone), email = email(rawEmail);
        if (password == null || password.length() < 8 || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) throw new RecoveryException(400, "VALIDATION_ERROR");
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalidToken();
        limit("reset-ip:" + ip, 300, 60);
        boolean changed = new TransactionRunner(factory).run(em -> {
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
        });
        if (!changed) throw invalidToken();
        try { mail.passwordChanged(email); }
        catch (RuntimeException failure) { LOG.warning("Password change email delivery failed"); }
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
    private void limit(String bucket, int seconds, int max) {
        boolean allowed = new TransactionRunner(factory).run(em -> consume(em, bucket, seconds, max));
        if (!allowed) throw new RecoveryException(429, "RATE_LIMITED");
    }
    private boolean consume(EntityManager em, String bucket, int seconds, int max) {
        String key = digest(bucket);
        Instant now = clock.instant();
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> rows = em.createNativeQuery(
                "SELECT expires_at, request_count FROM dbo.auth_rate_limit WITH (UPDLOCK, HOLDLOCK) WHERE bucket_key = :key")
                .setParameter("key", key).getResultList();
        if (rows.isEmpty()) {
            em.createNativeQuery("INSERT INTO dbo.auth_rate_limit(bucket_key, expires_at, request_count) VALUES (:key, :expiry, 1)")
                    .setParameter("key", key).setParameter("expiry", now.plusSeconds(seconds)).executeUpdate();
            return true;
        }
        Object[] row = rows.get(0);
        Instant expiry = row[0] instanceof java.sql.Timestamp timestamp ? timestamp.toInstant()
                : ((java.time.LocalDateTime) row[0]).toInstant(java.time.ZoneOffset.UTC);
        int count = ((Number) row[1]).intValue();
        if (now.isBefore(expiry) && count >= max) return false;
        em.createNativeQuery("UPDATE dbo.auth_rate_limit SET expires_at = :expiry, request_count = :count WHERE bucket_key = :key")
                .setParameter("expiry", now.isBefore(expiry) ? expiry : now.plusSeconds(seconds))
                .setParameter("count", now.isBefore(expiry) ? count + 1 : 1).setParameter("key", key).executeUpdate();
        return true;
    }
    private void refund(String... buckets) {
        new TransactionRunner(factory).run(em -> {
            for (String bucket : buckets) {
                String key = digest(bucket);
                int removed = em.createNativeQuery("DELETE FROM dbo.auth_rate_limit WHERE bucket_key = :key AND request_count = 1")
                        .setParameter("key", key).executeUpdate();
                if (removed == 0) em.createNativeQuery(
                        "UPDATE dbo.auth_rate_limit SET request_count = request_count - 1 WHERE bucket_key = :key AND request_count > 1")
                        .setParameter("key", key).executeUpdate();
            }
            return null;
        });
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
