package com.miniongvang.integration;

import java.util.Locale;
import java.util.Map;

/** Small, deliberately finite fixture; no generated distances or network access. */
public final class FakeRouteProvider implements RouteProvider {
    public enum Scenario { NORMAL, TIMEOUT, ERROR }

    private record Place(String id, String address, boolean inServiceArea) {}
    private record Leg(long meters, long seconds) {}

    private static final Place Q1 = new Place("q1", "Quận 1, TP.HCM", true);
    private static final Place Q3 = new Place("q3", "Quận 3, TP.HCM", true);
    private static final Place Q5 = new Place("q5", "Quận 5, TP.HCM", true);
    private static final Place HANOI = new Place("hn", "Hà Nội", false);
    private static final Map<String, Place> PLACES = Map.ofEntries(
            Map.entry("quận 1, tp.hcm", Q1), Map.entry("quận 1", Q1), Map.entry("điểm mẫu a", Q1),
            Map.entry("quận 3, tp.hcm", Q3), Map.entry("quận 3", Q3), Map.entry("điểm mẫu b", Q3),
            Map.entry("quận 5, tp.hcm", Q5), Map.entry("quận 5", Q5), Map.entry("điểm mẫu c", Q5),
            Map.entry("hà nội", HANOI));
    private static final Map<String, Leg> LEGS = Map.of(
            "q1:q3", new Leg(5000, 900), "q3:q1", new Leg(5400, 960),
            "q1:q5", new Leg(8000, 1500), "q5:q1", new Leg(8200, 1560),
            "q3:q5", new Leg(4000, 720), "q5:q3", new Leg(4300, 780));

    private final Scenario scenario;

    public FakeRouteProvider() { this(Scenario.NORMAL); }
    public FakeRouteProvider(Scenario scenario) { this.scenario = java.util.Objects.requireNonNull(scenario); }

    @Override public RouteData estimate(String origin, String destination) {
        if (scenario == Scenario.TIMEOUT) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT);
        if (scenario == Scenario.ERROR) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        Place start = PLACES.get(origin.toLowerCase(Locale.ROOT));
        Place end = PLACES.get(destination.toLowerCase(Locale.ROOT));
        if (start == null || end == null) throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
        if (!start.inServiceArea || !end.inServiceArea)
            throw new RouteFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA);
        Leg leg = LEGS.get(start.id + ":" + end.id);
        if (leg == null) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
        return new RouteData(start.address, end.address, leg.meters, leg.seconds, "GIA_LAP");
    }
}
