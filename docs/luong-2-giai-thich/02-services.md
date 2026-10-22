# Luồng 2 — Các Service: lộ trình, thành viên, báo giá và tạo đơn

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## service/RouteService.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/RouteService.java) · 46 dòng.

**Ai gọi:** QuoteService.create; RouteServlet; các test lộ trình. RouteConfiguration tạo đối tượng này.

**Gọi đến ai:** RouteProvider.estimate → FakeRouteProvider hoặc GoongRouteProvider.

### Dòng 1–9

```text
   1 | package com.miniongvang.service;
   2 | import com.miniongvang.dto.route.RouteDtos.Route;
   3 | import com.miniongvang.dto.route.RouteDtos.EstimateRequest;
   4 | 
   5 | import com.miniongvang.integration.RouteFailure;
   6 | import com.miniongvang.integration.RouteProvider;
   7 | import java.math.BigDecimal;
   8 | import java.math.RoundingMode;
   9 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.Route` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.EstimateRequest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.integration.RouteFailure` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.integration.RouteProvider` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.math.RoundingMode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 10–18

```text
  10 | public final class RouteService {
  11 |     private final RouteProvider provider;
  12 |     private final long maxDistanceMeters;
  13 | 
  14 |     public RouteService(RouteProvider provider, long maxDistanceMeters) {
  15 |         if (provider == null || maxDistanceMeters <= 0) throw new IllegalArgumentException("Invalid route configuration");
  16 |         this.provider = provider;
  17 |         this.maxDistanceMeters = maxDistanceMeters;
  18 |     }
```

Lớp final không cho kế thừa. provider là nhà cung cấp được truyền từ ngoài vào; maxDistanceMeters là giới hạn đơn vị mét. Constructor từ chối provider null hoặc giới hạn ≤0, sau đó giữ hai giá trị. final ngăn gán lại tham chiếu, không tự làm đối tượng bên trong bất biến.

### Dòng 19

```text
  19 | 
```



### Dòng 20–24

```text
  20 |     public Route estimate(String origin, String destination) {
  21 |         String start = normalize(origin), end = normalize(destination);
  22 |         if (start == null || end == null) throw new IllegalArgumentException("Invalid address");
  23 |         if (start.equalsIgnoreCase(end)) throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
  24 |         RouteProvider.RouteData data = provider.estimate(start, end);
```

estimate nhận hai địa chỉ. D21 gọi normalize cho cả hai. D22 chặn địa chỉ thiếu/rỗng/quá dài. D23 chặn hai chuỗi địa chỉ giống nhau không phân biệt hoa thường. D24 gọi provider thực tế; tại đây mới có thể phát sinh HTTP nếu chọn Goong.

### Dòng 25–29

```text
  25 |         if (data.distanceMeters() <= 0 || data.durationSeconds() <= 0 || data.durationSeconds() > Integer.MAX_VALUE
  26 |                 || data.origin() == null || data.destination() == null
  27 |                 || data.origin().isBlank() || data.destination().isBlank()
  28 |                 || data.origin().length() > 255 || data.destination().length() > 255)
  29 |             throw new RouteFailure(RouteFailure.Kind.DISTANCE_INVALID);
```

Kiểm tra kết quả từ nhà cung cấp: mét và giây phải dương; giây vừa kiểu int; hai địa chỉ chuẩn hóa phải tồn tại, không rỗng, dài ≤255. Sai bất kỳ điều kiện nào ném DISTANCE_INVALID; không tin dữ liệu bên ngoài vô điều kiện.

### Dòng 30–33

```text
  30 |         if (data.distanceMeters() > maxDistanceMeters)
  31 |             throw new RouteFailure(RouteFailure.Kind.OUT_OF_SERVICE_AREA);
  32 |         String km = BigDecimal.valueOf(data.distanceMeters()).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP).toPlainString();
  33 |         return new Route(data.origin(), data.destination(), km, data.durationSeconds(), true, data.source());
```

D30–31 so khoảng cách mét với giới hạn cấu hình trước khi làm tròn. D32 chia 1000 để đổi mét sang km, giữ 2 số lẻ bằng HALF_UP; toPlainString tránh dạng số mũ. D33 trả Route DTO với địa chỉ chuẩn hóa, km, thời gian, trongPhamVi=true và nhãn nguồn.

### Dòng 34–35

```text
  34 |     }
  35 | 
```

- D34: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 36–38

```text
  36 |     public Route estimate(EstimateRequest request) {
  37 |         return estimate(request.diemLayHang(), request.diemGiaoHang());
  38 |     }
```

Overload nhận EstimateRequest chỉ bóc hai trường rồi gọi lại estimate(String,String); không có thuật toán tuyến thứ hai.

### Dòng 39

```text
  39 | 
```



### Dòng 40–44

```text
  40 |     private static String normalize(String raw) {
  41 |         if (raw == null) return null;
  42 |         String value = raw.strip().replaceAll("\\s+", " ");
  43 |         return value.isEmpty() || value.length() > 255 ? null : value;
  44 |     }
```

normalize: null giữ null; strip bỏ khoảng trắng đầu/cuối; replaceAll gộp khoảng trắng liên tiếp thành một. Chuỗi rỗng hoặc >255 trả null, để estimate quyết định báo lỗi. Hàm này chỉ chuẩn hóa văn bản, không xác minh địa chỉ tồn tại.

### Dòng 45–46

```text
  45 | 
  46 | }
```

- D46: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## service/MembershipPolicyService.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/MembershipPolicyService.java) · 51 dòng.

**Ai gọi:** QuoteService.evaluateV1; CustomerService; các test chính sách.

**Gọi đến ai:** ChinhSachThanhVienDAO.findApplicable; trả Decision cho QuoteService.

### Dòng 1–14

```text
   1 | package com.miniongvang.service;
   2 | 
   3 | import com.miniongvang.dao.ChinhSachThanhVienDAO;
   4 | import com.miniongvang.entity.ChinhSachThanhVien;
   5 | import com.miniongvang.entity.KhachHang;
   6 | import com.miniongvang.entity.enums.MembershipTier;
   7 | import jakarta.persistence.EntityManager;
   8 | import java.math.BigDecimal;
   9 | import java.math.RoundingMode;
  10 | import java.time.Clock;
  11 | import java.time.Instant;
  12 | import java.time.ZoneId;
  13 | import java.util.Objects;
  14 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.dao.ChinhSachThanhVienDAO` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachThanhVien` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.entity.KhachHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.enums.MembershipTier` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.math.RoundingMode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `java.time.Clock` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `java.time.ZoneId` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `java.util.Objects` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 15–19

```text
  15 | /**
  16 |  * UC-05: applies the customer's stored tier, without awarding points or upgrading tiers.
  17 |  * A null expiry means unlimited validity; the expiry date itself is inclusive.
  18 |  * Spending thresholds belong to tier assignment, not the amount of an individual quote.
  19 |  */
```

Comment mô tả UC-05 dùng hạng có sẵn, không tích điểm/tự nâng hạng. Thực thi bên dưới dùng mốc Instant theo khoảng [từ,đến); không hiểu comment ngày hết hạn thành phép so sánh ≤ trên Instant.

### Dòng 20–27

```text
  20 | public final class MembershipPolicyService {
  21 |     public MembershipPolicyService() {
  22 |         this(Clock.system(ZoneId.of("Asia/Ho_Chi_Minh")));
  23 |     }
  24 | 
  25 |     public MembershipPolicyService(Clock clock) {
  26 |         Objects.requireNonNull(clock, "clock");
  27 |     }
```

Constructor không tham số chuyển Clock có múi giờ Việt Nam cho constructor thứ hai. Constructor nhận Clock chỉ kiểm tra khác null, KHÔNG lưu clock thành field. Thời điểm thực sự tính ưu đãi là tham số at của evaluate; đây là chi tiết cần đọc đúng code.

### Dòng 28

```text
  28 | 
```



### Dòng 29–35

