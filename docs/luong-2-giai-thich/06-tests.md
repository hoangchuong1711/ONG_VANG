# Luồng 2 — Kiểm thử luồng 2

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## quote/FareCalculatorTest.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/test/java/com/miniongvang/quote/FareCalculatorTest.java) · 78 dòng.

**Ai gọi:** JUnit phát hiện @Test khi Maven chạy test/verify.

**Gọi đến ai:** FareCalculator.calculateV1; fixture tạo entity trong RAM; Assertions.

### Dòng 1–10

```text
   1 | package com.miniongvang.quote;
   2 | 
   3 | import com.miniongvang.entity.BieuPhi;
   4 | import com.miniongvang.entity.ChinhSachPhuThu;
   5 | import com.miniongvang.service.FareCalculator;
   6 | import org.junit.jupiter.api.Test;
   7 | import java.math.BigDecimal;
   8 | import java.util.List;
   9 | import static org.junit.jupiter.api.Assertions.*;
  10 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.quote`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.BieuPhi` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachPhuThu` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.service.FareCalculator` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `org.junit.jupiter.api.Test` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `static org.junit.jupiter.api.Assertions.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 11–12

```text
  11 | class FareCalculatorTest {
  12 |     private final FareCalculator calculator = new FareCalculator();
```

Tạo calculator thật để test công thức, không mock và không cần database.

### Dòng 13

```text
  13 | 
```



### Dòng 14–24

```text
  14 |     @Test void roundsOnceAndAppliesPublishedFixedSurchargeAndDiscount() {
  15 |         BieuPhi tariff = tariff("10.25", "2.05");
  16 |         ChinhSachPhuThu extra = extra("1.00");
  17 |         var fare = calculator.calculateV1(new BigDecimal("1.50"), tariff,
  18 |                 List.of(extra), new BigDecimal("2.00"));
  19 |         assertEquals("13.00", fare.cuocGoc());
  20 |         assertEquals("1.00", fare.tienPhuThu());
  21 |         assertEquals("2.00", fare.tienGiamGia());
  22 |         assertEquals("12.00", fare.tongCuoc());
  23 |         assertEquals("1.00", fare.phuThu().getFirst().soTienTinh());
  24 |     }
```

Test làm tròn: tạo cước10.25, đơn giá2.05/km, phụ thu1, km1.5, giảm2. 10.25+1.5×2.05=13.325→13; tổng13+1−2=12. Các assertEquals lần lượt kiểm cước gốc, phụ thu, giảm, tổng và chi tiết phụ thu.

### Dòng 25

```text
  25 | 
```



### Dòng 26–36

```text
  26 |     @Test void rejectsInvalidAmountAndOverflow() {
  27 |         assertThrows(IllegalArgumentException.class,
  28 |                 () -> calculator.calculateV1(BigDecimal.ZERO, tariff("10", "2"), List.of(), BigDecimal.ZERO));
  29 |         assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
  30 |                 () -> calculator.calculateV1(BigDecimal.ONE, tariff("-1", "2"), List.of(), BigDecimal.ZERO));
  31 |         assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
  32 |                 () -> calculator.calculateV1(BigDecimal.ONE, tariff("10", "2"), List.of(), new BigDecimal("100")));
  33 |         assertThrows(com.miniongvang.service.FareCalculator.FareConfigurationException.class,
  34 |                 () -> calculator.calculateV1(new BigDecimal("1000"), tariff("0", "9999999999999"),
  35 |                         List.of(), BigDecimal.ZERO));
  36 |     }
```

assertThrows kiểm km0→IllegalArgumentException; biểu phí âm→FareConfigurationException; giảm100 vượt subtotal→lỗi; cước quá MAX_MONEY→lỗi. Lambda chỉ được thực thi khi assertion gọi, không chạy khi khai báo.

### Dòng 37

```text
  37 | 
```



### Dòng 38–59

```text
  38 |     @Test void pricesWeightBoundariesAndAppliesDiscountAfterSurcharge() {
  39 |         BieuPhi tariff = tariff("20000", "5000");
  40 |         tariff.setId("POLICY-1");
  41 |         tariff.setPhienBan(2);
  42 |         tariff.setKgBaoGom(new BigDecimal("1.00"));
  43 |         tariff.setDonGiaKg(new BigDecimal("3000.00"));
  44 |         tariff.setKgToiDa(new BigDecimal("30.00"));
  45 |         var included = calculator.calculateV1(new BigDecimal("5.00"), new BigDecimal("1.00"),
  46 |                 tariff, List.of(extra("5000")), new BigDecimal("5000"));
  47 |         assertEquals("45000.00", included.cuocKm());
  48 |         assertEquals("0.00", included.cuocKhoiLuong());
  49 |         assertEquals("45000.00", included.tongCuoc());
  50 |         var heavy = calculator.calculateV1(new BigDecimal("5.00"), new BigDecimal("1.01"),
  51 |                 tariff, List.of(), BigDecimal.ZERO);
  52 |         assertEquals("30.00", heavy.cuocKhoiLuong());
  53 |         assertEquals("POLICY-1", heavy.maBieuPhi());
  54 |         assertEquals(2, heavy.phienBanBieuPhi());
  55 |         assertDoesNotThrow(() -> calculator.calculateV1(BigDecimal.ONE, new BigDecimal("30.00"),
  56 |                 tariff, List.of(), BigDecimal.ZERO));
  57 |         assertThrows(IllegalArgumentException.class, () -> calculator.calculateV1(BigDecimal.ONE,
  58 |                 new BigDecimal("30.01"), tariff, List.of(), BigDecimal.ZERO));
  59 |     }
```

