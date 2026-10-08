# Truy vết hợp đồng T04

UC-01/T06 và endpoint `estimateRoute` của UC-04/T07 đã có implementation và test riêng; UC nghiệp vụ T08–T18 vẫn **Not Run / chờ implementation BE**. `createQuote` thuộc T09 chưa triển khai dù phụ thuộc lộ trình T07. Địa chỉ T07 là fixture cố định; username và ID trong OpenAPI còn là ví dụ. `x-uc`, `x-roles`, `x-error-codes`, `x-implementation-status` nằm ngay trong mỗi operation.


| UC / task | Operation ID | Nhánh và tiêu chí cần kiểm thử |
| --- | --- | --- |
| Hạ tầng / T02 | getHealth | 200 DB connected; 503 thiếu cấu hình/driver hoặc DB lỗi, vẫn là JSON Health |
| UC-01 / T06 | getCsrf, register, login, getCurrentUser, logout | Register: tạo tài khoản và hồ sơ khách thường nguyên tử, hash mật khẩu, chuẩn hóa SĐT, trùng SĐT kể cả đồng thời, rollback, chặn field role/status/ID/VIP, không tự đăng nhập; login bằng tài khoản mới. Auth: sai credential, thiếu field, tài khoản khóa, session hết hạn, CSRF thiếu/sai kể cả register; cookie HttpOnly/SameSite/Secure; đổi session khi login và vô hiệu sau logout |
| UC-02 / T10 | listCustomers, createOrder, getOrder | Khách/tổng đài tạo đúng chủ; thiếu địa chỉ/SĐT, sai SĐT, ngoài vùng; báo giá hết hạn/đổi giá; timeout retry cùng key; rollback đơn/kiện/snapshot/nhật ký |
| UC-03 / T09 | createQuote | Thiếu biểu phí, khoảng cách không hợp lệ, HALF_UP và không âm; tổng breakdown khớp snapshot |
| UC-04 / T07 | estimateRoute, createQuote | Địa chỉ không tìm thấy, quá phạm vi, timeout/lỗi provider; fixture cố định, không random/fallback âm thầm |
| UC-05 / T08 | createQuote | Khách thường=0 giảm; VIP hợp lệ/hết hạn/hạng lỗi; giảm không vượt cước; tổng đài chọn đúng khách |
| UC-08 / T14 | createPayment, listPayments, getPayment, confirmCash | Đơn chưa hoàn tất, đã trả, sai tiền, giao dịch thất bại; khách không tự xác nhận tiền mặt; miễn cước; nhiều attempt nhưng một tất toán |
| UC-10 / T15/T18 | createPayment, getPayment, reconcilePayment, vnpayIpn, vnpayReturn | Thành công, khách hủy/thất bại; sai chữ ký/merchant/reference/amount; callback lặp/muộn; timeout chưa rõ kết quả; return không xác nhận đã trả; HTTPS public nhận IPN |
| UC-12 / T11 | listOrders, listDrivers, suggestDrivers, assignDriver, rejectOrder | Không có tài xế trả danh sách rỗng; tài xế vừa bận/khóa/offline; từ chối phải có lý do, CHO_GAN trở lại; gán-gán/gán-hủy đồng thời |
| UC-13 / T12 | getOrder, listOrderEvents, transitionOrder, recordIncident | Sai tài xế, nhảy bước, request lặp; không liên lạc/từ chối nhận giữ DANG_GIAO; hoàn tất ghi timestamp và giải phóng tài xế |
| UC-14 / T13 | cancelOrder | CHO_GAN/DA_GAN trước 300 giây; 299/300/301; thiếu lý do; đang giao/đã xong; đơn không có/khác chủ; cạnh tranh tiến trình/gán |
| UC-15 / T17 | getRevenueReport, exportRevenueReport | Ngày sai; rỗng số 0; ranh giới ngày/tuần/tháng múi giờ VN; snapshot lịch sử; join nhiều payment không nhân tiền; lỗi export không mất báo cáo; chỉ quản trị |
| UC-19 / T16 | listOrders, getOrder, listOrderEvents | Rỗng, ngày sai, page/size ngoài miền; tổng toàn bộ tập lọc; đơn người khác trả 404; quyền lịch sử tài xế |

## Test dành riêng T04

1. Parser xác nhận OpenAPI hợp lệ, $ref đầy đủ, operationId không trùng.
2. JSON Schema 2020-12 kiểm tra tất cả examples request/response và component examples.
3. Kiểm tra đủ 12 UC, path parameter bắt buộc, CSRF cho POST và ví dụ mã lỗi khai báo.
4. Collection/environment sinh lại phải giống file commit; secret mặc định rỗng.
5. Unit test interceptor: base path, token cùng origin, không gửi ra domain khác, clear sau login/logout/401.
6. Maven build đóng gói spec, HTML, JS/CSS Swagger và attribution vào WAR.
7. Runtime smoke: /openapi.json và /swagger-ui/ trả 200; getHealth 200 với DB khỏe, 503 khi DB không sẵn sàng. Nếu không chạy được Docker/runtime thì ghi rõ chưa kiểm thử, không thay bằng examples.

Review của một thành viên khác theo quy trình dự án còn chờ nhóm thực hiện. Bộ negative request Postman là điểm khởi đầu, không thay thế toàn bộ test của T06–T20 hoặc kiểm thử đồng thời/JUnit.
