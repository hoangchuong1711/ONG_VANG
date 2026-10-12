package com.miniongvang.web;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Strict parsing shared by JSON endpoints. Semantic validation remains with each endpoint. */
public final class JsonRequests {
    private static final ObjectMapper JSON = new ObjectMapper();

    private JsonRequests() {}

    public static JsonNode object(HttpServletRequest request) throws IOException {
        String type = request.getContentType();
        if (type == null || !type.toLowerCase(Locale.ROOT).startsWith("application/json"))
            throw new InvalidJson();
        try {
            JsonNode body = JSON.readTree(request.getInputStream());
            if (body == null || !body.isObject()) throw new InvalidJson();
            return body;
        } catch (IOException invalid) {
            throw new InvalidJson();
        } catch (RuntimeException invalid) {
            throw new InvalidJson();
        }
    }

    public static boolean allowed(JsonNode object, Set<String> names) {
        for (String name : object.propertyNames()) if (!names.contains(name)) return false;
        return true;
    }

    public static boolean textIfPresent(JsonNode object, String name) {
        JsonNode value = object.get(name);
        return value == null || value.isTextual();
    }

    public static String text(JsonNode object, String name) {
        JsonNode value = object.get(name);
        return value == null || value.isNull() || !value.isTextual() ? null : value.textValue();
    }

    public static final class InvalidJson extends RuntimeException {}
}
