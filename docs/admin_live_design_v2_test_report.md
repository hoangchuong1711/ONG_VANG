# Kiểm thử cổng admin designV2

Ngày chạy: 18/10/2026. Môi trường live hiện trỏ tới `mini_ong_vang_design_v2_demo`; mọi kiểm thử có thể ghi chỉ được phép chạy trên `mini_ong_vang_design_v2_test_admin`.

## Kết quả đã kiểm tra

| Phạm vi | Kết quả | Bằng chứng |
| --- | --- | --- |
| Health backend live | Đạt | `/api/health` trả `databaseName=mini_ong_vang_design_v2_demo`. |
| Tải route admin | Đạt | `/admin`, orders, customers, drivers, vehicles, incidents, payments, reports, pricing, staff và account đều HTTP 200 trên cổng 3001. `/admin/settings` HTTP 404, phù hợp với việc route đã gỡ. |
| API khi chưa đăng nhập | Đạt | Các API admin V2 được hỏi trực tiếp trả HTTP 401. |
| Danh bạ live | Đạt | Smoke đọc được 3 tài xế, 3 xe, 3 khách, 6 chính sách và 2 nhân sự. |
| Đơn/tổng quan/sự cố live | Đạt | Smoke đọc trang đơn, chi tiết, tổng quan, sự cố và kiểm tra đầu vào sai; DB có 4 đơn, 0 sự cố. |
| Báo cáo và VNPay live | Đạt | Tổng JSON khớp Excel; sự kiện thanh toán không lộ trường payload nhạy cảm; khách hàng bị từ chối 403 khi gọi API admin. Kỳ kiểm tra 19/09–19/10/2026 cho thấy công ty phát sinh 29.103đ, đã nhận 0đ, còn phải nộp 29.103đ. |
| Frontend production build | Đạt | `npm.cmd run build --prefix src/frontend`; TypeScript và Next production build hoàn tất, sinh đủ route admin. |
| Kiểm tra hợp đồng API ban đầu | Đạt một phần tại thời điểm lập báo cáo | Lượt kiểm tra ban đầu bao phủ OpenAPI designV1 với 37 operation, Postman đồng bộ, backend boundary và 2 test Swagger. Trạng thái mới nhất được ghi ở mục cập nhật bên dưới. |
| Hồ sơ/chính sách/nhân sự trên DB test | Đạt | Chạy lại smoke V12/V13: tạo/sửa tài xế và xe, khóa/mở khóa tài khoản khách/tài xế, thu hồi phiên, chính sách bản nháp/công bố hiệu lực tương lai, nhân sự và hồ sơ. |
| Đồng thời và retry trên DB test | Đạt | Retry cùng `Idempotency-Key` không nhân đôi đơn; hai request phân công đồng thời cho cùng tài xế cho kết quả 200/409; khóa tài xế đang nhận đơn bị từ chối; đua phân công/hủy kết thúc `DA_HUY`, không còn phân công hoạt động. |
| Phân trang trên 100 đơn | Đạt | Tạo qua API 101 đơn test: tổng 102, trang đầu 100 và trang tiếp theo 2; sau đó hủy đủ 101 đơn qua API để giữ nhật ký. DB test cuối cùng có 104 đơn, cả 104 `DA_HUY`, 0 đơn chờ, 0 phân công đang hoạt động. |
| Danh bạ/vận hành/tài chính trên DB test | Đạt | Smoke chỉ đọc chạy lại với owner test-only: 5 tài xế, 5 xe, 5 khách, 6 chính sách, 5 nhân sự; phân trang/chi tiết đơn và sự cố; JSON/Excel cùng bằng 0 cho kỳ test không có khoản hoàn tất. Kiểm tra khách bị 403 đã chạy trên DB demo. |

Các smoke live chỉ đăng nhập và đọc dữ liệu. Không tạo/sửa đơn, chính sách, nhân sự, hồ sơ, tài khoản hay giao dịch trong DB demo; giao dịch `CHO_XU_LY` 29.103đ vẫn được giữ nguyên.

## Cập nhật sau lượt tiếp tục ngày 18/10/2026

| Phạm vi | Kết quả | Bằng chứng |
| --- | --- | --- |
| Hợp đồng OpenAPI/Postman V2 | Đạt | OpenAPI có 80 operation tổng cộng, gồm Admin V2, callback VNPay và API ví tài xế. `npm.cmd run check --prefix tools/api` thành công: OpenAPI hợp lệ, Postman đồng bộ, backend boundary đạt và 2 test Swagger qua. Các request V2 bị chặn mặc định trong Postman. |
| Dữ liệu cứng frontend | Đã gỡ khỏi các luồng đã kiểm kê | Admin không dùng kho demo. Theo dõi/thanh toán chuyển tới chi tiết đơn V2; tạo đơn tổng đài dùng `LiveOrderForm`; lịch sử tài xế đọc API V2. Màn đánh giá bị gỡ vì không có bảng/API trong schema. Các module demo không còn import đã được xóa. |
| Frontend production build | Đạt | `npm.cmd run build --prefix src/frontend` hoàn tất compile, TypeScript, static generation và route manifest. |
| Bảo toàn DB | Đạt trong lượt này | Không gọi API ghi hoặc migration lên DB live; tài khoản/đơn/giao dịch demo không bị thay đổi. |

