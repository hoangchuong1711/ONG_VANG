# Luồng 2 — DAO, truy vấn và ánh xạ CSDL

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## dao/BaseDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/BaseDAO.java) · 17 dòng.

**Ai gọi:** Các DAO con gọi super; service gọi find/persist kế thừa.

**Gọi đến ai:** EntityManager.find và persist.

### Dòng 1–4

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import jakarta.persistence.EntityManager;
   4 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 5–12

```text
   5 | /** A DAO never owns a transaction or EntityManager. */
   6 | public abstract class BaseDAO<T> {
   7 |     protected final EntityManager em;
   8 |     private final Class<T> type;
   9 | 
  10 |     protected BaseDAO(EntityManager em, Class<T> type) {
  11 |         this.em = em;
  12 |         this.type = type;
```

BaseDAO<T> là lớp abstract generic. T là loại entity của DAO con. em được service truyền vào; type là Class<T> dùng cho find. protected em để lớp con truy vấn; constructor không mở transaction.

### Dòng 13–14

```text
  13 |     }
  14 | 
```

- D13: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 15–16

```text
  15 |     public T find(String id) { return em.find(type, id); }
  16 |     public T persist(T entity) { em.persist(entity); return entity; }
```

find(id) gọi em.find(type,id): trả entity hoặc null. persist đăng ký entity mới với persistence context rồi trả entity. Việc SQL thực sự chạy/commit phụ thuộc flush và TransactionRunner, không phải persist tự commit.

### Dòng 17

```text
  17 | }
```

- D17: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## dao/BaoGiaDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/BaoGiaDAO.java) · 8 dòng.

**Ai gọi:** QuoteService.persist báo giá; OrderService.find báo giá.

**Gọi đến ai:** Kế thừa BaseDAO<BaoGia>.

### Dòng 1–5

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import com.miniongvang.entity.BaoGia;
   4 | import jakarta.persistence.EntityManager;
   5 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.BaoGia` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 6–8

```text
   6 | public final class BaoGiaDAO extends BaseDAO<BaoGia> {
   7 |     public BaoGiaDAO(EntityManager em) { super(em, BaoGia.class); }
   8 | }
```

DAO chuyên cho BaoGia. Constructor gọi super(em,BaoGia.class), do đó find truy vấn BaoGia và persist lưu BaoGia. Không có method riêng vì CRUD cơ bản đủ cho hai thao tác hiện tại.



## dao/YeuCauTaoDonDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/YeuCauTaoDonDAO.java) · 11 dòng.

**Ai gọi:** OrderService.create gọi find, lockActor, persist.

**Gọi đến ai:** BaseDAO và EntityManager.find(TaiKhoan,...,PESSIMISTIC_WRITE).

### Dòng 1–7

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import com.miniongvang.entity.TaiKhoan;
   4 | import com.miniongvang.entity.YeuCauTaoDon;
   5 | import jakarta.persistence.EntityManager;
   6 | import jakarta.persistence.LockModeType;
   7 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.TaiKhoan` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.YeuCauTaoDon` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `jakarta.persistence.LockModeType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 8–11

```text
   8 | public final class YeuCauTaoDonDAO extends BaseDAO<YeuCauTaoDon> {
   9 |     public YeuCauTaoDonDAO(EntityManager em) { super(em, YeuCauTaoDon.class); }
  10 |     public TaiKhoan lockActor(String id) { return em.find(TaiKhoan.class, id, LockModeType.PESSIMISTIC_WRITE); }
  11 | }
```

DAO quản lý YeuCauTaoDon; find/persist kế thừa. lockActor khóa ghi bi quan hàng TaiKhoan theo ID trong giao dịch hiện tại; hai request cùng actor phải chờ nhau ở điểm khóa. Service đọc lại key sau khóa để ngăn cả hai cùng ghi đơn.



## dao/DonHangDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/DonHangDAO.java) · 70 dòng.

**Ai gọi:** OrderService gọi persistAggregateV1; phần đọc đơn có thể dùng các hàm truy vấn khác.

**Gọi đến ai:** BaseDAO; EntityManager.persist/find/createQuery; không tự begin/commit.

