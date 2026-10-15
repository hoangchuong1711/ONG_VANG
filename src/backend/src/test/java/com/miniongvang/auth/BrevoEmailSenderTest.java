package com.miniongvang.auth;

import com.miniongvang.service.BrevoEmailSender;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class BrevoEmailSenderTest {
    @Test void sendsWelcomeAndOtpToConfiguredEndpoint() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/email", exchange -> {
            assertEquals("test-key", exchange.getRequestHeaders().getFirst("api-key"));
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(201, -1);
            exchange.close();
        });
        server.start();
        try {
            var mail = new BrevoEmailSender("test-key", "sender@example.test", "Mini Ong Vang",
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/email"));
            mail.welcome("user@example.test", "An");
            assertTrue(body.get().contains("user@example.test"));
            assertTrue(body.get().contains("sender@example.test"));
            mail.otp("user@example.test", "012345");
            assertTrue(body.get().contains("012345"));
        } finally { server.stop(0); }
    }
    @Test void otpRequiresMailConfiguration() {
        var mail = new BrevoEmailSender(null, null, "Mini Ong Vang", URI.create("https://example.test"));
        assertFalse(mail.enabled());
        assertThrows(IllegalStateException.class, () -> mail.otp("user@example.test", "123456"));
    }
}
