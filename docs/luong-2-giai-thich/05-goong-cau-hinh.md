# Luồng 2 — Nhà cung cấp tuyến và cấu hình

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## integration/RouteProvider.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/integration/RouteProvider.java) · 9 dòng.

**Ai gọi:** RouteService gọi estimate trên interface; FakeRouteProvider/GoongRouteProvider thực hiện.

**Gọi đến ai:** Interface khai báo hợp đồng, không tự chọn implementation.

### Dòng 1–2

```text
   1 | package com.miniongvang.integration;
   2 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.integration`; không gọi hàm hay truy cập DB.

### Dòng 3–9

```text
   3 | /** Source of normalized addresses, road distance and estimated travel time. */
   4 | public interface RouteProvider {
   5 |     RouteData estimate(String origin, String destination);
   6 | 
   7 |     record RouteData(String origin, String destination, long distanceMeters,
   8 |                      long durationSeconds, String source) {}
   9 | }
```

estimate nhận hai chuỗi địa chỉ và trả RouteData. Record gồm địa chỉ chuẩn, distanceMeters đơn vị mét, durationSeconds đơn vị giây, source. Interface không có thân thuật toán; RouteConfiguration chọn đối tượng thật. Đó là đa hình: cùng lời gọi nhưng chạy implementation khác.



## integration/FakeRouteProvider.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/integration/FakeRouteProvider.java) · 44 dòng.

**Ai gọi:** RouteConfiguration tạo khi ROUTE_PROVIDER=fake; RouteService gọi estimate; test có thể truyền Scenario.

**Gọi đến ai:** Tra Map trong bộ nhớ; không gọi HTTP/DB.

### Dòng 1–5

```text
   1 | package com.miniongvang.integration;
   2 | 
   3 | import java.util.Locale;
   4 | import java.util.Map;
   5 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.integration`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `java.util.Locale` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `java.util.Map` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 6–11

```text
   6 | /** Small, deliberately finite fixture; no generated distances or network access. */
   7 | public final class FakeRouteProvider implements RouteProvider {
   8 |     public enum Scenario { NORMAL, TIMEOUT, ERROR }
   9 | 
  10 |     private record Place(String id, String address, boolean inServiceArea) {}
  11 |     private record Leg(long meters, long seconds) {}
```

implements RouteProvider thực hiện hợp đồng chung. Scenario cho mô phỏng bình thường/timeout/lỗi. Place giữ ID, địa chỉ và cờ vùng phục vụ; Leg giữ mét/giây.

### Dòng 12

```text
  12 | 
```



### Dòng 13–21

```text
  13 |     private static final Place Q1 = new Place("q1", "Quận 1, TP.HCM", true);
  14 |     private static final Place Q3 = new Place("q3", "Quận 3, TP.HCM", true);
  15 |     private static final Place Q5 = new Place("q5", "Quận 5, TP.HCM", true);
  16 |     private static final Place HANOI = new Place("hn", "Hà Nội", false);
  17 |     private static final Map<String, Place> PLACES = Map.ofEntries(
  18 |             Map.entry("quận 1, tp.hcm", Q1), Map.entry("quận 1", Q1), Map.entry("điểm mẫu a", Q1),
  19 |             Map.entry("quận 3, tp.hcm", Q3), Map.entry("quận 3", Q3), Map.entry("điểm mẫu b", Q3),
  20 |             Map.entry("quận 5, tp.hcm", Q5), Map.entry("quận 5", Q5), Map.entry("điểm mẫu c", Q5),
  21 |             Map.entry("hà nội", HANOI));
```

Khai báo Q1/Q3/Q5 trong vùng, Hà Nội ngoài vùng. PLACES ánh xạ nhiều cách viết vào cùng Place, ví dụ Điểm mẫu A cũng là Q1; không geocode địa chỉ bất kỳ.

### Dòng 22–25

```text
  22 |     private static final Map<String, Leg> LEGS = Map.of(
  23 |             "q1:q3", new Leg(5000, 900), "q3:q1", new Leg(5400, 960),
  24 |             "q1:q5", new Leg(8000, 1500), "q5:q1", new Leg(8200, 1560),
  25 |             "q3:q5", new Leg(4000, 720), "q5:q3", new Leg(4300, 780));
```

