package com.miniongvang.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** Session attributes and CSRF rules shared by auth endpoints and the API filter. */
public final class AuthSession {
    public static final String CSRF_HEADER = "X-CSRF-Token";
    private static final String USER_ID = "auth.userId";
    private static final String VERSION = "auth.version";
    private static final String CSRF = "auth.csrf";
    private static final SecureRandom RANDOM = new SecureRandom();

    private AuthSession() {}

    public static String userId(HttpSession session) {
        return session == null ? null : (String) session.getAttribute(USER_ID);
    }

    public static Long version(HttpSession session) {
        return session == null ? null : (Long) session.getAttribute(VERSION);
    }

    public static String csrfToken(HttpSession session) {
        String token = (String) session.getAttribute(CSRF);
        if (token == null) {
            token = newToken();
            session.setAttribute(CSRF, token);
        }
        return token;
    }

    public static boolean hasValidCsrf(HttpServletRequest request, HttpSession session) {
        String expected = session == null ? null : (String) session.getAttribute(CSRF);
        String supplied = request.getHeader(CSRF_HEADER);
        return expected != null && supplied != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
    }

    public static void start(HttpServletRequest request, String userId, long version) {
        HttpSession old = request.getSession(false);
        if (old != null) old.invalidate();
        HttpSession session = request.getSession(true);
        session.setMaxInactiveInterval(1800);
        session.setAttribute(USER_ID, userId);
        session.setAttribute(VERSION, version);
        session.setAttribute(CSRF, newToken());
    }

    public static void end(HttpServletRequest request, HttpServletResponse response, HttpSession session) {
        session.invalidate();
        String path = request.getContextPath().isEmpty() ? "/" : request.getContextPath();
        response.setHeader("Set-Cookie", "JSESSIONID=; Path=" + path
                + "; HttpOnly; SameSite=Lax; Max-Age=0" + (request.isSecure() ? "; Secure" : ""));
    }

    public static String missingSessionCode(HttpServletRequest request) {
        if (request.getCookies() != null) for (var cookie : request.getCookies()) {
            if ("JSESSIONID".equals(cookie.getName())) return "SESSION_EXPIRED";
        }
        return "AUTH_REQUIRED";
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
