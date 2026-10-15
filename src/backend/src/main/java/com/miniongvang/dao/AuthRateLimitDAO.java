package com.miniongvang.dao;

import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

/** Reads and updates the shared password-reset rate-limit table. */
public final class AuthRateLimitDAO {
    private final EntityManager em;

    public AuthRateLimitDAO(EntityManager em) {
        this.em = em;
    }

    public boolean consume(String bucket, Instant now, int windowSeconds, int maxRequests) {
        String key = digest(bucket);
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

    public void refund(String bucket) {
        String key = digest(bucket);
        int removed = em.createNativeQuery(
                "DELETE FROM dbo.auth_rate_limit WHERE bucket_key = :key AND request_count = 1")
                .setParameter("key", key).executeUpdate();
        if (removed == 0) em.createNativeQuery(
                "UPDATE dbo.auth_rate_limit SET request_count = request_count - 1 WHERE bucket_key = :key AND request_count > 1")
                .setParameter("key", key).executeUpdate();
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
