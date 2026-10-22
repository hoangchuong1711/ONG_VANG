# Luồng 2 — HTTP, phân quyền và DTO

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## controller/QuoteServlet.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/controller/QuoteServlet.java) · 103 dòng.

**Ai gọi:** Tomcat gọi doPost khi POST /api/quotes, sau ApiSecurityFilter. Frontend api('/quotes') gửi request.

**Gọi đến ai:** JsonRequests → AuthService.currentActor → QuoteService.create → WebResponses.

### Dòng 1–25

```text
   1 | package com.miniongvang.controller;
   2 | import com.miniongvang.dto.quote.QuoteDtos.Parcel;
   3 | import com.miniongvang.dto.quote.QuoteDtos.CreateQuote;
   4 | import com.miniongvang.web.JsonRequests;
   5 | 
   6 | import com.miniongvang.config.PersistenceContext;
   7 | import com.miniongvang.config.PersistenceListener;
   8 | import com.miniongvang.config.RouteConfiguration;
   9 | import com.miniongvang.integration.RouteFailure;
  10 | import com.miniongvang.service.AuthService;
  11 | import com.miniongvang.service.FareCalculator;
  12 | import com.miniongvang.service.QuoteService;
  13 | import com.miniongvang.service.RouteService;
  14 | import jakarta.servlet.annotation.WebServlet;
  15 | import jakarta.servlet.http.HttpServlet;
  16 | import jakarta.servlet.http.HttpServletRequest;
  17 | import jakarta.servlet.http.HttpServletResponse;
  18 | import jakarta.servlet.http.HttpSession;
  19 | import java.io.IOException;
  20 | import java.util.ArrayList;
  21 | import java.util.List;
  22 | import java.util.NoSuchElementException;
  23 | import java.util.Set;
  24 | import tools.jackson.databind.JsonNode;
  25 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.controller`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Parcel` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.CreateQuote` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.web.JsonRequests` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.config.PersistenceContext` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.config.PersistenceListener` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.config.RouteConfiguration` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `com.miniongvang.integration.RouteFailure` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `com.miniongvang.service.AuthService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `com.miniongvang.service.FareCalculator` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `com.miniongvang.service.QuoteService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `com.miniongvang.service.RouteService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `jakarta.servlet.annotation.WebServlet` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `jakarta.servlet.http.HttpServlet` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D16: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D17: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletResponse` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D18: Cho phép dùng tên từ `jakarta.servlet.http.HttpSession` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D19: Cho phép dùng tên từ `java.io.IOException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D20: Cho phép dùng tên từ `java.util.ArrayList` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D21: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D22: Cho phép dùng tên từ `java.util.NoSuchElementException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D23: Cho phép dùng tên từ `java.util.Set` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D24: Cho phép dùng tên từ `tools.jackson.databind.JsonNode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 26–30

```text
  26 | @WebServlet("/api/quotes")
  27 | public final class QuoteServlet extends HttpServlet {
  28 |     private static final Set<String> FIELDS = Set.of("maKh", "diemLayHang", "diemGiaoHang", "kienHang",
  29 |             "benThanhToan", "phuongThucThanhToan");
  30 |     private static final Set<String> PARCEL_FIELDS = Set.of("loaiHangHoa", "ghiChuBaoQuan", "khoiLuongKg");
```

@WebServlet đăng ký đường dẫn, extends HttpServlet nhận xử lý HTTP của Tomcat. FIELDS là allowlist trường cấp đầu; PARCEL_FIELDS là allowlist của từng kiện, ngăn chấp nhận trường ngoài hợp đồng.

### Dòng 31

```text
  31 | 
```



### Dòng 32–36

```text
  32 |     @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
  33 |         resp.setHeader("Cache-Control", "no-store");
  34 |         JsonNode body;
  35 |         try { body = JsonRequests.object(req); }
  36 |         catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
```

doPost ghi đè phương thức của HttpServlet. req đọc yêu cầu, resp ghi phản hồi. Cache-Control=no-store không lưu cache báo giá. JsonRequests.object đọc JSON object; JSON sai trả 400 JSON_INVALID rồi return.

### Dòng 37–45

```text
  37 |         if (!fields(body, FIELDS) || !textIfPresent(body, "maKh") || !textIfPresent(body, "diemLayHang")
  38 |                 || !textIfPresent(body, "diemGiaoHang") || !textIfPresent(body, "benThanhToan")
  39 |                 || !textIfPresent(body, "phuongThucThanhToan")) {
  40 |             error(resp, 400, "VALIDATION_ERROR"); return;
  41 |         }
  42 |         String maKh = value(body, "maKh");
  43 |         if (maKh != null && (maKh.isBlank() || maKh.strip().length() > 36)) {
  44 |             error(resp, 400, "VALIDATION_ERROR"); return;
  45 |         }
```

Kiểm tra chỉ có các trường cho phép và trường chuỗi nếu xuất hiện đúng kiểu. Đây chưa phải toàn bộ kiểm tra bắt buộc nghiệp vụ. maKh nếu gửi thì không trắng và sau strip ≤36. Sai trả 400 và kết thúc.

### Dòng 46–57

```text
  46 |         JsonNode packages = body.path("kienHang");
  47 |         if (!packages.isArray() || packages.isEmpty()) { error(resp, 400, "VALIDATION_ERROR"); return; }
  48 |         List<Parcel> parcels = new ArrayList<>();
  49 |         for (JsonNode item : packages) {
  50 |             if (!item.isObject() || !fields(item, PARCEL_FIELDS)
  51 |                     || !textIfPresent(item, "loaiHangHoa") || !textIfPresent(item, "ghiChuBaoQuan")
  52 |                     || !textIfPresent(item, "khoiLuongKg")) {
  53 |                 error(resp, 400, "VALIDATION_ERROR"); return;
  54 |             }
  55 |             parcels.add(new Parcel(value(item, "loaiHangHoa"), value(item, "ghiChuBaoQuan"),
  56 |                     value(item, "khoiLuongKg")));
  57 |         }
```

Lấy kienHang bằng path; bắt buộc mảng không rỗng. Tạo List<Parcel>; mỗi item phải là object, đúng allowlist và kiểu chuỗi. Sau đó bóc loại hàng, ghi chú, kg vào record. Giá trị kg dương và giới hạn độ dài được kiểm tra tiếp ở service.

### Dòng 58–64

```text
  58 |         try {
  59 |             PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
  60 |             RouteService routes = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
  61 |             HttpSession session = req.getSession(false);
  62 |             String id = session == null ? null : (String) session.getAttribute("auth.userId");
  63 |             com.miniongvang.security.ActorContext actor = id == null ? null : new AuthService(persistence.entityManagerFactory()).currentActor(id);
  64 |             QuoteService service = new QuoteService(persistence.entityManagerFactory(), routes);
```

Lấy PersistenceContext/RouteService đã được ứng dụng đặt trong ServletContext. getSession(false) chỉ lấy session hiện có, không tự tạo mới. Lấy auth.userId; AuthService.currentActor chuyển ID thành danh tính nghiệp vụ. Tạo QuoteService dùng factory và routes.

### Dòng 65–68

```text
  65 |             send(resp, 200, service.create(actor, new CreateQuote(maKh == null ? null : maKh.strip(),
  66 |                     value(body, "diemLayHang"), value(body, "diemGiaoHang"), parcels,
  67 |                     value(body, "benThanhToan") == null ? "NGUOI_DAT" : value(body, "benThanhToan"),
  68 |                     value(body, "phuongThucThanhToan") == null ? "TIEN_MAT" : value(body, "phuongThucThanhToan"))));
```

Tạo CreateQuote; trim maKh nếu có; lấy địa chỉ/kiện. Thiếu bên trả thì NGUOI_DAT, thiếu phương thức thì TIEN_MAT. Gọi service.create trước; nếu thành công send HTTP 200 và serialize Quote.

### Dòng 69–72

```text
  69 |         } catch (FareCalculator.WeightLimitExceededException heavy) { error(resp, 422, "WEIGHT_LIMIT_EXCEEDED"); }
  70 |         catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
  71 |         catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
  72 |         catch (NoSuchElementException missing) { error(resp, 404, "RESOURCE_NOT_FOUND"); }
```

Catch theo loại: vượt kg→422; input sai→400; sai quyền→403; không thấy dữ liệu→404. Exception cụ thể phải đứng trước loại cha.

### Dòng 73–80

```text
  73 |         catch (RouteFailure failure) {
  74 |             int status = switch (failure.kind()) {
  75 |                 case ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID -> 422;
  76 |                 case ROUTE_PROVIDER_ERROR -> 502;
  77 |                 case ROUTE_PROVIDER_TIMEOUT -> 504;
  78 |                 case ROUTE_PROVIDER_QUOTA -> 429;
  79 |             };
  80 |             error(resp, status, failure.kind().name());
```

RouteFailure chuyển mã lỗi nhà cung cấp thành HTTP: địa chỉ/phạm vi/khoảng cách→422; nhà cung cấp lỗi→502; timeout→504; quota→429. failure.kind().name() là code frontend tra thông báo.

### Dòng 81–86

```text
  81 |         } catch (com.miniongvang.service.FareCalculator.FareConfigurationException missing) { error(resp, 503, "FARE_CONFIG_MISSING"); }
  82 |         catch (RuntimeException failure) {
  83 |             getServletContext().log("Quote failed", failure);
  84 |             if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
  85 |         }
  86 |     }
