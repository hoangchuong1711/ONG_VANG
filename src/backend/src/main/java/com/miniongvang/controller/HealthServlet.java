package com.miniongvang.controller;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

@WebServlet("/api/health")
public class HealthServlet extends HttpServlet {

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) {
        setCorsHeaders(response);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {

        setCorsHeaders(response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String databaseUrl = System.getenv("DB_URL");
        String databaseUser = System.getenv("DB_USER");
        String databasePassword = System.getenv("DB_PASSWORD");

        if (databaseUrl == null || databaseUser == null || databasePassword == null) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.getWriter().write("""
                {"status":"error","service":"mini-ong-vang-backend","database":"disconnected","message":"Database connection settings are missing."}
                """);
            return;
        }

        try {
            Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        } catch (ClassNotFoundException exception) {
            getServletContext().log("SQL Server JDBC driver is missing from the backend WAR.", exception);
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.getWriter().write("""
                {"status":"error","service":"mini-ong-vang-backend","database":"disconnected","message":"SQL Server JDBC driver is unavailable."}
                """);
            return;
        }

        try (Connection connection = DriverManager.getConnection(databaseUrl, databaseUser, databasePassword);
             var statement = connection.createStatement()) {
            statement.executeQuery("SELECT 1").close();
            String databaseName = connection.getCatalog();
            response.getWriter().write("""
                {"status":"ok","service":"mini-ong-vang-backend","database":"connected","databaseName":"%s"}
                """.formatted(escapeJson(databaseName)));
        } catch (SQLException exception) {
            getServletContext().log(
                    "Database health check failed (SQLState=" + exception.getSQLState() + "): " + exception.getMessage(),
                    exception
            );
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.getWriter().write("""
                {"status":"error","service":"mini-ong-vang-backend","database":"disconnected","message":"Backend is reachable, but the database connection failed."}
                """);
        }
    }

    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
