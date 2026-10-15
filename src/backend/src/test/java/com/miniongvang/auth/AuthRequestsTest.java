package com.miniongvang.auth;

import com.miniongvang.web.AuthRequests;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthRequestsTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Test void registrationNormalizesEmailAndKeepsPhoneForLogin() {
        var request = AuthRequests.register(json("""
                {"hoTen":" Khach hang ","soDienThoai":"0912345678",
                 "password":"secret123","email":" USER@Example.test "}
                """));
        assertEquals("Khach hang", request.hoTen());
        assertEquals("0912345678", request.soDienThoai());
        assertEquals("user@example.test", request.email());
    }

    @Test void rejectsUnexpectedFieldsAndNonTextOptionalAddress() {
        assertThrows(AuthRequests.InvalidRequest.class, () -> AuthRequests.login(json("""
                {"username":"0912345678","password":"secret123","admin":true}
                """)));
        assertThrows(AuthRequests.InvalidRequest.class, () -> AuthRequests.register(json("""
                {"hoTen":"Khach hang","soDienThoai":"0912345678",
                 "password":"secret123","email":"user@example.test","diaChiMacDinh":null}
                """)));
    }

    @Test void recoveryRequestsKeepPhoneEmailAndOtpTogether() {
        var request = AuthRequests.verifyResetOtp(json("""
                {"soDienThoai":"0912345678","email":"user@example.test","otp":"123456"}
                """));
        assertEquals("0912345678", request.soDienThoai());
        assertEquals("user@example.test", request.email());
        assertEquals("123456", request.otp());
    }

    private static JsonNode json(String content) {
        return JSON.readTree(content);
    }
}
