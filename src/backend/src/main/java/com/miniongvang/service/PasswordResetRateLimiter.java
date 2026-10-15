package com.miniongvang.service;

import com.miniongvang.dao.AuthRateLimitDAO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.time.Clock;
import java.util.List;

/** Applies password-reset limits while the DAO handles rate-limit storage. */
final class PasswordResetRateLimiter {
    private final EntityManagerFactory factory;
    private final Clock clock;

    PasswordResetRateLimiter(EntityManagerFactory factory, Clock clock) {
        this.factory = factory;
        this.clock = clock;
    }

    // The request limit and OTP challenge share a transaction.
    void checkRequest(EntityManager em, String phone, String email, String ip) {
        AuthRateLimitDAO limits = new AuthRateLimitDAO(em);
        String account = phone + ":" + email;
        if (!limits.consume("request-ip:" + ip, clock.instant(), 3600, 20)
                || !limits.consume("request-account-hour:" + account, clock.instant(), 3600, 5)
                || !limits.consume("request-account-minute:" + account, clock.instant(), 60, 1)) rateLimited();
    }

    void checkVerification(String ip) { check("verify-ip:" + ip, 300, 60); }

    void checkReset(String ip) { check("reset-ip:" + ip, 300, 60); }

    void refundRequest(String phone, String email, String ip) {
        String account = phone + ":" + email;
        new TransactionRunner(factory).run(em -> {
            AuthRateLimitDAO limits = new AuthRateLimitDAO(em);
            for (String bucket : List.of("request-ip:" + ip,
                    "request-account-hour:" + account, "request-account-minute:" + account)) {
                limits.refund(bucket);
            }
            return null;
        });
    }

    private void check(String bucket, int windowSeconds, int maxRequests) {
        boolean allowed = new TransactionRunner(factory).run(em ->
                new AuthRateLimitDAO(em).consume(bucket, clock.instant(), windowSeconds, maxRequests));
        if (!allowed) rateLimited();
    }

    private static void rateLimited() {
        throw new PasswordRecoveryService.RecoveryException(429, "RATE_LIMITED");
    }
}