### Dòng 1–15

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import java.time.Instant;
   4 | import java.util.List;
   5 | 
   6 | import com.miniongvang.entity.DonHang;
   7 | import com.miniongvang.entity.PhuThuDonHang;
   8 | import com.miniongvang.entity.PhuThuDonHangId;
   9 | import com.miniongvang.entity.CuocDonHang;
  10 | import com.miniongvang.entity.KienHang;
  11 | import com.miniongvang.entity.SuKienDonHang;
  12 | 
  13 | import jakarta.persistence.EntityManager;
  14 | import jakarta.persistence.LockModeType;
  15 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `com.miniongvang.entity.DonHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `com.miniongvang.entity.PhuThuDonHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `com.miniongvang.entity.PhuThuDonHangId` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `com.miniongvang.entity.CuocDonHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `com.miniongvang.entity.KienHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `com.miniongvang.entity.SuKienDonHang` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `jakarta.persistence.LockModeType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 16–19

```text
  16 | public final class DonHangDAO extends BaseDAO<DonHang> {
  17 |     public DonHangDAO(EntityManager em) { super(em, DonHang.class); }
  18 | 
  19 |     public DonHang findForUpdate(String id) { return em.find(DonHang.class, id, LockModeType.PESSIMISTIC_WRITE); }
```

DAO cụ thể DonHang, nhận em từ service. findForUpdate đọc đơn kèm khóa ghi; đây là tiện ích cho thao tác cập nhật, không được gọi trong create đang xét.

### Dòng 20

```text
  20 | 
```



### Dòng 21–26

```text
  21 |     public void persistAggregateV1(DonHang order, CuocDonHang fare,
  22 |                                    List<KienHang> parcels, List<PhuThuDonHang> surcharges,
  23 |                                    SuKienDonHang firstEvent) {
  24 |         if (order == null || fare == null || parcels == null || parcels.isEmpty()
  25 |                 || surcharges == null || firstEvent == null || firstEvent.getThuTu() != 1)
  26 |             throw new IllegalArgumentException("Order, fare, parcels and creation event are required");
```

persistAggregateV1 nhận đơn, cước, list kiện, list phụ thu, sự kiện đầu. Chặn null, kiện rỗng, sự kiện không có thứ tự1; không tính lại cước tại DAO.

### Dòng 27–29

```text
  27 |         em.persist(order);
  28 |         fare.setDonHang(order);
  29 |         em.persist(fare);
```

Persist đơn trước; gắn fare vào đơn; persist fare. CuocDonHang dùng @MapsId nên khóa cước theo khóa đơn.

### Dòng 30–33

```text
  30 |         for (KienHang parcel : parcels) {
  31 |             parcel.setDonHang(order);
  32 |             em.persist(parcel);
  33 |         }
```

Mỗi kiện được gắn order rồi persist. Khi commit, FK ma_don trỏ cùng đơn.

### Dòng 34–38

```text
  34 |         for (PhuThuDonHang surcharge : surcharges) {
  35 |             surcharge.setDonHang(order);
  36 |             surcharge.setId(new PhuThuDonHangId(order.getId(), surcharge.getChinhSachPhuThu().getId()));
  37 |             em.persist(surcharge);
  38 |         }
```

Mỗi liên kết phụ thu gắn đơn, tạo khóa ghép (mã đơn,mã chính sách phụ thu), rồi persist; tránh coi phụ thu là chuỗi JSON không có quan hệ.

### Dòng 39–41

```text
  39 |         firstEvent.setDonHang(order);
  40 |         em.persist(firstEvent);
  41 |     }
```

Gắn và persist sự kiện tạo đơn. Tất cả ở cùng EntityManager; một constraint lỗi khiến TransactionRunner rollback toàn bộ.

### Dòng 42

```text
  42 | 
```



### Dòng 43–53

```text
  43 |     public DetailsV1 findDetailsV1(String id) {
  44 |         DonHang order = find(id);
  45 |         if (order == null) return null;
  46 |         return new DetailsV1(order, em.find(CuocDonHang.class, id),
  47 |                 em.createQuery("from KienHang k where k.donHang.id=:id order by k.thuTu", KienHang.class)
  48 |                         .setParameter("id", id).getResultList(),
  49 |                 em.createQuery("from PhuThuDonHang p where p.donHang.id=:id order by p.id.maPhuThu", PhuThuDonHang.class)
  50 |                         .setParameter("id", id).getResultList(),
  51 |                 em.createQuery("from SuKienDonHang e where e.donHang.id=:id order by e.thuTu", SuKienDonHang.class)
  52 |                         .setParameter("id", id).getResultList());
  53 |     }
```

findDetailsV1 đọc đơn; không có trả null. Có thì đọc cước bằng cùng ID, kiện theo thứ tự, phụ thu theo mã, sự kiện theo thứ tự. Các câu là JPQL theo tên entity/thuộc tính, không phải SQL tên bảng trực tiếp.

### Dòng 54

```text
  54 | 
```



### Dòng 55–56

```text
  55 |     public record DetailsV1(DonHang order, CuocDonHang fare, List<KienHang> parcels,
  56 |                             List<PhuThuDonHang> surcharges, List<SuKienDonHang> events) {}
```

DetailsV1 gộp entity đọc được; đây là kết quả nội bộ DAO, không phải mặc nhiên API JSON.

### Dòng 57

```text
  57 | 
```



### Dòng 58–68

```text
  58 |     public List<DonHang> findByCustomer(String customerId, Instant from, Instant to, int page, int size) {
  59 |         if (page < 0 || size < 1 || size > 100 || from == null || to == null || !from.isBefore(to))
  60 |             throw new IllegalArgumentException("Invalid page, size or date range");
  61 |         return em.createQuery("""
  62 |             select d from DonHang d where d.khachHang.id = :id
  63 |               and d.thoiGianTao >= :from and d.thoiGianTao < :to
  64 |             order by d.thoiGianTao desc, d.id asc
  65 |             """, DonHang.class).setParameter("id", customerId)
  66 |                 .setParameter("from", from).setParameter("to", to)
  67 |                 .setFirstResult(Math.multiplyExact(page, size)).setMaxResults(size).getResultList();
  68 |     }
```

findByCustomer kiểm tra page≥0,size1–100,khoảng ngày hợp lệ. JPQL lọc khách và [from,to), sắp tạo mới nhất rồi ID để ổn định phân trang. setParameter bind giá trị. offset=page×size với multiplyExact phát hiện tràn; limit=size.

### Dòng 69–70

```text
  69 | 
  70 | }
