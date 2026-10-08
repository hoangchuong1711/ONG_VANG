package com.miniongvang.integration;

/** Source of normalized addresses, road distance and estimated travel time. */
public interface RouteProvider {
    RouteData estimate(String origin, String destination);

    record RouteData(String origin, String destination, long distanceMeters,
                     long durationSeconds, String source) {}
}
