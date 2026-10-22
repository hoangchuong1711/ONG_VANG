package com.miniongvang.persistence;

import com.miniongvang.config.PersistenceContext;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import java.sql.DriverManager;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class ConsolidatedMigrationTest {
    @Test
    void migratesFreshAndLegacyDatabasesAndRestartsWithoutChangingHistory() throws Exception {
        String testUrl = System.getenv("TEST_DB_URL");
        assumeTrue("true".equals(System.getenv("VERIFY_MIGRATION_COMPATIBILITY")), "Only the disposable migration harness enables this test");
        assumeTrue(testUrl != null && testUrl.contains("databaseName=mini_ong_vang_design_v2_test;"));
        String user = System.getenv("TEST_DB_USER"), password = System.getenv("TEST_DB_PASSWORD");
        assumeTrue("true".equalsIgnoreCase(System.getenv("DESIGN_V2_DEMO")));
        try (var first = PersistenceContext.start(testUrl, user, password);
             var restart = PersistenceContext.start(testUrl, user, password);
             var c = restart.dataSource().getConnection(); var s = c.createStatement()) {
            try (var r = s.executeQuery("SELECT COUNT(*) FROM dbo.flyway_schema_history WHERE success=1 AND script='V10__default_pricing.sql'")) {
                r.next(); assertEquals(1, r.getInt(1));
            }
        }
        // The test harness creates this second, empty database in its disposable container.
        String legacyUrl = testUrl.replace("databaseName=mini_ong_vang_design_v2_test;", "databaseName=mini_ong_vang_design_v2_demo;");
        Flyway.configure().dataSource(legacyUrl,user,password).defaultSchema("dbo")
                .locations("classpath:db/designV2Legacy/sqlserver/schema", "classpath:db/designV2Legacy/sqlserver/demo")
                .load().migrate();
        try (var c = DriverManager.getConnection(legacyUrl,user,password); var s = c.createStatement()) {
            s.executeUpdate("UPDATE dbo.tai_khoan SET ho_ten=N'Preserved migration test' WHERE username='demo_admin'");
        }
        try (var first = PersistenceContext.start(legacyUrl,user,password);
             var restart = PersistenceContext.start(legacyUrl,user,password);
             var c = restart.dataSource().getConnection(); var s = c.createStatement()) {
            try (var r = s.executeQuery("SELECT COUNT(*) FROM dbo.flyway_schema_history WHERE success=1")) {
                r.next(); assertEquals(26,r.getInt(1));
            }
            try (var r = s.executeQuery("SELECT ho_ten FROM dbo.tai_khoan WHERE username='demo_admin'")) {
                r.next(); assertEquals("Preserved migration test",r.getString(1));
            }
            try (var r = s.executeQuery("SELECT COUNT(*) FROM dbo.don_hang")) {
                r.next(); assertEquals(9,r.getInt(1));
            }
        }
    }
}