```text
  29 |     /** Evaluates the customer's tier and the one published policy valid at the quote time. */
  30 |     public Decision evaluate(EntityManager em, KhachHang customer, BigDecimal subtotal, Instant at) {
  31 |         Objects.requireNonNull(em, "em");
  32 |         Objects.requireNonNull(customer, "customer");
  33 |         Objects.requireNonNull(at, "at");
  34 |         if (subtotal == null || subtotal.signum() < 0) throw new IllegalArgumentException("Invalid subtotal");
  35 |         MembershipTier tier = customer.getMaHang();
```

evaluate nhận EntityManager chung, hồ sơ khách, tổng tiền trước giảm và thời điểm xét. requireNonNull kiểm tra em/customer/at; subtotal null hoặc âm là dữ liệu không hợp lệ. Lấy mã hạng từ khách hàng, không lấy từ người thao tác tổng đài.

### Dòng 36–39

```text
  36 |         boolean active = tier != null && tier != MembershipTier.THUONG
  37 |                 && customer.getThanhVienTu() != null && !at.isBefore(customer.getThanhVienTu())
  38 |                 && (customer.getThanhVienDen() == null || at.isBefore(customer.getThanhVienDen()));
  39 |         if (!active) return new Decision(null, BigDecimal.ZERO.setScale(2), false);
```

active chỉ true khi có hạng khác THUONG, có ngày bắt đầu, at≥bắt đầu, và chưa đến ngày kết thúc hoặc không có kết thúc. D39 trả policy=null, discount=0.00, active=false nếu không thỏa; không truy vấn policy tiếp.

### Dòng 40–43

```text
  40 |         var matching = new ChinhSachThanhVienDAO(em).findApplicable(tier, at);
  41 |         if (matching.size() > 1) throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
  42 |         if (matching.isEmpty()) return new Decision(null, BigDecimal.ZERO.setScale(2), false);
  43 |         ChinhSachThanhVien policy = matching.getFirst();
```

DAO tìm chính sách đúng hạng, đã công bố và còn hiệu lực. >1 kết quả là cấu hình chồng lấn nên báo lỗi; 0 kết quả thì không giảm. Chỉ getFirst khi chắc có đúng một chính sách.

### Dòng 44–47

```text
  44 |         BigDecimal discount = subtotal.multiply(policy.getTyLeGiam())
  45 |                 .movePointLeft(2).setScale(0, RoundingMode.HALF_UP).min(subtotal)
  46 |                 .setScale(2);
  47 |         return new Decision(policy, discount, true);
```

Tính subtotal × tỷ lệ; movePointLeft(2) tương đương chia 100. Làm tròn đến đồng bằng HALF_UP; min(subtotal) chặn giảm vượt tiền trước giảm; setScale(2) chuẩn hóa dạng tiền 2 số lẻ. Trả chính sách, số giảm và active=true.

### Dòng 48–49

```text
  48 |     }
  49 | 
```

- D48: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 50

```text
  50 |     public record Decision(ChinhSachThanhVien policy, BigDecimal discount, boolean active) {}
```

Decision là record mang ba kết quả; policy dùng lưu tham chiếu lịch sử, discount dùng tính tiền, active dùng hiển thị. Record không tự gọi DAO hay tính toán.

### Dòng 51

```text
  51 | }
```

- D51: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## service/FareCalculator.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/FareCalculator.java) · 66 dòng.

**Ai gọi:** QuoteService.evaluateV1 gọi hai lần (trước giảm và sau giảm); FareCalculatorTest.

**Gọi đến ai:** Các phép toán BigDecimal và tạo Fare/Surcharge DTO; không gọi database hay HTTP.

### Dòng 1–12

```text
   1 | package com.miniongvang.service;
   2 | import com.miniongvang.dto.quote.FareDtos.Fare;
   3 | import com.miniongvang.dto.quote.FareDtos.Surcharge;
   4 | 
   5 | import com.miniongvang.entity.BieuPhi;
   6 | import com.miniongvang.entity.ChinhSachPhuThu;
   7 | import java.math.BigDecimal;
   8 | import java.math.RoundingMode;
   9 | import java.util.ArrayList;
  10 | import java.util.List;
  11 | 
  12 | /** Pure VND calculation shared by quotes and the later order confirmation flow. */
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.dto.quote.FareDtos.Fare` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.quote.FareDtos.Surcharge` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.entity.BieuPhi` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachPhuThu` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.math.RoundingMode` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.util.ArrayList` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Chú thích của tác giả; không được thực thi. Dùng phần giải thích mã thực thi để hiểu chính xác hành vi.

### Dòng 13–19

```text
  13 | public final class FareCalculator {
  14 |     private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999.00");
  15 | 
  16 |     public Fare calculateV1(BigDecimal km, BieuPhi tariff, List<ChinhSachPhuThu> surcharges,
  17 |                             BigDecimal discount) {
  18 |         return calculateV1(km, BigDecimal.ZERO, tariff, surcharges, discount);
  19 |     }
```

MAX_MONEY là trần phù hợp độ chính xác tiền trong schema. Overload không có kg gọi phiên bản đầy đủ với kg=0; không phải mặc định kiện thật bằng 0 kg, vì luồng tạo báo giá kiểm tra kiện riêng.

### Dòng 20

```text
  20 | 
```



### Dòng 21–24

```text
  21 |     public Fare calculateV1(BigDecimal km, BigDecimal kg, BieuPhi tariff,
  22 |                             List<ChinhSachPhuThu> surcharges, BigDecimal discount) {
  23 |         if (km == null || km.signum() <= 0) throw new IllegalArgumentException("Distance must be positive");
  24 |         if (kg == null || kg.signum() < 0) throw new IllegalArgumentException("Invalid weight");
```

Phiên bản đầy đủ nhận km, tổng kg, biểu phí, danh sách phụ thu, số tiền giảm. km phải >0; kg phải ≥0. signum trả -1/0/1 tương ứng âm/0/dương.

### Dòng 25–30

```text
  25 |         if (tariff == null || tariff.getCuocCoBan() == null || tariff.getDonGiaKm() == null
  26 |                 || tariff.getKgBaoGom() == null || tariff.getDonGiaKg() == null || tariff.getKgToiDa() == null
  27 |                 || tariff.getCuocCoBan().signum() < 0 || tariff.getDonGiaKm().signum() < 0
  28 |                 || tariff.getKgBaoGom().signum() < 0 || tariff.getDonGiaKg().signum() < 0
  29 |                 || tariff.getKgToiDa().compareTo(tariff.getKgBaoGom()) < 0 || tariff.getPhienBan() < 1)
  30 |             throw new FareConfigurationException();
```

Kiểm tra biểu phí khác null; các thông số cơ bản/km/kg có giá trị và không âm; kg tối đa ≥kg bao gồm; phiên bản ≥1. || là OR, chỉ một điều kiện sai đã ném FareConfigurationException.

### Dòng 31

```text
  31 |         if (kg.compareTo(tariff.getKgToiDa()) > 0) throw new WeightLimitExceededException();
```

compareTo>0 nghĩa kg lớn hơn tối đa. Ném WeightLimitExceededException để servlet trả lỗi riêng 422; đúng mức tối đa vẫn được.

### Dòng 32–34

```text
  32 |         BigDecimal distanceFare = whole(tariff.getCuocCoBan().add(km.multiply(tariff.getDonGiaKm())));
  33 |         BigDecimal weightFare = whole(kg.subtract(tariff.getKgBaoGom()).max(BigDecimal.ZERO)
  34 |                 .multiply(tariff.getDonGiaKg()));
```

D32 tính cước cơ bản + km×đơn giá rồi whole làm tròn đồng. D33 trừ phần kg miễn/bao gồm, max(0) tránh phí âm; D34 nhân đơn giá kg và làm tròn riêng khoản này.

### Dòng 35–37

```text
  35 |         BigDecimal base = distanceFare.add(weightFare);
  36 |         BigDecimal extras = BigDecimal.ZERO;
  37 |         List<Surcharge> lines = new ArrayList<>();
```

base = cước km + cước kg. extras bắt đầu 0; lines dùng lưu chi tiết từng phụ thu để frontend hiển thị. cuocGoc trong DTO tương ứng base, không chỉ riêng cước mở cửa.

### Dòng 38–45

```text
  38 |         for (ChinhSachPhuThu item : surcharges) {
  39 |             if (item.getSoTien() == null || item.getSoTien().signum() < 0)
  40 |                 throw new FareConfigurationException();
  41 |             BigDecimal value = item.getSoTien();
  42 |             if (value.stripTrailingZeros().scale() > 0) throw new FareConfigurationException();
  43 |             extras = extras.add(value);
  44 |             lines.add(new Surcharge(item.getId(), item.getTenPhuThu(), money(value)));
  45 |         }
```

Duyệt từng policy phụ thu. Số tiền không được null/âm. stripTrailingZeros().scale()>0 phát hiện phần lẻ thật (100.00 hợp lệ, 100.50 không). Cộng vào extras rồi thêm mã/tên/số tiền vào Surcharge DTO.

### Dòng 46–50

```text
  46 |         BigDecimal subtotal = base.add(extras);
  47 |         BigDecimal appliedDiscount = discount == null ? BigDecimal.ZERO : discount;
  48 |         if (appliedDiscount.signum() < 0 || appliedDiscount.compareTo(subtotal) > 0
  49 |                 || appliedDiscount.stripTrailingZeros().scale() > 0)
  50 |             throw new FareConfigurationException();
```

subtotal=base+extras. discount null được xem 0. Không chấp nhận giảm âm, vượt subtotal hoặc có phần lẻ đồng. Tham số discount là SỐ TIỀN, không phải phần trăm; MembershipPolicyService đã tính phần trăm trước đó.

### Dòng 51–55

```text
  51 |         BigDecimal total = subtotal.subtract(appliedDiscount);
  52 |         checkAmount(base); checkAmount(extras); checkAmount(appliedDiscount); checkAmount(total);
  53 |         return new Fare(money(base), money(extras), money(appliedDiscount), money(total),
  54 |                 "VND", List.copyOf(lines), money(distanceFare), money(weightFare),
  55 |                 kg.setScale(2, RoundingMode.UNNECESSARY).toPlainString(), tariff.getId(), tariff.getPhienBan());
```

total=subtotal−discount. Kiểm tra trần cho các khoản. Tạo Fare: cước gốc, phụ thu, giảm, tổng, VND, danh sách phụ thu không sửa cấu trúc được, cước km/kg, tổng kg và ID/phiên bản biểu phí. UNNECESSARY yêu cầu không cần làm tròn thêm; dữ liệu sai độ lẻ có thể ném lỗi.

### Dòng 56–57

```text
  56 |     }
  57 | 
```

- D56: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 58–62

```text
  58 |     public static BigDecimal whole(BigDecimal value) { return value.setScale(0, RoundingMode.HALF_UP); }
  59 |     private static String money(BigDecimal value) { return value.setScale(2, RoundingMode.UNNECESSARY).toPlainString(); }
  60 |     private static void checkAmount(BigDecimal amount) {
  61 |         if (amount.compareTo(MAX_MONEY) > 0) throw new FareConfigurationException();
  62 |     }
```

whole làm tròn nguyên đồng HALF_UP. money chuẩn hóa 2 số lẻ rồi trả chuỗi để giữ chính xác khi trao đổi JSON. checkAmount báo lỗi khi vượt MAX_MONEY.

### Dòng 63

```text
  63 | 
```



### Dòng 64–65

```text
  64 |     public static final class FareConfigurationException extends RuntimeException {}
  65 |     public static final class WeightLimitExceededException extends IllegalArgumentException {}
```

Hai exception đánh dấu lỗi nghiệp vụ riêng. WeightLimitExceededException kế thừa IllegalArgumentException nên servlet phải catch loại cụ thể trước catch cha để giữ mã lỗi kg.

### Dòng 66

```text
  66 | }
