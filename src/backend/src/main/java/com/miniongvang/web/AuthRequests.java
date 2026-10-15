package com.miniongvang.web;

import com.miniongvang.dto.auth.AuthDtos.ForgotPasswordRequest;
import com.miniongvang.dto.auth.AuthDtos.LoginRequest;
import com.miniongvang.dto.auth.AuthDtos.RegisterRequest;
import com.miniongvang.dto.auth.AuthDtos.ResetPasswordRequest;
import com.miniongvang.dto.auth.AuthDtos.VerifyResetOtpRequest;
import com.miniongvang.service.AuthService;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Parses and validates the HTTP input contract before calling auth services. */
public final class AuthRequests {
    private static final Set<String> REGISTER_FIELDS = Set.of("hoTen", "soDienThoai", "password", "email", "diaChiMacDinh");
    private static final Set<String> LOGIN_FIELDS = Set.of("username", "password");
    private static final Set<String> FORGOT_FIELDS = Set.of("soDienThoai", "email");
    private static final Set<String> VERIFY_FIELDS = Set.of("soDienThoai", "email", "otp");
    private static final Set<String> RESET_FIELDS = Set.of("soDienThoai", "email", "resetToken", "newPassword");

    private AuthRequests() {}

    public static RegisterRequest register(JsonNode body) {
        allowed(body, REGISTER_FIELDS);
        String name = JsonRequests.text(body, "hoTen");
        String phone = JsonRequests.text(body, "soDienThoai");
        String password = JsonRequests.text(body, "password");
        String email = JsonRequests.text(body, "email");
        String address = JsonRequests.text(body, "diaChiMacDinh");
        if (name == null || name.isBlank() || name.trim().length() > 100
                || AuthService.normalizePhone(phone) == null
                || !validPassword(password)
                || email == null || email.trim().length() > 150
                || !email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
                || (body.get("diaChiMacDinh") != null && !body.get("diaChiMacDinh").isTextual())
                || (address != null && address.length() > 255)) throw new InvalidRequest();
        return new RegisterRequest(name.trim(), phone, password,
                email.trim().toLowerCase(Locale.ROOT), address);
    }

    public static LoginRequest login(JsonNode body) {
        allowed(body, LOGIN_FIELDS);
        String username = JsonRequests.text(body, "username");
        String password = JsonRequests.text(body, "password");
        if (username == null || username.isBlank() || username.length() > 50
                || password == null || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) throw new InvalidRequest();
        return new LoginRequest(username, password);
    }

    public static ForgotPasswordRequest forgotPassword(JsonNode body) {
        allowed(body, FORGOT_FIELDS);
        return new ForgotPasswordRequest(JsonRequests.text(body, "soDienThoai"), JsonRequests.text(body, "email"));
    }

    public static VerifyResetOtpRequest verifyResetOtp(JsonNode body) {
        allowed(body, VERIFY_FIELDS);
        return new VerifyResetOtpRequest(JsonRequests.text(body, "soDienThoai"),
                JsonRequests.text(body, "email"), JsonRequests.text(body, "otp"));
    }

    public static ResetPasswordRequest resetPassword(JsonNode body) {
        allowed(body, RESET_FIELDS);
        return new ResetPasswordRequest(JsonRequests.text(body, "soDienThoai"),
                JsonRequests.text(body, "email"), JsonRequests.text(body, "resetToken"),
                JsonRequests.text(body, "newPassword"));
    }

    private static void allowed(JsonNode body, Set<String> fields) {
        if (!JsonRequests.allowed(body, fields)) throw new InvalidRequest();
    }

    private static boolean validPassword(String password) {
        return password != null && password.length() >= 8 && !password.isBlank()
                && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    public static final class InvalidRequest extends RuntimeException {}
}