```

- D70: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.



## dao/BieuPhiDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/BieuPhiDAO.java) · 32 dòng.

**Ai gọi:** QuoteService.evaluateV1

**Gọi đến ai:** EntityManager.createQuery → setParameter → getResultList.

### Dòng 1–9

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import com.miniongvang.entity.BieuPhi;
   4 | import com.miniongvang.entity.enums.PolicyStatus;
   5 | import jakarta.persistence.EntityManager;
   6 | import java.math.BigDecimal;
   7 | import java.time.Instant;
   8 | import java.util.List;
   9 | import java.util.Objects;
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.BieuPhi` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.enums.PolicyStatus` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.util.Objects` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 10–32

```text
  10 | 
  11 | public final class BieuPhiDAO extends BaseDAO<BieuPhi> {
  12 |     public BieuPhiDAO(EntityManager em) { super(em, BieuPhi.class); }
  13 | 
  14 |     /** Caller must reject zero or multiple matches as a configuration error. */
  15 |     public List<BieuPhi> findApplicable(Instant at, BigDecimal km) {
  16 |         Objects.requireNonNull(at, "at");
  17 |         Objects.requireNonNull(km, "km");
  18 |         return em.createQuery("""
  19 |                 select b from BieuPhi b
  20 |                 where b.trangThai = :published
  21 |                   and b.hieuLucTu <= :at
  22 |                   and (b.hieuLucDen is null or b.hieuLucDen > :at)
  23 |                   and b.kmToiThieu <= :km
  24 |                   and (b.kmToiDa is null or b.kmToiDa >= :km)
  25 |                 order by b.hieuLucTu desc, b.id
  26 |                 """, BieuPhi.class)
  27 |                 .setParameter("published", PolicyStatus.CONG_BO)
  28 |                 .setParameter("at", at)
  29 |                 .setParameter("km", km)
  30 |                 .getResultList();
  31 |     }
  32 | }
```

Chọn biểu phí CONG_BO, bắt đầu≤at, kết thúc null hoặc >at; km tối thiểu≤km, tối đa null hoặc≥km. Sắp thời gian giảm dần rồi ID; trả toàn bộ kết quả để service phát hiện 0 hoặc nhiều biểu phí. Constructor truyền entity type vào BaseDAO. requireNonNull chặn tham số bắt buộc. createQuery tạo JPQL; các :tên là placeholder; setParameter gán giá trị có kiểu, không nối dữ liệu người dùng vào câu truy vấn. getResultList thực thi và trả các entity. DAO không tự quyết định khoản giảm/tổng cước.



## dao/ChinhSachPhuThuDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/ChinhSachPhuThuDAO.java) · 27 dòng.

**Ai gọi:** QuoteService.evaluateV1

**Gọi đến ai:** EntityManager.createQuery → setParameter → getResultList.

### Dòng 1–9

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import com.miniongvang.entity.ChinhSachPhuThu;
   4 | import com.miniongvang.entity.enums.PolicyStatus;
   5 | import jakarta.persistence.EntityManager;
   6 | import java.time.Instant;
   7 | import java.util.List;
   8 | import java.util.Objects;
   9 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachPhuThu` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.enums.PolicyStatus` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.util.Objects` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 10–27

```text
  10 | public final class ChinhSachPhuThuDAO extends BaseDAO<ChinhSachPhuThu> {
  11 |     public ChinhSachPhuThuDAO(EntityManager em) { super(em, ChinhSachPhuThu.class); }
  12 | 
  13 |     /** Caller must reject duplicate active versions of the same surcharge type. */
  14 |     public List<ChinhSachPhuThu> findApplicable(Instant at) {
  15 |         Objects.requireNonNull(at, "at");
  16 |         return em.createQuery("""
  17 |                 select p from ChinhSachPhuThu p
  18 |                 where p.trangThai = :published
  19 |                   and p.hieuLucTu <= :at
  20 |                   and (p.hieuLucDen is null or p.hieuLucDen > :at)
  21 |                 order by p.maLoaiPhuThu, p.hieuLucTu desc, p.id
  22 |                 """, ChinhSachPhuThu.class)
  23 |                 .setParameter("published", PolicyStatus.CONG_BO)
  24 |                 .setParameter("at", at)
  25 |                 .getResultList();
  26 |     }
  27 | }
