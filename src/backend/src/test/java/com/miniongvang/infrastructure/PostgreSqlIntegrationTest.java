package com.miniongvang.infrastructure;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Skeleton infrastructure tests; no application migrations or real payment calls. */
class PostgreSqlIntegrationTest {
    private static String url;

    @BeforeAll
    static void requireIsolatedDatabase() {
        url = System.getenv("TEST_DB_URL");
        boolean configured = url != null && !url.isBlank();
        if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) {
            assertTrue(configured, "CI requires TEST_DB_URL; integration tests must not silently skip");
        }
        assumeTrue(configured, "Set TEST_DB_URL to run isolated PostgreSQL integration tests");
        assertTrue(url.matches("jdbc:postgresql://[^/]+/mini_ong_vang_test"),
                "Integration tests only accept the dedicated mini_ong_vang_test database");
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
    }

    @Test
    void connectsToDedicatedPostgreSqlDatabase() throws SQLException {
        try (Connection connection = connect(); var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT current_database(), 1")) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
            assertTrue(result.next());
            assertEquals("mini_ong_vang_test", result.getString(1));
            assertEquals(1, result.getInt(2));
        }
    }

    @Test
    void commitsAndRollsBackWithoutLeakingPartialWrites() throws SQLException {
        try (Connection connection = connect(); var statement = connection.createStatement()) {
            // Temporary table belongs only to this connection and disappears when it closes.
            statement.execute("CREATE TEMP TABLE t05_transaction_probe (id INTEGER PRIMARY KEY, amount NUMERIC(15,2) NOT NULL)");
            connection.setAutoCommit(false);
            statement.executeUpdate("INSERT INTO t05_transaction_probe VALUES (1, 45000.00)");
            connection.commit();

            statement.executeUpdate("INSERT INTO t05_transaction_probe VALUES (2, 10000.00)");
            SQLException duplicate = assertThrows(SQLException.class,
                    () -> statement.executeUpdate("INSERT INTO t05_transaction_probe VALUES (1, 90000.00)"));
            assertEquals("23505", duplicate.getSQLState());
            connection.rollback();

            try (var result = statement.executeQuery("SELECT count(*), sum(amount) FROM t05_transaction_probe")) {
                assertTrue(result.next());
                assertEquals(1, result.getInt(1));
                assertEquals("45000.00", result.getBigDecimal(2).toPlainString());
            }
            connection.rollback();
        }
    }
}