```

Lỗi cấu hình giá→503. Lỗi runtime còn lại được ghi log server; nếu response chưa gửi thì trả 500 INTERNAL_ERROR, không gửi stack trace cho khách.

### Dòng 87

```text
  87 | 
```



### Dòng 88–96

```text
  88 |     private static boolean fields(JsonNode object, Set<String> allowed) {
  89 |         return JsonRequests.allowed(object, allowed);
  90 |     }
  91 |     private static boolean textIfPresent(JsonNode object, String name) {
  92 |         return JsonRequests.textIfPresent(object, name);
  93 |     }
  94 |     private static String value(JsonNode object, String name) {
  95 |         return JsonRequests.text(object, name);
  96 |     }
```

Ba wrapper fields/textIfPresent/value lần lượt gọi JsonRequests.allowed, textIfPresent, text; dùng chung quy tắc JSON thay vì mỗi servlet parse khác nhau.

### Dòng 97–102

```text
  97 |     private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
  98 |         com.miniongvang.web.WebResponses.json(resp, status, body);
  99 |     }
 100 |     private static void error(HttpServletResponse resp, int status, String code) throws IOException {
 101 |         com.miniongvang.web.WebResponses.error(resp, status, code);
 102 |     }
```

send chuyển DTO qua WebResponses.json; error chuyển HTTP status và code qua WebResponses.error. Đây là nơi ghi HTTP/JSON; Service chỉ trả dữ liệu hoặc ném lỗi.

### Dòng 103

```text
 103 | }
