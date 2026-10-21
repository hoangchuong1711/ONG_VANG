# Kế hoạch chuyển cổng admin sang dữ liệu thật designV2

> Lưu ý: đây là kế hoạch lịch sử. Từ V25–V26, cấu hình giá được nạp bằng migration và trang `/admin/pricing` cùng API `/api/v2/policies` đã được gỡ.

## 1. Mục tiêu và ranh giới

- Mọi màn còn xuất hiện dưới `/admin` chỉ đọc/ghi dữ liệu của backend designV2. Không dùng `sample-data`, `admin-demo`, `demo-store` hoặc `localStorage` làm nguồn dữ liệu nghiệp vụ.
- Backend và database quyết định quyền, trạng thái đơn, chính sách giá và kết quả thanh toán. Giao diện chỉ hiển thị kết quả được backend xác nhận.
- Tiếp tục dùng database designV2 hiện tại và các tài khoản do V9–V11 tạo (trong đó có `demo_admin`). Giữ tài khoản, đơn do người dùng tạo và giao dịch thật; V20 chỉ dọn 30 đơn fixture V9 cùng giao dịch giả liên quan theo ID cố định.
- Giữ 16 bảng nghiệp vụ trong `csdl.md`. Tính năng không có dữ liệu hoặc quy tắc trong 16 bảng sẽ được bỏ khỏi admin, trừ khi có yêu cầu thiết kế CSDL mới riêng.
- Phạm vi chính là cổng admin và API phục vụ nó. “Bỏ demo” trong kế hoạch này nghĩa là bỏ **dữ liệu nghiệp vụ viết cứng trên frontend** và state giả trong trình duyệt; tài khoản demo và cấu hình trong DB tiếp tục sử dụng. Riêng 30 fixture đơn V9 được dọn bằng V20 theo ID cố định như yêu cầu; dữ liệu người dùng vẫn được giữ. Module frontend dùng chung chỉ xóa sau khi mọi route phụ thuộc đã được thay thế hoặc giữ nguyên an toàn.

### Bằng chứng hiện trạng

- `AdminProvider` hiện đọc `useDemoStore`; phần lớn trang gọi `updateDemo`.
- `admin/payments` và `admin/drivers` gọi `/cod/drivers`; `admin/reports` gọi `/reports/revenue` và `/reports/drivers`. `requestApi` hiện không hỗ trợ các đường dẫn này và sẽ báo lỗi; chúng cũng không phải API báo cáo designV2.
- Backend V2 đã có `/orders`, `/drivers`, `/customers`, `/vehicles`, `/policies`, `/reports/finance`, `/profile` và luồng giao dịch nộp tiền của tài xế. Nhiều API chỉ trả danh sách cơ bản; admin cần thêm lọc, phân trang, chi tiết và quyền ghi.
- Schema V2 chỉ có các vai trò `KHACH_HANG`, `TAI_XE`, `TONG_DAI`, `CHU_DOI_XE`; không có vai trò `DIEU_PHOI` riêng. `nhat_ky_don_hang` có sự kiện `SU_CO`, nhưng không có hồ sơ người phụ trách/trạng thái giải quyết sự cố. Không có bảng lưu cài đặt đội xe hoặc tùy chọn thông báo.

## 2. Quyết định cho từng màn

