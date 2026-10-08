# Quy ước API v0.2.0

Các quyết định dưới đây là baseline T04 từ SQL v0 và project brief; nhóm có thể sửa có phiên bản khi thiết kế/DB thay đổi. Chưa phải tất cả đã được thực thi bởi BE.

## HTTP, DTO, validation

- Prefix `/api`; JSON UTF-8; tên field tiếng Việt không dấu camelCase tương ứng SQL snake_case. DTO độc lập Entity Hibernate.
- ID là chuỗi không rỗng tối đa 36 ký tự theo VARCHAR(36), không tự ép UUID. Client không tự đặt ID cho tài nguyên được tạo.
- Request không nhận field lạ. Chuỗi bắt buộc phải trim và không trắng; giới hạn độ dài nằm trong OpenAPI. Optional có thể bỏ; chỉ nhận null khi schema cho phép. Cấm trả password/hash, CCCD hoặc secret cổng thanh toán.
- SĐT demo: 10 chữ số bắt đầu 0 hoặc +84 và 9 chữ số; normalize về dạng 0xxxxxxxxx trước tra/lưu. Đây là quyết định T04 chặt hơn SQL VARCHAR(15), cần review T01.
- Kiện hàng ít nhất một phần tử; khối lượng bắt buộc và phải >0 theo schema T03. Giới hạn khối lượng/phạm vi/biểu phí/VIP nghiệp vụ lấy từ cấu hình T01, không tự suy ra từ sức chứa DECIMAL.
- Thành công: object DTO trực tiếp; list có `items,page,size,totalElements,totalPages`; 201 khi tạo tài nguyên, 204 logout không body. Không bọc thêm `success/data`.
- 0-based page; mặc định size=20, max=100; ngoài miền trả 400, không tự clamp. Trang vượt kết quả trả items rỗng; total vẫn đúng. Không cho sort SQL tùy ý; sort cố định ghi tại operation. totalPages=ceil(totalElements/size), bằng 0 khi rỗng.
- Lịch sử lọc theo thoiGianTao. summary của orders tính trên **toàn bộ tập lọc trong phạm vi quyền**, kể cả đơn hủy; không phải doanh thu. Tập rỗng: tổng bằng 0.

## Tiền và thời gian

- VND, BigDecimal/NUMERIC trong BE/DB; JSON chuỗi như `"45000.00"`. API chỉ giao dịch nguyên đồng, 2 chữ số lẻ luôn `.00`. Không dùng float tính tiền.
- Tính với độ chính xác decimal, giới hạn giảm không vượt gốc+phụ thu; tổng=max(0,gốc+phụ thu−giảm); HALF_UP nguyên đồng tại bước cuối. Lưu snapshot sau làm tròn; breakdown phải cộng ra đúng tổng (điều chỉnh phần giảm đã làm tròn nếu cần). Tỷ lệ VIP là phần trăm, `"10.00"` = 10%.
- T03 thống nhất tiền trong snapshot, cấu hình và thanh toán thành NUMERIC(15,2). T09/T14 vẫn phải kiểm tra giới hạn nghiệp vụ và giới hạn cổng thanh toán trước khi lưu/gửi.
- VNPay amount nhân 100 chỉ trong adapter và kiểm tra chữ ký/amount callback; DTO nội bộ luôn VND.
- Timestamp trả ISO 8601 UTC với Z. DATE như ngày hết hạn và bộ lọc dùng YYYY-MM-DD. Quy ước DATETIME không timezone của SQL tham chiếu được hiểu theo Asia/Ho_Chi_Minh khi chuyển đổi; PostgreSQL nên dùng timestamptz cho thời điểm.
- Hạn VIP có hiệu lực đến hết ngayHetHan tại Asia/Ho_Chi_Minh; null = không có hạn, nhưng vẫn phải có hạng hợp lệ. Hạng thiếu/hết hạn không giảm, không làm lỗi toàn bộ báo giá.
- Báo cáo [tuNgay,denNgay) theo Asia/Ho_Chi_Minh; tuần từ thứ Hai. Giá trị đơn hoàn tất theo hoanTatLuc; thực thu theo paid timestamp xác nhận; còn phải thu của mọi đơn đã hoàn tất trước cuối kỳ nhưng chưa thu tính tại cuối kỳ. Không lấy trạng thái hiện tại để suy ra lịch sử thu tiền của kỳ cũ.

## Lỗi

Envelope: `code` ổn định để client xử lý, `message` tiếng Việt, `fieldErrors:[{field,message}]` (rỗng nếu không có), `traceId` đối chiếu log. Không trả stack trace, SQL, password hoặc chữ ký bí mật. OpenAPI ghi chính xác mã áp dụng cho mỗi operation ở responses và `x-error-codes`.

