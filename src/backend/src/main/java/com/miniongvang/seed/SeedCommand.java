package com.miniongvang.seed;

import com.miniongvang.config.PersistenceContext;

/** CLI entry point for seeding a dedicated test database after reset. */
public final class SeedCommand {
    private SeedCommand() {}

    public static void main(String[] args) {
        if (args.length != 1 || !"test".equals(args[0]))
            throw new IllegalArgumentException("Only the dedicated test seed mode is supported");
        String url = System.getenv("TEST_DB_URL");
        if (!"true".equalsIgnoreCase(System.getenv("REQUIRE_TEST_DB"))
                || url == null || !url.matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):15433/mini_ong_vang_test")) {
            throw new IllegalArgumentException("Dedicated test DB settings are required");
        }
        String password = System.getenv("DEMO_PASSWORD");
        try (PersistenceContext persistence = PersistenceContext.start(url,
                System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"))) {
            try (var connection = persistence.dataSource().getConnection();
                 var statement = connection.createStatement();
                 var result = statement.executeQuery("SELECT current_database()")) {
                result.next();
                if (!"mini_ong_vang_test".equals(result.getString(1)))
                    throw new IllegalStateException("Refusing to seed a non-test database");
            } catch (java.sql.SQLException failure) {
                throw new IllegalStateException("Cannot verify test database", failure);
            }
            new DemoSeeder(persistence.entityManagerFactory()).seed(password);
        }
    }
}