LEGS lưu từng chiều riêng: q1:q3=5000m/900s, chiều ngược=5400m/960s. Không giả định đi/về giống nhau, không suy ra khoảng cách bằng chuỗi địa chỉ.

### Dòng 26

```text
  26 | 
```



### Dòng 27–30

```text
  27 |     private final Scenario scenario;
  28 | 
  29 |     public FakeRouteProvider() { this(Scenario.NORMAL); }
  30 |     public FakeRouteProvider(Scenario scenario) { this.scenario = java.util.Objects.requireNonNull(scenario); }
```

Giữ scenario final; constructor mặc định NORMAL; constructor test yêu cầu scenario không null.

### Dòng 31

```text
  31 | 
```



### Dòng 32–36

```text
  32 |     @Override public RouteData estimate(String origin, String destination) {
  33 |         if (scenario == Scenario.TIMEOUT) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT);
  34 |         if (scenario == Scenario.ERROR) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
  35 |         Place start = PLACES.get(origin.toLowerCase(Locale.ROOT));
  36 |         Place end = PLACES.get(destination.toLowerCase(Locale.ROOT));
```

estimate ném timeout/error ngay nếu scenario yêu cầu. Bình thường chuyển địa chỉ sang chữ thường Locale.ROOT rồi tra bản đồ địa danh.

### Dòng 37–42

```text
  37 |         if (start == null || end == null) throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
  38 |         if (!start.inServiceArea || !end.inServiceArea)
  39 |             throw new RouteFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA);
  40 |         Leg leg = LEGS.get(start.id + ":" + end.id);
  41 |         if (leg == null) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
  42 |         return new RouteData(start.address, end.address, leg.meters, leg.seconds, "FAKE");
```

Không có Place→ADDRESS_NOT_FOUND. Ngoài vùng→OUT_OF_SERVICE_AREA. Không có Leg (gồm hai tên cùng trỏ một điểm)→DISTANCE_INVALID. Có tuyến thì trả RouteData với source=FAKE.

### Dòng 43–44

```text
  43 |     }
  44 | }
```

- D43: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.
- D44: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## integration/GoongRouteProvider.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/integration/GoongRouteProvider.java) · 162 dòng.

**Ai gọi:** RouteService gọi estimate; DispatchService gọi geocodeAddress/routeGeometry; seeder cũng geocode vị trí demo.

**Gọi đến ai:** HTTP Goong /v2/geocode và /v2/direction qua get; JSON Jackson.

### Dòng 1–13

```text
   1 | package com.miniongvang.integration;
   2 | 
   3 | import java.io.IOException;
   4 | import java.net.URI;
   5 | import java.net.URLEncoder;
   6 | import java.net.http.HttpClient;
   7 | import java.net.http.HttpRequest;
   8 | import java.net.http.HttpResponse;
   9 | import java.nio.charset.StandardCharsets;
  10 | import java.time.Duration;
  11 | import tools.jackson.databind.JsonNode;
  12 | import tools.jackson.databind.ObjectMapper;
  13 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.integration`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `java.io.IOException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `java.net.URI` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `java.net.URLEncoder` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `java.net.http.HttpClient` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.net.http.HttpRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.net.http.HttpResponse` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.nio.charset.StandardCharsets` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `java.time.Duration` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `tools.jackson.databind.JsonNode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `tools.jackson.databind.ObjectMapper` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 14–22

```text
  14 | /** Goong V2 geocoding and directions; API-specific JSON stays behind RouteProvider. */
  15 | public final class GoongRouteProvider implements RouteProvider {
  16 |     private static final ObjectMapper JSON = new ObjectMapper();
  17 |     private static final java.util.logging.Logger LOG = java.util.logging.Logger.getLogger(GoongRouteProvider.class.getName());
  18 |     private final HttpClient client;
  19 |     private final URI baseUri;
  20 |     private final String apiKey;
  21 |     private final String vehicle;
  22 |     private final Duration timeout;
```

