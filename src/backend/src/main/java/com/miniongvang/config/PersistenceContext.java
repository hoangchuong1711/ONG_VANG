package com.miniongvang.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;
import org.flywaydb.core.Flyway;

import java.util.Map;

/** Owns the pool and JPA factory. Migration always precedes Hibernate validation. */
public final class PersistenceContext implements AutoCloseable {
    private final HikariDataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    private PersistenceContext(HikariDataSource dataSource, EntityManagerFactory entityManagerFactory) {
        this.dataSource = dataSource;
        this.entityManagerFactory = entityManagerFactory;
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
            Flyway.configure().dataSource(pool).defaultSchema("dbo")
                    .locations("classpath:db/sqlserver").load().migrate();
            EntityManagerFactory factory = Persistence.createEntityManagerFactory("mini-ong-vang",
                    Map.of("jakarta.persistence.nonJtaDataSource", pool));
            return new PersistenceContext(pool, factory);
        } catch (RuntimeException failure) {
            pool.close();
            throw failure;
        }
    }

    public EntityManagerFactory entityManagerFactory() { return entityManagerFactory; }
    public HikariDataSource dataSource() { return dataSource; }

    @Override public void close() {
        try { entityManagerFactory.close(); }
        finally { dataSource.close(); }
    }
}
