package com.miniongvang.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;

/** Owns the database pool. Migration always runs before requests are served. */
public final class PersistenceContext implements AutoCloseable {
    private final HikariDataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    private PersistenceContext(HikariDataSource dataSource) {
        this.dataSource = dataSource;
        this.entityManagerFactory = null;
    }

    public static PersistenceContext start(String url, String user, String password) {
        if (url == null || url.isBlank() || user == null || password == null) {
            throw new IllegalArgumentException("DB_URL, DB_USER and DB_PASSWORD are required");
        }
        HikariConfig config = new HikariConfig();
        // Load the WAR-local driver explicitly when running under Tomcat.
        config.setDriverClassName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        config.setJdbcUrl(url);
        config.setUsername(user);
        config.setPassword(password);
        config.setMaximumPoolSize(8);
        config.setMinimumIdle(1);
        config.setPoolName("mini-ong-vang");
        HikariDataSource pool = new HikariDataSource(config);
        try {
            String db = url.toLowerCase(java.util.Locale.ROOT);
            if (!db.contains("databasename=mini_ong_vang_"))
                throw new IllegalArgumentException("DB_URL must target a mini_ong_vang database");
            boolean demo = "true".equalsIgnoreCase(System.getenv("DESIGN_V2_DEMO"));
            String schema = "classpath:db/designV2/sqlserver/schema";
            String migrationUser = System.getenv().getOrDefault("MIGRATION_DB_USER", user);
            String migrationPassword = System.getenv().getOrDefault("MIGRATION_DB_PASSWORD", password);
            Flyway.configure().dataSource(url, migrationUser, migrationPassword).defaultSchema("dbo")
                    .locations(demo ? new String[]{schema, "classpath:db/designV2/sqlserver/demo"}
                            : new String[]{schema}).load().migrate();
            return new PersistenceContext(pool);
        } catch (RuntimeException failure) {
            pool.close();
            throw failure;
        }
    }

    public HikariDataSource dataSource() { return dataSource; }
    public EntityManagerFactory entityManagerFactory() { return entityManagerFactory; }

    @Override public void close() {
        dataSource.close();
    }
}
