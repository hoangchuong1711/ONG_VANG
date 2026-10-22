package com.miniongvang.integration;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Goong V2 geocoding and directions; API-specific JSON stays behind RouteProvider. */
public final class GoongRouteProvider implements RouteProvider {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final java.util.logging.Logger LOG = java.util.logging.Logger.getLogger(GoongRouteProvider.class.getName());
    private final HttpClient client;
    private final URI baseUri;
    private final String apiKey;
    private final String vehicle;
    private final Duration timeout;

    public GoongRouteProvider(String apiKey, Duration timeout) {
        this(apiKey, timeout, "car");
    }

    public GoongRouteProvider(String apiKey, Duration timeout, String vehicle) {
        this(HttpClient.newBuilder().connectTimeout(timeout).build(),
                URI.create("https://rsapi.goong.io/v2/"), apiKey, timeout, vehicle);
    }

    /** Injectable transport and base URL let tests exercise the adapter without a real key. */
    public GoongRouteProvider(HttpClient client, URI baseUri, String apiKey, Duration timeout) {
        this(client, baseUri, apiKey, timeout, "car");
    }

    public GoongRouteProvider(HttpClient client, URI baseUri, String apiKey, Duration timeout, String vehicle) {
        if (client == null || baseUri == null || apiKey == null || apiKey.isBlank()
                || timeout == null || timeout.isNegative() || timeout.isZero()
                || vehicle == null || !java.util.Set.of("car", "bike", "motorcycle", "truck").contains(vehicle))
            throw new IllegalArgumentException("Invalid Goong configuration");
        this.client = client;
        this.baseUri = baseUri;
        this.apiKey = apiKey;
        this.vehicle = vehicle;
        this.timeout = timeout;
    }

    @Override public RouteData estimate(String origin, String destination) {
        Location start = geocode(origin);
        Location end = geocode(destination);
        JsonNode response = get("direction?origin=" + encode(start.coordinates())
                + "&destination=" + encode(end.coordinates()) + "&vehicle=" + vehicle + "&api_key=" + encode(apiKey));
        JsonNode routes = response.path("routes");
        if (!routes.isArray() || routes.isEmpty())
            throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
        JsonNode leg = routes.get(0).path("legs");
        if (!leg.isArray() || leg.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        long meters = positiveLong(leg.get(0).path("distance").path("value"));
        long seconds = nonnegativeLong(leg.get(0).path("duration").path("value"));
        return new RouteData(start.address, end.address, meters, seconds, "GOONG");
    }

    public GeocodedAddress geocodeAddress(String address) {
        Location location = geocode(address);
        String[] pair = location.coordinates().split(",", 2);
        return new GeocodedAddress(location.address(),
                new java.math.BigDecimal(pair[0]), new java.math.BigDecimal(pair[1]));
    }

    public record GeocodedAddress(String address, java.math.BigDecimal latitude, java.math.BigDecimal longitude) {}

    /** Geometry is returned only to the authorized driver through the dispatch endpoint. */
    public Geometry routeGeometry(double fromLat, double fromLng, double toLat, double toLng) {
        JsonNode response = get("direction?origin=" + encode(fromLat + "," + fromLng)
                + "&destination=" + encode(toLat + "," + toLng)
                + "&vehicle=" + vehicle + "&api_key=" + encode(apiKey));
        JsonNode routes = response.path("routes");
        if (!routes.isArray() || routes.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
        JsonNode route = routes.get(0);
        JsonNode legs = route.path("legs");
        if (!legs.isArray() || legs.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        String polyline = route.path("overview_polyline").path("points").asText();
        if (polyline.isBlank()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        long meters = positiveLong(legs.get(0).path("distance").path("value"));
        long seconds = nonnegativeLong(legs.get(0).path("duration").path("value"));
        return new Geometry(polyline, meters, seconds);
    }

    public record Geometry(String polyline, long meters, long seconds) {}

    private Location geocode(String address) {
        String query = disambiguateDemoAddress(address);
        JsonNode response = get("geocode?address=" + encode(query) + "&api_key=" + encode(apiKey));
        JsonNode results = response.path("results");
        if (!results.isArray() || results.isEmpty())
            throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
        JsonNode first = null;
        for (JsonNode result : results) {
            if (matchesAddress(query, result.path("formatted_address").asText())) {
                first = result;
                break;
            }
        }
        if (first == null) throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
        JsonNode position = first.path("geometry").path("location");
        String formatted = first.path("formatted_address").asText();
        if (formatted.isBlank() || formatted.length() > 255
                || !position.path("lat").isNumber() || !position.path("lng").isNumber())
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        double lat = position.path("lat").asDouble();
        double lng = position.path("lng").asDouble();
        if (!Double.isFinite(lat) || !Double.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        return new Location(formatted, lat + "," + lng);
    }

    // Only expand the two historical demo literals; never rewrite an arbitrary user's address.
    private static String disambiguateDemoAddress(String address) {
        String normalized = normalizeAddress(address).replaceAll("[ ,.]", "");
        return switch (normalized) {
            case "227nguyenvancutphcm", "227nguyenvancuthanhphohochiminh" ->
                    "227 Nguyễn Văn Cừ, Quận 5, Thành phố Hồ Chí Minh";
            case "268lythuongkiettphcm", "268lythuongkietthanhphohochiminh" ->
                    "268 Lý Thường Kiệt, Quận 10, Thành phố Hồ Chí Minh";
            default -> address;
        };
    }

    private static String normalizeAddress(String address) {
        return java.text.Normalizer.normalize(address.toLowerCase(java.util.Locale.ROOT),
                java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd');
    }

    private static boolean matchesAddress(String requested, String resolved) {
        String input = normalizeAddress(requested);
        String output = " " + normalizeAddress(resolved).replaceAll("[^a-z0-9]+", " ") + " ";
        if ((input.contains("tp.hcm") || input.contains("ho chi minh"))
                && !(output.contains("ho chi minh") || output.contains("hcm"))) return false;
        String street = input.split(",", 2)[0].strip();
        // A numbered street address must not silently resolve to a different street/house.
        if (street.matches("^[0-9].*")) {
            for (String token : street.replaceAll("[^a-z0-9]+", " ").split(" +")) {
                if (!token.isEmpty() && !token.equals("duong") && !output.contains(" " + token + " "))
                    return false;
            }
        }
        return !resolved.isBlank();
    }

    private JsonNode get(String pathAndQuery) {
        try {
            HttpRequest request = HttpRequest.newBuilder(baseUri.resolve(pathAndQuery))
                    .timeout(timeout).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 429)
                throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_QUOTA);
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOG.warning("Goong API returned HTTP " + response.statusCode());
                throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
            }
            try {
                JsonNode body = JSON.readTree(response.body());
                if (body == null || !body.isObject()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
                return body;
            } catch (RouteFailure failure) {
                throw failure;
            } catch (RuntimeException invalidJson) {
                throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
            }
        } catch (java.net.http.HttpTimeoutException failure) {
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT);
        } catch (IOException failure) {
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        } catch (IllegalArgumentException failure) {
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        }
    }

    private static long positiveLong(JsonNode value) {
        long number = nonnegativeLong(value);
        if (number == 0) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
        return number;
    }

    private static long nonnegativeLong(JsonNode value) {
        if (!value.isNumber()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        double number = value.asDouble();
        if (!Double.isFinite(number) || number < 0 || number > Long.MAX_VALUE)
            throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
        return Math.round(number);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record Location(String address, String coordinates) {}
}