| Màn | Dữ liệu/khả năng thật | Việc thực hiện |
| --- | --- | --- |
| Tổng quan | `don_hang`, `phan_cong_don_hang`, `nhat_ky_don_hang`, `v_so_du_tai_xe` | Tính chỉ số trên server; hiển thị đơn chờ gán, đang giao, hoàn tất, sự cố và tiền công ty theo V2. |
| Đơn hàng và chi tiết | `/api/v2/orders`, `/orders/{id}`, assign/cancel hiện có | Nối API; bổ sung lọc/phân trang server và quyền; dùng UUID, trạng thái V2 và nhật ký DB. |
| Tài xế | `tai_xe`, `tai_khoan`, `phan_cong_don_hang`, `v_so_du_tai_xe` | Danh sách/hồ sơ/số dư thật; bổ sung API tạo/sửa/khóa có audit. Bỏ COD, tỷ lệ nhận đơn, rating và vị trí demo khỏi màn live. |
| Phương tiện | `/api/v2/vehicles`, `phuong_tien` | Nối GET/POST hiện có; chỉ dùng biển số, loại, màu, đang hoạt động và tài xế. Bỏ `capacityKg`, `BAO_TRI`, `NGUNG` vì schema không có. |
| Sự cố | `nhat_ky_don_hang.loai='SU_CO'` | Giữ danh sách sự cố **chỉ đọc**, liên kết về đơn và sự kiện. Bỏ người phụ trách, nút giải quyết và ghi chú kết quả giả. Quy trình xử lý riêng chỉ được thêm sau khi thiết kế dữ liệu tương ứng. |
| Khách hàng | `khach_hang`, `tai_khoan`, `don_hang` | Nối danh sách/chi tiết; liên kết đơn bằng `ma_kh`; nếu cho đổi hạng/khóa tài khoản thì bổ sung API có ràng buộc, audit và thời hạn hội viên. Hiển thị đủ `THUONG`, `BAC`, `VANG`, `KIM_CUONG`. |
| Thanh toán | `phan_chia_cuoc`, `giao_dich_nop_tien`, `su_kien_thanh_toan`, `v_so_du_tai_xe` | Thay hẳn màn thanh toán khách/COD bằng công ty được hưởng, đã nhận VNPay, còn phải nộp, giao dịch đang chờ/cần đối soát và chi tiết theo tài xế. Không có nút tự đánh dấu đã thu. |
| Báo cáo | Dữ liệu tài chính V2 | API kỳ báo cáo + Excel dùng cùng một truy vấn và quy tắc tính; bỏ cột COD và thanh toán khách. |
| Biểu phí và thành viên | `/api/v2/policies`, 3 bảng chính sách | Dùng draft/công bố/đóng hiệu lực của V2. Bổ sung các trường km, kg và phụ thu thật; bỏ `maxDiscount` và phụ thu mẫu vốn không có trong schema. |
| Nhân sự và quyền | `tai_khoan`, `nhat_ky_kiem_toan` | Quản lý tài khoản `TONG_DAI` theo quyền chủ đội xe; hiển thị tài khoản chủ đội xe nhưng không cho tự hạ quyền/khóa chủ cuối cùng. Bỏ vai trò `DIEU_PHOI` giả; ma trận quyền lấy từ hợp đồng quyền backend. |
| Cài đặt | Không có dữ liệu tương ứng trong V2 | Gỡ route và mục menu. Hotline, email, khu vực và nút bật thông báo không được trình bày như cấu hình vận hành khi backend không sử dụng chúng. |
| Tài khoản | `/api/v2/profile`, đổi mật khẩu | Giữ màn thật; kiểm tra sửa hồ sơ, đổi mật khẩu, hết phiên và quyền. |

## 3. Thứ tự triển khai và cổng kiểm tra

### Tiến độ thực tế (18/10/2026)

| Giai đoạn | Trạng thái | Phần đã có và cổng còn thiếu |
| --- | --- | --- |
| 0 | Đã kiểm tra | Đang dùng DB V2 hiện tại; tài khoản, đơn và giao dịch đang chờ được giữ nguyên; bản sao lưu đã được xác minh. |
| 1 | Đã qua cổng cho nền tảng hiện có | Đã tách admin khỏi `AdminProvider` và dữ liệu cứng; danh sách đơn lọc/phân trang tại server. API đọc admin yêu cầu `CHU_DOI_XE`; thủ tục ghi hồ sơ/xe/chính sách/nhân sự ghi audit trong transaction. Các API ghi tài khoản khách, tài xế và tổng đài đã được bổ sung ở giai đoạn 4–5. |
| 2 | Đang kiểm tra cổng | Đã bổ sung giao dịch/số dư theo tài xế, trạng thái và sự kiện xác minh gần nhất đã lược dữ liệu nhạy cảm; báo cáo theo kỳ `[từ ngày, trước ngày)` giờ Việt Nam và Excel dùng cùng kết quả service. Đã đối chiếu số hiện tại với SQL độc lập và đọc file Excel bằng openpyxl. Chưa kiểm tra HTTP của bản mới và các tình huống callback trên DB test riêng. |
| 3 | Chưa qua cổng | Có danh sách/chi tiết đơn, phân công/hủy và tổng quan đọc DB. Lọc trạng thái còn ở frontend theo từng trang; chưa kiểm tra trên dữ liệu trên 100 đơn và thao tác đồng thời. |
| 4 | Đã triển khai; còn kiểm thử chấp nhận | Đã có CRUD/khóa tài xế, xe; hồ sơ và khóa khách. Kiểm thử các trường hợp phân công đang hoạt động, nhiều trang và đồng bộ chéo để ở giai đoạn 6. |
| 5 | Đã qua cổng kiểm thử mục tiêu | Chính sách, xem thử báo giá, nhân sự tổng đài, hồ sơ và đổi mật khẩu đã nối DB; migration V13, smoke cô lập, build và đọc xác nhận trên cổng 3001/8081 đều qua. |
| 6 | Đang kiểm thử | Smoke đọc live, smoke ghi chính sách/nhân sự/tài xế/khách, concurrency/retry, khóa tài xế đang có đơn và phân trang 102 đơn trên DB test đều qua. OpenAPI/Postman có hợp đồng V2 (80 operation); kiểm tra spec, đồng bộ collection, boundary và 2 test Swagger đều qua. Còn callback VNPay trên DB test, UI tải/rỗng/lỗi và đa trình duyệt sau khi có thông tin đăng nhập hợp lệ, cùng sao lưu/đối chiếu ngay trước triển khai. Xem [báo cáo kiểm thử](admin_live_design_v2_test_report.md). |
| 7 | Đã dọn luồng frontend; còn smoke runtime | Mọi route admin và các luồng dùng chung đã bỏ kho dữ liệu mẫu frontend. Theo dõi/thanh toán mở chi tiết đơn thật; tạo đơn tổng đài dùng form V2; lịch sử tài xế đọc API V2; trang đánh giá được gỡ vì schema không có dữ liệu đánh giá. Các module `admin-demo`, `admin-extras`, `sample-data`, `demo-store`, `customer-demo`, `demo-pricing` và profile demo đã được xóa sau khi xác nhận không còn import. Build production qua; còn smoke dưới tài khoản từng vai trò và kiểm tra giao diện trên trình duyệt. |