| Status | Ý nghĩa |
| --- | --- |
| 400 | JSON_INVALID, VALIDATION_ERROR, DATE_RANGE_INVALID |
| 401 | AUTH_REQUIRED, SESSION_EXPIRED, INVALID_CREDENTIALS |
| 403 | FORBIDDEN, ACCOUNT_LOCKED, CSRF_INVALID |
| 404 | RESOURCE_NOT_FOUND; dùng cả trường hợp khác chủ đơn để không lộ tồn tại |
| 409 | Xung đột trạng thái, tài xế vừa bận, quá hạn hủy, báo giá thay đổi/hết hạn, attempt còn chờ, đã trả, idempotency khác payload |
| 422 | Địa chỉ/khoảng cách/phạm vi hoặc số tiền không hợp lệ; PAYMENT_NOT_REQUIRED với đơn miễn cước |
| 500 | INTERNAL_ERROR, EXPORT_FAILED |
| 502/504 | Lỗi/timeout route provider hoặc cổng thanh toán |
| 503 | FARE_CONFIG_MISSING |

404 sai chủ đơn ưu tiên trước kiểm tra trạng thái nghiệp vụ; 403 sai vai trò. Không dùng HTTP 200 bọc lỗi nghiệp vụ. Ngoại lệ đã mô tả riêng: health 503 có Health DTO; VNPay IPN HTTP 200 kèm ACK theo giao thức; return HTML; xuất báo cáo XLSX, lỗi xuất vẫn JSON.

## Session và quyền

### Đăng ký khách hàng — bổ sung phạm vi T06

Yêu cầu bổ sung ngày 08/10/2026, chưa có trong OpenAPI 0.2.0 hoặc implementation. T06 cập nhật hợp đồng máy đọc và sinh lại collection trước khi nghiệm thu.

- Endpoint dự kiến: `POST /api/auth/register`, operationId `register`; không yêu cầu đã đăng nhập nhưng bắt buộc session và `X-CSRF-Token` lấy từ `GET /api/auth/csrf`.
- Request gồm `hoTen` (bắt buộc, tối đa 100 ký tự), `soDienThoai` (bắt buộc, chuẩn hóa theo quy ước SĐT), `password` (bắt buộc, không trắng, tối đa 72 byte UTF-8 theo PasswordHasher); `email` (tùy chọn, đúng định dạng, tối đa 150 ký tự), `diaChiMacDinh` (tùy chọn, tối đa 255 ký tự). Không trim hoặc biến đổi mật khẩu; chính sách độ dài tối thiểu sẽ được chốt trong OpenAPI khi triển khai. Không nhận username riêng: username lấy từ SĐT đã chuẩn hóa.
- Server sinh ID, đặt role `KHACH_HANG` và trạng thái `HOAT_DONG`; tạo tài khoản và hồ sơ khách thường cùng transaction, đồng bộ họ tên. Không tạo VIP. Từ chối field lạ, bao gồm role, trạng thái, ID, hash và thông tin cấp VIP do client gửi.
- Băm mật khẩu bằng `PasswordHasher` sẵn có; chỉ lưu hash. Kiểm tra trùng username sau chuẩn hóa và xử lý cả vi phạm unique khi hai request đồng thời; lỗi rollback toàn bộ, không để tài khoản thiếu hồ sơ.
- Thành công dự kiến: `201` với DTO `User` của khách vừa tạo (có `maNguoiDung` và `maKh`), không trả mật khẩu/hash. Không tự đăng nhập, không thay danh tính phiên hiện có; khách gọi login riêng sau khi đăng ký.
- Lỗi dự kiến: `400 JSON_INVALID/VALIDATION_ERROR`, `409 ACCOUNT_ALREADY_EXISTS` cho username/SĐT đã tồn tại, `403 CSRF_INVALID`, `500 INTERNAL_ERROR` cho lỗi ngoài dự kiến. Đây là mã bổ sung cần đưa vào OpenAPI; không mặc định email là duy nhất vì schema hiện tại không quy định điều đó.
- Phạm vi chỉ là API tự đăng ký khách hàng. Cấp tài khoản tài xế/tổng đài/chủ đội xe, xác minh OTP/email, quên/đổi mật khẩu và giao diện đăng ký không được tự động bổ sung vào T06.

### Phiên đăng nhập và phân quyền