```

- D103: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## controller/OrderServlet.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/controller/OrderServlet.java) · 104 dòng.

**Ai gọi:** Tomcat xử lý /api/orders; POST từ LiveOrderForm hoặc trang tổng đài; GET từ màn hình danh sách.

**Gọi đến ai:** GET → DispatchEndpoint.handle. POST → JsonRequests, AuthService, OrderService.create, WebResponses.

### Dòng 1–24

```text
   1 | package com.miniongvang.controller;
   2 | import com.miniongvang.dto.order.OrderDtos.CreateOrder;
   3 | import com.miniongvang.dto.quote.QuoteDtos.Parcel;
   4 | import com.miniongvang.web.JsonRequests;
   5 | 
   6 | import com.miniongvang.config.PersistenceContext;
   7 | import com.miniongvang.config.PersistenceListener;
   8 | import com.miniongvang.config.RouteConfiguration;
   9 | import com.miniongvang.service.AuthService;
  10 | import com.miniongvang.service.FareCalculator;
  11 | import com.miniongvang.service.OrderService;
  12 | import com.miniongvang.service.RouteService;
  13 | import jakarta.servlet.annotation.WebServlet;
  14 | import jakarta.servlet.http.HttpServlet;
  15 | import jakarta.servlet.http.HttpServletRequest;
  16 | import jakarta.servlet.http.HttpServletResponse;
  17 | import jakarta.servlet.http.HttpSession;
  18 | import java.io.IOException;
  19 | import java.util.ArrayList;
  20 | import java.util.List;
  21 | import java.util.NoSuchElementException;
  22 | import java.util.Set;
  23 | import tools.jackson.databind.JsonNode;
  24 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.controller`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.order.OrderDtos.CreateOrder` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Parcel` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.web.JsonRequests` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.config.PersistenceContext` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.config.PersistenceListener` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.config.RouteConfiguration` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `com.miniongvang.service.AuthService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `com.miniongvang.service.FareCalculator` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `com.miniongvang.service.OrderService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `com.miniongvang.service.RouteService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `jakarta.servlet.annotation.WebServlet` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `jakarta.servlet.http.HttpServlet` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D16: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletResponse` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D17: Cho phép dùng tên từ `jakarta.servlet.http.HttpSession` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D18: Cho phép dùng tên từ `java.io.IOException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D19: Cho phép dùng tên từ `java.util.ArrayList` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D20: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D21: Cho phép dùng tên từ `java.util.NoSuchElementException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D22: Cho phép dùng tên từ `java.util.Set` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D23: Cho phép dùng tên từ `tools.jackson.databind.JsonNode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 25–30

```text
  25 | @WebServlet("/api/orders")
  26 | public final class OrderServlet extends HttpServlet {
  27 |     private static final Set<String> FIELDS = Set.of("maBaoGia", "maKh", "diemLayHang", "diemGiaoHang",
  28 |             "sdtNguoiNhan", "tenNguoiNhan", "ghiChuGiaoHang", "kienHang",
  29 |             "benThanhToan", "phuongThucThanhToan");
  30 |     private static final Set<String> PARCEL_FIELDS = Set.of("loaiHangHoa", "ghiChuBaoQuan", "khoiLuongKg");
```

Ánh xạ URL /api/orders. Allowlist gồm báo giá, khách, hai địa chỉ, người nhận, ghi chú, kiện, bên trả/phương thức. Không có trường tổng tiền: backend không nhận một tổng cước tùy ý để lưu.

### Dòng 31

```text
  31 | 
```



### Dòng 32–34

```text
  32 |     @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
  33 |         com.miniongvang.web.DispatchEndpoint.handle(req,resp);
  34 |     }
```

doGet chuyển xử lý danh sách cho DispatchEndpoint.handle; cùng URL nhưng method khác nên không chạy create.

### Dòng 35

```text
  35 | 
```



### Dòng 36–40

```text
  36 |     @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
  37 |         resp.setHeader("Cache-Control", "no-store");
  38 |         JsonNode body;
  39 |         try { body = JsonRequests.object(req); }
  40 |         catch (JsonRequests.InvalidJson invalid) { error(resp, 400, "JSON_INVALID"); return; }
```

doPost đặt no-store, đọc JSON object; lỗi cú pháp trả 400 JSON_INVALID và return.

