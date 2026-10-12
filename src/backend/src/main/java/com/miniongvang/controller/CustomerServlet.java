package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.CustomerService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

@WebServlet("/api/customers")
public final class CustomerServlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            var persistence = (PersistenceContext) req.getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            var factory = persistence.entityManagerFactory();
            var session = req.getSession(false);
            String userId = session == null ? null : (String) session.getAttribute("auth.userId");
            var actor = userId == null ? null : new AuthService(factory).current(userId);
            var result = new CustomerService(factory).search(actor, integer(req, "page", 0),
                    integer(req, "size", 20), parameter(req, "q"));
            send(resp, 200, result);
        } catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
        catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
        catch (RuntimeException failure) {
            req.getServletContext().log("Customer search failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private static String parameter(HttpServletRequest req, String name) {
        String[] values = req.getParameterValues(name);
        if (values == null) return null;
        if (values.length != 1) throw new IllegalArgumentException("Invalid query parameter");
        return values[0];
    }
    private static int integer(HttpServletRequest req, String name, int fallback) {
        String value = parameter(req, name);
        return value == null ? fallback : Integer.parseInt(value);
    }
    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(resp.getOutputStream(), body);
    }
    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        send(resp, status, new ErrorDto(code, "Không thể thực hiện yêu cầu: " + code,
                new Object[0], UUID.randomUUID().toString()));
    }
    private record ErrorDto(String code, String message, Object[] fieldErrors, String traceId) {}
}