```

- D66: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## service/QuoteService.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/QuoteService.java) · 163 dòng.

**Ai gọi:** QuoteServlet gọi create; OrderService gọi evaluateV1 khi xác nhận tạo đơn; test gọi cả hai.

**Gọi đến ai:** RouteService → các DAO chính sách → FareCalculator → MembershipPolicyService → BaoGiaDAO; dùng TransactionRunner.

### Dòng 1–30

```text
   1 | package com.miniongvang.service;
   2 | import com.miniongvang.security.ActorContext;
   3 | import com.miniongvang.dto.quote.FareDtos.Fare;
   4 | import com.miniongvang.dto.quote.QuoteDtos.MembershipView;
   5 | import com.miniongvang.dto.quote.QuoteDtos.Parcel;
   6 | import com.miniongvang.dto.quote.QuoteDtos.Quote;
   7 | import com.miniongvang.dto.quote.QuoteDtos.CreateQuote;
   8 | import com.miniongvang.dto.route.RouteDtos.Route;
   9 | 
  10 | import com.miniongvang.dao.BaoGiaDAO;
  11 | import com.miniongvang.dao.KhachHangDAO;
  12 | import com.miniongvang.dao.BieuPhiDAO;
  13 | import com.miniongvang.dao.ChinhSachPhuThuDAO;
  14 | import com.miniongvang.entity.BaoGia;
  15 | import com.miniongvang.entity.BieuPhi;
  16 | import com.miniongvang.entity.ChinhSachPhuThu;
  17 | import com.miniongvang.entity.ChinhSachThanhVien;
  18 | import com.miniongvang.entity.enums.AccountRole;
  19 | import com.miniongvang.entity.enums.MembershipTier;
  20 | import jakarta.persistence.EntityManagerFactory;
  21 | import java.math.BigDecimal;
  22 | import java.time.Clock;
  23 | import java.time.Instant;
  24 | import java.time.ZoneId;
  25 | import java.util.List;
  26 | import java.util.NoSuchElementException;
  27 | import java.util.UUID;
  28 | import java.util.regex.Pattern;
  29 | import tools.jackson.databind.ObjectMapper;
  30 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.security.ActorContext` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.quote.FareDtos.Fare` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.MembershipView` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Parcel` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Quote` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.CreateQuote` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.Route` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `com.miniongvang.dao.BaoGiaDAO` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `com.miniongvang.dao.KhachHangDAO` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `com.miniongvang.dao.BieuPhiDAO` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `com.miniongvang.dao.ChinhSachPhuThuDAO` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `com.miniongvang.entity.BaoGia` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `com.miniongvang.entity.BieuPhi` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D16: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachPhuThu` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D17: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachThanhVien` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D18: Cho phép dùng tên từ `com.miniongvang.entity.enums.AccountRole` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D19: Cho phép dùng tên từ `com.miniongvang.entity.enums.MembershipTier` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D20: Cho phép dùng tên từ `jakarta.persistence.EntityManagerFactory` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D21: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D22: Cho phép dùng tên từ `java.time.Clock` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D23: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D24: Cho phép dùng tên từ `java.time.ZoneId` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D25: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D26: Cho phép dùng tên từ `java.util.NoSuchElementException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D27: Cho phép dùng tên từ `java.util.UUID` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D28: Cho phép dùng tên từ `java.util.regex.Pattern` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D29: Cho phép dùng tên từ `tools.jackson.databind.ObjectMapper` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 31–39

```text
  31 | public final class QuoteService {
  32 |     private static final ObjectMapper JSON = new ObjectMapper();
  33 |     private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
  34 |     private static final Pattern WEIGHT = Pattern.compile("^(0\\.(0[1-9]|[1-9][0-9]?)|[1-9][0-9]{0,7}(\\.[0-9]{1,2})?)$");
  35 |     private final TransactionRunner transactions;
  36 |     private final RouteService routes;
  37 |     private final Clock clock;
  38 |     private final MembershipPolicyService membership;
  39 |     private final FareCalculator calculator = new FareCalculator();
```

JSON chuyển DTO thành chuỗi và đọc lại. VIETNAM phục vụ hiển thị ngày thành viên. WEIGHT chấp nhận kg dương tối đa 2 số lẻ, không nhận chuỗi 0/âm/ký pháp mũ. transactions quản lý DB; routes làm tuyến; clock cung cấp thời gian; membership tính giảm; calculator tính cước.

### Dòng 40

```text
  40 | 
```



### Dòng 41–49