Các trang chỉ đọc hiện tại là bước nối dữ liệu thật, **không được xem là hoàn thành** tính năng quản lý tương ứng. Chỉ đánh dấu một giai đoạn xong sau khi đạt điều kiện “Qua cổng” bên dưới.

### Giai đoạn 0 — Chốt database hiện dùng và bảo toàn dữ liệu

1. Kiểm tra `MSSQL_DATABASE`, `DESIGN_V2_DEMO`, `ROUTE_PROVIDER`, Flyway history và `/api/health` của môi trường đang chạy. Ghi lại database nào chứa đơn/giao dịch thật và giao dịch VNPay còn chờ.
2. Tiếp tục dùng DB designV2 hiện tại với `demo_admin` và các tài khoản mẫu; xác nhận đăng nhập, quyền, số đơn và số dư lấy từ DB. Giữ nguyên checksum V9–V11; không tạo/chuyển sang DB live riêng cho kế hoạch này. Dọn fixture V9 bằng migration V20, không đụng các đơn và giao dịch người dùng.
3. Sao lưu DB trước khi sửa code hoặc cấu hình. Giữ nguyên đơn do người dùng tạo và giao dịch VNPay đang chờ; đối soát kết quả giao dịch qua luồng hiện có khi có thông tin đáng tin, không xóa hay tự đặt trạng thái kết thúc.
4. Chạy tuyến thật khi vận hành (`ROUTE_PROVIDER=goong` và cấu hình hợp lệ). Không hiển thị vị trí demo như vị trí GPS thật.

**Qua cổng:** `/api/health` xác nhận đúng DB V2, `demo_admin` đăng nhập được, Flyway hợp lệ, đã có bản sao lưu kiểm tra được và giao dịch chưa rõ kết quả vẫn được giữ. Việc đối chiếu số liệu hiển thị trên admin thuộc các giai đoạn 1–6 sau khi bỏ frontend viết cứng.

**Kiểm tra giai đoạn 0 ngày 18/10/2026:** `/api/health` trả `databaseName=mini_ong_vang_design_v2_demo`; Flyway V1–V11 thành công. DB này có 8 tài khoản, 4 đơn do người dùng tạo, 1 giao dịch `CHO_XU_LY` 29.103đ liên kết 3 đơn và chưa có sự kiện xác minh. Đăng nhập `demo_admin` trên API V2 trả vai trò `CHU_DOI_XE`. Bản sao lưu COPY_ONLY ở `.local/backups/design_v2_demo_stage0_20261018_212458.bak` đã qua `RESTORE VERIFYONLY`. Theo yêu cầu mới, giữ cả 4 đơn và giao dịch ở DB đang dùng; không chuyển hay xóa. DB `mini_ong_vang_design_v2_live` đã được tạo trong lúc theo phiên bản kế hoạch cũ, có schema V1–V8 và một tài khoản `admin`, **không được ứng dụng sử dụng** vì `.env` vẫn trỏ DB demo. Không chuyển cấu hình sang DB đó trong kế hoạch hiện tại.

### Giai đoạn 1 — Hợp đồng API và nền tảng admin

1. Xây module API admin V2 có DTO rõ ràng. Mọi request dùng phiên hiện tại; kiểm tra `CHU_DOI_XE` ở backend. Không tin vai trò hoặc ID actor từ body.
2. Định nghĩa phân trang, lọc, sắp xếp, mốc thời gian UTC/giờ Việt Nam, định dạng tiền nguyên VND và lỗi `400/401/403/404/409/5xx` nhất quán.
3. Ghi `nhat_ky_kiem_toan` cùng transaction cho thao tác tài khoản, khách hàng, tài xế, xe và chính sách. Với các thao tác lặp/đồng thời, dùng khóa/phiên bản hoặc quy tắc xung đột phù hợp.
4. Loại bỏ `AdminProvider` demo khỏi cây `/admin`; tạo lớp gọi API V2 và state chỉ cho tải/lỗi/bộ lọc/form. Route chưa hoàn thành phải báo chưa khả dụng, không hiện dữ liệu mẫu.
5. Gỡ nhãn “Dữ liệu demo”, nút “Đặt lại demo” và mọi import `sample-data`/`admin-demo`/`demo-store` còn dùng trong admin. Chỉ xóa module dùng chung sau khi kiểm tra không còn màn khác phụ thuộc.

