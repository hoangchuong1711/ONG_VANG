# Giải thích mã nguồn Luồng 2 — Tạo đơn và báo giá

Dành cho UC-04 (lộ trình), UC-05 (thành viên), UC-03 (báo giá), UC-02 (tạo đơn). Đọc mã nguồn tại workspace ngày 16/10/2026. Tài liệu không sửa code ứng dụng, không khẳng định test đã chạy thành công và không gán tác giả công việc cho một thành viên.

## Mục lục và cách học

1. [Giao diện: từ nhập dữ liệu đến gửi API](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/01-frontend.md)
2. [Các Service: lộ trình, thành viên, báo giá và tạo đơn](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/02-services.md)
3. [HTTP, phân quyền và DTO](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/03-http-dto-phan-quyen.md)
4. [DAO, truy vấn và ánh xạ CSDL](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/04-dao-entity.md)
5. [Nhà cung cấp tuyến và cấu hình](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/05-goong-cau-hinh.md)
6. [Kiểm thử luồng 2](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/06-tests.md)

Mỗi file có: ai gọi; gọi đến ai; code nguyên bản đánh số dòng; diễn giải lệnh/cụm lệnh. Một biểu thức Java/JS có thể trải nhiều dòng nên được giải thích cùng nhau để không tách mất ý nghĩa. Import, getter/setter và JSX lặp lại được giải thích bằng quy tắc đi kèm. Số dòng có thể thay đổi nếu code được chỉnh sửa sau ngày này.

Phạm vi gồm toàn bộ 31 file sản phẩm/test nhỏ trong mục lục, cộng các đoạn liên quan luồng 2 của DesignV1IntegrationTest. Bổ sung LiveOrderForm, BaseDAO, RouteConfiguration và ba DAO chính sách vì nếu chỉ đọc danh sách ban đầu sẽ thiếu mắt xích thực thi. Ba tài liệu nghiệp vụ ban đầu là tài liệu tham khảo, không phải code thực thi.

## Hai request phải phân biệt

### Request lấy báo giá

```text
Nút báo giá (LiveOrderForm.requestQuote)
  → api<Quote>("/quotes", POST)
  → GET /api/auth/csrf, rồi POST /api/quotes
  → Next.js rewrite /api/* sang backend
  → Tomcat: ApiSecurityFilter.doFilter
  → QuoteServlet.doPost
  → QuoteService.create(actor, CreateQuote)
      → normalizeParcels
      → RouteService.estimate
          → RouteProvider.estimate
              → FakeRouteProvider: Map trong RAM
              → HOẶC GoongRouteProvider:
                  geocode lấy → geocode giao → direction
      → TransactionRunner.run(em -> ...)
          → evaluateV1
              → KhachHangDAO.findWithAccount
              → BieuPhiDAO.findApplicable
              → ChinhSachPhuThuDAO.findApplicable
              → FareCalculator.calculateV1 (chưa giảm)
              → MembershipPolicyService.evaluate
                  → ChinhSachThanhVienDAO.findApplicable
              → FareCalculator.calculateV1 (sau giảm)
          → BaoGiaDAO.persist
          → flush → commit
  → Quote DTO → WebResponses.json → HTTP 200
  → frontend setQuote → hiển thị giá
```

### Request xác nhận tạo đơn

```text
LiveOrderForm.createOrder
  → api<Order>("/orders", POST, Idempotency-Key)
  → ApiSecurityFilter
  → OrderServlet.doPost
  → OrderService.create(actor,key,CreateOrder)
      → phân quyền khách/tổng đài, normalize payload
      → băm actor + tên thao tác + key
      → đọc nhanh bản ghi yêu cầu; có replay hợp lệ thì trả ngay
      → transaction ghi:
          → khóa tài khoản (lockActor)
          → kiểm tra lại replay
          → kiểm tra khách, chủ báo giá, hạn, nội dung
          → lấy tuyến đã lưu; KHÔNG gọi Goong lại tại đây
          → QuoteService.evaluateV1 với CÙNG EntityManager
          → nếu cước/chính sách thay đổi: lỗi409
          → tạo DonHang, CuocDonHang, KienHang,
             PhuThuDonHang, SuKienDonHang
          → DonHangDAO.persistAggregateV1
          → lưu key + payload + response với hạn24h
          → flush → commit (lỗi thì rollback)
  → Order DTO → JSON → HTTP201
  → router.push đến chi tiết đơn
```

Trang tổng đài hiện có handler riêng: lấy freshQuote khi submit rồi mới POST orders. Nó không gọi LiveOrderForm dù component đó có prop dispatcher.

## Mẫu dữ liệu để hiểu các trường

Đây là ví dụ học code với tuyến FAKE; thay mã báo giá bằng kết quả thật của lần gọi đầu.

```json
{
  "diemLayHang": "Quận 1",
  "diemGiaoHang": "Quận 3",
  "kienHang": [
    {"loaiHangHoa": "Tài liệu", "ghiChuBaoQuan": "", "khoiLuongKg": "3.00"}
  ],
  "benThanhToan": "NGUOI_DAT",
  "phuongThucThanhToan": "TIEN_MAT"
}
```

POST quotes nhận dữ liệu trên. Khách tự tạo không cần gửi maKh; tổng đài thêm maKh của khách. POST orders dùng lại các trường này và thêm maBaoGia, tenNguoiNhan, sdtNguoiNhan, ghiChuGiaoHang; gửi Idempotency-Key trong HEADER, không phải một trường JSON. Không gửi tổng tiền tự tính.

