package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.dto.auth.AuthDtos.Csrf;
import com.miniongvang.dto.auth.AuthDtos.LoginRequest;
import com.miniongvang.dto.auth.AuthDtos.RegisterRequest;
import com.miniongvang.dto.auth.AuthDtos.User;
import com.miniongvang.security.AuthSession;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.BrevoEmailSender;
import com.miniongvang.service.PasswordRecoveryService;
import com.miniongvang.web.JsonRequests;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import tools.jackson.databind.JsonNode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@WebServlet({"/api/auth/csrf", "/api/auth/register", "/api/auth/login", "/api/auth/me", "/api/auth/logout",
        "/api/auth/forgot-password", "/api/auth/verify-reset-otp", "/api/auth/reset-password"})
public final class AuthServlet extends HttpServlet {
    private static final Set<String> REGISTER_FIELDS = Set.of("hoTen", "soDienThoai", "password", "email", "diaChiMacDinh");
    private static final Set<String> LOGIN_FIELDS = Set.of("username", "password");
    private static final Set<String> FORGOT_FIELDS = Set.of("soDienThoai", "email");
    private static final Set<String> VERIFY_FIELDS = Set.of("soDienThoai", "email", "otp");
    private static final Set<String> RESET_FIELDS = Set.of("soDienThoai", "email", "resetToken", "newPassword");

    private AuthService service() {
        PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
        return new AuthService(persistence.entityManagerFactory());
    }
    private PasswordRecoveryService recovery() {
        PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
        return new PasswordRecoveryService(persistence.entityManagerFactory(), BrevoEmailSender.fromEnvironment(), java.time.Clock.systemUTC());
    }

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        noStore(resp);
        try {
            switch (req.getServletPath()) {
                case "/api/auth/csrf" -> send(resp, 200,
                        new Csrf(AuthSession.csrfToken(req.getSession()), AuthSession.CSRF_HEADER));
                case "/api/auth/me" -> currentUser(req, resp);
                default -> error(resp, 404, "RESOURCE_NOT_FOUND");
            }
        } catch (RuntimeException failure) {
            getServletContext().log("Auth GET failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private void currentUser(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        String id = AuthSession.userId(session);
        if (id == null) { error(resp, 401, AuthSession.missingSessionCode(req)); return; }
        AuthService auth = service();
        if (!auth.sessionValid(id, AuthSession.version(session))) {
            session.invalidate(); error(resp, 401, "SESSION_EXPIRED"); return;
        }
        User user = auth.current(id);
        if (user == null) { session.invalidate(); error(resp, 403, "FORBIDDEN"); return; }
        send(resp, 200, user);
    }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        noStore(resp);
        HttpSession session = req.getSession(false);
        String path = req.getServletPath();
        if ("/api/auth/logout".equals(path) && AuthSession.userId(session) == null) {
            error(resp, 401, AuthSession.missingSessionCode(req)); return;
        }
        if (!AuthSession.hasValidCsrf(req, session)) {
            error(resp, 403, "CSRF_INVALID"); return;
        }
        if ("/api/auth/logout".equals(path)) {
            AuthSession.end(req, resp, session);
            resp.setStatus(204);
            return;
        }
        JsonNode body;
        try { body = JsonRequests.object(req); }
        catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
        try {
            switch (path) {
                case "/api/auth/register" -> register(resp, body);
                case "/api/auth/login" -> login(req, resp, body);
                case "/api/auth/forgot-password" -> forgotPassword(req, resp, body);
                case "/api/auth/verify-reset-otp" -> verifyResetOtp(req, resp, body);
                case "/api/auth/reset-password" -> resetPassword(req, resp, body);
                default -> error(resp, 404, "RESOURCE_NOT_FOUND");
            }
        } catch (PasswordRecoveryService.RecoveryException failure) {
            error(resp, failure.status(), failure.code());
        } catch (RuntimeException failure) {
            getServletContext().log("Auth POST failed", failure);
            if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private void register(HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, REGISTER_FIELDS) || !validRegistration(body)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        String name = value(body, "hoTen").trim();
        String phone = value(body, "soDienThoai");
        String password = value(body, "password");
        String email = value(body, "email").trim().toLowerCase(Locale.ROOT);
        String address = value(body, "diaChiMacDinh");
        try {
            send(resp, 201, service().register(new RegisterRequest(name, phone, password, email, address)));
        } catch (AuthService.AccountExistsException duplicate) { error(resp, 409, "ACCOUNT_ALREADY_EXISTS"); }
    }

    private void login(HttpServletRequest req, HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, LOGIN_FIELDS) || !validLogin(body)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        String username = value(body, "username"), password = value(body, "password");
        var result = service().login(new LoginRequest(username, password));
        if (result.status() == AuthService.LoginStatus.INVALID_CREDENTIALS) {
            error(resp, 401, "INVALID_CREDENTIALS"); return;
        }
        if (result.status() == AuthService.LoginStatus.ACCOUNT_LOCKED) {
            error(resp, 403, "ACCOUNT_LOCKED"); return;
        }
        AuthSession.start(req, result.user().maNguoiDung(), result.authVersion());
        send(resp, 200, result.user());
    }

