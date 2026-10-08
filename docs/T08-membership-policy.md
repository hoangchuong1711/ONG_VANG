# T08 — Chính sách thành viên (UC-05)

## Phạm vi

`MembershipPolicyService` đọc khách hàng, thông tin VIP và hạng đã lưu qua
`KhachHangDAO.findWithVip`. Tỷ lệ lấy từ `HangThanhVien.phanTramGiamGia`, không
hard-code tỷ lệ theo tên hạng. DAO hiện có fetch cả VIP và hạng trong cùng truy vấn.
Không cần thêm endpoint riêng; T09 gọi service khi tính báo giá.

## Quy tắc

- Khách thường, hạng thiếu, tỷ lệ null/âm/lớn hơn 100: giảm 0.
- VIP phải có ngày đăng ký không sau ngày hiện tại. Hạn có hiệu lực đến hết ngày
  `ngayHetHan` theo `Asia/Ho_Chi_Minh`; hạn null nghĩa là không thời hạn.
- Tỷ lệ hợp lệ từ 0 đến 100, tính theo phần trăm: 10 nghĩa là 10%.
- Cước đầu vào là số tiền được xét giảm (gốc + phụ thu do T09 cung cấp), không âm.
  Null hoặc âm gây `IllegalArgumentException`; khách không tồn tại khi tra DAO gây
  `NoSuchElementException`, để controller của luồng gọi ánh xạ lỗi phù hợp.
- Tiền giảm = cước × tỷ lệ / 100, luôn trong khoảng 0 đến cước. Dùng `BigDecimal`
  và giữ độ chính xác trung gian. T09 chịu trách nhiệm HALF_UP nguyên đồng ở bước
  cuối và bảo đảm breakdown khớp tổng theo `api/conventions.md`.
- `nguongChiTieu` là ngưỡng xét hạng, không phải cước tối thiểu của một chuyến.
  T08 dùng hạng đã gán; không tự nâng hạng, không cộng/trừ điểm hoặc ghi dữ liệu.
- DTO là kết quả nội bộ, không phải JSON response trực tiếp. Khi không áp dụng,
  tỷ lệ và tiền giảm bằng 0; thông tin hạng/hạn vẫn được giữ để giải thích kết quả.

## Cách gọi từ T09

```java
MembershipPolicyService policy = new MembershipPolicyService();
MembershipDiscountResponse discount = transactions.run(em ->
        policy.calculateDiscount(new KhachHangDAO(em), customerId, subtotal));
```

`transactions` là `TransactionRunner` hiện có. Nếu T09 đang trong transaction,
gọi với DAO dùng cùng `EntityManager`, không mở transaction lồng nhau. Có thể gọi
overload nhận `KhachHang` đã load VIP/hạng để dùng chung dữ liệu hoặc unit test.
Controller phải xác thực quyền chọn khách; service này chỉ tính chính sách.

## Dữ liệu và kiểm thử

Seed T03 đã có `KH-DEMO-1` thường, `KH-DEMO-2` VIP còn hạn và `KH-DEMO-3` VIP hết
hạn; hạng `HANG-DEMO-VIP` giảm 10%, ngưỡng 100000. Không sửa seed/schema.

```powershell
mvn -f src/backend/pom.xml -Dtest=MembershipPolicyServiceTest test
```

Unit test không cần DB: khách thường, VIP còn hạn/không thời hạn/hết hạn, ranh giới
ngày Việt Nam, ngày đăng ký, hạng/tỷ lệ lỗi, tỷ lệ 0–100 và số lẻ, cước 0/âm/null,
giữ độ chính xác, giới hạn giảm với cước nhỏ/lớn, dưới/bằng/trên ngưỡng và giữ
nguyên hạng/điểm. Kiểm thử endpoint `createQuote`, quyền chọn khách và việc làm
tròn breakdown thuộc phần tích hợp T09; unit test này chưa xác minh các phần đó.