```text
  41 |     public QuoteService(EntityManagerFactory factory, RouteService routes) {
  42 |         this(factory, routes, Clock.systemUTC());
  43 |     }
  44 | 
  45 |     public QuoteService(EntityManagerFactory factory, RouteService routes, Clock clock) {
  46 |         this.transactions = new TransactionRunner(factory);
  47 |         this.routes = routes;
  48 |         this.clock = clock;
  49 |         this.membership = new MembershipPolicyService(clock);
```

Constructor ngắn dùng Clock.systemUTC. Constructor đầy đủ nhận clock từ ngoài (test có thể dùng Clock.fixed), tạo TransactionRunner và MembershipPolicyService, giữ RouteService dùng chung.

### Dòng 50–51

```text
  50 |     }
  51 | 
```

- D50: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 52–56

```text
  52 |     public Quote create(ActorContext actor, String requestedCustomerId, String origin,
  53 |                         String destination, List<Parcel> parcels) {
  54 |         return create(actor, new CreateQuote(requestedCustomerId, origin, destination, parcels,
  55 |                 "NGUOI_DAT", "TIEN_MAT"));
  56 |     }
```

Overload cũ gói tham số vào CreateQuote với người đặt trả, tiền mặt rồi chuyển sang create chính. Các test/đoạn gọi cũ vẫn dùng được.

### Dòng 57

```text
  57 | 
```



### Dòng 58–64

```text
  58 |     public Quote create(ActorContext actor, CreateQuote request) {
  59 |         String requestedCustomerId = request.maKh();
  60 |         String origin = request.diemLayHang();
  61 |         String destination = request.diemGiaoHang();
  62 |         List<Parcel> parcels = request.kienHang();
  63 |         String payer = choice(request.benThanhToan(), "NGUOI_DAT", "NGUOI_NHAN");
  64 |         String method = choice(request.phuongThucThanhToan(), "TIEN_MAT", "VNPAY_QR");
```

Đọc dữ liệu trong DTO thành biến. choice kiểm tra hai giá trị hợp lệ cho bên trả và phương thức. Phương thức này kỳ vọng request không null; biên HTTP đã tạo DTO trước khi gọi.

### Dòng 65–75

```text
  65 |         if (actor == null) throw new SecurityException("Authentication required");
  66 |         String customerId;
  67 |         if (actor.vaiTro() == AccountRole.KHACH_HANG) {
  68 |             customerId = actor.maKh();
  69 |             if (customerId == null || (requestedCustomerId != null && !customerId.equals(requestedCustomerId)))
  70 |                 throw new SecurityException("Customer mismatch");
  71 |         } else if (actor.vaiTro() == AccountRole.TONG_DAI) {
  72 |             customerId = requestedCustomerId;
  73 |             if (customerId == null || customerId.isBlank() || customerId.length() > 36)
  74 |                 throw new IllegalArgumentException("maKh is required for dispatcher");
  75 |         } else throw new SecurityException("Role cannot quote");
```

Chặn actor null. Khách tự tạo lấy customerId từ actor; nếu request cố chọn khách khác thì SecurityException. Tổng đài phải gửi mã khách không rỗng, ≤36 ký tự. Vai trò khác không được báo giá.

### Dòng 76–79

```text
  76 |         List<Parcel> normalizedParcels = normalizeParcels(parcels);
  77 |         // Network route lookup must finish before a database transaction begins.
  78 |         Route route = routes.estimate(origin, destination);
  79 |         Instant now = clock.instant();
```

normalizeParcels kiểm tra/chuẩn hóa kiện. routes.estimate gọi nhà cung cấp TRƯỚC khi mở giao dịch DB để không giữ transaction trong lúc chờ mạng. now lấy sau khi đã có tuyến; báo giá sống 300 giây tính từ mốc này.

### Dòng 80–86

```text
  80 |         return transactions.run(em -> {
  81 |             EvaluationV1 evaluated = evaluateV1(em, customerId, route, normalizedParcels, now);
  82 |             BieuPhi tariff = evaluated.tariff();
  83 |             Fare fare = evaluated.fare();
  84 |             MembershipView tier = evaluated.tier();
  85 |             Instant expiry = now.plusSeconds(300);
  86 |             Quote result = new Quote(UUID.randomUUID().toString(), expiry.toString(), route, fare, tier);
```

Mở transaction. evaluateV1 trả biểu phí, cước, hạng và chính sách liên quan. expiry=now+300 giây. Quote DTO được gán UUID riêng, không phải mã đơn.

### Dòng 87–93

```text
  87 |             BaoGia stored = new BaoGia();
  88 |             stored.setId(result.maBaoGia()); stored.setMaKh(customerId); stored.setMaBieuPhi(tariff.getId());
  89 |             stored.setTaoLuc(now); stored.setHetHanLuc(expiry);
  90 |             stored.setYeuCauJson(JSON.writeValueAsString(new FrozenRequest(customerId, route, normalizedParcels,
  91 |                     payer, method, cleanAddress(origin), cleanAddress(destination))));
  92 |             stored.setKetQuaJson(JSON.writeValueAsString(result));
  93 |             new BaoGiaDAO(em).persist(stored);
```

Tạo BaoGia entity. Ghi mã báo giá, khách, biểu phí, thời điểm tạo/hết hạn. FrozenRequest lưu tuyến, kiện, bên trả/phương thức và địa chỉ gõ ban đầu đã chuẩn hóa. KetQuaJson lưu DTO kết quả. BaoGiaDAO.persist đăng ký ghi DB; commit diễn ra trong TransactionRunner.

### Dòng 94–95

```text
  94 |             return result;
  95 |         });
```

Trả Quote từ lambda; TransactionRunner flush/commit thành công rồi create mới trả cho servlet. Nếu commit lỗi thì HTTP không được xem như đã báo giá thành công.

### Dòng 96–97

```text
  96 |     }
  97 | 
```

- D96: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 98–101

```text
  98 |     EvaluationV1 evaluateV1(jakarta.persistence.EntityManager em, String customerId,
  99 |                             Route route, Instant now) {
 100 |         return evaluateV1(em, customerId, route, List.of(), now);
 101 |     }
```

Overload evaluateV1 không nhận danh sách kiện gọi phiên bản đầy đủ với danh sách rỗng; không phải entry point HTTP. Phạm vi package-private cho OrderService cùng package dùng.

### Dòng 102

```text
 102 | 
```



### Dòng 103–109

```text
 103 |     EvaluationV1 evaluateV1(jakarta.persistence.EntityManager em, String customerId,
 104 |                             Route route, List<Parcel> parcels, Instant now) {
 105 |         BigDecimal km = new BigDecimal(route.quangDuongKm());
 106 |         BigDecimal kg = parcels.stream().map(p -> new BigDecimal(p.khoiLuongKg()))
 107 |                 .reduce(BigDecimal.ZERO, BigDecimal::add);
 108 |         var customer = new KhachHangDAO(em).findWithAccount(customerId);
 109 |         if (customer == null) throw new NoSuchElementException("Customer not found");
```

Chuyển km chuỗi sang BigDecimal. stream.map chuyển kg từng kiện; reduce cộng từ 0 ra tổng kg. Đọc khách kèm tài khoản bằng DAO; khách không tồn tại thì ném NoSuchElementException.

### Dòng 110–112

```text
 110 |         var matchingTariffs = new BieuPhiDAO(em).findApplicable(now, km);
 111 |         if (matchingTariffs.size() != 1) throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
 112 |         BieuPhi tariff = matchingTariffs.getFirst();
```

Tìm biểu phí đúng thời điểm và km. Bắt buộc đúng 1 kết quả: không có hoặc chồng lấn đều báo lỗi cấu hình, không tự chọn một giá tùy ý.

### Dòng 113–117

```text
 113 |         List<ChinhSachPhuThu> extras = new ChinhSachPhuThuDAO(em).findApplicable(now);
 114 |         java.util.HashSet<String> types = new java.util.HashSet<>();
 115 |         for (ChinhSachPhuThu item : extras)
 116 |             if (!types.add(item.getMaLoaiPhuThu()))
 117 |                 throw new com.miniongvang.service.FareCalculator.FareConfigurationException();
```

Lấy phụ thu hiệu lực. HashSet lưu mã loại phụ thu; add trả false khi loại đã tồn tại. Khi có hai phiên bản cùng loại đang hiệu lực, báo lỗi để tránh cộng trùng.

