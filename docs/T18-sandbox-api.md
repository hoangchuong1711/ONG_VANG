# T18 — Đồng bộ tài liệu API và phạm vi triển khai sau

## Phạm vi đợt cập nhật hiện tại

Theo thống nhất ngày 12/10/2026, đợt này **chỉ sửa tài liệu cho đúng code hiện tại**. Không thay đổi nghiệp vụ, không thêm seed đơn/thanh toán, không bổ sung hoặc chạy tiếp kiểm thử thanh toán. Chưa yêu cầu mọi thành viên chạy được VNPay Sandbox. Sau khi dự án hoàn thiện và deploy, nhóm mới cấu hình và kiểm tra thanh toán trên môi trường dùng chung.

Đây là phần tài liệu của T18, **không phải xác nhận đã hoàn thành toàn bộ tiêu chí T18 trong kế hoạch gốc**. Các phần chưa làm được ghi riêng bên dưới.

## Trạng thái đã đối chiếu

| Phần | Trạng thái trong repo |
| --- | --- |
| T06–T13 | Đã có xác thực, lộ trình, chính sách thành viên/báo giá, tạo đơn, điều phối, tiến trình/sự cố và hủy đơn |
| T14 | Đã có tạo/đọc payment và xác nhận tiền mặt |
| T15 | Đã có tạo URL VNPay, IPN, Return, query đối soát và test giả lập; đã có hướng dẫn `.env`, Docker và ngrok |
| T16 | Đã có lịch sử/chi tiết đơn và nhật ký theo quyền |
| T17 | Đã có báo cáo doanh thu và xuất Excel |
| Hợp đồng API | 29 operation: 28 implemented, chỉ `listCustomers` planned |
| Seed | `DesignV1DemoSeeder` tạo tài khoản, khách, tài xế, xe và chính sách; chưa có đơn/thanh toán dựng sẵn |
| Sandbox dùng chung | Chưa là yêu cầu vận hành ở giai đoạn hiện tại; thực hiện sau khi deploy |

Nguồn chuẩn endpoint/DTO là [OpenAPI](../src/backend/src/main/webapp/openapi.json); Swagger và [Postman](../tests/postman/README.md) phục vụ tra cứu/gọi API. Trạng thái implemented nói rằng có code, không tự chứng minh mọi ca kiểm thử đã PASS. Kết quả kiểm thử trước đây giữ trong tài liệu từng task; lần chỉnh tài liệu này không tạo bằng chứng Sandbox thật mới.

## Phân biệt T15 và T18

T15 xây dựng nghiệp vụ thanh toán VNPay. Cấu hình local/ngrok và hướng dẫn host đã được làm cùng T15, nên không phải làm lại chỉ vì chuyển sang T18. Giữ [hướng dẫn T15](T15-vnpay.md) và mục người host trong README để tham khảo khi cần.

T18 trong kế hoạch gốc bao gồm hoàn thiện môi trường, đồng bộ tài liệu/API, seed các tình huống demo và hướng dẫn timeout/chạy lại. Hiện chỉ thực hiện phần đồng bộ tài liệu; chưa triển khai seed hoặc nghiệm thu các tình huống thanh toán còn lại.

## Cách dùng tài liệu/API lúc này

- Dùng các operation implemented theo vai trò và fixture phù hợp. Với Postman, đăng nhập theo getCsrf → login → getCsrf; đổi tài khoản thì logout trước.
- Giữ `runPlanned=false` cho luồng thông thường. `listCustomers` chưa triển khai. Folder negative hiện cũng dùng guard `runPlanned`: chỉ bật khi chạy riêng ca negative đã chuẩn bị, không chạy toàn bộ collection.
- Seed hiện tại chỉ cung cấp dữ liệu nền; cần tạo đơn qua API nếu muốn xem lịch sử, chi tiết hoặc báo cáo có dữ liệu. Không tìm các mã đơn/thanh toán demo chưa được seed.
- Luồng VNPay trong tài liệu là hướng dẫn tham khảo; không phải điều kiện để mọi thành viên kiểm tra phần việc khác. Nếu chưa chạy thì ghi Not Run, không coi việc có request/example là test đã PASS.
- Tạo lại container bằng `docker compose up --build -d backend` khi đổi biến môi trường. `docker compose restart` không nạp biến mới. `.env` chỉ chứa `KEY=value`/comment; lệnh cấu hình ngrok phải chạy trong terminal.

## Việc để sau khi hoàn thiện dự án và deploy

1. Chốt môi trường BE/DB dùng chung và HTTPS domain. DB chỉ cần BE truy cập được, không cần public ra Internet.
2. Cấu hình credential Sandbox riêng trên môi trường đó; cập nhật IPN phía VNPay và `VNPAY_RETURN_URL` theo domain deploy. Không đưa secret vào Git hoặc Postman.
3. Kiểm tra giao dịch Sandbox thật trên môi trường deploy: IPN tới BE, payment/đơn cập nhật đúng. Return chỉ để hiển thị, không tự xác nhận đã thu.
4. Kiểm tra timeout/query lại, callback lặp/đến muộn, tránh thu lại khi chưa rõ kết quả; lưu Expected/Actual/PASS-FAIL và bằng chứng đã che thông tin nhạy cảm.
5. Khi cần bộ demo chung, bổ sung seed đơn miễn cước, chưa thu, thanh toán lỗi/đến muộn, kèm cách chạy lại. Seed giả lập phải được phân biệt với giao dịch từ cổng.

Hồi quy xuyên 12 UC và nghiệm thu BE tiếp tục theo T19–T20; Goong vẫn là mở rộng tùy chọn. Không đánh dấu các hạng mục hoãn là đã PASS chỉ vì tài liệu đã được cập nhật.