Cước ví dụ chỉ đúng khi policy đang áp dụng là: cơ bản20.000,5.000/km,gồm1kg,3.000/kg vượt, không phụ thu/giảm: 20.000+5×5.000+(3−1)×3.000=51.000đ. Fixture DB có thể có phụ thu/ưu đãi khác, vì vậy không khẳng định mọi tài khoản luôn nhận51.000đ.

## Ngôn ngữ và ký hiệu cần hiểu

| Cú pháp | Ý nghĩa trong các file |
|---|---|
| package/import | Namespace và phụ thuộc tên; không gọi chức năng khi chạy |
| public/private/package-private | Ai có quyền truy cập phương thức trong code; khác quyền người dùng |
| final | Không kế thừa lớp hoặc không gán lại biến; không luôn đồng nghĩa dữ liệu sâu bất biến |
| static | Thành viên thuộc lớp, không cần tạo instance để gọi |
| new | Tạo object trong bộ nhớ; chưa chắc đã có dòng trong DB |
| record | Java tạo constructor/accessor/equals/hashCode; không tự persist |
| var | Compiler suy kiểu Java, không phải biến mất kiểu |
| DTO/Entity | Dữ liệu trao đổi API / đối tượng ánh xạ DB |
| em -> {...} | Lambda được truyền cho TransactionRunner, em do runner cung cấp |
| stream().map().toList() | Biến đổi từng phần tử và gom kết quả |
| reduce(ZERO, BigDecimal::add) | Cộng dồn các số thập phân |
| throw/catch/finally | Ném lỗi / xử lý lỗi / phần dọn luôn chạy |
| && / \|\| / ! | AND / OR / phủ định, có đánh giá ngắn mạch |
| a ? b : c | Chọn b nếu a đúng, ngược lại c |
| @Entity/@Column/@JoinColumn | Mapping lớp/cột/khóa ngoại, không phải API |
| em.persist/flush/commit | Đăng ký lưu / đồng bộ với DB / xác nhận giao dịch |
| useState | State thay đổi làm React render lại |
| useRef | Giữ giá trị giữa render, sửa current không tự render |
| useEffect | Tác vụ sau render và hàm cleanup |
| async/await | Chờ Promise, không phải chuyển toàn bộ công việc sang thread riêng |
| ...object | Sao chép/trải các thuộc tính; thuộc tính phía sau có thể ghi đè |
| ?. / ?? | Truy cập an toàn khi nullish / giá trị dự phòng chỉ cho null hoặc undefined |
| type/assertion TypeScript | Kiểm tra compile-time; không tự xác thực JSON runtime |
| JSX className | CSS hiển thị; không quyết định giá hoặc quyền backend |

## Các điểm cần nói chính xác khi bảo vệ

1. Đây là Servlet trên Tomcat; Tomcat gọi doPost/doFilter. Không có Spring tự inject service trong đoạn này; servlet new service và lấy dependency từ ServletContext.
2. UC-05 dùng hạng lưu sẵn và chính sách có hiệu lực; không tự tích điểm hay nâng hạng sau mỗi đơn.
3. MembershipPolicyService nhận Clock nhưng không lưu/dùng nó để lấy now; evaluate dùng tham số at.
4. Cửa sổ thời gian [bắt đầu,kết thúc): tại đúng kết thúc là hết hạn. Quote sống300giây, idempotency sống24h; hai hạn khác nhau.
5. Goong được gọi lúc lấy quote trước transaction. Xác nhận đơn dùng tuyến frozen nhưng xét lại policy và tiền.
6. Báo giá không khóa giá tuyệt đối. Sai lệch trả QUOTE_CHANGED, không tự tạo đơn với giá mới.
7. Cùng key/payload chỉ replay trong phạm vi actor và thời hạn. Key khác có thể tạo đơn mới có chủ ý từ cùng quote còn hợp lệ.
8. Lock trong tạo đơn là khóa hàng tài khoản để tuần tự hóa request của actor; không phải khóa toàn DB.
9. Snapshot response replay có thể vẫn ghi CHO_GAN dù đơn đã được điều phối; muốn trạng thái hiện tại phải đọc chi tiết.
10. CuocDonHang không lưu tổng cước thành một field riêng; có cước km/kg/giảm và tham chiếu policy. Cần cộng phụ thu để ra tổng.
11. KHACH_HANG không được chọn maKh người khác; TONG_DAI phải chọn khách. maTkTao là tài khoản thao tác, khác maKh.
12. UI khách chỉ nhập một kiện mặc dù API nhận list kiện.
13. Giao diện tổng đài khác giao diện khách ở cách lấy quote và retry; xem lời giải để không mô tả hai màn hình giống nhau.
14. Test trong tài liệu là mã kiểm chứng có sẵn. Không biến việc đọc test thành tuyên bố “đã chạy PASS”.

## Cách chỉ code trước giảng viên

Mở OrderServlet.doPost: “Đây là đầu vào HTTP, em lấy key, đọc DTO và xác định actor.”

Mở OrderService.create: “Đây là kiểm tra quyền, chống lặp, kiểm tra quote rồi tạo các entity.”

Mở QuoteService.evaluateV1: “Em dùng lại phép tính này cho báo giá và kiểm tra lúc tạo đơn.”

Mở FareCalculator.calculateV1: “Cước km và kg được làm tròn riêng; giảm tính sau phụ thu.”

Mở DonHangDAO.persistAggregateV1 và TransactionRunner.run: “Những thành phần được lưu trong cùng transaction, lỗi thì rollback.”

Mở test quoteExpiresAtExactlyThreeHundredSeconds hoặc failedIdempotencyWriteRollsBackWholeOrderAggregate: “Đây là cách kiểm chứng biên thời gian hoặc không để dữ liệu dở dang.”

Khi nói về đóng góp cá nhân, chỉ nhận phần mình thực sự làm và dùng task/PR/commit thật làm bằng chứng.