```

Chọn phụ thu CONG_BO trong [hieuLucTu,hieuLucDen), sắp mã loại/thời gian/ID. Trả danh sách nhiều loại; QuoteService kiểm tra không có hai phiên bản cùng mã loại. Constructor truyền entity type vào BaseDAO. requireNonNull chặn tham số bắt buộc. createQuery tạo JPQL; các :tên là placeholder; setParameter gán giá trị có kiểu, không nối dữ liệu người dùng vào câu truy vấn. getResultList thực thi và trả các entity. DAO không tự quyết định khoản giảm/tổng cước.



## dao/ChinhSachThanhVienDAO.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/dao/ChinhSachThanhVienDAO.java) · 30 dòng.

**Ai gọi:** MembershipPolicyService.evaluate

**Gọi đến ai:** EntityManager.createQuery → setParameter → getResultList.

### Dòng 1–9

```text
   1 | package com.miniongvang.dao;
   2 | 
   3 | import com.miniongvang.entity.ChinhSachThanhVien;
   4 | import com.miniongvang.entity.enums.MembershipTier;
   5 | import com.miniongvang.entity.enums.PolicyStatus;
   6 | import jakarta.persistence.EntityManager;
   7 | import java.time.Instant;
   8 | import java.util.List;
   9 | import java.util.Objects;
```

- D1: Đặt lớp trong namespace `com.miniongvang.dao`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.ChinhSachThanhVien` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.enums.MembershipTier` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `com.miniongvang.entity.enums.PolicyStatus` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `jakarta.persistence.EntityManager` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `java.util.List` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `java.util.Objects` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 10–30

```text
  10 | 
  11 | public final class ChinhSachThanhVienDAO extends BaseDAO<ChinhSachThanhVien> {
  12 |     public ChinhSachThanhVienDAO(EntityManager em) { super(em, ChinhSachThanhVien.class); }
  13 | 
  14 |     /** More than one published result is an overlap error, never a reason to pick the first row. */
  15 |     public List<ChinhSachThanhVien> findApplicable(MembershipTier tier, Instant at) {
  16 |         Objects.requireNonNull(tier, "tier");
  17 |         Objects.requireNonNull(at, "at");
  18 |         return em.createQuery("""
  19 |                 select p from ChinhSachThanhVien p
  20 |                 where p.hang = :tier and p.trangThai = :published
  21 |                   and p.hieuLucTu <= :at
  22 |                   and (p.hieuLucDen is null or p.hieuLucDen > :at)
  23 |                 order by p.hieuLucTu desc, p.id
  24 |                 """, ChinhSachThanhVien.class)
  25 |                 .setParameter("tier", tier)
  26 |                 .setParameter("published", PolicyStatus.CONG_BO)
  27 |                 .setParameter("at", at)
  28 |                 .getResultList();
  29 |     }
  30 | }
```

Chọn đúng hạng, CONG_BO, trong cửa sổ thời gian [từ,đến). Trả danh sách để service phân biệt không có/đúng một/chồng lấn. Constructor truyền entity type vào BaseDAO. requireNonNull chặn tham số bắt buộc. createQuery tạo JPQL; các :tên là placeholder; setParameter gán giá trị có kiểu, không nối dữ liệu người dùng vào câu truy vấn. getResultList thực thi và trả các entity. DAO không tự quyết định khoản giảm/tổng cước.



## entity/DonHang.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/entity/DonHang.java) · 98 dòng.

**Ai gọi:** OrderService tạo và set dữ liệu; DonHangDAO persist; Hibernate dựng lại khi đọc; nhiều service vận hành đọc/cập nhật đơn.

**Gọi đến ai:** Entity không chủ động gọi DAO/service; setter chỉ gán field trong Java.

### Dòng 1–16

```text
   1 | package com.miniongvang.entity;
   2 | 
   3 | import com.miniongvang.entity.enums.OrderStatus;
   4 | import com.miniongvang.entity.enums.RouteSource;
   5 | import jakarta.persistence.Column;
   6 | import jakarta.persistence.Entity;
   7 | import jakarta.persistence.EnumType;
   8 | import jakarta.persistence.Enumerated;
   9 | import jakarta.persistence.FetchType;
  10 | import jakarta.persistence.Id;
  11 | import jakarta.persistence.JoinColumn;
  12 | import jakarta.persistence.ManyToOne;
  13 | import jakarta.persistence.Table;
  14 | import java.math.BigDecimal;
  15 | import java.time.Instant;
  16 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.entity`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `com.miniongvang.entity.enums.OrderStatus` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `com.miniongvang.entity.enums.RouteSource` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.Column` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `jakarta.persistence.Entity` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `jakarta.persistence.EnumType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `jakarta.persistence.Enumerated` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `jakarta.persistence.FetchType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `jakarta.persistence.Id` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `jakarta.persistence.JoinColumn` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `jakarta.persistence.ManyToOne` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D13: Cho phép dùng tên từ `jakarta.persistence.Table` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D14: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D15: Cho phép dùng tên từ `java.time.Instant` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 17–27