### Dòng 118–121

```text
 118 |         Fare before = calculator.calculateV1(km, kg, tariff, extras, BigDecimal.ZERO);
 119 |         BigDecimal subtotal = new BigDecimal(before.cuocGoc()).add(new BigDecimal(before.tienPhuThu()));
 120 |         MembershipPolicyService.Decision decision = membership.evaluate(em, customer, subtotal, now);
 121 |         Fare fare = calculator.calculateV1(km, kg, tariff, extras, decision.discount());
```

Tính lần 1 với giảm=0 để biết tiền trước giảm. subtotal=cuocGoc+tienPhuThu. MembershipPolicyService tính số tiền giảm trên subtotal. Tính lần 2 với số giảm đó để tạo Fare cuối.

### Dòng 122–129

```text
 122 |         ChinhSachThanhVien policy = decision.policy();
 123 |         MembershipView tier = customer.getMaHang() == MembershipTier.THUONG ? null
 124 |                 : new MembershipView(customer.getMaHang().name(), customer.getMaHang().name(),
 125 |                         policy == null ? "0.00" : policy.getTyLeGiam().setScale(2).toPlainString(),
 126 |                         customer.getThanhVienDen() == null ? null
 127 |                                 : customer.getThanhVienDen().minusMillis(1).atZone(VIETNAM).toLocalDate().toString(),
 128 |                         decision.active());
 129 |         return new EvaluationV1(tariff, fare, tier, extras, policy);
```

Giữ policy giảm từ Decision. Hạng THUONG trả MembershipView=null. Hạng khác có mã/tên hạng, tỷ lệ (0 nếu không có policy), ngày hết hạn và active. minusMillis(1) rồi đổi ngày Việt Nam giúp hiển thị ngày cuối được hưởng khi mốc kết thúc lưu dạng loại trừ. Trả EvaluationV1 gồm cả entity policy để OrderService lưu tham chiếu.

### Dòng 130–131

```text
 130 |     }
 131 | 
```

- D130: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 132–133

```text
 132 |     record EvaluationV1(BieuPhi tariff, Fare fare, MembershipView tier,
 133 |                         List<ChinhSachPhuThu> extras, ChinhSachThanhVien discountPolicy) {}
```

EvaluationV1 là record nội bộ gộp kết quả tính và các entity đã chọn; khác Quote DTO gửi cho trình duyệt.

### Dòng 134

```text
 134 | 
```



### Dòng 135–141

```text
 135 |     static List<Parcel> normalizeParcels(List<Parcel> parcels) {
 136 |         if (parcels == null || parcels.isEmpty()) throw new IllegalArgumentException("kienHang is required");
 137 |         java.util.ArrayList<Parcel> normalized = new java.util.ArrayList<>();
 138 |         for (Parcel parcel : parcels) {
 139 |             if (parcel == null || parcel.loaiHangHoa() == null || parcel.loaiHangHoa().isBlank()
 140 |                     || parcel.khoiLuongKg() == null || !WEIGHT.matcher(parcel.khoiLuongKg()).matches())
 141 |                 throw new IllegalArgumentException("Invalid parcel");
```

normalizeParcels chặn null/rỗng. Mỗi kiện phải có loại hàng không trắng và chuỗi kg khớp WEIGHT. Chưa kiểm tra tổng kg tối đa ở đây; FareCalculator làm với biểu phí.

### Dòng 142–148

```text
 142 |             String name = parcel.loaiHangHoa().strip().replaceAll("\\s+", " ");
 143 |             String note = parcel.ghiChuBaoQuan() == null ? null : parcel.ghiChuBaoQuan().strip();
 144 |             if (name.length() > 100 || note != null && note.length() > 500)
 145 |                 throw new IllegalArgumentException("Invalid parcel");
 146 |             normalized.add(new Parcel(name, note, parcel.khoiLuongKg()));
 147 |         }
 148 |         return List.copyOf(normalized);
```

Tên loại hàng bỏ khoảng trắng thừa; ghi chú trim nếu có. Giới hạn tên 100, ghi chú 500. Tạo Parcel mới nhưng giữ nguyên chuỗi kg, không tự đổi 1.0 thành 1.00. Vì record so sánh cả chuỗi nên cách biểu diễn kg có thể ảnh hưởng so khớp báo giá. List.copyOf trả danh sách không cho thêm/xóa.

### Dòng 149–150

```text
 149 |     }
 150 | 
```

- D149: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 151–154

```text
 151 |     static String choice(String value, String first, String second) {
 152 |         if (!first.equals(value) && !second.equals(value)) throw new IllegalArgumentException("Invalid payment choice");
 153 |         return value;
 154 |     }
```

choice kiểm tra value đúng một trong hai chuỗi được truyền. Giá trị null không mặc định ở đây; servlet/overload đã cấp mặc định nếu thiếu.

### Dòng 155

```text
 155 | 
```



### Dòng 156–158

```text
 156 |     static String cleanAddress(String value) {
 157 |         return value == null ? null : value.strip().replaceAll("\\s+", " ");
 158 |     }
```

cleanAddress trim và gộp khoảng trắng, giữ null nếu đầu vào null. Địa chỉ này dùng so với lần tạo đơn; khác địa chỉ chuẩn do Goong trả.

### Dòng 159

```text
 159 | 
```



### Dòng 160–162

```text
 160 |     public record FrozenRequest(String maKh, Route loTrinh, List<Parcel> kienHang,
 161 |                                 String benThanhToan, String phuongThucThanhToan,
 162 |                                 String diaChiNhapLay, String diaChiNhapGiao) {}
```

FrozenRequest là bản chụp dữ liệu yêu cầu + tuyến. OrderService đọc từ JSON để kiểm tra người dùng không thay địa chỉ/kiện/lựa chọn thanh toán sau khi lấy giá.

### Dòng 163

```text
 163 | }
```

- D163: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## service/OrderService.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/OrderService.java) · 178 dòng.

**Ai gọi:** OrderServlet.doPost gọi create; các test tạo đơn gọi trực tiếp.

**Gọi đến ai:** QuoteService.evaluateV1, normalizeParcels, choice; AuthService.normalizePhone; DAO khách/báo giá/đơn/chống lặp; TransactionRunner.

### Dòng 1–21

```text
   1 | package com.miniongvang.service;
   2 | import com.miniongvang.security.ActorContext;
   3 | import com.miniongvang.dto.order.OrderDtos.CreateOrder;
   4 | import com.miniongvang.dto.order.OrderDtos.Order;
   5 | import com.miniongvang.dto.order.OrderDtos.PaymentSummary;
   6 | import com.miniongvang.dto.quote.QuoteDtos.Quote;
   7 | import com.miniongvang.dto.route.RouteDtos.Route;
   8 | 
   9 | import com.miniongvang.dao.*;
  10 | import com.miniongvang.entity.*;
  11 | import com.miniongvang.entity.enums.*;
  12 | import jakarta.persistence.EntityManagerFactory;
  13 | import java.math.BigDecimal;
  14 | import java.nio.charset.StandardCharsets;
  15 | import java.security.MessageDigest;
  16 | import java.security.NoSuchAlgorithmException;
  17 | import java.time.Clock;
  18 | import java.time.Instant;
  19 | import java.util.*;
  20 | import tools.jackson.databind.ObjectMapper;
  21 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D2: Cho phép dùng tên từ `com.miniongvang.security.ActorContext` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D3: Cho phép dùng tên từ `com.miniongvang.dto.order.OrderDtos.CreateOrder` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.dto.order.OrderDtos.Order` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.dto.order.OrderDtos.PaymentSummary` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.dto.quote.QuoteDtos.Quote` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.dto.route.RouteDtos.Route` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `com.miniongvang.dao.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `com.miniongvang.entity.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `com.miniongvang.entity.enums.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `jakarta.persistence.EntityManagerFactory` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `java.nio.charset.StandardCharsets` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `java.security.MessageDigest` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D16: Cho phép dùng tên từ `java.security.NoSuchAlgorithmException` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D17: Cho phép dùng tên từ `java.time.Clock` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D18: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D19: Cho phép dùng tên từ `java.util.*` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D20: Cho phép dùng tên từ `tools.jackson.databind.ObjectMapper` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 22–26