**Qua cổng:** các trang admin không đọc/ghi `localStorage` nghiệp vụ; API lỗi không được đổi thành số 0 hoặc danh sách rỗng; gọi trực tiếp API bằng vai trò sai trả `403`.

**Hợp đồng đã triển khai cho danh sách đơn admin:** `GET /api/v2/admin/orders?page=0&size=20&status=CHO_GAN`; `status` có thể bỏ qua, chỉ nhận mã trạng thái V2. `page` bắt đầu từ 0, `size` từ 1 đến 100; thứ tự cố định là `tao_luc DESC, ma_don`. Phản hồi gồm `items`, `total`, `page`, `size`; `total` là tổng số bản ghi sau lọc, không phụ thuộc trang hiện tại. Giá trị tiền lấy nguyên VND từ DB; thời điểm từ API ở UTC, giao diện admin hiển thị theo `Asia/Ho_Chi_Minh`. Tham số sai trả `400`, chưa đăng nhập `401`, vai trò khác `403`.

**Kiểm tra API trên backend riêng cổng 8082:** `demo_admin` nhận `200`, tổng 4 đơn với `size=2`; khách hàng nhận `403`, phiên vô danh nhận `401`, trang âm hoặc trạng thái không hợp lệ nhận `400`. Kiểm tra này chỉ đọc DB đang dùng và không thay đổi tài khoản, đơn hoặc giao dịch. Cổng 8081/3001 vẫn chạy bản cũ trong lúc kiểm tra.

**Kiểm tra sau khi cập nhật cổng 3001/8081:** backend và frontend build thành công; `/api/health` vẫn trỏ `mini_ong_vang_design_v2_demo`; đăng nhập `demo_admin` qua cổng 3001 trả `CHU_DOI_XE`; `/admin/orders?page=0&size=2` trả `total=4`, 2 bản ghi; trang vượt cuối vẫn trả `total=4`, danh sách rỗng; route `/admin/orders` trả HTTP 200. `/admin/payments` đọc 1 giao dịch và giao dịch `CHO_XU_LY` còn nguyên. Rà soát các route/component admin không còn import `admin-demo`, `demo-store`, `sample-data` hoặc đọc/ghi `localStorage` nghiệp vụ; lỗi API được hiển thị thay vì thay bằng số 0. Backend kiểm thử cổng 8082 đã dừng sau kiểm tra.

### Giai đoạn 2 — Thanh toán và báo cáo V2

1. Bổ sung API admin đọc số dư theo tài xế, danh sách giao dịch, trạng thái, thời gian, mã tham chiếu và sự kiện xác minh đã lược bỏ dữ liệu nhạy cảm. Tách `CHO_XU_LY`, `CHUA_RO_KET_QUA`, `THANH_CONG`, `KHONG_THU` và trường hợp cần đối soát.
2. Xây lại `/admin/payments` với công ty được hưởng, đã nhận qua VNPay, còn phải nộp và khoản đang thanh toán. Không tạo giao dịch thay tài xế hoặc tự sửa kết quả VNPay từ admin.
3. Mở rộng báo cáo theo khoảng `[từ ngày, trước ngày)` và múi giờ Việt Nam. Tách dòng tiền phát sinh theo `phan_chia_cuoc.ghi_nhan_luc`, tiền đã nhận theo `giao_dich_nop_tien.giai_quyet_luc`, số dư tại cuối mốc; không dùng số dư hiện tại để suy ra số dư quá khứ.
4. API JSON và Excel cùng dùng một service/truy vấn đối chiếu; có tổng hợp và theo tài xế. Gỡ `/cod/drivers`, `/reports/revenue`, `/reports/drivers` khỏi admin.

**Qua cổng:** tổng trên UI, API, Excel và SQL độc lập khớp nhau; giao dịch chờ không được tính là đã nhận; callback lặp không cộng hai lần; khoản mới phát sinh sau khi bắt đầu thanh toán vẫn còn phải nộp.