    private void forgotPassword(HttpServletRequest req, HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, FORGOT_FIELDS)) { error(resp, 400, "VALIDATION_ERROR"); return; }
        recovery().request(value(body, "soDienThoai"), value(body, "email"), req.getRemoteAddr());
        send(resp, 200, Map.of("message", "Neu thong tin khop tai khoan, ma OTP se duoc gui qua email."));
    }
    private void verifyResetOtp(HttpServletRequest req, HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, VERIFY_FIELDS)) { error(resp, 400, "VALIDATION_ERROR"); return; }
        String token = recovery().verify(value(body, "soDienThoai"), value(body, "email"), value(body, "otp"), req.getRemoteAddr());
        send(resp, 200, Map.of("resetToken", token));
    }
    private void resetPassword(HttpServletRequest req, HttpServletResponse resp, JsonNode body) throws IOException {
        if (!fields(body, RESET_FIELDS)) {
            error(resp, 400, "VALIDATION_ERROR"); return;
        }
        recovery().reset(value(body, "soDienThoai"), value(body, "email"), value(body, "resetToken"),
                value(body, "newPassword"), req.getRemoteAddr());
        send(resp, 200, Map.of("message", "Mat khau da duoc thay doi."));
    }

    private static boolean validRegistration(JsonNode body) {
        String name = value(body, "hoTen");
        String phone = value(body, "soDienThoai");
        String password = value(body, "password");
        String email = value(body, "email");
        String address = value(body, "diaChiMacDinh");
        return name != null && !name.isBlank() && name.trim().length() <= 100
                && AuthService.normalizePhone(phone) != null
                && validPassword(password)
                && email != null && email.trim().length() <= 150
                && email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
                && !invalidOptional(body, "diaChiMacDinh")
                && (address == null || address.length() <= 255);
    }

    private static boolean validLogin(JsonNode body) {
        String username = value(body, "username");
        String password = value(body, "password");
        return username != null && !username.isBlank() && username.length() <= 50
                && password != null && !password.isBlank()
                && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    private static boolean validPassword(String password) {
        return password != null && password.length() >= 8 && !password.isBlank()
                && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    private static boolean fields(JsonNode body, Set<String> allowed) {
        return JsonRequests.allowed(body, allowed);
    }
    private static String value(JsonNode body, String name) {
        return JsonRequests.text(body, name);
    }
    private static boolean invalidOptional(JsonNode body, String name) {
        JsonNode field = body.get(name);
        return field != null && !field.isTextual();
    }
    private static void noStore(HttpServletResponse resp) { resp.setHeader("Cache-Control", "no-store"); }
    private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        com.miniongvang.web.WebResponses.json(resp, status, body);
    }
    private static void error(HttpServletResponse resp, int status, String code) throws IOException {
        com.miniongvang.web.WebResponses.error(resp, status, code);
    }
}