Đặt policy1 phiên bản2, gồm1kg, phụ phí3000/kg, tối đa30. Với5km/1kg/phụthu5000/giảm5000: km45000, kg0, tổng45000. Với1.01kg: phí vượt0.01×3000=30. Kiểm ID/phiên bản; đúng30kg được phép;30.01 bị chặn.

### Dòng 60

```text
  60 | 
```



### Dòng 61–66

```text
  61 |     @Test void zeroFareHasNoNegativeBalance() {
  62 |         BieuPhi tariff = tariff("0", "0");
  63 |         tariff.setDonGiaKg(BigDecimal.ZERO);
  64 |         var fare = calculator.calculateV1(BigDecimal.ONE, BigDecimal.ONE, tariff, List.of(), BigDecimal.ZERO);
  65 |         assertEquals("0.00", fare.tongCuoc());
  66 |     }
```

Biểu phí0 và đơn giá kg0, km/kg dương; kết quả tổng0.00. Test cước miễn phí hợp lệ, không tạo số âm.

### Dòng 67

```text
  67 | 
```



### Dòng 68–77

```text
  68 |     private static BieuPhi tariff(String base, String perKm) {
  69 |         BieuPhi value = new BieuPhi();
  70 |         value.setCuocCoBan(new BigDecimal(base)); value.setDonGiaKm(new BigDecimal(perKm));
  71 |         return value;
  72 |     }
  73 |     private static ChinhSachPhuThu extra(String amount) {
  74 |         ChinhSachPhuThu value = new ChinhSachPhuThu();
  75 |         value.setId("EXTRA"); value.setTenPhuThu("Sample"); value.setSoTien(new BigDecimal(amount));
  76 |         return value;
  77 |     }
```

tariff/extra là helper tạo dữ liệu test. new entity rồi setter chỉ trong RAM. Các thuộc tính biểu phí không set ở helper dùng mặc định của entity BieuPhi. Test không chứng minh provider mạng hay SQL chạy được.

### Dòng 78

```text
  78 | }
```

- D78: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## route/RouteServiceTest.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/test/java/com/miniongvang/route/RouteServiceTest.java) · 66 dòng.

**Ai gọi:** JUnit chạy các method @Test.

**Gọi đến ai:** RouteConfiguration; RouteService; FakeRouteProvider; Assertions.

### Dòng 1–12

```text
   1 | package com.miniongvang.route;
   2 | import com.miniongvang.dto.route.RouteDtos.Route;
   3 | 
   4 | import com.miniongvang.config.RouteConfiguration;
   5 | import com.miniongvang.integration.FakeRouteProvider;
   6 | import com.miniongvang.integration.RouteFailure;
   7 | import com.miniongvang.integration.RouteProvider;
   8 | import com.miniongvang.service.RouteService;
   9 | import java.util.Map;
  10 | import org.junit.jupiter.api.Test;
  11 | import static org.junit.jupiter.api.Assertions.*;
  12 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.route`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.Route` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.config.RouteConfiguration` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.integration.FakeRouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.integration.RouteFailure` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.integration.RouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.service.RouteService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.util.Map` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `org.junit.jupiter.api.Test` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `static org.junit.jupiter.api.Assertions.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 13–24

```text
  13 | class RouteServiceTest {
  14 |     @Test void fixedRoutesAndAddressNormalization() {
  15 |         RouteService service = RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "fake"));
  16 |         Route route = service.estimate("  QUẬN   1, TP.HCM  ", "  điểm mẫu b ");
  17 |         assertEquals("Quận 1, TP.HCM", route.diemLayHang());
  18 |         assertEquals("Quận 3, TP.HCM", route.diemGiaoHang());
  19 |         assertEquals("5.00", route.quangDuongKm());
  20 |         assertEquals(900, route.thoiGianDuKienGiay());
  21 |         assertEquals("FAKE", route.nguon());
  22 |         assertTrue(route.trongPhamVi());
  23 |         assertEquals("5.40", service.estimate("Quận 3", "Quận 1").quangDuongKm());
  24 |     }
```

Tạo service cấu hình fake; địa chỉ có dư khoảng trắng/hoa thường. Kiểm chuẩn hóa về Q1/Q3,5km,900s,FAKE,trong vùng. Kiểm chiều ngược5.40km cho thấy fixture phân biệt chiều.

### Dòng 25

```text
  25 | 
```



### Dòng 26–36

```text
  26 |     @Test void rejectsBadAddressesAndOutOfArea() {
  27 |         RouteService service = RouteConfiguration.from(Map.of());
  28 |         assertThrows(IllegalArgumentException.class, () -> service.estimate(" ", "Quận 3"));
  29 |         assertThrows(IllegalArgumentException.class, () -> service.estimate("a".repeat(256), "Quận 3"));
  30 |         assertFailure(RouteFailure.Kind.ADDRESS_NOT_FOUND, () -> service.estimate("Không có", "Quận 3"));
  31 |         assertFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA, () -> service.estimate("Hà Nội", "Quận 3"));
  32 |         assertFailure(RouteFailure.Kind.DISTANCE_INVALID, () -> service.estimate("Quận 1", "Điểm mẫu A"));
  33 |         RouteService shortRange = RouteConfiguration.from(Map.of("ROUTE_MAX_DISTANCE_KM", "4"));
  34 |         assertFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA,
  35 |                 () -> shortRange.estimate("Quận 1", "Quận 3"));
  36 |     }