**Tiến độ kiểm tra giai đoạn 2 ngày 18/10/2026:** service báo cáo dùng `phan_chia_cuoc.ghi_nhan_luc` để tính tiền phát sinh trong kỳ, `giao_dich_nop_tien.giai_quyet_luc` với trạng thái `THANH_CONG` để tính tiền đã nhận. Công nợ cuối kỳ là tổng phần công ty lũy kế trước mốc kết thúc trừ tổng tiền VNPay thành công trước mốc đó; giao dịch `CHO_XU_LY` vẫn tính trong công nợ. JSON và Excel lấy cùng đối tượng kết quả. Với kỳ `2026-01-01` đến trước `2026-10-19`, truy vấn service và SQL độc lập đều trả phần công ty `29.103đ`, thu nhập tài xế `116.412đ`, VNPay đã nhận `0đ`, công nợ `29.103đ`; DB vẫn có 1 giao dịch `CHO_XU_LY`. Kỳ 18/10 riêng có công ty phát sinh `29.103đ`, còn kỳ đầu tháng 1 là 0đ. Tệp XLSX được đọc thành công, tổng lần lượt là `29103`, `116412`, `0`, `29103` và có 3 dòng tài xế. Smoke HTTP sau cập nhật bản mới đã qua cả ở backend cô lập cổng 8082 và cổng thật 8081: JSON/Excel khớp; phân trang và lọc giao dịch hoạt động; sự kiện không lộ callback thô; ngày/trạng thái sai bị từ chối; khách hàng bị chặn; `/admin/payments` trả HTTP 200. `/api/health` xác nhận ứng dụng vẫn nối `mini_ong_vang_design_v2_demo`. Giao dịch `CHO_XU_LY` được giữ nguyên.

**Còn lại để qua đầy đủ cổng giai đoạn 2:** kiểm thử callback lặp, callback mâu thuẫn và khoản phát sinh trong lúc thanh toán trên DB test riêng ở giai đoạn 6. Không tạo callback thử trên DB đang dùng. Sau khi các kiểm thử đó qua mới đánh dấu toàn bộ tiêu chí giai đoạn 2 hoàn tất.

### Giai đoạn 3 — Đơn hàng, tổng quan và sự cố

1. Nối danh sách/chi tiết đơn vào API V2; mở rộng backend để lọc/phân trang server, tránh giới hạn hiện tại `usp_doc_don NULL,0,100` làm tổng quan thiếu đơn.
2. Dùng các procedure phân công/hủy hiện có. Sau khi ghi, tải lại bản ghi từ server và hiển thị `409` nếu trạng thái thay đổi đồng thời.
3. Tạo API tổng quan tổng hợp trên DB, dùng chung quy tắc với trang đơn và tài chính. Sự cố chỉ đọc từ `nhat_ky_don_hang` và liên kết tới chi tiết đơn.

**Qua cổng:** đơn mới xuất hiện trên admin sau khi tải lại; phân công/hủy được thấy ở màn tổng đài và tài xế; tổng số đơn đúng khi vượt 100; không có nút “giải quyết sự cố” giả.

**Tiến độ giai đoạn 3 ngày 18/10/2026:** danh sách đơn admin dùng truy vấn DB có lọc trạng thái và phân trang server; tổng số đếm toàn bộ đơn sau lọc, không giới hạn 100. Chi tiết đơn hiện thông tin người nhận, tuyến đường, kiện hàng, nhật ký trạng thái và lịch sử phân công. Phân công/hủy vẫn gọi `usp_phan_cong`/`usp_huy_don`, procedure khóa và kiểm tra trạng thái trong transaction; SQL lỗi quy tắc nghiệp vụ trả HTTP 409 để giao diện giữ lại lỗi và tải lại sau khi thao tác thành công. Dashboard tổng hợp số đơn toàn bộ DB, đơn gần đây và tài chính từ các view V2. Danh sách sự cố chỉ đọc `nhat_ky_don_hang`, liên kết đến chi tiết đơn và nay có phân trang server.

Backend JDK 21 và frontend TypeScript build thành công. Smoke chỉ đọc qua trên backend cô lập và sau triển khai cổng 8081/3001: phân trang đơn, truy vấn trang rỗng vẫn giữ đúng tổng, chi tiết có kiện hàng/nhật ký/lịch sử phân công, tổng quan, phân trang sự cố, đầu vào sai bị từ chối. Dashboard, danh sách đơn và sự cố trả HTTP 200; smoke tài chính giai đoạn 2 vẫn qua. `/api/health` xác nhận DB `mini_ong_vang_design_v2_demo`; hiện có 4 đơn, 0 sự cố. Không tạo/hủy/phân công đơn trong DB đang dùng.

**Còn lại để qua đầy đủ cổng giai đoạn 3:** xác nhận tập dữ liệu vượt 100 đơn và kiểm tra phân công/hủy được phản ánh ở cả admin lẫn màn tài xế trên DB test riêng; các thao tác ghi không chạy trên DB đang dùng để giữ nguyên dữ liệu mẫu và giao dịch đang chờ.