Callback VNPay mới chưa được chạy trên DB test: Docker Desktop daemon từ chối kết nối (`permission denied` tại Docker API pipe) và `sqlcmd` không thiết lập được kết nối SQL Server local. Chrome headless tải trang `/admin` và chuyển về đăng nhập; API CSRF trả HTTP 200. Một lần đăng nhập `demo_admin` bằng `DEMO_PASSWORD` hiện có trả HTTP 401 `INVALID_CREDENTIALS`, nên đã dừng, không thử mật khẩu khác và không chạy các trang cần phiên. Vì vậy trạng thái UI tải/rỗng/lỗi và đăng nhập đồng thời ở trình duyệt khác còn chờ thông tin đăng nhập hợp lệ. Không gửi callback hoặc lệnh ghi lên DB demo; các mục này vẫn là cổng bắt buộc trước khi đóng giai đoạn 6.

## Đối chiếu route → API V2

| Route | Nguồn hiện tại | Kết quả quan sát |
| --- | --- | --- |
| `/admin` | `GET /admin/overview` | HTTP 200; smoke owner đọc tổng quan thành công. |
| `/admin/orders` | `GET /admin/orders`; lọc/phân trang server | HTTP 200; smoke kiểm tra trang đầu, trang ngoài phạm vi và status sai. |
| `/admin/orders/[id]` | `GET /orders/{id}`, `GET /drivers`; thao tác ghi dùng endpoint đơn | Route HTTP 200; API đọc chi tiết thành công. Chưa kiểm thử ghi và đồng bộ trình duyệt. |
| `/admin/customers` | `GET /admin/customers`, POST khóa/mở khóa trạng thái | HTTP 200; danh sách live đọc được. Ghi đã có smoke ở DB test giai đoạn 4; kiểm tra liên trình duyệt còn thiếu. |
| `/admin/customers/[id]` | `GET /admin/customers/{id}`, POST trạng thái | HTTP 200; API chi tiết đọc được. Chưa kiểm tra giao diện khi dữ liệu rỗng hoặc tải chậm. |
| `/admin/drivers` | GET/POST/PATCH `/admin/drivers`, POST trạng thái | HTTP 200; danh sách live đọc được. Ghi đã có smoke ở DB test; chưa xác nhận khóa tài xế đang có phân công trên test DB ở lượt này. |
| `/admin/vehicles` | `GET/POST /vehicles` | HTTP 200; danh sách live đọc được. |
| `/admin/incidents` | `GET /admin/incidents` | HTTP 200; danh sách rỗng được trả từ DB, không thay bằng dữ liệu mẫu. |
| `/admin/payments` | `GET /admin/payments`, `GET /admin/payments/{id}/events` | HTTP 200; 1 giao dịch chờ được đọc mà không thay đổi trạng thái. |
| `/admin/reports` | `GET /admin/reports/finance`, tải Excel | HTTP 200; JSON/Excel khớp nhau. |
| `/admin/pricing` | `GET/POST /policies`, POST `/fare/quote` | HTTP 200; danh sách chính sách live đọc được; ghi/chính sách tương lai chỉ được chạy ở DB test trước đây. |
| `/admin/staff` | GET/POST/PATCH `/admin/staff`, POST trạng thái/cấp mật khẩu | HTTP 200; danh sách live đọc được; vòng đời ghi đã smoke trên DB test. |
| `/admin/account` | GET/POST `/profile`, POST `/auth/change-password` | HTTP 200; đổi hồ sơ/mật khẩu đã smoke trên DB test. |
| `/admin/settings` | Không còn route | HTTP 404; mục cấu hình đã gỡ. |

## Còn thiếu trước khi đóng giai đoạn 6

1. Bổ sung kiểm thử các trạng thái callback VNPay mâu thuẫn/lặp/timeout trên luồng designV2; các smoke hiện tại chỉ đọc giao dịch và sự kiện, không gọi cổng sandbox.
2. Kiểm thử trạng thái tải chậm, rỗng và lỗi API trên từng màn bằng Chrome sau khi đăng nhập owner; thử phiên thứ hai. Chrome headless hiện chạy được nhưng `DEMO_PASSWORD` trong `.env` không đăng nhập được, nên chưa mở các màn có phiên.
3. Sao lưu/đối chiếu DB ngay trước lần triển khai code tiếp theo. Bản sao lưu giai đoạn 0 có sẵn; không có thay đổi DB live trong lượt kiểm thử này.

Để chạy smoke lần đầu, hash đăng nhập của `demo_admin` được sao tạm sang đúng fixture `test_admin` trong DB test. Sau khi chạy xong, fixture này được chuyển sang hash của nhân sự test-only; tài khoản và mật khẩu trên DB demo không bị sửa. Các bản ghi kiểm thử được giữ dưới trạng thái hủy để bảo toàn audit, không xóa vật lý.
