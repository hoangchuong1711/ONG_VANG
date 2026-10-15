package com.miniongvang.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

/** Database-backed limits shared by all backend instances. */
final class PasswordResetRateLimiter {
    private final EntityManagerFactory factory;
    private final Clock clock;

    PasswordResetRateLimiter(EntityManagerFactory factory, Clock clock) {
        this.factory = factory;
        this.clock = clock;
    }

    // This runs in the same transaction as OTP creation, so failed database writes do not use a send attempt.
    void checkRequest(EntityManager em, String phone, String email, String ip) {
        String account = phone + ":" + email;
        if (!consume(em, "request-ip:" + ip, 3600, 20)
                || !consume(em, "request-account-hour:" + account, 3600, 5)
                || !consume(em, "request-account-minute:" + account, 60, 1)) rateLimited();
    }

    void checkVerification(String ip) { check("verify-ip:" + ip, 300, 60); }

    void checkReset(String ip) { check("reset-ip:" + ip, 300, 60); }

    void refundRequest(String phone, String email, String ip) {
        String account = phone + ":" + email;
        new TransactionRunner(factory).run(em -> {
            for (String bucket : List.of("request-ip:" + ip,
                    "request-account-hour:" + account, "request-account-minute:" + account)) {
                String key = digest(bucket);
                int removed = em.createNativeQuery(
                        "DELETE FROM dbo.auth_rate_limit WHERE bucket_key = :key AND request_count = 1")
                        .setParameter("key", key).executeUpdate();
                if (removed == 0) em.createNativeQuery(
                        "UPDATE dbo.auth_rate_limit SET request_count = request_count - 1 WHERE bucket_key = :key AND request_count > 1")
                        .setParameter("key", key).executeUpdate();
            }
            return null;
        });
    }

    private void check(String bucket, int windowSeconds, int maxRequests) {
        boolean allowed = new TransactionRunner(factory).run(em -> consume(em, bucket, windowSeconds, maxRequests));
        if (!allowed) rateLimited();
    }

    private boolean consume(EntityManager em, String bucket, int windowSeconds, int maxRequests) {
        String key = digest(bucket);
        Instant now = clock.instant();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT expires_at, request_count FROM dbo.auth_rate_limit WITH (UPDLOCK, HOLDLOCK) WHERE bucket_key = :key")
                .setParameter("key", key).getResultList();

        if (rows.isEmpty()) {
            em.createNativeQuery("INSERT INTO dbo.auth_rate_limit(bucket_key, expires_at, request_count) VALUES (:key, :expiry, 1)")
                    .setParameter("key", key).setParameter("expiry", now.plusSeconds(windowSeconds)).executeUpdate();
            return true;
        }

        Object[] row = rows.get(0);
        Instant expiry = row[0] instanceof java.sql.Timestamp timestamp ? timestamp.toInstant()
                : ((LocalDateTime) row[0]).toInstant(ZoneOffset.UTC);
        int count = ((Number) row[1]).intValue();
        if (now.isBefore(expiry) && count >= maxRequests) return false;

        em.createNativeQuery("UPDATE dbo.auth_rate_limit SET expires_at = :expiry, request_count = :count WHERE bucket_key = :key")
                .setParameter("expiry", now.isBefore(expiry) ? expiry : now.plusSeconds(windowSeconds))
                .setParameter("count", now.isBefore(expiry) ? count + 1 : 1)
                .setParameter("key", key).executeUpdate();
        return true;
    }

    private static void rateLimited() {
        throw new PasswordRecoveryService.RecoveryException(429, "RATE_LIMITED");
    }

    private static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException failure) {
            throw new IllegalStateException(failure);
        }
    }
}
