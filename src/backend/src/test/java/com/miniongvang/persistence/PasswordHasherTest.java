package com.miniongvang.persistence;

import com.miniongvang.service.PasswordHasher;
import org.junit.jupiter.api.Test;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
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

    @Test void restoredDemoHashMatchesDocumentedPassword() throws Exception {
        String path = "/db/designV2/sqlserver/demo/V9__demo_data.sql";
        try (InputStream migration = getClass().getResourceAsStream(path)) {
            assertNotNull(migration);
            String sql = new String(migration.readAllBytes(), StandardCharsets.UTF_8);
            var matcher = Pattern.compile("@hash NVARCHAR\\(255\\)=N'([^']+)'").matcher(sql);
            assertTrue(matcher.find());
            assertTrue(PasswordHasher.verify("12345678", matcher.group(1)));
        }
    }
}