### Giai đoạn 4 — Tài xế, phương tiện, khách hàng

1. Hoàn thiện API đọc/ghi cho tài xế và tài khoản liên quan. Tạo/sửa hồ sơ có kiểm tra CCCD, giấy phép, ngày hết hạn, số điện thoại và khóa duy nhất. Khóa tài xế đang có chuyến phải theo quy tắc xử lý phân công rõ ràng.
2. Nối phương tiện với `/api/v2/vehicles`; form dùng đúng các cột V2 và quy tắc một xe gắn một tài xế.
3. Mở rộng API khách hàng cho chi tiết, đơn theo `ma_kh`, hạng và thời hạn hội viên. Nếu cho khóa tài khoản, tăng `auth_version` để vô hiệu phiên cũ và ghi audit.

**Qua cổng:** tạo/sửa/khóa được thấy sau khi đăng nhập bằng trình duyệt khác; vi phạm unique/FK trả thông báo rõ; tài xế hoặc khách bị khóa không tiếp tục dùng phiên cũ.

**Tiến độ giai đoạn 4 ngày 18/10/2026:** thêm migration `V12__admin_driver_customer_management.sql` chỉ tạo hai stored procedure quản trị và cấp quyền execute cho backend; đã chạy migration trên DB rỗng riêng `mini_ong_vang_design_v2_test_admin` trước khi áp dụng vào demo. API owner-only hỗ trợ tạo/sửa hồ sơ tài xế, khóa/mở khóa tài khoản tài xế và khách hàng; tạo/sửa xe qua procedure hiện có; xem danh sách và chi tiết khách hàng kèm hạng, thời hạn thành viên và đơn theo `ma_kh` có phân trang. Khóa tài xế có phân công đang hoạt động bị procedure từ chối; khóa/mở khóa tăng `auth_version`, tài xế chuyển về `NGHI`/`OFFLINE` để không tự trở lại sẵn sàng. Password chỉ lưu BCrypt; không đưa password/hash vào audit.

Smoke ghi dữ liệu trên DB test riêng đã qua: tạo/cập nhật tài xế, trùng CCCD trả `409` và rollback không tạo tài khoản rời, tạo xe, khóa tài khoản làm phiên hiện tại hết hiệu lực, đăng nhập tài khoản khóa bị từ chối, mở khóa tài xế/khách hàng và đọc chi tiết khách hàng. Sau triển khai, trang tài xế/xe/khách hàng trả HTTP 200; API đọc xác nhận 3 tài xế, 3 xe, 3 khách hàng trên `mini_ong_vang_design_v2_demo`. Flyway ghi nhận V12; DB demo vẫn có 8 tài khoản, 4 đơn và 1 giao dịch `CHO_XU_LY`.

**Còn lại để qua đầy đủ cổng giai đoạn 4:** kiểm tra khóa tài xế khi đang có đơn phân công, nhiều trang đơn khách hàng và đồng bộ chéo giữa trình duyệt admin/tài xế trên DB test có dữ liệu nghiệp vụ. Chưa chạy thao tác ghi hồ sơ hoặc trạng thái trên DB demo.

### Giai đoạn 5 — Chính sách giá, nhân sự và tài khoản

1. Nối `/admin/pricing` với `/api/v2/policies`: lưu nháp, sửa/xóa nháp, công bố, đóng hiệu lực; hiển thị cả giá km, kg, phụ thu và tỷ lệ giảm của bốn hạng theo schema.
2. Xem thử báo giá bằng API `/api/v2/fare/quote` hoặc cùng logic backend; đơn cũ giữ nguyên giá đã chốt. Không chỉnh trực tiếp bản đã công bố.
3. Bổ sung API quản lý nhân sự `TONG_DAI` trên `tai_khoan`, gồm xem, tạo, cập nhật, khóa/mở khóa và cấp mật khẩu an toàn. Giữ chủ đội xe cuối cùng có quyền truy cập; mọi thay đổi ghi audit và tăng `auth_version` khi cần thu hồi phiên.
4. Kiểm tra màn tài khoản hiện tại với API `/api/v2/profile` và đổi mật khẩu.

**Qua cổng:** chính sách mới chỉ ảnh hưởng báo giá khi đến thời điểm hiệu lực; quyền trên UI khớp quyền backend; khóa nhân sự thu hồi phiên; không có vai trò `DIEU_PHOI` hoặc hạn mức giảm giá giả.