Adapter che JSON riêng của Goong sau RouteProvider. JSON parser và logger dùng chung; instance giữ HttpClient, base URI, API key, loại xe, timeout.

### Dòng 23

```text
  23 | 
```



### Dòng 24–36

```text
  24 |     public GoongRouteProvider(String apiKey, Duration timeout) {
  25 |         this(apiKey, timeout, "car");
  26 |     }
  27 | 
  28 |     public GoongRouteProvider(String apiKey, Duration timeout, String vehicle) {
  29 |         this(HttpClient.newBuilder().connectTimeout(timeout).build(),
  30 |                 URI.create("https://rsapi.goong.io/v2/"), apiKey, timeout, vehicle);
  31 |     }
  32 | 
  33 |     /** Injectable transport and base URL let tests exercise the adapter without a real key. */
  34 |     public GoongRouteProvider(HttpClient client, URI baseUri, String apiKey, Duration timeout) {
  35 |         this(client, baseUri, apiKey, timeout, "car");
  36 |     }
```

Các constructor tiện dụng gọi constructor đầy đủ. Mặc định vehicle=car. Tạo HttpClient có connectTimeout và base URL Goong V2. Constructor nhận HttpClient/baseUri cho phép test trỏ server giả, không cần key thật.

### Dòng 37

```text
  37 | 
```



### Dòng 38–47

```text
  38 |     public GoongRouteProvider(HttpClient client, URI baseUri, String apiKey, Duration timeout, String vehicle) {
  39 |         if (client == null || baseUri == null || apiKey == null || apiKey.isBlank()
  40 |                 || timeout == null || timeout.isNegative() || timeout.isZero()
  41 |                 || vehicle == null || !java.util.Set.of("car", "bike", "motorcycle", "truck").contains(vehicle))
  42 |             throw new IllegalArgumentException("Invalid Goong configuration");
  43 |         this.client = client;
  44 |         this.baseUri = baseUri;
  45 |         this.apiKey = apiKey;
  46 |         this.vehicle = vehicle;
  47 |         this.timeout = timeout;
```

Kiểm tra client/baseUri/key/timeout và vehicle trong tập cho phép; lưu cấu hình. Danh sách cho phép trong code không đảm bảo nhà cung cấp hỗ trợ mọi giá trị tại mọi thời điểm.

### Dòng 48–49

```text
  48 |     }
  49 | 
```

- D48: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 50–54

```text
  50 |     @Override public RouteData estimate(String origin, String destination) {
  51 |         Location start = geocode(origin);
  52 |         Location end = geocode(destination);
  53 |         JsonNode response = get("direction?origin=" + encode(start.coordinates())
  54 |                 + "&destination=" + encode(end.coordinates()) + "&vehicle=" + vehicle + "&api_key=" + encode(apiKey));
```

estimate gọi geocode cho điểm lấy và giao, rồi gọi direction với tọa độ hai điểm, vehicle, key. Mỗi giá trị chuỗi được URL-encode. Thông thường có 3 HTTP request cho một lần estimate thành công, không phải 1.

### Dòng 55–62

```text
  55 |         JsonNode routes = response.path("routes");
  56 |         if (!routes.isArray() || routes.isEmpty())
  57 |             throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
  58 |         JsonNode leg = routes.get(0).path("legs");
  59 |         if (!leg.isArray() || leg.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
  60 |         long meters = positiveLong(leg.get(0).path("distance").path("value"));
  61 |         long seconds = nonnegativeLong(leg.get(0).path("duration").path("value"));
  62 |         return new RouteData(start.address, end.address, meters, seconds, "GOONG");
```

Đọc routes array, chặn rỗng; lấy tuyến đầu tiên và legs đầu tiên; đọc distance.value bằng positiveLong, duration.value bằng nonnegativeLong. Trả RouteData GOONG. RouteService còn kiểm tra duration>0 và giới hạn khoảng cách.

### Dòng 63–64

```text
  63 |     }
  64 | 
```

- D63: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 65–72