```text
  22 | public final class OrderService {
  23 |     private static final ObjectMapper JSON = new ObjectMapper();
  24 |     private final TransactionRunner transactions;
  25 |     private final QuoteService quotes;
  26 |     private final Clock clock;
```

JSON dùng chuẩn hóa payload lưu chống lặp và đọc báo giá; transactions quản lý giao dịch; quotes tái đánh giá cước; clock lấy thời gian có thể điều khiển trong test.

### Dòng 27

```text
  27 | 
```



### Dòng 28–35

```text
  28 |     public OrderService(EntityManagerFactory factory, RouteService routes) {
  29 |         this(factory, routes, Clock.systemUTC());
  30 |     }
  31 |     public OrderService(EntityManagerFactory factory, RouteService routes, Clock clock) {
  32 |         transactions = new TransactionRunner(factory);
  33 |         this.clock = clock;
  34 |         quotes = new QuoteService(factory, routes, clock);
  35 |     }
```

Constructor mặc định dùng UTC. Constructor đầy đủ tạo TransactionRunner, giữ clock và tạo QuoteService cùng factory/routes/clock. Tạo QuoteService không tự gọi Goong; chỉ create của QuoteService mới ước tính tuyến.

### Dòng 36

```text
  36 | 
```



### Dòng 37–46

```text
  37 |     public Order create(ActorContext actor, String key, CreateOrder input) {
  38 |         if (actor == null || actor.maNguoiDung() == null) throw new SecurityException("Authentication required");
  39 |         String customerId;
  40 |         if (actor.vaiTro() == AccountRole.KHACH_HANG) {
  41 |             customerId = actor.maKh();
  42 |             if (customerId == null || input != null && input.maKh() != null && !customerId.equals(input.maKh()))
  43 |                 throw new SecurityException("Customer mismatch");
  44 |         } else if (actor.vaiTro() == AccountRole.TONG_DAI) {
  45 |             customerId = input == null ? null : input.maKh();
  46 |         } else throw new SecurityException("Role cannot create orders");
```

create nhận actor từ session, key từ header, input từ JSON DTO. Chặn chưa xác thực. Khách dùng maKh trong actor và không được gửi maKh người khác. Tổng đài dùng maKh trong input. Vai trò còn lại ném SecurityException.

### Dòng 47–48

```text
  47 |         if (key == null || key.isBlank() || key.length() > 100 || key.chars().anyMatch(Character::isISOControl))
  48 |             throw new IllegalArgumentException("Idempotency-Key is required (1-100 characters)");
```

Key bắt buộc 1–100 ký tự, không được toàn trắng hoặc chứa ký tự điều khiển. Không bắt buộc key là UUID; UUID chỉ là cách frontend sinh.

### Dòng 49–51

```text
  49 |         CreateOrder request = normalize(input, customerId);
  50 |         String requestJson = JSON.writeValueAsString(request);
  51 |         String requestId = digest(actor.maNguoiDung() + "\ncreateOrder\n" + key);
```

normalize tạo request chuẩn. JSON.writeValueAsString dùng chính DTO chuẩn để so nội dung lặp. digest băm mã tài khoản + tên thao tác + key; cùng key ở hai tài khoản tạo requestId khác nhau.

### Dòng 52–54

```text
  52 |         // Replay does not depend on quote expiry, current prices or provider availability.
  53 |         Order replay = transactions.run(em -> replay(new YeuCauTaoDonDAO(em).find(requestId), requestJson));
  54 |         if (replay != null) return replay;
```

Transaction đọc nhanh tìm requestId. replay trả DTO cũ nếu bản ghi chưa hết hạn và payload giống. Trả ngay trước kiểm tra báo giá hiện tại: retry đơn đã commit vẫn được dù báo giá sau đó hết hạn.

### Dòng 55–59

```text
  55 |         return transactions.run(em -> {
  56 |             var requests = new YeuCauTaoDonDAO(em);
  57 |             TaiKhoan account = requests.lockActor(actor.maNguoiDung());
  58 |             if (account == null || account.getTrangThai() != AccountStatus.HOAT_DONG
  59 |                     || account.getVaiTro() != actor.vaiTro()) throw new SecurityException("Account unavailable");
```

Mở transaction ghi. lockActor dùng PESSIMISTIC_WRITE trên hàng tài khoản, giúp tuần tự hóa tạo đơn của cùng actor. Kiểm tra tài khoản còn hoạt động và role khớp actor; khóa này không phải khóa toàn bộ database.

### Dòng 60–62

```text
  60 |             YeuCauTaoDon saved = requests.find(requestId);
  61 |             Order repeated = replay(saved, requestJson);
  62 |             if (repeated != null) return repeated;
```

Đọc và replay lần thứ hai SAU khi lấy khóa. Cần kiểm tra lại vì request khác có thể đã tạo đơn trong khoảng giữa lần đọc nhanh và lúc lấy được khóa.

### Dòng 63–69

```text
  63 |             var customer = new KhachHangDAO(em).findWithAccount(customerId);
  64 |             if (customer == null) throw new NoSuchElementException("Customer not found");
  65 |             if (actor.vaiTro() == AccountRole.KHACH_HANG
  66 |                     && !customer.getTaiKhoan().getId().equals(account.getId())) throw new SecurityException("Customer mismatch");
  67 |             BaoGia quote = new BaoGiaDAO(em).find(request.maBaoGia());
  68 |             if (quote == null) throw new NoSuchElementException("Quote not found");
  69 |             if (!customerId.equals(quote.getMaKh())) throw new SecurityException("Quote owner mismatch");
```

Đọc khách, báo lỗi nếu không có. Nếu người gọi là khách, đối chiếu tài khoản gắn hồ sơ. Đọc báo giá, kiểm tra tồn tại và maKh báo giá đúng khách. Đây là kiểm tra quyền trên dữ liệu, ngoài kiểm tra role ở filter.

### Dòng 70–71

```text
  70 |             Instant now = clock.instant();
  71 |             if (!now.isBefore(quote.getHetHanLuc())) throw new Conflict("QUOTE_EXPIRED");
```

now từ clock. !now.isBefore(expiry) nghĩa now≥expiry: đúng mốc hết hạn cũng bị chặn QUOTE_EXPIRED.

### Dòng 72–79

```text
  72 |             var frozen = JSON.readValue(quote.getYeuCauJson(), QuoteService.FrozenRequest.class);
  73 |             if (!customerId.equals(frozen.maKh())
  74 |                     || !request.kienHang().equals(frozen.kienHang())
  75 |                     || !request.diemLayHang().equals(frozen.diaChiNhapLay())
  76 |                     || !request.diemGiaoHang().equals(frozen.diaChiNhapGiao())
  77 |                     || !request.benThanhToan().equals(frozen.benThanhToan())
  78 |                     || !request.phuongThucThanhToan().equals(frozen.phuongThucThanhToan()))
  79 |                 throw new Conflict("QUOTE_CHANGED");
```

Giải mã FrozenRequest từ báo giá. So khách, danh sách kiện, hai địa chỉ nhập đã chuẩn hóa, bên trả, phương thức. Sai bất cứ trường nào ném QUOTE_CHANGED. Tên/SĐT người nhận không thuộc FrozenRequest này; chúng vẫn được normalize/validate riêng.

### Dòng 80–83

```text
  80 |             Route route = frozen.loTrinh();
  81 |             if (route == null) throw new Conflict("QUOTE_CHANGED");
  82 |             var old = JSON.readValue(quote.getKetQuaJson(), Quote.class);
  83 |             var evaluated = quotes.evaluateV1(em, customerId, route, request.kienHang(), now);
```

Lấy route từ FrozenRequest; thiếu thì báo thay đổi. Đọc Quote kết quả cũ. Gọi quotes.evaluateV1 bằng EntityManager ĐANG CÓ và route đã chốt, không mở transaction lồng và không gọi lại routes.estimate.

### Dòng 84–86