```text
  17 | @Entity
  18 | @Table(name = "don_hang")
  19 | public class DonHang {
  20 |     @Id @Column(name = "ma_don", nullable = false, length = 36)
  21 |     private String id;
  22 |     @ManyToOne(fetch = FetchType.LAZY, optional = false)
  23 |     @JoinColumn(name = "ma_kh", nullable = false)
  24 |     private KhachHang khachHang;
  25 |     @ManyToOne(fetch = FetchType.LAZY, optional = false)
  26 |     @JoinColumn(name = "ma_tk_tao", nullable = false)
  27 |     private TaiKhoan taiKhoanTao;
```

@Entity đăng ký lớp JPA, @Table ánh xạ don_hang. id ↔ ma_don là PK chuỗi36. khachHang: nhiều đơn thuộc một khách, FK ma_kh, bắt buộc. taiKhoanTao: nhiều đơn do một tài khoản tạo, FK ma_tk_tao. LAZY yêu cầu tải quan hệ khi cần; không có nghĩa luôn phát sinh đúng một truy vấn.

### Dòng 28–43

```text
  28 |     @Column(name = "thoi_gian_tao", nullable = false)
  29 |     private Instant thoiGianTao;
  30 |     @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
  31 |     private OrderStatus trangThai = OrderStatus.CHO_GAN;
  32 |     @Column(name = "diem_lay_hang", nullable = false, length = 255)
  33 |     private String diemLayHang;
  34 |     @Column(name = "diem_giao_hang", nullable = false, length = 255)
  35 |     private String diemGiaoHang;
  36 |     @Column(name = "sdt_nguoi_nhan", nullable = false, length = 10)
  37 |     private String sdtNguoiNhan;
  38 |     @Column(name = "ten_nguoi_nhan", length = 100)
  39 |     private String tenNguoiNhan;
  40 |     @Column(name = "ben_thanh_toan", nullable = false, length = 20)
  41 |     private String benThanhToan = "NGUOI_DAT";
  42 |     @Column(name = "phuong_thuc_thanh_toan", nullable = false, length = 20)
  43 |     private String phuongThucThanhToan = "TIEN_MAT";
```

thoiGianTao là Instant. trangThai lưu tên enum thay vì số thứ tự, mặc định CHO_GAN. Hai địa chỉ bắt buộc ≤255; SĐT người nhận≤10; tên≤100 có thể null. Bên trả mặc định NGUOI_DAT và phương thức TIEN_MAT. nullable=false mô tả mapping, không thay thế kiểm tra đầu vào trong service.

### Dòng 44–57

```text
  44 |     @Column(name = "quang_duong_km", nullable = false, precision = 10, scale = 2)
  45 |     private BigDecimal quangDuongKm;
  46 |     @Column(name = "thoi_gian_du_kien_giay", nullable = false)
  47 |     private int thoiGianDuKienGiay;
  48 |     @Enumerated(EnumType.STRING) @Column(name = "nguon_lo_trinh", nullable = false, length = 40)
  49 |     private RouteSource nguonLoTrinh;
  50 |     @Column(name = "ghi_chu_giao_hang", length = 500)
  51 |     private String ghiChuGiaoHang;
  52 |     @Column(name = "thoi_gian_hoan_tat")
  53 |     private Instant thoiGianHoanTat;
  54 |     @Column(name = "thoi_gian_huy")
  55 |     private Instant thoiGianHuy;
  56 |     @Column(name = "ly_do_huy", length = 500)
  57 |     private String lyDoHuy;
```

Km dùng precision10/scale2; giây dùng int. Nguồn tuyến enum lưu chuỗi. Ghi chú≤500. Thời điểm hoàn tất/hủy và lý do hủy có thể null lúc mới tạo. Không có field tài xế hiện tại ở entity này; phân công quản lý riêng.

### Dòng 58–59

```text
  58 | 
  59 | 
```



### Dòng 60–98