**Tiến độ giai đoạn 5 ngày 18/10/2026:** trang chính sách có tạo/sửa/xóa bản nháp, công bố và đóng hiệu lực; hiển thị giá cước km/kg, phụ thu, tỷ lệ giảm ba hạng lưu trong DB và mức 0% ngầm định của hạng `THUONG`. Xem thử báo giá gọi `/fare/quote` và không tạo đơn. Nhân sự có thể tạo/sửa/khóa/mở khóa/cấp lại mật khẩu cho `TONG_DAI`; tài khoản `CHU_DOI_XE` chỉ xem, không có thao tác khóa hay hạ quyền. Thủ tục SQL ghi audit trong transaction, lưu mật khẩu BCrypt và tăng `auth_version` khi cấp lại mật khẩu/khóa/mở khóa để thu hồi phiên. Hồ sơ cá nhân sửa được; đổi mật khẩu yêu cầu mật khẩu cũ, ghi audit, thu hồi phiên hiện tại và yêu cầu đăng nhập lại.

Migration `V13__admin_staff_profile_management.sql` đã chạy trước trên `mini_ong_vang_design_v2_test_admin`, sau đó được áp lên `mini_ong_vang_design_v2_demo`; V13 chỉ thêm thủ tục và quyền thực thi, không sửa/xóa bản ghi nghiệp vụ. Smoke trên DB test xác nhận vòng đời bản nháp, đủ dữ liệu giá, báo giá hiện tại không đổi khi công bố biểu phí hiệu lực tương lai, tạo/sửa/khóa/mở khóa/cấp mật khẩu nhân viên, thu hồi phiên, không tác động chủ đội xe cuối cùng và đọc/cập nhật hồ sơ. Backend JDK 21, TypeScript và Next production build đều thành công. Sau triển khai, `/api/health` xác nhận đúng DB `mini_ong_vang_design_v2_demo`; API chính sách/nhân sự đọc được 6 phiên bản và 2 tài khoản, các trang `/admin/pricing`, `/admin/staff`, `/admin/account` trả HTTP 200. Không tạo hoặc sửa dữ liệu nghiệp vụ trên DB demo.

### Giai đoạn 6 — Kiểm thử trên DB đang dùng

1. Kiểm thử DB/API/UI trên DB V2 test riêng: quyền, trạng thái đơn, hai thao tác đồng thời, rollback, khách/tài xế bị khóa, chính sách giá, kỳ báo cáo, Excel và các trạng thái VNPay.
2. Kiểm tra từng route `/admin` trên cổng 3001 bằng tài khoản chủ thật; kiểm tra màn rỗng, tải chậm, API lỗi, làm mới trang và đăng nhập ở trình duyệt khác.
3. Kiểm tra mọi route còn dùng mã demo hoặc API V1; lập bảng đối chiếu route → API V2/thao tác thay thế → kết quả kiểm thử. Không xóa module dùng chung ở bước này khi màn khác vẫn import.
4. Cập nhật README, API/Postman và hướng dẫn sử dụng admin với DB V2 hiện tại, `demo_admin`, báo cáo và đối soát. Giữ nguyên mọi migration đã áp dụng. Phiên bản Flyway phải duy nhất giữa hai locations; migration mới dùng số sau schema V16.
5. Sao lưu và đối chiếu DB trước khi triển khai code admin; có cách khôi phục ứng dụng tương ứng. Không xóa dữ liệu hoặc giao dịch đang chờ khi cập nhật giao diện/API.

**Tiến độ kiểm thử ngày 18/10/2026:** các route admin trên `localhost:3001` trả HTTP 200 (route settings đã gỡ trả 404); `/api/health` xác nhận backend live đang dùng `mini_ong_vang_design_v2_demo`. Smoke API chỉ đọc bằng `demo_admin` trước đó qua danh bạ, đơn/tổng quan/sự cố, báo cáo JSON/Excel và thanh toán. Kết quả live vẫn là 4 đơn và giao dịch VNPay `CHO_XU_LY` 29.103đ; không phát sinh ghi dữ liệu. API admin từ chối request chưa đăng nhập bằng 401 và từ chối khách hàng bằng 403. Trên DB test, smoke V12/V13, retry idempotent, hai phân công đồng thời, đua phân công/hủy, khóa tài xế đang có đơn, danh bạ, báo cáo JSON/Excel và phân trang 102 đơn đều qua; 104 đơn test được giữ ở `DA_HUY`, không còn đơn chờ hoặc phân công đang hoạt động. Next production build qua; `npm.cmd run check --prefix tools/api` qua, gồm OpenAPI 80 operation, Postman đồng bộ, backend boundary và 2 test Swagger. Chrome headless hiện tải trang `/admin` và bị chuyển về màn đăng nhập; API CSRF trả 200. Một lần thử đăng nhập `demo_admin` bằng `DEMO_PASSWORD` hiện có trả 401 `INVALID_CREDENTIALS`, nên đã dừng và chưa chạy smoke UI có phiên. SQL local không kết nối được bằng `sqlcmd`, Docker daemon cũng từ chối quyền; chưa chạy callback trên DB test. Ma trận route/API nằm trong [báo cáo kiểm thử](admin_live_design_v2_test_report.md), tài liệu API bổ trợ ở [hợp đồng admin V2](../api/design-v2-admin.md). Chưa đóng giai đoạn: còn test callback VNPay trên DB test, UI trạng thái biên/đa trình duyệt sau khi có thông tin đăng nhập hợp lệ và sao lưu/đối chiếu ngay trước triển khai. Tài khoản fixture chỉ được điều chỉnh trong DB test.