```text
  65 |     public GeocodedAddress geocodeAddress(String address) {
  66 |         Location location = geocode(address);
  67 |         String[] pair = location.coordinates().split(",", 2);
  68 |         return new GeocodedAddress(location.address(),
  69 |                 new java.math.BigDecimal(pair[0]), new java.math.BigDecimal(pair[1]));
  70 |     }
  71 | 
  72 |     public record GeocodedAddress(String address, java.math.BigDecimal latitude, java.math.BigDecimal longitude) {}
```

geocodeAddress dùng chung hàm geocode, tách chuỗi lat,lng thành hai BigDecimal rồi trả GeocodedAddress. Đây là hàm hỗ trợ vị trí demo/điều phối; luồng báo giá dùng estimate.

### Dòng 73

```text
  73 | 
```



### Dòng 74–91

```text
  74 |     /** Geometry is returned only to the authorized driver through the dispatch endpoint. */
  75 |     public Geometry routeGeometry(double fromLat, double fromLng, double toLat, double toLng) {
  76 |         JsonNode response = get("direction?origin=" + encode(fromLat + "," + fromLng)
  77 |                 + "&destination=" + encode(toLat + "," + toLng)
  78 |                 + "&vehicle=" + vehicle + "&api_key=" + encode(apiKey));
  79 |         JsonNode routes = response.path("routes");
  80 |         if (!routes.isArray() || routes.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
  81 |         JsonNode route = routes.get(0);
  82 |         JsonNode legs = route.path("legs");
  83 |         if (!legs.isArray() || legs.isEmpty()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
  84 |         String polyline = route.path("overview_polyline").path("points").asText();
  85 |         if (polyline.isBlank()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
  86 |         long meters = positiveLong(legs.get(0).path("distance").path("value"));
  87 |         long seconds = nonnegativeLong(legs.get(0).path("duration").path("value"));
  88 |         return new Geometry(polyline, meters, seconds);
  89 |     }
  90 | 
  91 |     public record Geometry(String polyline, long meters, long seconds) {}
```

routeGeometry nhận tọa độ đã có, gọi direction; lấy tuyến và leg đầu, kiểm tra polyline không trắng, lấy mét/giây; trả Geometry. Nó phục vụ vẽ tuyến tài xế; không phải hàm tính cước và không tự kiểm tra role. Bên gọi phải kiểm tra quyền.

### Dòng 92

```text
  92 | 
```



### Dòng 93–100

```text
  93 |     private Location geocode(String address) {
  94 |         JsonNode response = get("geocode?address=" + encode(address) + "&api_key=" + encode(apiKey));
  95 |         JsonNode results = response.path("results");
  96 |         if (!results.isArray() || results.isEmpty())
  97 |             throw new RouteFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND);
  98 |         JsonNode first = results.get(0);
  99 |         JsonNode position = first.path("geometry").path("location");
 100 |         String formatted = first.path("formatted_address").asText();
```

geocode gọi endpoint với address/key; kiểm tra mảng results; chọn kết quả đầu; lấy geometry.location và formatted_address. Không cung cấp giao diện cho khách chọn giữa nhiều kết quả ở đoạn này.

### Dòng 101–108

```text
 101 |         if (formatted.isBlank() || formatted.length() > 255
 102 |                 || !position.path("lat").isNumber() || !position.path("lng").isNumber())
 103 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 104 |         double lat = position.path("lat").asDouble();
 105 |         double lng = position.path("lng").asDouble();
 106 |         if (!Double.isFinite(lat) || !Double.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
 107 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 108 |         return new Location(formatted, lat + "," + lng);
```

Kiểm tra địa chỉ chuẩn không rỗng/quá255; lat/lng phải số hữu hạn và trong [-90,90]/[-180,180]. Trả Location gồm địa chỉ và chuỗi tọa độ.

### Dòng 109–110

```text
 109 |     }
 110 | 
```

- D109: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 111–115

```text
 111 |     private JsonNode get(String pathAndQuery) {
 112 |         try {
 113 |             HttpRequest request = HttpRequest.newBuilder(baseUri.resolve(pathAndQuery))
 114 |                     .timeout(timeout).GET().build();
 115 |             HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
```