### Dòng 41–51

```text
  41 |         if (!fields(body, FIELDS) || !textIfPresent(body, "maKh") || !textIfPresent(body, "diemLayHang")
  42 |                 || !textIfPresent(body, "diemGiaoHang") || !textIfPresent(body, "maBaoGia")
  43 |                 || !textIfPresent(body, "sdtNguoiNhan") || !textIfPresent(body, "ghiChuGiaoHang")
  44 |                 || !textIfPresent(body, "tenNguoiNhan") || !textIfPresent(body, "benThanhToan")
  45 |                 || !textIfPresent(body, "phuongThucThanhToan")) {
  46 |             error(resp, 400, "VALIDATION_ERROR"); return;
  47 |         }
  48 |         String maKh = value(body, "maKh");
  49 |         if (maKh != null && (maKh.isBlank() || maKh.strip().length() > 36)) {
  50 |             error(resp, 400, "VALIDATION_ERROR"); return;
  51 |         }
```

Kiểm tra trường lạ và kiểu chuỗi cho các trường nếu xuất hiện; kiểm tra maKh không trắng/quá dài. Các quy tắc nội dung như hạn báo giá chưa xử lý tại đây.

### Dòng 52–63

```text
  52 |         JsonNode packages = body.path("kienHang");
  53 |         if (!packages.isArray() || packages.isEmpty()) { error(resp, 400, "VALIDATION_ERROR"); return; }
  54 |         List<Parcel> parcels = new ArrayList<>();
  55 |         for (JsonNode item : packages) {
  56 |             if (!item.isObject() || !fields(item, PARCEL_FIELDS)
  57 |                     || !textIfPresent(item, "loaiHangHoa") || !textIfPresent(item, "ghiChuBaoQuan")
  58 |                     || !textIfPresent(item, "khoiLuongKg")) {
  59 |                 error(resp, 400, "VALIDATION_ERROR"); return;
  60 |             }
  61 |             parcels.add(new Parcel(value(item, "loaiHangHoa"), value(item, "ghiChuBaoQuan"),
  62 |                     value(item, "khoiLuongKg")));
  63 |         }
```

kienHang phải là mảng không rỗng. Duyệt từng object, kiểm tra trường/kiểu, chuyển thành Parcel DTO. Không tạo KienHang entity ở servlet.

### Dòng 64–70

```text
  64 |         try {
  65 |             PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
  66 |             RouteService routes = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
  67 |             HttpSession session = req.getSession(false);
  68 |             String id = session == null ? null : (String) session.getAttribute("auth.userId");
  69 |             com.miniongvang.security.ActorContext actor = id == null ? null : new AuthService(persistence.entityManagerFactory()).currentActor(id);
  70 |             OrderService service = new OrderService(persistence.entityManagerFactory(), routes);
```

Lấy persistence/routes trong ServletContext; lấy session không tạo mới; lấy ID rồi currentActor. Tạo OrderService. Actor xuất phát từ session, không lấy maTkTao do trình duyệt tự khai.

### Dòng 71–76

```text
  71 |             send(resp, 201, service.create(actor, req.getHeader("Idempotency-Key"),
  72 |                     new CreateOrder(value(body, "maBaoGia"), maKh == null ? null : maKh.strip(),
  73 |                             value(body, "diemLayHang"), value(body, "diemGiaoHang"), value(body, "sdtNguoiNhan"),
  74 |                             value(body, "ghiChuGiaoHang"), parcels, value(body, "tenNguoiNhan"),
  75 |                             value(body, "benThanhToan") == null ? "NGUOI_DAT" : value(body, "benThanhToan"),
  76 |                             value(body, "phuongThucThanhToan") == null ? "TIEN_MAT" : value(body, "phuongThucThanhToan"))));
```

Đọc header Idempotency-Key, dựng CreateOrder với báo giá, khách, địa chỉ, SĐT, ghi chú, kiện, tên, bên trả/phương thức. Thiếu hai lựa chọn thì mặc định. Gọi create rồi trả 201; kể cả replay, servlet này vẫn dùng 201.

### Dòng 77–85

```text
  77 |         } catch (FareCalculator.WeightLimitExceededException heavy) { error(resp, 422, "WEIGHT_LIMIT_EXCEEDED"); }
  78 |         catch (IllegalArgumentException invalid) { error(resp, 400, "VALIDATION_ERROR"); }
  79 |         catch (OrderService.Conflict conflict) { error(resp, 409, conflict.getMessage()); }
  80 |         catch (SecurityException forbidden) { error(resp, 403, "FORBIDDEN"); }
  81 |         catch (NoSuchElementException missing) { error(resp, 404, "RESOURCE_NOT_FOUND"); }
  82 |         catch (com.miniongvang.service.FareCalculator.FareConfigurationException missing) { error(resp, 503, "FARE_CONFIG_MISSING"); }
  83 |         catch (RuntimeException failure) {
  84 |             getServletContext().log("Order creation failed", failure);
  85 |             if (!resp.isCommitted()) error(resp, 500, "INTERNAL_ERROR");
```

