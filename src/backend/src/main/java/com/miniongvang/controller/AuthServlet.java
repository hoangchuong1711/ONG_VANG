package com.miniongvang.controller;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.enums.AccountStatus;
import com.miniongvang.service.AuthService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

@WebServlet({"/api/auth/csrf", "/api/auth/register", "/api/auth/login", "/api/auth/me", "/api/auth/logout"})
public final class AuthServlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String USER_ID = "auth.userId";
    private static final String CSRF = "auth.csrf";

    private AuthService service() {
        PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
        return new AuthService(persistence.entityManagerFactory());
    }

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        noStore(resp);
        try {
        if (req.getServletPath().endsWith("/csrf")) {
            HttpSession session = req.getSession();
            String token = (String) session.getAttribute(CSRF);
            if (token == null) { token = token(); session.setAttribute(CSRF, token); }
            send(resp, 200, new Csrf(token, "X-CSRF-Token"));
        } else if (req.getServletPath().endsWith("/me")) {
            HttpSession session = req.getSession(false);
            String id = session == null ? null : (String) session.getAttribute(USER_ID);
            if (id == null) { error(resp, 401, missingSessionCode(req)); return; }
            AuthService.User user = service().current(id);
            if (user == null) { session.invalidate(); error(resp, 403, "FORBIDDEN"); return; }
            send(resp, 200, user);
        } else error(resp, 404, "RESOURCE_NOT_FOUND");
        } catch (RuntimeException failure) {
            getServletContext().log("Auth GET failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        noStore(resp);
        String path = req.getServletPath();
        HttpSession session = req.getSession(false);
        if (path.endsWith("/logout") && (session == null || session.getAttribute(USER_ID) == null)) {
            error(resp, 401, missingSessionCode(req)); return;
        }
        String expected = session == null ? null : (String) session.getAttribute(CSRF);
        String supplied = req.getHeader("X-CSRF-Token");
        if (expected == null || supplied == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) {
            error(resp, 403, "CSRF_INVALID"); return;
        }
        if (path.endsWith("/logout")) {
            session.invalidate();
            resp.setHeader("Set-Cookie", "JSESSIONID=; Path=" + cookiePath(req) + "; HttpOnly; SameSite=Lax; Max-Age=0" + (req.isSecure() ? "; Secure" : ""));
            resp.setStatus(204);
            return;
        }
        JsonNode body;
        try {
            if (req.getContentType() == null || !req.getContentType().toLowerCase().startsWith("application/json")) {
                error(resp, 400, "JSON_INVALID"); return;
            }
            body = JSON.readTree(req.getInputStream());
            if (body == null || !body.isObject()) { error(resp, 400, "JSON_INVALID"); return; }
        } catch (Exception invalid) { error(resp, 400, "JSON_INVALID"); return; }
        try {
            if (path.endsWith("/register")) register(resp, body);
            else if (path.endsWith("/login")) login(req, resp, body);
            else error(resp, 404, "RESOURCE_NOT_FOUND");
        } catch (RuntimeException failure) {
            getServletContext().log("Auth POST failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private void register(HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, Set.of("hoTen", "soDienThoai", "password", "email", "diaChiMacDinh"))) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        String name = value(body, "hoTen"), phone = value(body, "soDienThoai"), password = value(body, "password");
        String email = value(body, "email"), address = value(body, "diaChiMacDinh");
        if (name == null || name.isBlank() || name.trim().length() > 100 || AuthService.normalizePhone(phone) == null
                || password == null || password.length() < 8 || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || invalidOptional(body, "email") || invalidOptional(body, "diaChiMacDinh")
                || (email != null && (email.length() > 150 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")))
                || (address != null && address.length() > 255)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        try {
            send(resp, 201, service().register(name.trim(), phone, password, email, address));
        } catch (AuthService.AccountExistsException duplicate) { error(resp, 409, "ACCOUNT_ALREADY_EXISTS"); }
    }

    private void login(HttpServletRequest req, HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, Set.of("username", "password"))) { error(resp, 400, "VALIDATION_ERROR"); return; }
        String username = value(body, "username"), password = value(body, "password");
        if (username == null || username.isBlank() || username.length() > 50 || password == null || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        TaiKhoan account = service().authenticate(username, password);
        if (account == null) { error(resp, 401, "INVALID_CREDENTIALS"); return; }
        if (account.getTrangThai() != AccountStatus.HOAT_DONG) { error(resp, 403, "ACCOUNT_LOCKED"); return; }
        service().recordLogin(account.getId());
        HttpSession old = req.getSession(false);
        if (old != null) old.invalidate();
        HttpSession session = req.getSession(true);
        session.setMaxInactiveInterval(1800);
        session.setAttribute(USER_ID, account.getId());
        session.setAttribute(CSRF, token());
        send(resp, 200, service().current(account.getId()));
    }

    private static boolean fields(JsonNode body, Set<String> allowed) {
        for (String name : body.propertyNames()) if (!allowed.contains(name)) return false;
        return true;
    }
    private static String value(JsonNode body, String name) {
        JsonNode field = body.get(name);
        return field == null || field.isNull() ? null : field.isTextual() ? field.textValue() : null;
    }
    private static boolean invalidOptional(JsonNode body, String name) {
        JsonNode field = body.get(name);
        return field != null && !field.isTextual();
    }
    private static String token() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private static String cookiePath(HttpServletRequest req) {
        return req.getContextPath().isEmpty() ? "/" : req.getContextPath();
    }
    private static String missingSessionCode(HttpServletRequest req) {
        if (req.getCookies() != null) for (var cookie : req.getCookies())
            if ("JSESSIONID".equals(cookie.getName())) return "SESSION_EXPIRED";
        return "AUTH_REQUIRED";
    }
    private static void noStore(HttpServletResponse resp) { resp.setHeader("Cache-Control", "no-store"); }
    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status); resp.setContentType("application/json;charset=UTF-8"); JSON.writeValue(resp.getOutputStream(), body);
    }
    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        send(resp, status, new ApiError(code, "Không thể thực hiện yêu cầu: " + code, new Object[0], UUID.randomUUID().toString()));
    }
    private record Csrf(String csrfToken, String headerName) {}
    private record ApiError(String code, String message, Object[] fieldErrors, String traceId) {}
}