```text
  60 |     public DonHang() {}
  61 |     public String getId() { return id; }
  62 |     public void setId(String value) { id = value; }
  63 |     public KhachHang getKhachHang() { return khachHang; }
  64 |     public void setKhachHang(KhachHang value) { khachHang = value; }
  65 |     public TaiKhoan getTaiKhoanTao() { return taiKhoanTao; }
  66 |     public void setTaiKhoanTao(TaiKhoan value) { taiKhoanTao = value; }
  67 |     public Instant getThoiGianTao() { return thoiGianTao; }
  68 |     public void setThoiGianTao(Instant value) { thoiGianTao = value; }
  69 |     public OrderStatus getTrangThai() { return trangThai; }
  70 |     public void setTrangThai(OrderStatus value) { trangThai = value; }
  71 |     public String getDiemLayHang() { return diemLayHang; }
  72 |     public void setDiemLayHang(String value) { diemLayHang = value; }
  73 |     public String getDiemGiaoHang() { return diemGiaoHang; }
  74 |     public void setDiemGiaoHang(String value) { diemGiaoHang = value; }
  75 |     public String getSdtNguoiNhan() { return sdtNguoiNhan; }
  76 |     public void setSdtNguoiNhan(String value) { sdtNguoiNhan = value; }
  77 |     public String getTenNguoiNhan() { return tenNguoiNhan; }
  78 |     public void setTenNguoiNhan(String value) { tenNguoiNhan = value; }
  79 |     public String getBenThanhToan() { return benThanhToan; }
  80 |     public void setBenThanhToan(String value) { benThanhToan = value; }
  81 |     public String getPhuongThucThanhToan() { return phuongThucThanhToan; }
  82 |     public void setPhuongThucThanhToan(String value) { phuongThucThanhToan = value; }
  83 |     public BigDecimal getQuangDuongKm() { return quangDuongKm; }
  84 |     public void setQuangDuongKm(BigDecimal value) { quangDuongKm = value; }
  85 |     public int getThoiGianDuKienGiay() { return thoiGianDuKienGiay; }
  86 |     public void setThoiGianDuKienGiay(int value) { thoiGianDuKienGiay = value; }
  87 |     public RouteSource getNguonLoTrinh() { return nguonLoTrinh; }
  88 |     public void setNguonLoTrinh(RouteSource value) { nguonLoTrinh = value; }
  89 |     public String getGhiChuGiaoHang() { return ghiChuGiaoHang; }
  90 |     public void setGhiChuGiaoHang(String value) { ghiChuGiaoHang = value; }
  91 |     public Instant getThoiGianHoanTat() { return thoiGianHoanTat; }
  92 |     public void setThoiGianHoanTat(Instant value) { thoiGianHoanTat = value; }
  93 |     public Instant getThoiGianHuy() { return thoiGianHuy; }
  94 |     public void setThoiGianHuy(Instant value) { thoiGianHuy = value; }
  95 |     public String getLyDoHuy() { return lyDoHuy; }
  96 |     public void setLyDoHuy(String value) { lyDoHuy = value; }
  97 | 
  98 | }
```

Constructor rỗng hỗ trợ JPA và code tạo entity. Từng getter trả đúng field tên tương ứng; từng setter gán value vào field đó, không tự validate hay chạy INSERT. Khi entity được quản lý trong transaction, Hibernate theo dõi thay đổi và đồng bộ lúc flush. Khi mới new, setter chỉ sửa đối tượng chưa lưu. Các cặp get/set ở đây bao phủ id, khách, người tạo, thời gian, trạng thái, địa chỉ, người nhận, thanh toán, km/giây/nguồn, ghi chú và hủy/hoàn tất.



## entity/KienHang.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/entity/KienHang.java) · 42 dòng.

**Ai gọi:** OrderService tạo từng kiện; DonHangDAO gắn đơn/persist; Hibernate đọc lại.

**Gọi đến ai:** Không chủ động gọi API; ánh xạ chi_tiet_kien_hang.

### Dòng 1–11

```text
   1 | package com.miniongvang.entity;
   2 | 
   3 | import jakarta.persistence.Column;
   4 | import jakarta.persistence.Entity;
   5 | import jakarta.persistence.FetchType;
   6 | import jakarta.persistence.Id;
   7 | import jakarta.persistence.JoinColumn;
   8 | import jakarta.persistence.ManyToOne;
   9 | import jakarta.persistence.Table;
  10 | import java.math.BigDecimal;
  11 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.entity`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `jakarta.persistence.Column` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `jakarta.persistence.Entity` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.FetchType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `jakarta.persistence.Id` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `jakarta.persistence.JoinColumn` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `jakarta.persistence.ManyToOne` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `jakarta.persistence.Table` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 12–19

```text
  12 | @Entity
  13 | @Table(name = "chi_tiet_kien_hang")
  14 | public class KienHang {
  15 |     @Id @Column(name = "ma_kien", nullable = false, length = 36)
  16 |     private String id;
  17 |     @ManyToOne(fetch = FetchType.LAZY, optional = false)
  18 |     @JoinColumn(name = "ma_don", nullable = false)
  19 |     private DonHang donHang;
```