Lỗi kg→422; input→400; Conflict→409 và dùng message làm code; quyền→403; không thấy→404; cấu hình→503. Runtime còn lại log và trả 500 nếu chưa committed.

### Dòng 86–88

```text
  86 |         }
  87 |     }
  88 | 
```

- D86: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.
- D87: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 89–103

```text
  89 |     private static boolean fields(JsonNode object, Set<String> allowed) {
  90 |         return JsonRequests.allowed(object, allowed);
  91 |     }
  92 |     private static boolean textIfPresent(JsonNode object, String name) {
  93 |         return JsonRequests.textIfPresent(object, name);
  94 |     }
  95 |     private static String value(JsonNode object, String name) {
  96 |         return JsonRequests.text(object, name);
  97 |     }
  98 |     private static void send(HttpServletResponse resp, int status, Object body) throws IOException {
  99 |         com.miniongvang.web.WebResponses.json(resp, status, body);
 100 |     }
 101 |     private static void error(HttpServletResponse resp, int status, String code) throws IOException {
 102 |         com.miniongvang.web.WebResponses.error(resp, status, code);
 103 |     }
```

Helper fields/textIfPresent/value ủy quyền JsonRequests; send/error ủy quyền WebResponses. Những helper không gọi DAO và không chứa công thức cước.

### Dòng 104

```text
 104 | }
```

- D104: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## controller/ApiSecurityFilter.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/controller/ApiSecurityFilter.java) · 103 dòng.

