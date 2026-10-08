# T07 — Ước tính lộ trình

`POST /api/routes/estimate` nhận `diemLayHang`, `diemGiaoHang` và trả địa chỉ chuẩn, `quangDuongKm` (chuỗi thập phân 2 chữ số), `thoiGianDuKienGiay`, `trongPhamVi=true`, `nguon`. Endpoint yêu cầu đăng nhập vai trò KHACH_HANG hoặc TONG_DAI và header CSRF như T06.

## Chế độ dữ liệu mẫu

Mặc định `ROUTE_PROVIDER=fake`; không cần API key hoặc kết nối mạng. Các tên sau được chuẩn hóa sau khi bỏ khoảng trắng thừa và so sánh không phân biệt chữ hoa/thường:

| Địa chỉ chuẩn | Tên thay thế |
| --- | --- |
| Quận 1, TP.HCM | Quận 1; Điểm mẫu A |
| Quận 3, TP.HCM | Quận 3; Điểm mẫu B |
| Quận 5, TP.HCM | Quận 5; Điểm mẫu C |
| Hà Nội | Fixture ngoài vùng phục vụ |

Các tuyến đã định nghĩa rõ cả hai chiều:

| Điểm đi → điểm đến | Km | Giây |
| --- | ---: | ---: |
| Quận 1 → Quận 3 | 5.00 | 900 |
| Quận 3 → Quận 1 | 5.40 | 960 |
| Quận 1 → Quận 5 | 8.00 | 1500 |
| Quận 5 → Quận 1 | 8.20 | 1560 |
| Quận 3 → Quận 5 | 4.00 | 720 |
| Quận 5 → Quận 3 | 4.30 | 780 |

Giới hạn mặc định `ROUTE_MAX_DISTANCE_KM=30`; có thể đổi trong `.env`. Địa chỉ không có trong fixture trả `ADDRESS_NOT_FOUND` (422), Hà Nội hoặc tuyến vượt giới hạn trả `OUT_OF_SERVICE_AREA` (422), hai điểm trùng nhau trả `DISTANCE_INVALID` (422). Dữ liệu mẫu chỉ dùng cho demo và test, không khẳng định khoảng cách thực tế.

## Chuyển sang Goong

Đặt trong `.env` ở thư mục gốc:

```dotenv
ROUTE_PROVIDER=goong
GOONG_API_KEY=<key-cua-ban>
GOONG_TIMEOUT_MS=5000
ROUTE_MAX_DISTANCE_KM=30
```

Sau đó chạy lại `docker compose up --build -d backend`. Chế độ Goong gọi Geocode V2 để tìm tọa độ của hai địa chỉ, rồi Directions V2 với `vehicle=motorcycle` cho xe máy. Adapter đổi khoảng cách từ mét và thời gian từ giây về đúng DTO của T07, `nguon=GOONG`. Key chỉ nằm ở backend và file `.env` không được commit. Nếu chọn Goong mà thiếu key, backend báo lỗi cấu hình khi khởi động. API Goong lỗi hoặc timeout lần lượt trả `ROUTE_PROVIDER_ERROR` (502), `ROUTE_PROVIDER_TIMEOUT` (504), không dùng kết quả giả lập để thay thế.

Hiện chưa có key nên phần Goong mới được kiểm thử bằng HTTP server cục bộ trả response mô phỏng; cần thử trực tiếp sau khi tài khoản được xác minh. Tham khảo [Geocode V2](https://help.goong.io/kb/rest-api-v2/geocode-rest-api-v2/geocode-v2/) và [Directions V2](https://help.goong.io/kb/rest-api-v2/directions-rest-api-v2/directions-v2/).