Entity bảng chi_tiet_kien_hang. PK ma_kien độc lập UUID chuỗi36. ManyToOne DonHang + JoinColumn ma_don tạo quan hệ nhiều kiện thuộc một đơn; bắt buộc và LAZY.

### Dòng 20–27

```text
  20 |     @Column(name = "thu_tu", nullable = false)
  21 |     private int thuTu;
  22 |     @Column(name = "loai_hang_hoa", nullable = false, length = 100)
  23 |     private String loaiHangHoa;
  24 |     @Column(name = "khoi_luong_kg", nullable = false, precision = 10, scale = 2)
  25 |     private BigDecimal khoiLuongKg;
  26 |     @Column(name = "ghi_chu_bao_quan", length = 500)
  27 |     private String ghiChuBaoQuan;
```

thuTu lưu thứ tự kiện trong đơn. loaiHangHoa bắt buộc≤100. khoiLuongKg kiểu decimal10,2; ghiChuBaoQuan≤500 và có thể null. Giới hạn tổng kg nằm ở FareCalculator, không ở các getter/setter.

### Dòng 28

```text
  28 | 
```



### Dòng 29–42

```text
  29 |     public KienHang() {}
  30 |     public String getId() { return id; }
  31 |     public void setId(String value) { id = value; }
  32 |     public DonHang getDonHang() { return donHang; }
  33 |     public void setDonHang(DonHang value) { donHang = value; }
  34 |     public int getThuTu() { return thuTu; }
  35 |     public void setThuTu(int value) { thuTu = value; }
  36 |     public String getLoaiHangHoa() { return loaiHangHoa; }
  37 |     public void setLoaiHangHoa(String value) { loaiHangHoa = value; }
  38 |     public BigDecimal getKhoiLuongKg() { return khoiLuongKg; }
  39 |     public void setKhoiLuongKg(BigDecimal value) { khoiLuongKg = value; }
  40 |     public String getGhiChuBaoQuan() { return ghiChuBaoQuan; }
  41 |     public void setGhiChuBaoQuan(String value) { ghiChuBaoQuan = value; }
  42 | }
```

Constructor rỗng cho JPA. Mỗi get trả field, mỗi set gán field: id, donHang, thuTu, loaiHangHoa, khoiLuongKg, ghiChuBaoQuan. setDonHang do DAO gọi trước persist để gắn FK. Getter/setter không tự ghi DB.



## entity/CuocDonHang.java

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/backend/src/main/java/com/miniongvang/entity/CuocDonHang.java) · 67 dòng.

**Ai gọi:** OrderService điền cước; DonHangDAO gắn đơn/persist; các phần đọc đơn/báo cáo sử dụng dữ liệu.

**Gọi đến ai:** Ánh xạ cuoc_don_hang và quan hệ DonHang/BieuPhi/ChinhSachThanhVien.

### Dòng 1–13

```text
   1 | package com.miniongvang.entity;
   2 | 
   3 | import jakarta.persistence.Column;
   4 | import jakarta.persistence.Entity;
   5 | import jakarta.persistence.FetchType;
   6 | import jakarta.persistence.Id;
   7 | import jakarta.persistence.JoinColumn;
   8 | import jakarta.persistence.ManyToOne;
   9 | import jakarta.persistence.MapsId;
  10 | import jakarta.persistence.OneToOne;
  11 | import jakarta.persistence.Table;
  12 | import java.math.BigDecimal;
  13 | 
```

- D1: Đặt lớp trong namespace `com.miniongvang.entity`; không gọi hàm hay truy cập DB.
- D3: Cho phép dùng tên từ `jakarta.persistence.Column` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D4: Cho phép dùng tên từ `jakarta.persistence.Entity` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D5: Cho phép dùng tên từ `jakarta.persistence.FetchType` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D6: Cho phép dùng tên từ `jakarta.persistence.Id` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D7: Cho phép dùng tên từ `jakarta.persistence.JoinColumn` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D8: Cho phép dùng tên từ `jakarta.persistence.ManyToOne` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D9: Cho phép dùng tên từ `jakarta.persistence.MapsId` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D10: Cho phép dùng tên từ `jakarta.persistence.OneToOne` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D11: Cho phép dùng tên từ `jakarta.persistence.Table` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.
- D12: Cho phép dùng tên từ `java.math.BigDecimal` trong file. Import chỉ khai báo phụ thuộc tên, không tạo đối tượng hay chạy phương thức.

### Dòng 14–23

```text
  14 | /** Persisted fare facts for one order; the total is deliberately derived at read time. */
  15 | @Entity
  16 | @Table(name = "cuoc_don_hang")
  17 | public class CuocDonHang {
  18 |     @Id @Column(name = "ma_don", nullable = false, length = 36)
  19 |     private String maDon;
  20 | 
  21 |     @MapsId @OneToOne(fetch = FetchType.LAZY, optional = false)
  22 |     @JoinColumn(name = "ma_don", nullable = false)
  23 |     private DonHang donHang;
```