**Ai gọi:** Tomcat gọi doFilter cho URL /api/* trước servlet.

**Gọi đến ai:** AuthSession; AuthService.sessionValid/current; chain.doFilter chuyển đến bộ lọc/servlet kế; WebResponses.error.

### Dòng 1–21

```text
   1 | package com.miniongvang.controller;
   2 | 
   3 | import com.miniongvang.config.PersistenceContext;
   4 | import com.miniongvang.config.PersistenceListener;
   5 | import com.miniongvang.dto.auth.AuthDtos.User;
   6 | import com.miniongvang.entity.enums.AccountRole;
   7 | import com.miniongvang.security.AuthSession;
   8 | import com.miniongvang.service.AuthService;
   9 | import jakarta.servlet.Filter;
  10 | import jakarta.servlet.FilterChain;
  11 | import jakarta.servlet.ServletException;
  12 | import jakarta.servlet.ServletRequest;
  13 | import jakarta.servlet.ServletResponse;
  14 | import jakarta.servlet.annotation.WebFilter;
  15 | import jakarta.servlet.http.HttpServletRequest;
  16 | import jakarta.servlet.http.HttpServletResponse;
  17 | import jakarta.servlet.http.HttpSession;
  18 | import java.io.IOException;
  19 | import java.util.EnumSet;
  20 | import java.util.Set;
  21 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.controller`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.config.PersistenceContext` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.config.PersistenceListener` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.dto.auth.AuthDtos.User` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.enums.AccountRole` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.security.AuthSession` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.service.AuthService` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `jakarta.servlet.Filter` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `jakarta.servlet.FilterChain` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `jakarta.servlet.ServletException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `jakarta.servlet.ServletRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `jakarta.servlet.ServletResponse` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `jakarta.servlet.annotation.WebFilter` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D16: Cho phép dùng tên từ `jakarta.servlet.http.HttpServletResponse` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D17: Cho phép dùng tên từ `jakarta.servlet.http.HttpSession` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D18: Cho phép dùng tên từ `java.io.IOException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D19: Cho phép dùng tên từ `java.util.EnumSet` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D20: Cho phép dùng tên từ `java.util.Set` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 22–29

```text
  22 | /** Role gate shared by future business servlets; ownership remains each service's responsibility. */
  23 | @WebFilter("/api/*")
  24 | public final class ApiSecurityFilter implements Filter {
  25 |     private static final Set<String> ORIGINS = Set.of("http://localhost:3000", "http://localhost:3001");
  26 |     private static final Set<String> PUBLIC_PATHS = Set.of(
  27 |             "/api/health", "/api/auth/csrf", "/api/auth/login", "/api/auth/register",
  28 |             "/api/auth/forgot-password", "/api/auth/verify-reset-otp", "/api/auth/reset-password",
  29 |             "/api/auth/logout", "/api/auth/me", "/api/payments/vnpay/ipn", "/api/payments/vnpay/return");
```

@WebFilter áp dụng /api/*. ORIGINS chỉ hai frontend localhost. PUBLIC_PATHS bỏ qua cổng role ở filter này, không có nghĩa endpoint không tự kiểm tra CSRF/chữ ký/token. Ví dụ callback và auth có xử lý chuyên biệt.

### Dòng 30

```text
  30 | 
```



### Dòng 31–35

```text
  31 |     @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
  32 |             throws IOException, ServletException {
  33 |         HttpServletRequest req = (HttpServletRequest) request;
  34 |         HttpServletResponse resp = (HttpServletResponse) response;
  35 |         resp.setHeader("Cache-Control", "no-store");
```

Ép request/response tổng quát sang HTTP; no-store ngăn cache dữ liệu API.

### Dòng 36–41

```text
  36 |         String origin = req.getHeader("Origin");
  37 |         if (origin != null && ORIGINS.contains(origin)) {
  38 |             resp.setHeader("Access-Control-Allow-Origin", origin);
  39 |             resp.setHeader("Access-Control-Allow-Credentials", "true");
  40 |             resp.setHeader("Vary", "Origin");
  41 |         }
```

Đọc Origin. Nếu nằm trong allowlist, đặt Allow-Origin đúng origin, cho gửi credentials và Vary:Origin. CORS là cơ chế trình duyệt, không thay thế phân quyền.

### Dòng 42–48

```text
  42 |         if ("OPTIONS".equals(req.getMethod())) {
  43 |             if (origin == null || !ORIGINS.contains(origin)) { resp.setStatus(403); return; }
  44 |             resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  45 |             resp.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, Idempotency-Key");
  46 |             resp.setStatus(204);
  47 |             return;
  48 |         }
```

OPTIONS là preflight: origin thiếu/sai trả403; hợp lệ khai báo methods và các header Content-Type/CSRF/Idempotency-Key, trả204 không có body rồi dừng.

### Dòng 49–52

```text
  49 |         String path = req.getServletPath() + (req.getPathInfo() == null ? "" : req.getPathInfo());
  50 |         if (PUBLIC_PATHS.contains(path)) {
  51 |             chain.doFilter(request, response); return;
  52 |         }
```

Ghép servletPath và pathInfo thành path. Public path thì chain.doFilter ngay và return; bảo vệ riêng của endpoint vẫn có thể chạy.

### Dòng 53–56

```text
  53 |         EnumSet<AccountRole> roles = roles(req.getMethod(), path);
  54 |         HttpSession session = req.getSession(false);
  55 |         String id = AuthSession.userId(session);
  56 |         AuthService auth = null;
```

roles(method,path) tìm vai trò cho endpoint. Lấy session hiện hữu và user ID qua AuthSession. auth ban đầu null.

### Dòng 57–63

```text
  57 |         if (id != null) {
  58 |             PersistenceContext persistence = (PersistenceContext) req.getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
  59 |             auth = new AuthService(persistence.entityManagerFactory());
  60 |             if (!auth.sessionValid(id, AuthSession.version(session))) {
  61 |                 session.invalidate(); error(resp, 401, "SESSION_EXPIRED"); return;
  62 |             }
  63 |         }
```

Nếu có ID, tạo AuthService và kiểm tra phiên bản session. Phiên cũ sau thay đổi bảo mật có thể bị vô hiệu; invalidate rồi401 SESSION_EXPIRED.

### Dòng 64–68

```text
  64 |         if (roles == null) { chain.doFilter(request, response); return; }
  65 |         if (id == null) { error(resp, 401, AuthSession.missingSessionCode(req)); return; }
  66 |         User user = auth.current(id);
  67 |         if (user == null) { session.invalidate(); error(resp, 403, "FORBIDDEN"); return; }
  68 |         if (!roles.contains(user.vaiTro())) { error(resp, 403, "FORBIDDEN"); return; }
```

roles=null thì filter cho đi tiếp, KHÔNG mặc định chặn; endpoint/service cần chịu trách nhiệm phù hợp. Với endpoint có rule: thiếu ID→401, user không hợp lệ→invalidate+403, role ngoài danh sách→403.

### Dòng 69–74

```text
  69 |         if (!"GET".equals(req.getMethod()) && !"HEAD".equals(req.getMethod())) {
  70 |             if (!AuthSession.hasValidCsrf(req, session)) {
  71 |                 error(resp, 403, "CSRF_INVALID"); return;
  72 |             }
  73 |         }
  74 |         chain.doFilter(request, response);
```

Các method khác GET/HEAD phải có CSRF hợp lệ; sai→403. Khi tất cả điều kiện qua, chain.doFilter chuyển xử lý tiếp. return trong nhánh lỗi ngăn gọi servlet.

### Dòng 75–76

```text
  75 |     }
  76 | 
```

- D75: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 77–86

```text
  77 |     private static EnumSet<AccountRole> roles(String method, String path) {
  78 |         if (path.equals("/api/customers") || path.equals("/api/drivers") || path.matches("/api/orders/[^/]+/driver-suggestions"))
  79 |             return EnumSet.of(AccountRole.TONG_DAI);
  80 |         if (path.equals("/api/cod/drivers") && "GET".equals(method)
  81 |                 || path.matches("/api/cod/settlements/[^/]+") && "GET".equals(method))
  82 |             return EnumSet.of(AccountRole.TONG_DAI, AccountRole.CHU_DOI_XE);
  83 |         if (path.startsWith("/api/cod/")) return EnumSet.of(AccountRole.TONG_DAI);
  84 |         if (path.equals("/api/drivers/me/earnings")) return EnumSet.of(AccountRole.TAI_XE);
  85 |         if (path.equals("/api/reports/drivers")) return EnumSet.of(AccountRole.CHU_DOI_XE);
  86 |         if (path.startsWith("/api/reports/")) return EnumSet.of(AccountRole.CHU_DOI_XE, AccountRole.TONG_DAI);
```

Bảng rule đầu: tra khách/tài xế/gợi ý→tổng đài; đọc COD→tổng đài/chủ đội; ghi COD→tổng đài; thu nhập cá nhân→tài xế; báo cáo tài xế→chủ đội; báo cáo còn lại→chủ đội/tổng đài.

### Dòng 87–94

```text
  87 |         if (path.matches("/api/orders/[^/]+/(reject|transitions|incidents)")) return EnumSet.of(AccountRole.TAI_XE);
  88 |         if (path.matches("/api/orders/[^/]+/assignments")) return EnumSet.of(AccountRole.TONG_DAI);
  89 |         if (path.matches("/api/orders/[^/]+/cancel") || path.equals("/api/routes/estimate") || path.equals("/api/quotes"))
  90 |             return EnumSet.of(AccountRole.KHACH_HANG, AccountRole.TONG_DAI);
  91 |         if (path.matches("/api/orders/[^/]+/payments") && "POST".equals(method)) return EnumSet.of(AccountRole.TAI_XE);
  92 |         if (path.matches("/api/payments/[^/]+/confirm-cash")) return EnumSet.of(AccountRole.TAI_XE);
  93 |         if (path.matches("/api/payments/[^/]+/reconcile")) return EnumSet.of(AccountRole.KHACH_HANG, AccountRole.TONG_DAI, AccountRole.TAI_XE);
  94 |         if (path.equals("/api/orders") && "POST".equals(method)) return EnumSet.of(AccountRole.KHACH_HANG, AccountRole.TONG_DAI);
```

Tiến trình/từ chối/sự cố→tài xế; gán→tổng đài; hủy/lộ trình/báo giá→khách hoặc tổng đài; mở/confirm thu tiền→tài xế; reconcile cho các role liệt kê. Đặc biệt POST /api/orders chỉ khách và tổng đài.

### Dòng 95–98

```text
  95 |         if (path.equals("/api/orders") || path.matches("/api/orders/[^/]+(/events|/payments)?") || path.matches("/api/payments/[^/]+"))
  96 |             return EnumSet.of(AccountRole.KHACH_HANG, AccountRole.TONG_DAI, AccountRole.TAI_XE);
  97 |         return null;
  98 |     }
```

Các endpoint đọc đơn/thanh toán cho khách, tổng đài, tài xế; lọc dữ liệu chủ sở hữu do service làm tiếp. Không khớp rule trả null.

### Dòng 99

```text
  99 | 
```



### Dòng 100–102

```text
 100 |     private static void error(HttpServletResponse resp, int status, String code) throws IOException {
 101 |         com.miniongvang.web.WebResponses.error(resp, status, code);
 102 |     }
```

Hàm error dùng WebResponses tạo lỗi JSON chung. Filter không trực tiếp tính giá hoặc lưu đơn.

### Dòng 103

```text
 103 | }
