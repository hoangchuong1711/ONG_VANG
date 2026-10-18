package com.miniongvang.service;

/** Application error that the HTTP adapter can translate into an API response. */
public class DesignV2Problem extends RuntimeException {
    private final int status;
    private final String code;

    public DesignV2Problem(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int status() { return status; }
    public String code() { return code; }
}
