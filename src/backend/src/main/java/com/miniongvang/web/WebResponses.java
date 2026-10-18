package com.miniongvang.web;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

/** HTTP serialization shared by controllers and the security filter. */
public final class WebResponses {
    private static final ObjectMapper JSON = new ObjectMapper();
    private WebResponses() {}

    public static void json(HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(response.getOutputStream(), body);
    }

    public static void error(HttpServletResponse response, int status, String code) throws IOException {
        error(response, status, code, "Không thể thực hiện yêu cầu: " + code);
    }

    public static void error(HttpServletResponse response, int status, String code, String message) throws IOException {
        json(response, status, Map.of("code", code, "message", message));
    }
}
