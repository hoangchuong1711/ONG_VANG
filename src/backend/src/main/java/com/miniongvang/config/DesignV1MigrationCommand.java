package com.miniongvang.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.Persistence;
import com.miniongvang.seed.DesignV1DemoSeeder;
import org.flywaydb.core.Flyway;
import java.util.Map;

/** Runs the new migration track only against the isolated designV1 database. */
public final class DesignV1MigrationCommand {
    private static final String TARGET = "mini_ong_vang_design_v1";

    private DesignV1MigrationCommand() {}

    public static void main(String[] args) {
        String url = System.getenv("DB_URL");
        String user = System.getenv("DB_USER");
        String password = System.getenv("DB_PASSWORD");
        if (url == null || user == null || password == null) {
            throw new IllegalArgumentException("DB_URL, DB_USER and DB_PASSWORD are required");
        }
        boolean targetMatches = false;
        for (String part : url.split(";")) {
            if (part.equalsIgnoreCase("databaseName=" + TARGET)) {
                targetMatches = true;
                break;
            }
        }
        if (!targetMatches) {
            throw new IllegalArgumentException("This command only migrates " + TARGET);
        }
        Flyway.configure()
                .dataSource(url, user, password)
                .defaultSchema("dbo")
                .locations("classpath:db/designV1/sqlserver")
                .load()
                .migrate();
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        config.setJdbcUrl(url);
        config.setUsername(user);
        config.setPassword(password);
        config.setMaximumPoolSize(2);
        try (HikariDataSource pool = new HikariDataSource(config)) {
            try (var factory = Persistence.createEntityManagerFactory("mini-ong-vang-design-v1",
                    Map.of("jakarta.persistence.nonJtaDataSource", pool))) {
                if ("true".equalsIgnoreCase(System.getenv("DEMO_SEED"))) {
                    new DesignV1DemoSeeder(factory).seed(System.getenv("DEMO_PASSWORD"));
                }
                if ("true".equalsIgnoreCase(System.getenv("DESIGN_V1_SMOKE"))) {
                    DesignV1Smoke.run(factory);
                }
                System.out.println("designV1 migration and JPA schema validation succeeded");
            }
        }
    }
}
