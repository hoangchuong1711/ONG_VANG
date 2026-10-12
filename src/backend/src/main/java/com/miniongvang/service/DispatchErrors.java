package com.miniongvang.service;

/** Errors shared by dispatch commands and queries. */
public final class DispatchErrors {
    private DispatchErrors() {}

    public static final class Conflict extends RuntimeException {
        public Conflict(String code) { super(code); }
    }

    public static final class DateRangeInvalid extends IllegalArgumentException {}
}