```

- D103: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## order/OrderDtos.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dto/order/OrderDtos.java) · 42 dòng.

**Ai gọi:** OrderServlet tạo CreateOrder; OrderService tạo Order/PaymentSummary; các màn hình/API đọc cấu trúc tương ứng.

**Gọi đến ai:** Record không tự gọi service; Jackson đọc/ghi JSON từ accessor của record.

### Dòng 1–7

```text
   1 | package com.miniongvang.dto.order;
   2 | import com.miniongvang.dto.quote.FareDtos.Fare;
   3 | import com.miniongvang.dto.quote.QuoteDtos.Parcel;
   4 | 
   5 | import java.util.List;
   6 | import com.miniongvang.entity.enums.*;
   7 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dto.order`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.quote.FareDtos.Fare` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Parcel` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.enums.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 8–10

```text
   8 | /** JSON contract types for order endpoints. */
   9 | public final class OrderDtos {
  10 |     private OrderDtos() {}
```

Lớp final làm namespace gom các record. Constructor private ngăn new OrderDtos(); vẫn new OrderDtos.CreateOrder(...) được.

### Dòng 11

```text
  11 | 
```



### Dòng 12–20

```text
  12 |     public record CreateOrder(String maBaoGia, String maKh, String diemLayHang, String diemGiaoHang,
  13 |                               String sdtNguoiNhan, String ghiChuGiaoHang, List<Parcel> kienHang,
  14 |                               String tenNguoiNhan, String benThanhToan, String phuongThucThanhToan) {
  15 |         public CreateOrder(String maBaoGia, String maKh, String diemLayHang, String diemGiaoHang,
  16 |                            String sdtNguoiNhan, String ghiChuGiaoHang, List<Parcel> kienHang) {
  17 |             this(maBaoGia, maKh, diemLayHang, diemGiaoHang, sdtNguoiNhan, ghiChuGiaoHang,
  18 |                     kienHang, null, "NGUOI_DAT", "TIEN_MAT");
  19 |         }
  20 |     }
```

CreateOrder là DTO đầu vào: mã báo giá/khách, địa chỉ, SĐT, ghi chú, list kiện, tên, bên trả/phương thức. Java record tự có constructor chuẩn, accessor dạng maKh(), equals/hashCode. Constructor ít tham số chuyển sang constructor đủ với tên=null, người đặt, tiền mặt.

### Dòng 21

```text
  21 | 
```



### Dòng 22–26

```text
  22 |     public record PaymentSummary(String trangThai, String soTienConPhaiThu, boolean canDoiSoat) {
  23 |             public PaymentSummary(String trangThai, String soTienConPhaiThu) {
  24 |                 this(trangThai, soTienConPhaiThu, false);
  25 |             }
  26 |         }
```

PaymentSummary chứa trạng thái, số còn thu, cờ cần đối soát; constructor hai tham số mặc định canDoiSoat=false. Không phải bản ghi thanh toán trong DB.

### Dòng 27

```text
  27 | 
```



### Dòng 28–40

```text
  28 |     public record Order(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
  29 |                             String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx, String maTkTao,
  30 |                             Fare cuoc, List<Parcel> kienHang, PaymentSummary thanhToan,
  31 |                             String hoanTatLuc, String huyLuc, String tenNguoiNhan,
  32 |                             String benThanhToan, String phuongThucThanhToan, String nguonLoTrinh) {
  33 |         public Order(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
  34 |                      String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx,
  35 |                      String maTkTao, Fare cuoc, List<Parcel> kienHang, PaymentSummary thanhToan,
  36 |                      String hoanTatLuc, String huyLuc) {
  37 |             this(maDon, thoiGianTao, diemLayHang, diemGiaoHang, sdtNguoiNhan, quangDuongKm,
  38 |                     ghiChuGiaoHang, trangThai, maKh, maTx, maTkTao, cuoc, kienHang, thanhToan,
  39 |                     hoanTatLuc, huyLuc, null, "NGUOI_DAT", "TIEN_MAT", null);
  40 |         }
```

Order là response: nhận diện/thời gian/địa chỉ/người nhận/trạng thái, chủ đơn/tài xế/người tạo, Fare, kiện, PaymentSummary, mốc hoàn tất/hủy và các lựa chọn. Constructor cũ điền thêm mặc định. Record là vật chứa dữ liệu; không tự validate từng trường và không tự persist.

### Dòng 41–42

```text
  41 |     }
  42 | }
