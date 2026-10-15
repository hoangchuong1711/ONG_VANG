package com.miniongvang.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

/** Sends transactional text emails via Brevo HTTPS API. Never logs secrets or message bodies. */
public final class BrevoEmailSender implements EmailSender {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient CLIENT = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final String key;
    private final String from;
    private final String name;
    private final URI endpoint;

    public static BrevoEmailSender fromEnvironment() {
        var env = System.getenv();
        return new BrevoEmailSender(env.get("BREVO_API_KEY"), env.get("MAIL_FROM_EMAIL"),
                env.getOrDefault("MAIL_FROM_NAME", "Mini Ong Vang"), URI.create("https://api.brevo.com/v3/smtp/email"));
    }
    public BrevoEmailSender(String key, String from, String name, URI endpoint) {
        this.key = key;
        this.from = from;
        this.name = name;
        this.endpoint = endpoint;
    }

    @Override public boolean enabled() {
        return key != null && !key.isBlank() && from != null && !from.isBlank();
    }

    @Override public void welcome(String email, String fullName) {
        if (!enabled()) return;
        send(email, "Chào mừng bạn đến với Mini Ông Vàng", "Xin chào " + fullName
                + ",\n\nCảm ơn bạn đã đăng ký tài khoản Mini Ông Vàng. Tài khoản của bạn đã được tạo thành công."
                + "\nBạn có thể đăng nhập bằng số điện thoại của mình.\n\nMini Ông Vàng");
    }
    @Override public void otp(String email, String code) {
        if (!enabled()) throw new IllegalStateException("Email delivery is not configured");
        send(email, "Mini Ông Vàng - Mã đặt lại mật khẩu", "Mã OTP của bạn là: " + code
                + "\n\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu, hãy bỏ qua email này.\n\nMini Ông Vàng");
    }
    @Override public void passwordChanged(String email) {
        if (!enabled()) return;
        send(email, "Mini Ông Vàng - Mật khẩu đã được thay đổi",
                "Mật khẩu tài khoản Mini Ông Vàng của bạn vừa được đặt lại. Các phiên đăng nhập cũ đã hết hiệu lực.");
    }
    private void send(String email, String subject, String content) {
        try {
            String body = JSON.writeValueAsString(Map.of(
                    "sender", Map.of("name", name, "email", from),
                    "to", List.of(Map.of("email", email)), "subject", subject, "textContent", content));
            var request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(8))
                    .header("api-key", key)
                    .header("accept", "application/json")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            int status = CLIENT.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException("Brevo rejected email (HTTP " + status + ")");
            }
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Email request interrupted", failure);
        } catch (java.io.IOException failure) {
            throw new IllegalStateException("Email service unavailable", failure);
        }
    }
}
