package com.miniongvang.integration;

public final class RouteFailure extends RuntimeException {
    public enum Kind {
        ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID,
        ROUTE_PROVIDER_ERROR, ROUTE_PROVIDER_TIMEOUT
    }

    private final Kind kind;

    public RouteFailure(Kind kind) {
        super(kind.name());
        this.kind = kind;
    }

    public Kind kind() { return kind; }
}