```

Input trắng/quá255 ký tự→IllegalArgumentException. Địa chỉ không có→ADDRESS_NOT_FOUND; Hà Nội→ngoài vùng; hai bí danh một nơi→khoảng cách sai. Cấu hình max4km chặn tuyến5km.

### Dòng 37

```text
  37 | 
```



### Dòng 38–55

```text
  38 |     @Test void controlledProviderErrorsAndConfiguration() {
  39 |         assertFailure(RouteFailure.Kind.ROUTE_PROVIDER_TIMEOUT,
  40 |                 () -> new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.TIMEOUT), 30_000)
  41 |                         .estimate("Quận 1", "Quận 3"));
  42 |         assertFailure(RouteFailure.Kind.ROUTE_PROVIDER_ERROR,
  43 |                 () -> new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.ERROR), 30_000)
  44 |                         .estimate("Quận 1", "Quận 3"));
  45 |         assertThrows(IllegalArgumentException.class,
  46 |                 () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "goong")));
  47 |         assertThrows(IllegalArgumentException.class,
  48 |                 () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "unknown")));
  49 |         assertThrows(IllegalArgumentException.class,
  50 |                 () -> RouteConfiguration.from(Map.of("ROUTE_MAX_DISTANCE_KM", "0")));
  51 |         assertThrows(IllegalArgumentException.class,
  52 |                 () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "goong", "GOONG_API_KEY", "test", "GOONG_TIMEOUT_MS", "0")));
  53 |         assertThrows(IllegalArgumentException.class,
  54 |                 () -> RouteConfiguration.from(Map.of("ROUTE_PROVIDER", "goong", "GOONG_API_KEY", "test", "GOONG_VEHICLE", "unsupported")));
  55 |     }
```

Scenario.TIMEOUT/ERROR tạo lỗi kiểm soát được. Cấu hình Goong thiếu key, provider lạ, max0, timeout0, vehicle lạ đều phải ném IllegalArgumentException; không dùng key thật ở đây.

### Dòng 56

```text
  56 | 
```



### Dòng 57–61

```text
  57 |     @Test void providerResultsAreValidatedBeforePublishing() {
  58 |         RouteProvider malformed = (a, b) -> new RouteProvider.RouteData(a, b, 0, 20, "TEST");
  59 |         assertFailure(RouteFailure.Kind.DISTANCE_INVALID,
  60 |                 () -> new RouteService(malformed, 30_000).estimate("A", "B"));
  61 |     }
```

Lambda (a,b)->RouteData tạo implementation RouteProvider giả trả khoảng cách0. Kiểm RouteService không xuất dữ liệu provider sai ra ngoài.

### Dòng 62

```text
  62 | 
```



### Dòng 63–65

```text
  63 |     private static void assertFailure(RouteFailure.Kind kind, Runnable call) {
  64 |         assertEquals(kind, assertThrows(RouteFailure.class, call::run).kind());
  65 |     }
```

assertFailure chạy Runnable qua assertThrows(RouteFailure.class,...), lấy exception rồi so kind. Vừa kiểm loại lỗi vừa kiểm đúng mã nghiệp vụ.

### Dòng 66

```text
  66 | }