### Giai đoạn 7 — Dọn dữ liệu viết cứng trên frontend

Mục tiêu là các màn admin hiển thị bản ghi và kết quả tính từ API/DB designV2 hiện tại. **Không xóa tài khoản demo, đơn/giao dịch do người dùng tạo, V9–V11 hoặc cấu hình đang dùng.** Migration V20 chỉ dọn 30 fixture V9 nhận diện bằng ID và khóa yêu cầu cố định, giữ nguyên các dữ liệu còn lại.

1. Kiểm kê từng route `/admin`: mọi import từ `admin-demo.ts`, `admin-extras.ts`, `sample-data.ts`, `demo-store.ts`, `demo-pricing.ts`; mọi mảng/đối tượng mẫu khai báo ngay trong component; các thao tác `localStorage` dùng làm nguồn dữ liệu nghiệp vụ; nhãn và nút “Đặt lại demo”. Ghi route, trường hiển thị, API V2 thay thế và quyền cần có.
2. Chuyển từng route sang API V2 và dữ liệu DB: tổng quan, đơn, tài xế, xe, khách, sự cố, thanh toán, báo cáo, chính sách, nhân sự và tài khoản. Với trường không có nguồn thật trong schema/API, bỏ khỏi UI hoặc thiết kế API/DB cần thiết trước khi hiển thị. Trạng thái tải/rỗng/lỗi phải nói đúng tình trạng API; không tự điền mẫu khi API lỗi.
3. Thay các thao tác tạo/sửa/xóa giả bằng request có quyền và audit, đọc lại bản ghi từ server sau khi ghi. Không để `updateDemo` hoặc `localStorage` làm cho thay đổi chỉ xuất hiện ở một trình duyệt.
4. Kiểm tra module dùng chung với các trang khách/tài xế/tổng đài (`tracking/[id]`, `rating/[id]`, `payment/[id]`, `driver/history`, `dispatcher/create-order`). Chỉ xóa file demo frontend khi không còn import; route ngoài admin đang dùng chúng phải được chuyển sang API thật hoặc xử lý riêng theo nghiệp vụ, không xóa để làm hỏng màn đang chạy.
5. Tìm lại toàn bộ `src/frontend` theo `admin-demo`, `demo-store`, `sample-data`, `customer-demo`, `demo-pricing`, `SAMPLE_`, dữ liệu cứng và `localStorage` nghiệp vụ. Kiểm tra từng kết quả: xóa dữ liệu giả khỏi các luồng đã chuyển, giữ các trường hợp còn phụ thuộc đến khi có thay thế. Build frontend và smoke từng vai trò trên DB hiện tại.

**Cập nhật kiểm kê ngày 18/10/2026:** các màn `/admin` không còn import kho demo hoặc đọc/ghi `localStorage` nghiệp vụ. Những phụ thuộc ngoài admin cũng đã xử lý: `/tracking/[id]` và `/payment/[id]` chuyển tới chi tiết đơn V2; `/dispatcher/create-order` dùng `LiveOrderForm` nối API V2; `/driver/history` đọc đơn và trạng thái tài xế từ API V2; `/rating/[id]` trả 404 vì schema không có bảng/API đánh giá. Sau khi xác nhận không còn import, đã xóa `admin-demo.ts`, `admin-extras.ts`, `sample-data.ts`, `demo-store.ts`, `customer-demo.ts`, `demo-pricing.ts` và component hồ sơ demo. `localStorage` còn dùng duy nhất để giữ `Idempotency-Key` cho thao tác nộp tiền của tài xế, không làm nguồn trạng thái nghiệp vụ. `npm.cmd run build --prefix src/frontend` thành công. Smoke vai trò cho các trang vừa chuyển chưa chạy do Docker Desktop không kết nối được; phần này còn trong cổng kiểm thử giai đoạn 6.

**Hoàn tất toàn kế hoạch khi:** mọi màn admin còn trong menu lấy số liệu từ API/DB designV2; các thao tác ghi lưu vào DB và hiện ở trình duyệt khác; lỗi API không bị che bằng dữ liệu mẫu; báo cáo/tiền đối chiếu được với SQL; các tài khoản và bản ghi demo hiện có vẫn đăng nhập/hiển thị theo dữ liệu DB; giao dịch đang chờ được giữ nguyên để đối soát. Không có yêu cầu xóa seed, migration hoặc DB demo trong phạm vi kế hoạch này.