get dựng URI tương đối trên baseUri, đặt timeout toàn request, method GET, gửi đồng bộ bằng client.send; BodyHandlers.ofString lấy nội dung text.

### Dòng 116–121

```text
 116 |             if (response.statusCode() == 429)
 117 |                 throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_QUOTA);
 118 |             if (response.statusCode() < 200 || response.statusCode() >= 300) {
 119 |                 LOG.warning("Goong API returned HTTP " + response.statusCode());
 120 |                 throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 121 |             }
```

429 chuyển thành lỗi quota riêng. Status ngoài 2xx log mã HTTP và ném provider error. Không log URL có key trong thông báo này.

### Dòng 122–130

```text
 122 |             try {
 123 |                 JsonNode body = JSON.readTree(response.body());
 124 |                 if (body == null || !body.isObject()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 125 |                 return body;
 126 |             } catch (RouteFailure failure) {
 127 |                 throw failure;
 128 |             } catch (RuntimeException invalidJson) {
 129 |                 throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 130 |             }
```

Parse body thành JSON object. body null/không object báo lỗi. RouteFailure đã phân loại được giữ nguyên; lỗi JSON runtime còn lại chuyển thành ROUTE_PROVIDER_ERROR.

### Dòng 131–140

```text
 131 |         } catch (java.net.http.HttpTimeoutException failure) {
 132 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT);
 133 |         } catch (IOException failure) {
 134 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 135 |         } catch (InterruptedException failure) {
 136 |             Thread.currentThread().interrupt();
 137 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 138 |         } catch (IllegalArgumentException failure) {
 139 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 140 |         }
```

Timeout→TIMEOUT; IOException→ERROR; InterruptedException phải khôi phục interrupt flag rồi ném lỗi; IllegalArgumentException (ví dụ URI sai)→ERROR. Không có fallback sang FakeRouteProvider.

### Dòng 141–142

```text
 141 |     }
 142 | 
```

- D141: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 143–155

```text
 143 |     private static long positiveLong(JsonNode value) {
 144 |         long number = nonnegativeLong(value);
 145 |         if (number == 0) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
 146 |         return number;
 147 |     }
 148 | 
 149 |     private static long nonnegativeLong(JsonNode value) {
 150 |         if (!value.isNumber()) throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 151 |         double number = value.asDouble();
 152 |         if (!Double.isFinite(number) || number < 0 || number > Long.MAX_VALUE)
 153 |             throw new RouteFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR);
 154 |         return Math.round(number);
 155 |     }
```

positiveLong dùng nonnegativeLong rồi chặn0. nonnegativeLong yêu cầu JSON number, hữu hạn, không âm, không vượt Long.MAX_VALUE, làm tròn bằng Math.round. RouteService kiểm tra kết quả tiếp.

### Dòng 156

```text
 156 | 
```



### Dòng 157–161

```text
 157 |     private static String encode(String value) {
 158 |         return URLEncoder.encode(value, StandardCharsets.UTF_8);
 159 |     }
 160 | 
 161 |     private record Location(String address, String coordinates) {}
```

encode gọi URLEncoder UTF-8 cho tham số query. Location là record private dùng trong adapter; không lộ JSON nhà cung cấp ra tầng nghiệp vụ.

### Dòng 162

```text
 162 | }
```

- D162: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## config/RouteConfiguration.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/config/RouteConfiguration.java) · 50 dòng.

**Ai gọi:** Khởi tạo ứng dụng gọi fromEnvironment; test gọi from(Map). Servlet đọc RouteService đã đặt trong context.

**Gọi đến ai:** System.getenv → chọn provider → new RouteService.

### Dòng 1–11