```text
  84 |             if (!quote.getMaBieuPhi().equals(evaluated.tariff().getId())
  85 |                     || !old.cuoc().equals(evaluated.fare()) || !Objects.equals(old.hangThanhVien(), evaluated.tier()))
  86 |                 throw new Conflict("QUOTE_CHANGED");
```

So ID biểu phí, toàn bộ Fare record và MembershipView với báo giá cũ. Nếu khác thì QUOTE_CHANGED, không tự tăng giá âm thầm. Objects.equals xử lý được hai giá trị hạng có thể null.

### Dòng 87

```text
  87 | 
```



### Dòng 88–91

```text
  88 |             DonHang order = new DonHang();
  89 |             order.setId(UUID.randomUUID().toString()); order.setKhachHang(customer);
  90 |             order.setTaiKhoanTao(account);
  91 |             order.setThoiGianTao(now); order.setTrangThai(OrderStatus.CHO_GAN);
```

Tạo entity trong bộ nhớ. Sinh UUID mã đơn; gắn khách và tài khoản tạo riêng biệt; lưu thời điểm, trạng thái CHO_GAN; dùng hai địa chỉ chuẩn của route.

### Dòng 92–96

```text
  92 |             order.setDiemLayHang(route.diemLayHang()); order.setDiemGiaoHang(route.diemGiaoHang());
  93 |             order.setSdtNguoiNhan(request.sdtNguoiNhan()); order.setQuangDuongKm(new BigDecimal(route.quangDuongKm()));
  94 |             order.setTenNguoiNhan(request.tenNguoiNhan());
  95 |             order.setBenThanhToan(request.benThanhToan());
  96 |             order.setPhuongThucThanhToan(request.phuongThucThanhToan());
```

Gắn SĐT người nhận và km BigDecimal; tên người nhận; bên trả cước; phương thức. Chưa tạo giao dịch thu tiền ở đây.

### Dòng 97–101

```text
  97 |             if (route.thoiGianDuKienGiay() <= 0 || route.thoiGianDuKienGiay() > Integer.MAX_VALUE)
  98 |                 throw new IllegalArgumentException("Invalid route duration");
  99 |             order.setThoiGianDuKienGiay((int) route.thoiGianDuKienGiay());
 100 |             order.setNguonLoTrinh(RouteSource.valueOf(route.nguon()));
 101 |             order.setGhiChuGiaoHang(request.ghiChuGiaoHang());
```

Giây phải dương và vừa int trước khi ép kiểu. RouteSource.valueOf chuyển chuỗi nguồn thành enum FAKE/GOONG; ghi ghi chú giao hàng.

### Dòng 102–110

```text
 102 |             var fare = evaluated.fare();
 103 |             CuocDonHang priced = new CuocDonHang();
 104 |             priced.setBieuPhi(evaluated.tariff());
 105 |             priced.setChinhSachGiam(evaluated.discountPolicy());
 106 |             priced.setCuocGoc(new BigDecimal(fare.cuocGoc()));
 107 |             priced.setCuocKm(new BigDecimal(fare.cuocKm()));
 108 |             priced.setCuocKhoiLuong(new BigDecimal(fare.cuocKhoiLuong()));
 109 |             priced.setTongKhoiLuongKg(new BigDecimal(fare.tongKhoiLuongKg()));
 110 |             priced.setPhienBanBieuPhi(fare.phienBanBieuPhi());
```

Lấy Fare vừa đánh giá. Tạo CuocDonHang: tham chiếu biểu phí và policy giảm (có thể null); lưu cước gốc, cước km, cước kg, tổng kg, phiên bản, số tiền giảm. Chưa gắn đơn tại đây; DAO gắn bằng setDonHang.

### Dòng 111–119

```text
 111 |             priced.setTienGiamGia(new BigDecimal(fare.tienGiamGia()));
 112 |             List<KienHang> parcels = new ArrayList<>();
 113 |             for (int i = 0; i < request.kienHang().size(); i++) {
 114 |                 var item = request.kienHang().get(i);
 115 |                 KienHang parcel = new KienHang();
 116 |                 parcel.setId(UUID.randomUUID().toString()); parcel.setThuTu(i + 1);
 117 |                 parcel.setLoaiHangHoa(item.loaiHangHoa());
 118 |                 parcel.setKhoiLuongKg(new BigDecimal(item.khoiLuongKg()));
 119 |                 parcel.setGhiChuBaoQuan(item.ghiChuBaoQuan()); parcels.add(parcel);
```

Tạo ArrayList kiện; với mỗi phần tử: sinh UUID, thứ tự i+1, gán loại hàng, chuyển chuỗi kg sang BigDecimal, gán ghi chú, thêm vào danh sách. Chưa persist bên trong vòng này.

### Dòng 120–124

```text
 120 |             }
 121 |             List<PhuThuDonHang> extras = evaluated.extras().stream().map(policy -> {
 122 |                 PhuThuDonHang extra = new PhuThuDonHang();
 123 |                 extra.setChinhSachPhuThu(policy); return extra;
 124 |             }).toList();
```

stream.map biến mỗi chính sách phụ thu thành PhuThuDonHang liên kết policy. toList gom kết quả. Chưa có khóa ghép; DonHangDAO sẽ tạo từ mã đơn và mã policy.

### Dòng 125–128

```text
 125 |             SuKienDonHang event = new SuKienDonHang(); event.setId(UUID.randomUUID().toString());
 126 |             event.setThuTu(1); event.setLoaiSuKien(OrderEventType.TAO_DON);
 127 |             event.setTrangThaiSau(OrderStatus.CHO_GAN); event.setThoiGian(now);
 128 |             event.setTaiKhoanThucHien(account);
```

Tạo sự kiện đầu tiên: UUID, thuTu=1, loại TAO_DON, trạng thái sau=CHO_GAN, mốc now và tài khoản thực hiện. Cùng thời điểm với tạo đơn nhưng thứ tự là trường riêng.

### Dòng 129

```text
 129 |             new DonHangDAO(em).persistAggregateV1(order, priced, parcels, extras, event);
```

Gọi DonHangDAO.persistAggregateV1 để đăng ký lưu đơn, cước, kiện, liên kết phụ thu, nhật ký bằng cùng EntityManager.

### Dòng 130–134

```text
 130 |             Order result = new Order(order.getId(), now.toString(), order.getDiemLayHang(), order.getDiemGiaoHang(),
 131 |                     order.getSdtNguoiNhan(), route.quangDuongKm(), order.getGhiChuGiaoHang(), "CHO_GAN",
 132 |                     customerId, null, account.getId(), fare, request.kienHang(),
 133 |                     new PaymentSummary(new BigDecimal(fare.tongCuoc()).signum() == 0 ? "MIEN_CUOC" : "CHUA_THANH_TOAN", fare.tongCuoc()),
 134 |                     null, null, request.tenNguoiNhan(), request.benThanhToan(), request.phuongThucThanhToan(), route.nguon());
```

Tạo Response DTO từ dữ liệu đã chốt. maTx=null vì chưa phân công. Tổng cước=0 thì MIEN_CUOC, còn lại CHUA_THANH_TOAN; số còn thu bằng tổng. Hai thời điểm hoàn tất/hủy null. DTO không phải entity và không có tác dụng thu tiền.

### Dòng 135–139

```text
 135 |             if (saved == null) { saved = new YeuCauTaoDon(); saved.setRequestId(requestId); }
 136 |             saved.setTaiKhoan(account); saved.setDonHang(order); saved.setRequestJson(requestJson);
 137 |             saved.setResponseJson(JSON.writeValueAsString(result)); saved.setExpiresAt(now.plusSeconds(86400));
 138 |             if (!em.contains(saved)) requests.persist(saved);
 139 |             return result;
```

Nếu chưa có bản ghi key thì tạo mới; nếu bản cũ hết TTL có thể cập nhật entity đã quản lý. Lưu actor, đơn, request JSON, response JSON, hết hạn now+86400 giây (24h). em.contains kiểm tra entity đang managed; nếu chưa thì persist. Trả result cho TransactionRunner, nơi flush/commit.

### Dòng 140–142

```text
 140 |         });
 141 |     }
 142 | 
```

- D140: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.
- D141: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 143–147

