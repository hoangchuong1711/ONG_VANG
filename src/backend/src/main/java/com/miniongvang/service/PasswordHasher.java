package com.miniongvang.service;

import java.nio.charset.StandardCharsets;
import org.mindrot.jbcrypt.BCrypt;

/** Shared password format for seed and the future T06 authentication service. */
public final class PasswordHasher {
    private PasswordHasher() {}

    public static String hash(String password) {
        if (password == null || password.isBlank() || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Password must be nonblank and at most 72 UTF-8 bytes");
        return BCrypt.hashpw(password, BCrypt.gensalt(10));
    }

    public static boolean verify(String password, String hash) {
        if (password == null || hash == null || password.getBytes(StandardCharsets.UTF_8).length > 72
                || !hash.matches("\\$2a\\$[0-9]{2}\\$[./A-Za-z0-9]{53}")) return false;
        try { return BCrypt.checkpw(password, hash); }
        catch (IllegalArgumentException malformedHash) { return false; }
    }
}
