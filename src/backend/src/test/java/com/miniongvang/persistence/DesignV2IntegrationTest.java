package com.miniongvang.persistence;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.service.DesignV2AccountService;
import com.miniongvang.service.DesignV2Problem;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Integration checks for the active JDBC-backed DesignV2 persistence model. */
class DesignV2IntegrationTest {
    private static PersistenceContext persistence;
    private static String url;
    private static String user;
    private static String password;
    private static final DesignV2AccountService accounts = new DesignV2AccountService();

    @BeforeAll
    static void start() {
        url = System.getenv("TEST_DB_URL");
        user = System.getenv("TEST_DB_USER");
        password = System.getenv("TEST_DB_PASSWORD");
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
        assumeTrue(url != null && url.matches(
                "jdbc:sqlserver://[^;]+;databaseName=mini_ong_vang_design_v2_test;encrypt=true;trustServerCertificate=true"),
                "DesignV2 integration tests require the isolated mini_ong_vang_design_v2_test database");
        persistence = PersistenceContext.start(url, user, password);
    }

    @AfterAll
    static void stop() {
        if (persistence != null) persistence.close();
    }

    @Test
    void v6CreatesEnabledDesignV2PolicyTriggers() throws Exception {
        try (var connection = persistence.dataSource().getConnection();
             var statement = connection.createStatement();
             var migration = statement.executeQuery(
                     "SELECT COUNT(*) FROM dbo.flyway_schema_history WHERE version='6' AND success=1")) {
            assertTrue(migration.next());
            assertEquals(1, migration.getInt(1), "DesignV2 V6 must be applied successfully");
        }

        try (var connection = persistence.dataSource().getConnection();
             var statement = connection.createStatement();
             var triggers = statement.executeQuery("""
                     SELECT COUNT(*)
                     FROM sys.triggers
                     WHERE is_ms_shipped=0 AND is_disabled=0
                       AND name IN ('tr_policy_cau_hinh_cuoc', 'tr_policy_chinh_sach_thanh_vien',
                                    'tr_policy_cau_hinh_phu_thu', 'tr_kh_role', 'tr_tx_role',
                                    'tr_tk_role_audit', 'tr_don_transition_log', 'tr_chia_hop_le',
                                    'tr_gd_bao_ve')
                     """)) {
            assertTrue(triggers.next());
            assertEquals(9, triggers.getInt(1), "All V2 integrity triggers must exist and be enabled");
        }
    }

    @Test
    void registersAuthenticatesAndRejectsAnIncorrectPassword() throws Exception {
        String phone = freshPhone();
        String accountId = null;
        try (var connection = persistence.dataSource().getConnection()) {
            accountId = accounts.registerCustomer(connection, phone, "secret123", "Khách kiểm thử", phone, null);
            assertNotNull(accountId);

            Map<String, Object> authenticated = accounts.authenticate(connection, phone, "secret123");
            assertEquals(accountId, authenticated.get("ma_tk").toString());
            assertEquals("KHACH_HANG", authenticated.get("vai_tro"));
            assertNotEquals("secret123", authenticated.get("mat_khau_hash"));

            DesignV2Problem failure = assertThrows(DesignV2Problem.class,
                    () -> accounts.authenticate(connection, phone, "wrong-password"));
            assertEquals(401, failure.status());
            assertEquals("INVALID_CREDENTIALS", failure.code());
        } finally {
            if (accountId != null) deleteAccount(accountId);
        }
    }

    @Test
    void duplicateUsernameCannotCreateASecondCustomer() throws Exception {
        String phone = freshPhone();
        String accountId = null;
        try (var connection = persistence.dataSource().getConnection()) {
            accountId = accounts.registerCustomer(connection, phone, "secret123", "Khách kiểm thử", phone, null);
            assertNotNull(accountId);
            assertThrows(SQLException.class, () -> accounts.registerCustomer(
                    connection, phone, "secret456", "Khách trùng", phone, null));
        } finally {
            if (accountId != null) deleteAccount(accountId);
        }
    }

    private static String freshPhone() {
        return "09" + String.format("%08d", ThreadLocalRandom.current().nextInt(100_000_000));
    }

    private static void deleteAccount(String accountId) throws SQLException {
        try (var connection = DriverManager.getConnection(url, user, password)) {
            connection.setAutoCommit(false);
            try (var profile = connection.prepareStatement("DELETE FROM dbo.khach_hang WHERE ma_tk=?");
                 var account = connection.prepareStatement("DELETE FROM dbo.tai_khoan WHERE ma_tk=?")) {
                UUID id = UUID.fromString(accountId);
                profile.setObject(1, id);
                profile.executeUpdate();
                account.setObject(1, id);
                account.executeUpdate();
                connection.commit();
            } catch (SQLException failure) {
                connection.rollback();
                throw failure;
            }
        }
    }
}
