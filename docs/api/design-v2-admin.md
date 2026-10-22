# Hợp đồng API admin designV2

Phạm vi này mô tả các endpoint mà giao diện `/admin` hiện dùng. Tất cả đường dẫn dưới đây có tiền tố `/api/v2`; yêu cầu cookie phiên hợp lệ, CSRF cho request ghi và quyền được nêu trong bảng. Backend kiểm tra vai trò; không lấy quyền từ dữ liệu gửi trong body.

## Endpoint theo màn hình

| Màn hình | Endpoint | Phương thức | Quyền |
| --- | --- | --- | --- |
| Tổng quan | `/admin/overview` | GET | `CHU_DOI_XE` |
| Đơn hàng | `/admin/orders?page=0&size=20&status=CHO_GAN` | GET | `CHU_DOI_XE` |
| Chi tiết đơn | `/orders/{maDon}` | GET | Chủ đội xe; tổng đài được đọc đơn theo quyền backend |
| Phân công (giao diện tổng đài) | `/orders/{maDon}/assign` | POST | Chỉ `TONG_DAI`; chủ đội xe nhận 403 |
| Hủy đơn | `/orders/{maDon}/cancel` | POST | `CHU_DOI_XE` hoặc `TONG_DAI`; khách được hủy theo điều kiện nghiệp vụ |
| Khách hàng | `/admin/customers`, `/admin/customers/{maKh}?page=0&size=20` | GET | `CHU_DOI_XE` |
| Khóa khách hàng | `/admin/customers/{maKh}/status` | POST | `CHU_DOI_XE` |
| Tài xế | `/admin/drivers`; `/admin/drivers/{maTx}`; `/admin/drivers/{maTx}/status` | GET, POST, PATCH | `CHU_DOI_XE` |
| Phương tiện | `/vehicles` | GET, POST | GET cho `CHU_DOI_XE`/`TONG_DAI`; POST cho `CHU_DOI_XE` |
| Sự cố | `/admin/incidents?page=0&size=20` | GET | `CHU_DOI_XE` |
| Thanh toán | `/admin/payments?page=0&size=20&status=...`; `/admin/payments/{maGiaoDich}/events` | GET | `CHU_DOI_XE` |
| Ví tài xế | `/drivers/me/finance`, `/drivers/me/earnings?tu=...&den=...`, `/drivers/me/settlements`, `/drivers/me/settlements/reconcile` | GET, POST | `TAI_XE` |
| Báo cáo | `/admin/reports/finance?tu=YYYY-MM-DD&den=YYYY-MM-DD`; `/admin/reports/finance.xlsx?...` | GET | `CHU_DOI_XE` |
| Nhân sự | `/admin/staff`; `/admin/staff/{maTk}`; `/admin/staff/{maTk}/status`; `/admin/staff/{maTk}/password` | GET, POST, PATCH | `CHU_DOI_XE` |
| Tài khoản hiện tại | `/profile`; `/auth/change-password` | GET, POST | Phiên hiện tại |

## Quy tắc gọi

- Phân trang bắt đầu từ 0; `size` nằm trong khoảng 1–100. API danh sách đơn trả `items`, `total`, `page`, `size`.
- Bộ lọc trạng thái chỉ nhận mã trạng thái V2. Dữ liệu phân trang và tổng số được lấy từ truy vấn server.
- Báo cáo dùng khoảng ngày `[tu, den)` theo giờ Việt Nam; JSON và Excel dùng cùng service tính số liệu.
- Khóa tài khoản phải thu hồi phiên cũ. Không có thao tác admin tự xác nhận giao dịch VNPay đã thu tiền.
- Quy tắc chung: `400` đầu vào sai, `401` chưa đăng nhập/hết phiên, `403` thiếu vai trò, `404` không có bản ghi, `409` xung đột nghiệp vụ.

Các endpoint V2 trong bảng đã được thêm vào `src/backend/src/main/webapp/openapi.json`; Postman được sinh lại từ hợp đồng đó. OpenAPI vẫn giữ các endpoint V1, và những luồng V2 ngoài phạm vi admin có thể chưa được liệt kê.

## Ghi chú an toàn cho Postman

- Request V2 được sinh trong nhóm `Admin V2 (manual; isolated test DB only)` và bỏ qua mặc định. Bộ sưu tập không chứa thông tin đăng nhập hay khóa VNPay.
- Chỉ bật `runPlanned=true` sau khi chọn URL DB test riêng, đăng nhập bằng vai trò phù hợp, lấy CSRF mới và điền ID fixture. Các thao tác ghi như khóa tài khoản, sửa chính sách, phân công/hủy đơn và đổi hồ sơ có tác dụng thật trên DB đích.
- Callback IPN phải dùng query string nguyên bản do VNPay ký. Không sửa mã tham chiếu/số tiền sau khi ký và không gửi callback thử đến DB demo.
- Return của trình duyệt chỉ chuyển hướng tới ví tài xế; IPN hoặc truy vấn VNPay đã xác minh mới có thể quyết toán.
