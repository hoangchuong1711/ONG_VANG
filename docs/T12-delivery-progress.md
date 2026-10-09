# T12 — Tiến trình và hoàn tất (UC-13)

## Kế hoạch và phạm vi

1. Dùng transaction, quyền và thứ tự khóa của T11; bổ sung state machine UC-13.
2. Triển khai chuyển trạng thái, ghi sự cố, đọc nhật ký theo OpenAPI.
3. Kiểm thử PostgreSQL thật: quyền, trạng thái, retry, cạnh tranh và rollback; kiểm thử HTTP và đồng bộ Postman.

Implementation nằm trong `DispatchService`, `DispatchDAO`, `DispatchServlet`; filter T06 đã có role gate và CSRF cho cả ba endpoint.

| Endpoint | Quyền | Kết quả |
| --- | --- | --- |
| POST `/api/orders/{maDon}/transitions` | Tài xế phụ trách | 200 Order |
| POST `/api/orders/{maDon}/incidents` | Tài xế phụ trách | 201 Event |
| GET `/api/orders/{maDon}/events?page=0&size=20` | Cùng quyền getOrder | 200 EventPage |

## Trạng thái và retry

Body chuyển trạng thái: `{"trangThai":"DA_LAY_HANG"}`. Chỉ chấp nhận `DA_GAN → DA_LAY_HANG → DANG_GIAO → HOAN_TAT`. Đích ngoài ba giá trị cho phép trả 400; nhảy bước, lùi bước hoặc cập nhật đơn đã hủy trả 409 `ORDER_STATE_CONFLICT`. Sai tài xế trả 404, sai vai trò/profile/tài khoản khóa trả 403.

Gửi lại đúng **trạng thái hiện tại** trả 200 và không ghi nhật ký, không đổi timestamp. Retry đích cũ sau khi đơn đã tiến xa hơn trả 409. Nhiều request cùng đích được tuần tự hóa bằng khóa đơn, chỉ request đầu tạo chuyển trạng thái. Sau hoàn tất vẫn cho tài xế thực hiện đọc/retry qua `maTx` hoặc lịch sử phân công đã kết thúc tại `hoanTatLuc`. Retry hoàn tất không sửa tài xế, kể cả khi người đó đang chạy đơn mới.

## Transaction hoàn tất

Khóa đơn → khóa/refresh tài xế → khóa/refresh tài khoản; kiểm tra lại tài khoản hoạt động và phân công hiện hành. Trong cùng transaction:

- Đơn chuyển `HOAN_TAT`, ghi `thoi_gian_hoan_tat` bằng clock server.
- Kết thúc phân công, lý do `HOAN_TAT`, giữ lịch sử và cờ `tuChoi=false`.
- Ghi `ranh_tu` cùng thời điểm, tài xế hết bận theo truy vấn T11.
- Ghi nhật ký cùng thời điểm, tài khoản/vai trò/tên người thực hiện.

Giữ `don_hang.ma_tx` để truy vết người thực hiện; bận được tính từ đơn/phân công đang hoạt động. Không thay trạng thái ONLINE/OFFLINE/NGHI. Lỗi bất kỳ bước nào rollback cả đơn, phân công, thời điểm rảnh và nhật ký. Snapshot cước và các lần thanh toán không đổi. `hoanTatLuc` và snapshot là cơ sở cho báo cáo T17; hoàn tất không đồng nghĩa đã thu tiền.

## Sự cố và nhật ký

Body: `{"loaiSuCo":"KHONG_LIEN_LAC_DUOC","lyDo":"Người nhận chưa nghe máy"}`. Loại còn lại là `TU_CHOI_NHAN`. Chỉ ghi khi `DANG_GIAO` và có phân công hiện hành đúng người. Lý do được trim, dài 1–500 ký tự. Giữ nguyên trạng thái, timestamp hoàn tất và tài xế bận; không tự tạo luồng hoàn hàng.

Migration V7 thêm `nhat_ky_trang_thai.loai_su_co`, nullable cho dữ liệu cũ và sự kiện thông thường; CHECK giới hạn loại, trạng thái DANG_GIAO và lý do không rỗng. Loại được lưu riêng, không nối vào lý do nên giữ đủ 500 ký tự. Event thêm thuộc tính tùy chọn `loaiSuCo`; server trả null khi không phải sự cố.

Mỗi POST sự cố hợp lệ là một lần ghi nhận riêng. API này không có idempotency key; gửi lại có thể tạo hai sự cố. Quy tắc chống ghi lặp của UC-13 áp dụng cho chuyển trạng thái theo hợp đồng đã có.

Nhật ký phân trang tại DB, sort `thoiGianGhiNhan ASC, maNhatKy ASC`; page ≥ 0, size 1–100, chặn offset tràn số. Khách chỉ xem đơn của mình; tài xế đã từ chối không được xem; tổng đài xem được. HEAD không thực hiện chuyển trạng thái hoặc ghi sự cố.

## Kiểm chứng và bàn giao

Xem [kết quả kiểm thử](../tests/T12-validation.md). OpenAPI đánh dấu ba operation là implemented; Postman được sinh lại; CI chạy `smoke:progress` sau T11. Không triển khai API hủy/thanh toán/báo cáo trong T12. Review, CI và merge theo CONTRIBUTING do nhóm thực hiện; không có thao tác Git trong lần triển khai này.