- Vai trò: KHACH_HANG, TAI_XE, TONG_DAI, CHU_DOI_XE. CHU_DOI_XE ánh xạ quản trị trong brief; TONG_DAI gồm tổng đài/điều phối. Không tự cấp quản trị quyền hành động thay mọi actor.
- Khách/tài xế đăng nhập bằng SĐT qua field username; nhân viên dùng username. T03 lưu credential chung trong tai_khoan; User.maNguoiDung = ma_tk, các maKh/maTx/maNv là ID hồ sơ. T06 dùng PasswordHasher kiểm tra bcrypt, không dùng cột SĐT làm mật khẩu.
- Cookie JSESSIONID, host-only, Path=/ (hoặc context path khi deploy riêng), HttpOnly, SameSite=Lax, Secure trên HTTPS. Local HTTP không bật Secure. Session chỉ qua cookie, không URL rewriting.
- Session idle timeout 30 phút (baseline demo). Login đổi session ID/token, logout invalidate và hết hạn cookie. API riêng tư trả Cache-Control: no-store. Auth filter kiểm tra tài khoản bị khóa và role mỗi request.
- `x-roles` là metadata mô tả, không phải cơ chế bảo mật tự sinh từ Swagger. Ownership phải kiểm tra ở BE trên đơn/lần thanh toán. Khách không được đổi maKh sang người khác. Tổng đài phải chọn khách khi tạo/báo giá.
- Tài xế chỉ đổi tiến trình đơn đang được gán; đọc/thu tiền đơn đã hoàn tất dựa trên lịch sử người thực hiện, không dựa duy nhất cờ đang bận.

## CSRF, proxy, CORS

- GET `/api/auth/csrf` cấp token ngẫu nhiên gắn với anonymous/authenticated session; trả no-store. Login dùng token anonymous, rồi lấy lại token của session mới. POST/PUT/PATCH/DELETE luôn có X-CSRF-Token, kể cả login/logout.
- Thiếu/sai token trả 403 CSRF_INVALID. SameSite hỗ trợ thêm, không thay kiểm tra token. Logout/hết phiên xóa token ở client.
- Swagger UI chạy cùng BE origin. Cookie không nhập thủ công; token lưu trong bộ nhớ trang, không localStorage. Interceptor chỉ thêm token cho origin của trang.
- FE tương lai ưu tiên proxy cùng origin `/api` về BE; cần giữ Set-Cookie/Cookie, CSRF header và thông tin HTTPS trusted proxy. T04 chưa thay FE health/proxy hiện có.
- Nếu cấu hình direct-origin dev: chỉ allowlist chính xác `http://localhost:3001` (Docker FE), `http://localhost:3000` (FE trực tiếp), credentials=true, Vary: Origin; methods GET/POST/PUT/PATCH/DELETE/OPTIONS, headers Content-Type/X-CSRF-Token/Idempotency-Key. Preflight không đòi đăng nhập. Không dùng wildcard với credentials. CORS health hiện có chưa phải filter nghiệp vụ này.
- VNPay IPN/return không cần cookie/CSRF. IPN phải xác minh signature, merchant, reference, amount và trạng thái; return không tự ghi nhận đã trả. Endpoint nhận IPN cần HTTPS public ở T18; localhost không đủ cho callback từ cổng.

## Báo giá, trạng thái và retry

- Báo giá có hạn 300 giây theo server (quyết định demo T04); maBaoGia là opaque reference gắn khách, tuyến, kiện hàng, cấu hình và giá. Tạo đơn so khớp và tính lại; hết hạn/đổi giá trả 409. Không tin tổng tiền từ FE.
- Hủy khi tuổi đơn <300 giây và CHO_GAN/DA_GAN, lý do không trắng; 299 được phép, 300/301 từ chối. Đơn cuối HOAN_TAT/DA_HUY không đổi nữa.
- Chuyển DA_GAN→DA_LAY_HANG→DANG_GIAO→HOAN_TAT; sự cố giữ DANG_GIAO, tài xế bận. Gán/từ chối/hủy/hoàn tất cần transaction và chống cạnh tranh.
- POST tạo đơn và tạo thanh toán bắt buộc Idempotency-Key. Scope user+operation, tồn tại ít nhất 24h: cùng key+payload trả lại status/body ban đầu; cùng key khác payload 409. Kiểm tra quyền trước replay. Timeout retry giữ key; thao tác mới tạo key mới. Request đang thực hiện cùng key được serialize; không tạo tài nguyên thứ hai.
- Các action khác: transition đến trạng thái hiện tại đã đạt trả lại hiện trạng; confirm-cash lặp cùng tiền trả kết quả cũ. Gán/từ chối/hủy không đáp ứng precondition trả 409. Incident lặp có thể tạo bản ghi mới nên không tự retry khi chưa rõ kết quả.
- Thanh toán chỉ sau HOAN_TAT; khách yêu cầu TIEN_MAT/VNPAY_QR; tài xế đã thực hiện hoặc TONG_DAI xác nhận tiền mặt. Mỗi đơn nhiều attempt, chỉ một online còn hiệu lực, một lần tất toán. Timeout giữ CHO_XU_LY, đối soát trước thử lại/chuyển phương thức. Callback lặp/đến muộn không thu hai lần, không hạ THÀNH CÔNG.
- Đơn tổng 0: thanhToan.trangThai=MIEN_CUOC, không gọi cổng; tạo payment trả PAYMENT_NOT_REQUIRED. MOMO và API hoàn tiền/đánh giá nằm ngoài phạm vi dù SQL có giá trị/bảng đó.
