package com.miniongvang.persistence;

import com.miniongvang.service.PasswordHasher;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PasswordHasherTest {
    @Test void hashesUseRandomSaltAndRejectWrongOrMalformedInput() {
        String first = PasswordHasher.hash("test-only-password");
        String second = PasswordHasher.hash("test-only-password");
        assertNotEquals(first, second);
        assertTrue(PasswordHasher.verify("test-only-password", first));
        assertFalse(PasswordHasher.verify("wrong", first));
        assertFalse(PasswordHasher.verify("test-only-password", ""));
        assertFalse(PasswordHasher.verify("test-only-password", "malformed"));
    }

    @Test void rejectsPasswordsThatBcryptWouldSilentlyTruncate() {
        assertThrows(IllegalArgumentException.class, () -> PasswordHasher.hash("a".repeat(73)));
        assertThrows(IllegalArgumentException.class, () -> PasswordHasher.hash("ắ".repeat(25)));
        assertThrows(IllegalArgumentException.class, () -> PasswordHasher.hash(" "));
    }
}