Cước của một đơn, tổng tiền được suy ra khi đọc. maDon vừa là PK vừa theo khóa đơn. @MapsId + OneToOne nói Hibernate lấy khóa từ donHang, không sinh một mã cước riêng.

### Dòng 24

```text
  24 | 
```



### Dòng 25–31

```text
  25 |     @ManyToOne(fetch = FetchType.LAZY, optional = false)
  26 |     @JoinColumn(name = "ma_bieu_phi", nullable = false)
  27 |     private BieuPhi bieuPhi;
  28 | 
  29 |     @ManyToOne(fetch = FetchType.LAZY)
  30 |     @JoinColumn(name = "ma_chinh_sach_giam")
  31 |     private ChinhSachThanhVien chinhSachGiam;
```

ManyToOne biểu phí bắt buộc: nhiều đơn có thể dùng cùng phiên bản biểu phí. Chính sách giảm có thể null nếu không áp dụng. FK giúp giữ tham chiếu policy của lịch sử.

### Dòng 32

```text
  32 | 
```



### Dòng 33–44

```text
  33 |     @Column(name = "cuoc_goc", nullable = false, precision = 15, scale = 2)
  34 |     private BigDecimal cuocGoc;
  35 |     @Column(name = "cuoc_km", nullable = false, precision = 15, scale = 2)
  36 |     private BigDecimal cuocKm;
  37 |     @Column(name = "cuoc_khoi_luong", nullable = false, precision = 15, scale = 2)
  38 |     private BigDecimal cuocKhoiLuong;
  39 |     @Column(name = "tong_khoi_luong_kg", nullable = false, precision = 10, scale = 2)
  40 |     private BigDecimal tongKhoiLuongKg;
  41 |     @Column(name = "phien_ban_bieu_phi", nullable = false)
  42 |     private int phienBanBieuPhi;
  43 |     @Column(name = "tien_giam_gia", nullable = false, precision = 15, scale = 2)
  44 |     private BigDecimal tienGiamGia;
```

cuocGoc=cuocKm+cuocKhoiLuong. cuocKm đã bao gồm cước cơ bản; cuocKhoiLuong là phí kg vượt mức. tongKhoiLuongKg lưu tổng kg, phienBanBieuPhi lưu số phiên bản, tienGiamGia lưu số đã giảm. Tiền dùng decimal15,2, kg decimal10,2. Không có cột tongCuoc trong lớp này.

### Dòng 45

```text
  45 | 
```



### Dòng 46–67

```text
  46 |     public CuocDonHang() {}
  47 |     public String getMaDon() { return maDon; }
  48 |     public void setMaDon(String maDon) { this.maDon = maDon; }
  49 |     public DonHang getDonHang() { return donHang; }
  50 |     public void setDonHang(DonHang donHang) { this.donHang = donHang; }
  51 |     public BieuPhi getBieuPhi() { return bieuPhi; }
  52 |     public void setBieuPhi(BieuPhi bieuPhi) { this.bieuPhi = bieuPhi; }
  53 |     public ChinhSachThanhVien getChinhSachGiam() { return chinhSachGiam; }
  54 |     public void setChinhSachGiam(ChinhSachThanhVien value) { chinhSachGiam = value; }
  55 |     public BigDecimal getCuocGoc() { return cuocGoc; }
  56 |     public void setCuocGoc(BigDecimal cuocGoc) { this.cuocGoc = cuocGoc; }
  57 |     public BigDecimal getCuocKm() { return cuocKm; }
  58 |     public void setCuocKm(BigDecimal value) { cuocKm = value; }
  59 |     public BigDecimal getCuocKhoiLuong() { return cuocKhoiLuong; }
  60 |     public void setCuocKhoiLuong(BigDecimal value) { cuocKhoiLuong = value; }
  61 |     public BigDecimal getTongKhoiLuongKg() { return tongKhoiLuongKg; }
  62 |     public void setTongKhoiLuongKg(BigDecimal value) { tongKhoiLuongKg = value; }
  63 |     public int getPhienBanBieuPhi() { return phienBanBieuPhi; }
  64 |     public void setPhienBanBieuPhi(int value) { phienBanBieuPhi = value; }
  65 |     public BigDecimal getTienGiamGia() { return tienGiamGia; }
  66 |     public void setTienGiamGia(BigDecimal tienGiamGia) { this.tienGiamGia = tienGiamGia; }
  67 | }
```

Constructor rỗng. Getter trả dữ liệu; setter gán dữ liệu. setDonHang và @MapsId phối hợp gán khóa lúc persist. Các setBieuPhi/setChinhSachGiam chỉ gắn tham chiếu, không sửa nội dung chính sách. Tổng thanh toán cần cộng phụ thu rồi trừ giảm khi đọc.


