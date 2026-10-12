package com.miniongvang.dto.common;

import java.util.UUID;

/** Stable public error shape shared by every JSON endpoint. */
public record ApiErrorResponse(String code, String message, Object[] fieldErrors, String traceId) {
    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(code, message, new Object[0], UUID.randomUUID().toString());
    }
}
