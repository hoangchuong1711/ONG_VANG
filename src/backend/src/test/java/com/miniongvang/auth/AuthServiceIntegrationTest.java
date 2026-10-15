package com.miniongvang.auth;
import com.miniongvang.dto.auth.AuthDtos.User;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.PasswordHasher;
import com.miniongvang.service.PasswordRecoveryService;
import com.miniongvang.service.EmailSender;
import java.time.Clock;
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
        assumeTrue(url != null && url.matches("jdbc:sqlserver://[^;]+;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true"));
        dbUser = System.getenv("TEST_DB_USER"); dbPassword = System.getenv("TEST_DB_PASSWORD");
        try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
             var s = c.createStatement(); var r = s.executeQuery("select DB_NAME()")) {
            assertTrue(r.next()); assertEquals("mini_ong_vang_test", r.getString(1));
        }
        persistence = PersistenceContext.start(url, dbUser, dbPassword);
        auth = new AuthService(persistence.entityManagerFactory());
    }

    @AfterAll static void stop() { if (persistence != null) persistence.close(); }

    @Test void registersCustomerAndAuthenticatesByBothPhoneFormats() throws Exception {
        String phone = freshPhone();
        User user = auth.register("Khách thử", "+84" + phone.substring(1), "secret123", null, null);
        try {
            assertEquals("KHACH_HANG", user.vaiTro().name());
            assertNotNull(user.maKh());
            assertEquals(user, auth.current(user.maNguoiDung()));
            assertEquals(user.maNguoiDung(), auth.login(phone, "secret123").user().maNguoiDung());
            assertEquals(user.maNguoiDung(), auth.login("+84" + phone.substring(1), "secret123").user().maNguoiDung());
            assertEquals(AuthService.LoginStatus.INVALID_CREDENTIALS, auth.login(phone, "wrong").status());
            try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
                 var p = c.prepareStatement("select t.username, t.mat_khau_hash, t.so_dien_thoai, t.lan_dang_nhap_cuoi from tai_khoan t join khach_hang k on k.ma_tk=t.ma_tk where t.ma_tk=?")) {
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
        User user = auth.register("Khách thử", phone, "secret123", null, null);
        try {
            assertThrows(AuthService.AccountExistsException.class,
                    () -> auth.register("Khách khác", "+84" + phone.substring(1), "secret456", null, null));
            assertEquals(1, count(phone));
        } finally { cleanup(user.maNguoiDung()); }
    }

    @Test void lockedAccountCannotResolveCurrentUser() throws Exception {
        String phone = freshPhone();
        User user = auth.register("Khách thử", phone, "secret123", null, null);
        try {
            try (var c = DriverManager.getConnection(url, dbUser, dbPassword);
                 var p = c.prepareStatement("update tai_khoan set trang_thai='KHOA' where ma_tk=?")) {
                p.setString(1, user.maNguoiDung()); assertEquals(1, p.executeUpdate());
            }
            assertNull(auth.current(user.maNguoiDung()));
            assertEquals(AuthService.LoginStatus.ACCOUNT_LOCKED, auth.login(phone, "secret123").status());
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
            User a = first.get(), b = second.get();
            try {
                assertTrue((a == null) != (b == null));
                assertEquals(1, count(phone));
            } finally { cleanup((a == null ? b : a).maNguoiDung()); }
        }
    }

    @Test void emailOtpResetsPasswordOnceAndRevokesOldSessionVersion() throws Exception {
        String phone = freshPhone();
        String email = "account-" + UUID.randomUUID() + "@example.test";
        class FakeMail implements EmailSender {
            String code;
            int welcomeCount;
            public boolean enabled() { return true; }
            public void welcome(String address, String name) { welcomeCount++; }
            public void otp(String address, String value) { assertEquals(email, address); code = value; }
            public void passwordChanged(String address) { assertEquals(email, address); }
        }
        FakeMail mail = new FakeMail();
        String ip = "test-" + UUID.randomUUID();
        AuthService configuredAuth = new AuthService(persistence.entityManagerFactory(), mail);
        User user = configuredAuth.register("Khach thu", phone, "secret123", email, null);
        try {
            assertEquals(1, mail.welcomeCount);
            assertTrue(configuredAuth.sessionValid(user.maNguoiDung(), 0L));
            var recovery = new PasswordRecoveryService(persistence.entityManagerFactory(), mail, Clock.systemUTC());
            recovery.request(phone, " " + email.toUpperCase() + " ", ip);
            assertNotNull(mail.code);
            assertThrows(PasswordRecoveryService.RecoveryException.class,
                    () -> recovery.verify(phone, email, "999999".equals(mail.code) ? "000000" : "999999", ip));
            String token = recovery.verify(phone, email, mail.code, ip);
            assertThrows(PasswordRecoveryService.RecoveryException.class,
                    () -> recovery.verify(phone, email, mail.code, ip));
            recovery.reset(phone, email, token, "newSecret123", ip);
            assertThrows(PasswordRecoveryService.RecoveryException.class,
                    () -> recovery.reset(phone, email, token, "anotherSecret123", ip));
            assertFalse(configuredAuth.sessionValid(user.maNguoiDung(), 0L));
            assertEquals(AuthService.LoginStatus.INVALID_CREDENTIALS, configuredAuth.login(phone, "secret123").status());
            assertEquals(AuthService.LoginStatus.SUCCESS, configuredAuth.login(phone, "newSecret123").status());
        } finally { cleanup(user.maNguoiDung()); }
    }

    @Test void failedOtpDeliveryDoesNotLeaveChallengeOrConsumeCooldown() throws Exception {
        String phone = freshPhone();
        String email = "account-" + UUID.randomUUID() + "@example.test";
        String ip = "test-" + UUID.randomUUID();
        class FakeMail implements EmailSender {
            boolean fail = true;
            String code;
            public boolean enabled() { return true; }
            public void welcome(String address, String name) { }
            public void otp(String address, String value) {
                if (fail) throw new IllegalStateException("provider unavailable");
                code = value;
            }
            public void passwordChanged(String address) { }
        }
        FakeMail mail = new FakeMail();
        User user = new AuthService(persistence.entityManagerFactory(), mail)
                .register("Khach thu", phone, "secret123", email, null);
        try {
            var recovery = new PasswordRecoveryService(persistence.entityManagerFactory(), mail, Clock.systemUTC());
            var failure = assertThrows(PasswordRecoveryService.RecoveryException.class,
                    () -> recovery.request(phone, email, ip));
            assertEquals(503, failure.status());
            assertEquals("MAIL_UNAVAILABLE", failure.code());
            mail.fail = false;
            recovery.request(phone, email, ip);
            assertNotNull(mail.code);
            assertNotNull(recovery.verify(phone, email, mail.code, ip));
        } finally { cleanup(user.maNguoiDung()); }
    }

    private static User attempt(String phone) {
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