```text
   1 | package com.miniongvang.config;
   2 | 
   3 | import com.miniongvang.integration.FakeRouteProvider;
   4 | import com.miniongvang.integration.GoongRouteProvider;
   5 | import com.miniongvang.integration.RouteProvider;
   6 | import com.miniongvang.service.RouteService;
   7 | import java.time.Duration;
   8 | import java.util.Locale;
   9 | import java.util.Map;
  10 | import java.util.HashMap;
  11 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.config`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.integration.FakeRouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.integration.GoongRouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.integration.RouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.service.RouteService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.time.Duration` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.util.Locale` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.util.Map` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `java.util.HashMap` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 12–15

```text
  12 | public final class RouteConfiguration {
  13 |     public static final String ATTRIBUTE = RouteService.class.getName();
  14 | 
  15 |     private RouteConfiguration() {}
```

ATTRIBUTE là tên class RouteService dùng làm khóa ServletContext; constructor private vì chỉ có static factory.

### Dòng 16

```text
  16 | 
```



### Dòng 17–24

```text
  17 |     public static RouteService fromEnvironment() {
  18 |         Map<String, String> settings = new HashMap<>();
  19 |         for (String name : new String[]{"ROUTE_PROVIDER", "GOONG_API_KEY", "GOONG_TIMEOUT_MS", "GOONG_VEHICLE", "ROUTE_MAX_DISTANCE_KM"}) {
  20 |             String value = System.getenv(name);
  21 |             if (value != null) settings.put(name, value);
  22 |         }
  23 |         return from(settings);
  24 |     }
```

Đọc đúng năm biến môi trường vào Map nếu tồn tại, rồi gọi from; không đọc key từ frontend.

### Dòng 25

```text
  25 | 
```



### Dòng 26–30

```text
  26 |     public static RouteService from(Map<String, String> env) {
  27 |         String name = env.getOrDefault("ROUTE_PROVIDER", "fake").strip().toLowerCase(Locale.ROOT);
  28 |         long maxKm = positiveLong(env.getOrDefault("ROUTE_MAX_DISTANCE_KM", "30"), "ROUTE_MAX_DISTANCE_KM");
  29 |         RouteProvider provider = switch (name) {
  30 |             case "fake" -> new FakeRouteProvider();
```

Chuẩn hóa tên provider chữ thường, mặc định fake. Đọc maxKm mặc định30 và kiểm tra số nguyên dương. switch chọn implementation, fake tạo fixture.

### Dòng 31–38

```text
  31 |             case "goong" -> {
  32 |                 String key = env.get("GOONG_API_KEY");
  33 |                 if (key == null || key.isBlank()) throw new IllegalArgumentException("GOONG_API_KEY is required when ROUTE_PROVIDER=goong");
  34 |                 long timeout = positiveLong(env.getOrDefault("GOONG_TIMEOUT_MS", "5000"), "GOONG_TIMEOUT_MS");
  35 |                 String vehicle = env.getOrDefault("GOONG_VEHICLE", "car").strip().toLowerCase(Locale.ROOT);
  36 |                 yield new GoongRouteProvider(key, Duration.ofMillis(timeout), vehicle);
  37 |             }
  38 |             default -> throw new IllegalArgumentException("ROUTE_PROVIDER must be fake or goong");
```

goong bắt buộc key; timeout mặc định5000ms; vehicle mặc địnhcar; yield GoongRouteProvider. Tên provider khác báo lỗi cấu hình ngay.

### Dòng 39

```text
  39 |         };
```

- D39: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 40

```text
  40 |         return new RouteService(provider, Math.multiplyExact(maxKm, 1000));
```

Đổi km tối đa sang mét bằng multiplyExact để phát hiện tràn, truyền giới hạn vào RouteService.

### Dòng 41–42

```text
  41 |     }
  42 | 
```

- D41: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 43–49

```text
  43 |     private static long positiveLong(String value, String name) {
  44 |         try {
  45 |             long parsed = Long.parseLong(value);
  46 |             if (parsed > 0) return parsed;
  47 |         } catch (NumberFormatException ignored) { }
  48 |         throw new IllegalArgumentException(name + " must be a positive integer");
  49 |     }
```

positiveLong parse long, chỉ trả nếu >0. Chuỗi không parse được hoặc số≤0 đều ném IllegalArgumentException kèm tên cấu hình.

### Dòng 50

```text
  50 | }
```

- D50: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.


