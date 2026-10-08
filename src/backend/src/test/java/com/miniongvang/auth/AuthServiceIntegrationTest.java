package com.miniongvang.auth;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.PasswordHasher;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.sql.DriverManager;
import java.util.UUID;
import java.util.concurrent.Executors;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class AuthServiceIntegrationTest {
    private static PersistenceContext persistence;
    private static AuthService auth;
    private static String url, dbUser, dbPassword;

    @BeforeAll static void start() throws Exception {
        url = System.getenv("TEST_DB_URL");
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
        assumeTrue(url != null && url.matches("jdbc:postgresql://[^/]+/mini_ong_vang_test"));
        dbUser = System.getenv("TEST_DB_USER"); dbPassword = System.getenv("TEST_DB_PASSWORD");
        try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
             var s = c.createStatement(); var r = s.executeQuery("select current_database()")) {
            assertTrue(r.next()); assertEquals("mini_ong_vang_test", r.getString(1));
        }
        persistence = PersistenceContext.start(url, dbUser, dbPassword);
        auth = new AuthService(persistence.entityManagerFactory());
    }

    @AfterAll static void stop() { if (persistence != null) persistence.close(); }

    @Test void registersCustomerAndAuthenticatesByBothPhoneFormats() throws Exception {
        String phone = freshPhone();
        AuthService.User user = auth.register("Khách thử", "+84" + phone.substring(1), "secret123", null, null);
        try {
            assertEquals("KHACH_HANG", user.vaiTro().name());
            assertNotNull(user.maKh());
            assertEquals(user, auth.current(user.maNguoiDung()));
            assertEquals(user.maNguoiDung(), auth.authenticate(phone, "secret123").getId());
            assertEquals(user.maNguoiDung(), auth.authenticate("+84" + phone.substring(1), "secret123").getId());
            assertNull(auth.authenticate(phone, "wrong"));
            auth.recordLogin(user.maNguoiDung());
            try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
                 var p = c.prepareStatement("select t.username, t.mat_khau_hash, k.so_dien_thoai, t.lan_dang_nhap_cuoi from tai_khoan t join khach_hang k on k.ma_tk=t.ma_tk where t.ma_tk=?")) {
                p.setString(1, user.maNguoiDung());
                try (var r = p.executeQuery()) {
                    assertTrue(r.next()); assertEquals(phone, r.getString(1)); assertEquals(phone, r.getString(3));
                    assertNotEquals("secret123", r.getString(2)); assertTrue(PasswordHasher.verify("secret123", r.getString(2)));
                    assertNotNull(r.getTimestamp(4));
                }
            }
        } finally { cleanup(user.maNguoiDung()); }
    }

    @Test void duplicateNormalizedPhoneDoesNotCreateSecondProfile() throws Exception {
        String phone = freshPhone();
        AuthService.User user = auth.register("Khách thử", phone, "secret123", null, null);
        try {
            assertThrows(AuthService.AccountExistsException.class,
                    () -> auth.register("Khách khác", "+84" + phone.substring(1), "secret456", null, null));
            assertEquals(1, count(phone));
        } finally { cleanup(user.maNguoiDung()); }
    }

    @Test void lockedAccountCannotResolveCurrentUser() throws Exception {
        String phone = freshPhone();
        AuthService.User user = auth.register("Khách thử", phone, "secret123", null, null);
        try {
            try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
                 var p = c.prepareStatement("update tai_khoan set trang_thai='KHOA' where ma_tk=?")) {
                p.setString(1, user.maNguoiDung()); assertEquals(1, p.executeUpdate());
            }
            assertNull(auth.current(user.maNguoiDung()));
            assertNotNull(auth.authenticate(phone, "secret123"));
        } finally { cleanup(user.maNguoiDung()); }
    }

    @Test void profileFailureRollsBackAccount() throws Exception {
        String phone = freshPhone();
        String address = "x".repeat(256);
        assertThrows(RuntimeException.class, () -> auth.register("Khách thử", phone, "secret123", null, address));
        assertEquals(0, count(phone));
    }

    @Test void concurrentDuplicateRegistrationCreatesOnlyOneCustomer() throws Exception {
        String phone = freshPhone();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> attempt(phone));
            var second = executor.submit(() -> attempt(phone));
            AuthService.User a = first.get(), b = second.get();
            try {
                assertTrue((a == null) != (b == null));
                assertEquals(1, count(phone));
            } finally { cleanup((a == null ? b : a).maNguoiDung()); }
        }
    }

    private static AuthService.User attempt(String phone) {
        try { return auth.register("Khách thử", phone, "secret123", null, null); }
        catch (AuthService.AccountExistsException duplicate) { return null; }
    }
    private static String freshPhone() {
        return "09" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode()) % 100000000);
    }
    private static int count(String phone) throws Exception {
        try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
             var p = c.prepareStatement("select count(*) from tai_khoan where username=?")) {
            p.setString(1, phone); try (var r = p.executeQuery()) { r.next(); return r.getInt(1); }
        }
    }
    private static void cleanup(String id) throws Exception {
        try (var c = DriverManager.getConnection(url, dbUser, dbPassword)) {
            c.setAutoCommit(false);
            try (var child = c.prepareStatement("delete from khach_hang where ma_tk=?");
                 var parent = c.prepareStatement("delete from tai_khoan where ma_tk=?")) {
                child.setString(1, id); child.executeUpdate();
                parent.setString(1, id); parent.executeUpdate();
                c.commit();
            }
        }
    }
}