```

- D41: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.
- D42: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## quote/QuoteDtos.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dto/quote/QuoteDtos.java) · 23 dòng.

**Ai gọi:** QuoteServlet tạo Parcel/CreateQuote; QuoteService tạo Quote/MembershipView; OrderService đọc lại Quote từ JSON.

**Gọi đến ai:** Jackson serialize record; không có truy vấn DB.

### Dòng 1–7

```text
   1 | package com.miniongvang.dto.quote;
   2 | import com.miniongvang.dto.quote.FareDtos.Fare;
   3 | import com.miniongvang.dto.route.RouteDtos.Route;
   4 | 
   5 | import java.util.List;
   6 | import com.miniongvang.entity.enums.*;
   7 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dto.quote`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.quote.FareDtos.Fare` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.Route` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.enums.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 8–10

```text
   8 | /** JSON contract types for quote endpoints. */
   9 | public final class QuoteDtos {
  10 |     private QuoteDtos() {}
```

Lớp chứa các kiểu dữ liệu, constructor private ngăn tạo đối tượng vỏ.

### Dòng 11

```text
  11 | 
```



### Dòng 12–13

```text
  12 |     @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
  13 |         public record Parcel(String loaiHangHoa, String ghiChuBaoQuan, String khoiLuongKg) {}
```

@JsonInclude NON_NULL trên Parcel bỏ trường null khi xuất JSON. Parcel giữ loại hàng, ghi chú, kg dạng String. equals của record so giá trị từng thành phần, nên chuỗi 1.0 và 1.00 khác nhau.

### Dòng 14

```text
  14 | 
```



### Dòng 15–16

```text
  15 |     public record CreateQuote(String maKh, String diemLayHang, String diemGiaoHang,
  16 |                               List<Parcel> kienHang, String benThanhToan, String phuongThucThanhToan) {}
```

CreateQuote giữ khách, địa chỉ, danh sách kiện, bên trả và phương thức. Không chứa số tiền client tự tính.

### Dòng 17

```text
  17 | 
```



### Dòng 18–19

```text
  18 |     public record MembershipView(String maHang, String tenHang, String phanTramGiamGia,
  19 |                                      String ngayHetHan, boolean conHieuLuc) {}
```

MembershipView là thông tin hiển thị: mã/tên hạng, tỷ lệ, ngày hết hạn, cờ hiệu lực; khác entity policy.

### Dòng 20

```text
  20 | 
```



### Dòng 21–22

```text
  21 |     public record Quote(String maBaoGia, String hetHanLuc, Route loTrinh,
  22 |                             Fare cuoc, MembershipView hangThanhVien) {}
```

Quote trả mã báo giá, hạn, Route, Fare và MembershipView. Có thể dùng chính kiểu này đọc snapshot JSON trong OrderService.

### Dòng 23

```text
  23 | }
```

- D23: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.