```

- D66: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.


## DesignV1IntegrationTest.java — các đoạn thuộc luồng 2

[Mở file gốc](D:/CNPM/ONG_VANG/src/backend/src/test/java/com/miniongvang/persistence/DesignV1IntegrationTest.java)

File này chứa cả điều phối, giao hàng, thanh toán, báo cáo. Phần dưới giải thích các test trực tiếp liên quan UC-04/05/03/02 và setup dùng chung, không trình bày các test nghiệp vụ ngoài luồng 2. JUnit là bên gọi các method có annotation; mã ứng dụng không gọi ngược vào test.

### Dòng 131–139

```text
131 |     @Test void dt09IdempotencyExpiresAtExactlyTwentyFourHoursWithoutDeletingOldOrder() {
132 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
133 |         var route = new RouteService(new FakeRouteProvider(), 30_000);
134 |         var firstQuotes = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC));
135 |         var firstOrders = new OrderService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC));
136 |         var quote = firstQuotes.create(customer(1), null, "Quận 1", "Quận 3", parcels());
137 |         var request = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3", "0901234567", null, parcels());
138 |         String key = UUID.randomUUID().toString();
139 |         var original = firstOrders.create(customer(1), key, request);
```

Tạo clock cố định, provider fake và hai service dùng cùng mốc start. Lấy quote, tạo payload, sinh key và tạo đơn đầu. UUID key ở đây đại diện một yêu cầu có thể gửi lại.

### Dòng 140–145

```text
140 |         Instant expiry = start.plusSeconds(86400);
141 |         assertEquals(original, new OrderService(db.entityManagerFactory(), route,
142 |                 Clock.fixed(expiry.minusMillis(1), ZoneOffset.UTC)).create(customer(1), key, request));
143 |         var expiredOrders = new OrderService(db.entityManagerFactory(), route, Clock.fixed(expiry, ZoneOffset.UTC));
144 |         assertEquals("QUOTE_EXPIRED", assertThrows(OrderService.Conflict.class,
145 |                 () -> expiredOrders.create(customer(1), key, request)).getMessage());
```

expiry=start+86400. Trước mốc1ms, cùng key/payload trả original. Đúng mốc24h, replay hết hạn; request phải qua kiểm tra quote và nhận QUOTE_EXPIRED vì quote chỉ sống300s.

### Dòng 146–153

```text
146 |         var freshQuote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(expiry, ZoneOffset.UTC))
147 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
148 |         var fresh = expiredOrders.create(customer(1), key, new CreateOrder(freshQuote.maBaoGia(), null,
149 |                 "Quận 1", "Quận 3", "0901234567", null, parcels()));
150 |         assertNotEquals(original.maDon(), fresh.maDon());
151 |         assertEquals(original.maDon(), dispatch.order(customer(1), original.maDon()).maDon());
152 |         assertArrayEquals(new long[]{2, 1}, tableCounts(new String[]{"don_hang", "yeu_cau_tao_don"}));
153 |     }
```

Lấy quote mới ở mốc24h, dùng lại key đã hết TTL để tạo đơn mới. Assert mã khác, đơn cũ vẫn đọc được; số lượng 2 đơn nhưng1 bản ghi key vì bản key được tái sử dụng. Hết TTL không xóa đơn cũ.

### Dòng 313–327

```text
313 |     @Test void dt04PublishedSuccessorNeverChangesCommittedOrderFare() {
314 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS), boundary = start.plusSeconds(120);
315 |         var route = new RouteService(new FakeRouteProvider(), 30_000);
316 |         var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
317 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
318 |         var original = new OrderService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
319 |                 .create(customer(1), UUID.randomUUID().toString(), new CreateOrder(quote.maBaoGia(), null,
320 |                         "Quận 1", "Quận 3", "0901234567", null, parcels()));
321 |         var before = dispatch.detail(customer(1), original.maDon());
322 |         String successor = publishFareSuccessor(start, boundary);
323 |         var next = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(boundary, ZoneOffset.UTC))
324 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
325 |         assertNotEquals(quote.cuoc().tongCuoc(), next.cuoc().tongCuoc());
326 |         assertEquals(original.cuoc(), dispatch.order(customer(1), original.maDon()).cuoc());
327 |         var after = dispatch.detail(customer(1), original.maDon());
```

Tạo quote/đơn ở start, đọc chi tiết; publishFareSuccessor thiết lập biểu phí kế tiếp tại boundary. Quote mới ở boundary phải khác tổng, nhưng đơn cũ và chi tiết đơn cũ vẫn giữ cước ban đầu.

### Dòng 328–349

```text
328 |         // Closing a published policy's future validity window is permitted;
329 |         // its pricing content and the order's policy reference remain immutable.
330 |         var oldPolicy = before.phienBanChinhSach().bieuPhi();
331 |         var historicalPolicy = after.phienBanChinhSach().bieuPhi();
332 |         assertEquals(oldPolicy.maBieuPhi(), historicalPolicy.maBieuPhi());
333 |         assertEquals(oldPolicy.tenBieuPhi(), historicalPolicy.tenBieuPhi());
334 |         assertEquals(oldPolicy.cuocCoBan(), historicalPolicy.cuocCoBan());
335 |         assertEquals(oldPolicy.donGiaKm(), historicalPolicy.donGiaKm());
336 |         assertEquals(oldPolicy.kmToiThieu(), historicalPolicy.kmToiThieu());
337 |         assertEquals(oldPolicy.kmToiDa(), historicalPolicy.kmToiDa());
338 |         assertEquals(oldPolicy.hieuLucTu(), historicalPolicy.hieuLucTu());
339 |         assertNull(oldPolicy.hieuLucDen());
340 |         assertEquals(boundary.toString(), historicalPolicy.hieuLucDen());
341 |         assertEquals(before.phienBanChinhSach().giamGia(), after.phienBanChinhSach().giamGia());
342 |         assertEquals(before.phienBanChinhSach().phuThu(), after.phienBanChinhSach().phuThu());
343 |         assertEquals(before.cuoc(), after.cuoc());
344 |         tx.run(em -> {
345 |             assertEquals("CUOC-DEMO-1", em.find(CuocDonHang.class, original.maDon()).getBieuPhi().getId());
346 |             assertEquals(successor, em.find(com.miniongvang.entity.BaoGia.class, next.maBaoGia()).getMaBieuPhi());
347 |             return null;
348 |         });
349 |     }
```

So từng thuộc tính policy lịch sử: ID/tên/cước cơ bản/đơn giá/phạm vi/thời điểm bắt đầu giữ nguyên. Mốc kết thúc policy được phép đóng về boundary. Chính sách giảm/phụ thu và cước đơn giữ nguyên. Truy vấn entity xác nhận đơn cũ trỏ CUOC-DEMO-1, quote mới trỏ successor.

### Dòng 351–371

```text
351 |     @Test void dt05PublishedMembershipPolicyExpiresAtExactBoundaryInEveryClockZone() {
352 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS), boundary = start.plusSeconds(120);
353 |         new PolicyPublicationService(db.entityManagerFactory(), Clock.fixed(start, ZoneOffset.UTC))
354 |                 .closeMembership(admin(), "TV-DEMO-VANG-1", boundary);
355 |         tx.run(em -> {
356 |             var member = em.find(KhachHang.class, "KH-DEMO-2");
357 |             member.setThanhVienTu(start.minusSeconds(60)); member.setThanhVienDen(boundary.plusSeconds(3600));
358 |             for (String zone : List.of("UTC", "Asia/Ho_Chi_Minh", "America/New_York")) {
359 |                 var clock = Clock.fixed(boundary, java.time.ZoneId.of(zone));
360 |                 var service = new MembershipPolicyService(clock);
361 |                 var before = service.evaluate(em, member, new BigDecimal("100.00"), clock.instant().minusMillis(1));
362 |                 assertEquals("TV-DEMO-VANG-1", before.policy().getId()); assertEquals(new BigDecimal("10.00"), before.discount());
363 |                 for (Instant at : List.of(clock.instant(), clock.instant().plusMillis(1))) {
364 |                     var expired = service.evaluate(em, member, new BigDecimal("100.00"), at);
365 |                     assertNull(expired.policy(), zone); assertFalse(expired.active(), zone);
366 |                     assertEquals(new BigDecimal("0.00"), expired.discount(), zone);
367 |                 }
368 |             }
369 |             return null;
370 |         });
371 |     }
```

Đóng policy thành viên tại boundary; hồ sơ khách vẫn còn hạn sau đó. Thử nhiều múi giờ với cùng Instant: trước boundary1ms còn giảm10/100; tại/sau boundary thì policy null,active=false,discount0. Test phân biệt hạn hồ sơ và hạn chính sách.

### Dòng 373–386

```text
373 |     @Test void dt07ChangedPolicyOrParcelsRejectsQuoteWithoutPartialOrder() {
374 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS), boundary = start.plusSeconds(120);
375 |         var route = new RouteService(new FakeRouteProvider(), 30_000);
376 |         var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
377 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
378 |         var original = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3", "0901234567", null, parcels());
379 |         String[] tables = {"don_hang", "cuoc_don_hang", "chi_tiet_kien_hang", "phu_thu_don_hang", "nhat_ky_don_hang", "yeu_cau_tao_don"};
380 |         long[] before = tableCounts(tables);
381 |         var changedParcels = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3", "0901234567", null,
382 |                 List.of(new Parcel("Tài liệu", null, "2.00")));
383 |         var atStart = new OrderService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC));
384 |         assertEquals("QUOTE_CHANGED", assertThrows(OrderService.Conflict.class,
385 |                 () -> atStart.create(customer(1), UUID.randomUUID().toString(), changedParcels)).getMessage());
386 |         assertArrayEquals(before, tableCounts(tables));
```

Tạo quote và payload gốc, đếm sáu bảng trước thao tác. Thay kiện thành2kg nhưng dùng quote cũ; assert QUOTE_CHANGED, số lượng bảng không đổi (không có đơn dở dang).

### Dòng 387–399

```text
387 |         publishFareSuccessor(start, boundary);
388 |         var atBoundary = new OrderService(db.entityManagerFactory(), route, Clock.fixed(boundary, ZoneOffset.UTC));
389 |         assertEquals("QUOTE_CHANGED", assertThrows(OrderService.Conflict.class,
390 |                 () -> atBoundary.create(customer(1), UUID.randomUUID().toString(), original)).getMessage());
391 |         assertArrayEquals(before, tableCounts(tables));
392 |         // A fresh quote permits a deliberate retry; stale quote is never repriced silently.
393 |         var fresh = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(boundary, ZoneOffset.UTC))
394 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
395 |         var accepted = atBoundary.create(customer(1), UUID.randomUUID().toString(), new CreateOrder(
396 |                 fresh.maBaoGia(), null, "Quận 1", "Quận 3", "0901234567", null, parcels()));
397 |         assertEquals(fresh.cuoc(), accepted.cuoc());
398 |         assertEquals(1, tableCounts(new String[]{"don_hang"})[0]);
399 |     }
```

Công bố biểu phí kế tiếp rồi dùng payload gốc ở boundary: vẫn QUOTE_CHANGED và không ghi nửa chừng. Lấy quote mới, tạo lại có chủ ý bằng key mới thì cước khớp quote và có1 đơn.

### Dòng 401–417

```text
401 |     @BeforeAll static void start() throws Exception {
402 |         url = System.getenv("TEST_DB_URL");
403 |         if (Boolean.parseBoolean(System.getenv("REQUIRE_TEST_DB"))) assertNotNull(url);
404 |         assumeTrue(url != null && url.matches("jdbc:sqlserver://[^;]+;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true"));
405 |         try (var connection = DriverManager.getConnection(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
406 |              var statement = connection.createStatement(); var result = statement.executeQuery("SELECT DB_NAME()")) {
407 |             assertTrue(result.next());
408 |             assertEquals("mini_ong_vang_test", result.getString(1));
409 |         }
410 |         db = PersistenceContext.start(url, System.getenv("TEST_DB_USER"), System.getenv("TEST_DB_PASSWORD"));
411 |         tx = new TransactionRunner(db.entityManagerFactory());
412 |         var routes = new RouteService(new FakeRouteProvider(), 30_000);
413 |         quotes = new QuoteService(db.entityManagerFactory(), routes);
414 |         orders = new OrderService(db.entityManagerFactory(), routes);
415 |         dispatch = new DispatchService(db.entityManagerFactory());
416 |         payments = new PaymentService(db.entityManagerFactory());
417 |     }
```

@BeforeAll chạy một lần trước suite. Đọc TEST_DB_URL; REQUIRE_TEST_DB=true thì thiếu URL phải lỗi. assumeTrue bảo đảm URL đúng DB test; nếu điều kiện không thỏa có thể skip. Kết nối kiểm DB_NAME trước khởi tạo PersistenceContext, TransactionRunner và các service thật với FakeRouteProvider.

### Dòng 419–419

```text
419 |     @AfterAll static void stop() { if (db != null) db.close(); }
```

@AfterAll đóng PersistenceContext nếu đã mở. Đây là dọn tài nguyên test, không phải endpoint ứng dụng.

### Dòng 421–441

```text
421 |     @BeforeEach void resetFixture() throws Exception {
422 |         try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
423 |             connection.setAutoCommit(false);
424 |             statement.execute("DISABLE TRIGGER dbo.trg_membership_policy_immutable ON dbo.chinh_sach_thanh_vien");
425 |             statement.execute("DISABLE TRIGGER dbo.trg_fare_policy_immutable ON dbo.cau_hinh_cuoc");
426 |             statement.execute("DISABLE TRIGGER dbo.trg_surcharge_policy_immutable ON dbo.cau_hinh_phu_thu");
427 |             for (String table : List.of("su_kien_nop_cod", "lan_nop_cod", "khoan_cod_trong_dot",
428 |                     "dot_nop_cod", "phan_chia_cuoc", "yeu_cau_tao_don", "bao_gia", "su_kien_thanh_toan",
429 |                     "xac_nhan_thanh_toan_don_hang", "thanh_toan", "nhat_ky_don_hang",
430 |                     "chi_tiet_kien_hang", "phu_thu_don_hang", "cuoc_don_hang",
431 |                     "phan_cong_don_hang", "don_hang", "phuong_tien", "tai_xe",
432 |                     "khach_hang", "nhat_ky_kiem_toan", "cau_hinh_phu_thu",
433 |                     "cau_hinh_cuoc", "chinh_sach_thanh_vien", "tai_khoan",
434 |                     "demo_seed_manifest")) statement.executeUpdate("DELETE FROM dbo.[" + table + "]");
435 |             statement.execute("ENABLE TRIGGER dbo.trg_membership_policy_immutable ON dbo.chinh_sach_thanh_vien");
436 |             statement.execute("ENABLE TRIGGER dbo.trg_fare_policy_immutable ON dbo.cau_hinh_cuoc");
437 |             statement.execute("ENABLE TRIGGER dbo.trg_surcharge_policy_immutable ON dbo.cau_hinh_phu_thu");
438 |             connection.commit();
439 |         }
440 |         new DesignV1DemoSeeder(db.entityManagerFactory()).seed("design-v1-test-password");
441 |     }
```

@BeforeEach dọn và seed lại fixture trong database test. Tạm tắt các trigger bảo vệ policy, xóa theo thứ tự quan hệ, bật lại trigger và commit; sau đó seed dữ liệu. Phần này thực sự xóa dữ liệu TEST nên không chạy trên database sử dụng thật. Tài liệu này chỉ giải thích, không thực thi test/reset.

### Dòng 459–475

```text
459 |     @Test void quoteAndOrderKeepVersionedFareAndReplayResponse() {
460 |         var parcel = parcels();
461 |         var regularQuote = quotes.create(customer(1), null, "Quận 1", "Quận 3", parcel);
462 |         var memberQuote = quotes.create(customer(2), null, "Quận 1", "Quận 3", parcel);
463 |         assertEquals("0.00", regularQuote.cuoc().tienGiamGia());
464 |         assertTrue(new BigDecimal(memberQuote.cuoc().tienGiamGia()).signum() > 0);
465 |         assertNotNull(memberQuote.hangThanhVien());
466 |         assertTrue(memberQuote.hangThanhVien().ngayHetHan().matches("\\d{4}-\\d{2}-\\d{2}"));
467 |         String key = UUID.randomUUID().toString();
468 |         var request = new CreateOrder(memberQuote.maBaoGia(), null,
469 |                 "Quận 1", "Quận 3", "0901234567", null, parcel);
470 |         var created = orders.create(customer(2), key, request);
471 |         assertEquals("TK-DEMO-KH-2", created.maTkTao());
472 |         assertEquals(created, orders.create(customer(2), key, request));
473 |         assertEquals("IDEMPOTENCY_CONFLICT", assertThrows(OrderService.Conflict.class,
474 |                 () -> orders.create(customer(2), key, new CreateOrder(memberQuote.maBaoGia(), null,
475 |                         "Quận 1", "Quận 3", "0909999999", null, parcel))).getMessage());
```

Tạo quote khách thường và thành viên; assert thường giảm0, thành viên có giảm và ngày đúng định dạng. Tạo đơn với key; cùng request/key trả response giống. Đổi SĐT nhưng giữ key phải IDEMPOTENCY_CONFLICT.

### Dòng 476–485

```text
476 |         tx.run(em -> {
477 |             DonHang order = em.find(DonHang.class, created.maDon());
478 |             CuocDonHang fare = em.find(CuocDonHang.class, created.maDon());
479 |             assertEquals("TK-DEMO-KH-2", order.getTaiKhoanTao().getId());
480 |             assertEquals("CUOC-DEMO-1", fare.getBieuPhi().getId());
481 |             assertEquals("TV-DEMO-VANG-1", fare.getChinhSachGiam().getId());
482 |             assertEquals(new BigDecimal(created.cuoc().tienGiamGia()), fare.getTienGiamGia());
483 |             return null;
484 |         });
485 |     }
```

Đọc DonHang/CuocDonHang từ SQL Server bằng EntityManager; kiểm người tạo, ID biểu phí, ID chính sách giảm và số giảm đã lưu bằng DTO. Đây là kiểm thử tích hợp thật với DB, không chỉ so đối tượng trong RAM.

### Dòng 487–503

```text
487 |     @Test void membershipWindowAndZeroOrFullDiscountUseExactBoundaries() {
488 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
489 |         Instant end = start.plusSeconds(300);
490 |         tx.run(em -> {
491 |             KhachHang customer = em.find(KhachHang.class, "KH-DEMO-2");
492 |             customer.setThanhVienTu(start); customer.setThanhVienDen(end);
493 |             var membership = new MembershipPolicyService();
494 |             BigDecimal subtotal = new BigDecimal("100.00");
495 |             assertEquals(BigDecimal.ZERO.setScale(2),
496 |                     membership.evaluate(em, customer, subtotal, start.minusMillis(1)).discount());
497 |             assertEquals(new BigDecimal("10.00"),
498 |                     membership.evaluate(em, customer, subtotal, start).discount());
499 |             assertEquals(new BigDecimal("10.00"),
500 |                     membership.evaluate(em, customer, subtotal, end.minusMillis(1)).discount());
501 |             assertEquals(BigDecimal.ZERO.setScale(2),
502 |                     membership.evaluate(em, customer, subtotal, end).discount());
503 |             for (var tier : List.of(MembershipTier.BAC, MembershipTier.KIM_CUONG)) {
```

Thiết lập cửa sổ thành viên [start,end), subtotal100. Kiểm start−1ms giảm0, start giảm10, end−1ms giảm10, end giảm0. Clock/time được điều khiển bằng tham số, không cần đợi5 phút.

### Dòng 504–517

```text
504 |                 var policy = new ChinhSachThanhVien();
505 |                 policy.setId(UUID.randomUUID().toString()); policy.setHang(tier);
506 |                 policy.setTyLeGiam(tier == MembershipTier.BAC ? BigDecimal.ZERO : new BigDecimal("100.00"));
507 |                 policy.setHieuLucTu(start.minusSeconds(60)); policy.setTrangThai(PolicyStatus.CONG_BO);
508 |                 em.persist(policy);
509 |             }
510 |             em.flush();
511 |             customer.setMaHang(MembershipTier.BAC);
512 |             assertEquals(BigDecimal.ZERO.setScale(2), membership.evaluate(em, customer, subtotal, start).discount());
513 |             customer.setMaHang(MembershipTier.KIM_CUONG);
514 |             assertEquals(new BigDecimal("100.00"), membership.evaluate(em, customer, subtotal, start).discount());
515 |             return null;
516 |         });
517 |     }
```

Tạo policy Bạc0% và Kim cương100%, persist/flush trong giao dịch; đổi hạng khách rồi assert số giảm0 hoặc100. Kiểm cả hai biên tỷ lệ.

### Dòng 519–533

```text
519 |     @Test void quoteExpiresAtExactlyThreeHundredSeconds() {
520 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
521 |         var route = new RouteService(new FakeRouteProvider(), 30_000);
522 |         var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
523 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
524 |         var request = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
525 |                 "0901234567", null, parcels());
526 |         var justBefore = new OrderService(db.entityManagerFactory(), route,
527 |                 Clock.fixed(start.plusMillis(299_999), ZoneOffset.UTC));
528 |         assertNotNull(justBefore.create(customer(1), UUID.randomUUID().toString(), request).maDon());
529 |         var atExpiry = new OrderService(db.entityManagerFactory(), route,
530 |                 Clock.fixed(start.plusSeconds(300), ZoneOffset.UTC));
531 |         assertEquals("QUOTE_EXPIRED", assertThrows(OrderService.Conflict.class,
532 |                 () -> atExpiry.create(customer(1), UUID.randomUUID().toString(), request)).getMessage());
533 |     }
```

Tạo quote ở start bằng Clock.fixed. OrderService ở299999ms vẫn tạo được; ở300000ms phải QUOTE_EXPIRED. Dùng key khác giữa hai lần để không vô tình kiểm replay thay vì expiry.

### Dòng 535–551

```text
535 |     @Test void committedOrderReplaysWithoutRouteProviderOrLiveQuote() {
536 |         Instant start = Instant.now().truncatedTo(ChronoUnit.MILLIS);
537 |         var route = new RouteService(new FakeRouteProvider(), 30_000);
538 |         var quote = new QuoteService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
539 |                 .create(customer(1), null, "Quận 1", "Quận 3", parcels());
540 |         var request = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
541 |                 "0901234567", null, parcels());
542 |         String key = UUID.randomUUID().toString();
543 |         var created = new OrderService(db.entityManagerFactory(), route, Clock.fixed(start, ZoneOffset.UTC))
544 |                 .create(customer(1), key, request);
545 |         var unavailableRoute = new RouteService(new FakeRouteProvider(FakeRouteProvider.Scenario.TIMEOUT), 30_000);
546 |         var replayService = new OrderService(db.entityManagerFactory(), unavailableRoute,
547 |                 Clock.fixed(start.plusSeconds(301), ZoneOffset.UTC));
548 |         assertEquals(created, replayService.create(customer(1), key, request));
549 |         assertEquals("QUOTE_EXPIRED", assertThrows(OrderService.Conflict.class,
550 |                 () -> replayService.create(customer(1), UUID.randomUUID().toString(), request)).getMessage());
551 |     }
```

Tạo một đơn đã commit, sau đó dựng service với provider mô phỏng timeout và clock+301s. Cùng key/request vẫn trả original vì replay trước kiểm quote/provider. Key mới không replay và bị QUOTE_EXPIRED.

### Dòng 553–559

```text
553 |     @Test void failedIdempotencyWriteRollsBackWholeOrderAggregate() throws Exception {
554 |         var quote = quotes.create(customer(1), null, "Quận 1", "Quận 3", parcels());
555 |         var request = new CreateOrder(quote.maBaoGia(), null, "Quận 1", "Quận 3",
556 |                 "0901234567", null, parcels());
557 |         String[] tables = {"don_hang", "cuoc_don_hang", "chi_tiet_kien_hang",
558 |                 "phu_thu_don_hang", "nhat_ky_don_hang", "yeu_cau_tao_don"};
559 |         long[] before = tableCounts(tables);
```

Tạo quote/request; liệt kê sáu bảng thuộc aggregate tạo đơn và chụp số bản ghi trước thử lỗi.

### Dòng 560–563

```text
560 |         try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
561 |             statement.execute("CREATE TRIGGER dbo.trg_test_order_rollback ON dbo.yeu_cau_tao_don "
562 |                     + "AFTER INSERT AS BEGIN THROW 51070, 'Injected request failure', 1; END");
563 |         }
```

Tạo trigger trong DB test cố tình THROW sau INSERT yeu_cau_tao_don. Đây là fault injection: ép lỗi xảy ra ở bước cuối sau khi đã persist các thành phần đơn.

### Dòng 564–571

```text
564 |         try {
565 |             assertThrows(RuntimeException.class, () -> orders.create(customer(1), UUID.randomUUID().toString(), request));
566 |         } finally {
567 |             try (var connection = db.dataSource().getConnection(); var statement = connection.createStatement()) {
568 |                 statement.execute("DROP TRIGGER dbo.trg_test_order_rollback");
569 |             }
570 |         }
571 |         assertArrayEquals(before, tableCounts(tables));
```

assertThrows yêu cầu tạo đơn thất bại. finally luôn gỡ trigger test. So số bản ghi sáu bảng trước/sau bằng assertArrayEquals: không bảng nào tăng chứng minh rollback toàn aggregate.

### Dòng 574–582

```text
574 |     private static long[] tableCounts(String[] tables) {
575 |         return tx.run(em -> {
576 |             long[] counts = new long[tables.length];
577 |             for (int i = 0; i < tables.length; i++)
578 |                 counts[i] = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM dbo.[" + tables[i] + "]")
579 |                         .getSingleResult()).longValue();
580 |             return counts;
581 |         });
582 |     }
```

tableCounts dùng transaction, tạo mảng đếm, lặp bảng nội bộ cố định, chạy native SQL COUNT(*), lấy Number→long và trả mảng. Đây là SQL trực tiếp phục vụ test, khác JPQL trong nhiều DAO.

### Dòng 1570–1579

```text
1570 |     @Test void t16DispatcherCreatedOrderBelongsToCustomerAndUsesSavedDiscount() {
1571 |         var parcel = parcels();
1572 |         var quote = quotes.create(dispatcher(), "KH-DEMO-2", "Quận 1", "Quận 3", parcel);
1573 |         var order = orders.create(dispatcher(), UUID.randomUUID().toString(),
1574 |                 new CreateOrder(quote.maBaoGia(), "KH-DEMO-2", "Quận 1", "Quận 3", "0901234567", null, parcel));
1575 |         var detail = dispatch.detail(customer(2),order.maDon());
1576 |         assertEquals("TK-DEMO-NV",detail.maTkTao());
1577 |         assertNotNull(detail.phienBanChinhSach().giamGia());
1578 |         String saved = tx.run(em -> em.find(CuocDonHang.class,order.maDon()).getChinhSachGiam().getId());
1579 |         assertEquals(saved,detail.phienBanChinhSach().giamGia().maChinhSach());
```

Tổng đài báo giá/tạo cho KH-DEMO-2; khách2 đọc được chi tiết, maTkTao là nhân viên. Chính sách giảm đọc ra phải khớp entity cước; quyền lợi là của khách, người tạo là tổng đài.

### Dòng 1580–1587

```text
1580 |         var cutoff = Instant.now().plusSeconds(60).truncatedTo(ChronoUnit.MILLIS);
1581 |         new PolicyPublicationService(db.entityManagerFactory()).closeFare(admin(),"CUOC-DEMO-1",cutoff);
1582 |         assertEquals(detail.cuoc(),dispatch.detail(customer(2),order.maDon()).cuoc());
1583 |         assertEquals("CUOC-DEMO-1",dispatch.detail(customer(2),order.maDon()).phienBanChinhSach().bieuPhi().maBieuPhi());
1584 |         assertThrows(NoSuchElementException.class,()->dispatch.detail(customer(1),order.maDon()));
1585 |         assertTrue(dispatch.orders(customer(2),0,100,null,null,null).items().stream().anyMatch(o->o.maDon().equals(order.maDon())));
1586 | 
1587 |     }
```

Đóng hiệu lực biểu phí ở tương lai không đổi cước hay ID policy đơn cũ. Khách1 đọc đơn khách2 nhận NoSuchElementException (che dữ liệu không thuộc quyền), danh sách của khách2 vẫn có đơn.