```text
 143 |     private Order replay(YeuCauTaoDon saved, String requestJson) {
 144 |         if (saved == null || !clock.instant().isBefore(saved.getExpiresAt())) return null;
 145 |         if (!saved.getRequestJson().equals(requestJson)) throw new Conflict("IDEMPOTENCY_CONFLICT");
 146 |         return JSON.readValue(saved.getResponseJson(), Order.class);
 147 |     }
```

replay: không có bản ghi hoặc hết 24h trả null; payload khác ném IDEMPOTENCY_CONFLICT; giống thì giải mã response cũ. Replay trả snapshot phản hồi lúc tạo, không đảm bảo là trạng thái đơn mới nhất sau các bước giao hàng.

### Dòng 148–153

```text
 148 |     private static CreateOrder normalize(CreateOrder input, String customerId) {
 149 |         if (input == null || customerId == null || customerId.isBlank() || customerId.length() > 36
 150 |                 || input.maBaoGia() == null || input.maBaoGia().isBlank() || input.maBaoGia().length() > 36)
 151 |             throw new IllegalArgumentException("Customer and quote required");
 152 |         String phone = AuthService.normalizePhone(input.sdtNguoiNhan());
 153 |         if (phone == null) throw new IllegalArgumentException("Invalid recipient phone");
```

normalize bắt buộc input/customerId/maBaoGia và giới hạn ID 36. Gọi AuthService.normalizePhone; nếu không chuẩn hóa thành SĐT hợp lệ thì báo lỗi.

### Dòng 154–158

```text
 154 |         String note = input.ghiChuGiaoHang() == null ? null : input.ghiChuGiaoHang().strip();
 155 |         if (note != null && note.length() > 500) throw new IllegalArgumentException("Delivery note too long");
 156 |         String recipient = input.tenNguoiNhan() == null ? null : input.tenNguoiNhan().strip();
 157 |         if (recipient != null && (recipient.isEmpty() || recipient.length() > 100))
 158 |             throw new IllegalArgumentException("Invalid recipient name");
```

Ghi chú được strip, giới hạn 500. Tên người nhận được strip, nếu có thì không rỗng và ≤100. Backend đoạn này cho tên null, trong khi giao diện yêu cầu tên; không nói hai lớp có kiểm tra hoàn toàn giống nhau.

### Dòng 159–162

```text
 159 |         String payer = QuoteService.choice(input.benThanhToan(), "NGUOI_DAT", "NGUOI_NHAN");
 160 |         String method = QuoteService.choice(input.phuongThucThanhToan(), "TIEN_MAT", "VNPAY_QR");
 161 |         return new CreateOrder(input.maBaoGia(), customerId, address(input.diemLayHang()), address(input.diemGiaoHang()),
 162 |                 phone, note, QuoteService.normalizeParcels(input.kienHang()), recipient, payer, method);
```

Kiểm tra hai lựa chọn thanh toán qua QuoteService.choice. Tạo DTO chuẩn dùng địa chỉ đã normalize và kiện đã normalize. Mục tiêu là kiểm tra và so payload trên biểu diễn ổn định, không sửa entity đầu vào.

### Dòng 163

```text
 163 |     }
```

- D163: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 164–169

```text
 164 |     private static String address(String value) {
 165 |         if (value == null) throw new IllegalArgumentException("Address required");
 166 |         String result = value.strip().replaceAll("\\s+", " ");
 167 |         if (result.isEmpty() || result.length() > 255) throw new IllegalArgumentException("Invalid address");
 168 |         return result;
 169 |     }
```

address bắt buộc khác null; strip/gộp khoảng trắng; rỗng hoặc dài >255 thì lỗi; trả chuỗi chuẩn.

### Dòng 170–173

```text
 170 |     private static String digest(String value) {
 171 |         try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
 172 |         catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
 173 |     }
```

digest dùng SHA-256 trên UTF-8 rồi chuyển byte sang hex. Đây là mã định danh chống lặp, không phải băm mật khẩu hay chữ ký thanh toán. Thuật toán không có thì chuyển thành IllegalStateException.

### Dòng 174

```text
 174 | 
```



### Dòng 175–177

```text
 175 |     public static final class Conflict extends RuntimeException {
 176 |         public Conflict(String code) { super(code); }
 177 |     }
```

Conflict mang mã lỗi trong message; OrderServlet bắt và trả HTTP 409 cùng mã QUOTE_CHANGED, QUOTE_EXPIRED hoặc IDEMPOTENCY_CONFLICT.

### Dòng 178

```text
 178 | }
```

- D178: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## service/TransactionRunner.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/service/TransactionRunner.java) · 35 dòng.

**Ai gọi:** QuoteService, OrderService và các service khác gọi run với lambda em -> {...}.

**Gọi đến ai:** EntityManagerFactory.createEntityManager; EntityTransaction.begin/commit/rollback; work.apply.

### Dòng 1–8

```text
   1 | package com.miniongvang.service;
   2 | 
   3 | import jakarta.persistence.EntityManager;
   4 | import jakarta.persistence.EntityManagerFactory;
   5 | import jakarta.persistence.EntityTransaction;
   6 | import java.util.function.Function;
   7 | 
   8 | /** All DAOs participating in a service operation receive this same EntityManager. */
```

- D1: Đặt lớp trong namespace `com.miniongvang.service`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `jakarta.persistence.EntityManagerFactory` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.EntityTransaction` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `java.util.function.Function` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Chú thích của tác giả; không được thực thi. Dùng phần giải thích mã thực thi để hiểu chính xác hành vi.

### Dòng 9–13

```text
   9 | public final class TransactionRunner {
  10 |     private final EntityManagerFactory factory;
  11 |     private static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);
  12 | 
  13 |     public TransactionRunner(EntityManagerFactory factory) { this.factory = factory; }
```

Giữ factory tạo EntityManager. ThreadLocal ACTIVE đánh dấu theo từng thread, không dùng chung một cờ cho tất cả request. Constructor chỉ giữ factory.

### Dòng 14

```text
  14 | 
```



### Dòng 15–17

```text
  15 |     public <T> T run(Function<EntityManager, T> work) {
  16 |         if (ACTIVE.get()) throw new IllegalStateException("Nested independent transactions are not supported");
  17 |         ACTIVE.set(true);
```

<T> cho phép giao dịch trả loại tùy ý (Quote, Order...). Function nhận em và trả T. Nếu thread đã ở một run khác thì báo lỗi transaction độc lập lồng nhau; đánh dấu active trước khi tạo em.

### Dòng 18–20

```text
  18 |         try (EntityManager em = factory.createEntityManager()) {
  19 |             EntityTransaction tx = em.getTransaction();
  20 |             tx.begin();
```

try-with-resources tự đóng EntityManager khi kết thúc. Lấy transaction rồi begin. Mọi DAO trong work dùng cùng em để cùng giao dịch.

### Dòng 21–25

```text
  21 |             try {
  22 |                 T result = work.apply(em);
  23 |                 em.flush();
  24 |                 tx.commit();
  25 |                 return result;
```

work.apply thực thi lambda nghiệp vụ. flush đồng bộ thay đổi với DB và có thể làm constraint/trigger báo lỗi; flush CHƯA phải commit. commit xác nhận giao dịch; chỉ sau đó return result.

### Dòng 26–30

```text
  26 |             } catch (RuntimeException | Error failure) {
  27 |                 try { if (tx.isActive()) tx.rollback(); }
  28 |                 catch (RuntimeException rollbackFailure) { failure.addSuppressed(rollbackFailure); }
  29 |                 throw failure;
  30 |             }
```

Nếu RuntimeException hoặc Error: thử rollback khi còn active. Nếu rollback cũng lỗi, gắn lỗi phụ bằng addSuppressed để không che lỗi gốc; ném lỗi gốc cho servlet xử lý.

### Dòng 31–33

```text
  31 |         } finally {
  32 |             ACTIVE.remove();
  33 |         }
```

finally luôn dọn ThreadLocal, kể cả khi tạo EntityManager hoặc xử lý thất bại, tránh request tiếp theo dùng lại thread bị hiểu nhầm đang có transaction.

### Dòng 34–35

```text
  34 |     }
  35 | }
```

- D34: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.
- D35: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.


