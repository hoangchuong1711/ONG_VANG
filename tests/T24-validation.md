# T24 — Kiểm thử frontend điều phối

Ngày kiểm tra: 13/10/2026 (Asia/Bangkok). Nhánh `feat/t24-dispatcher-integration`, nền `develop` `0f98c06`. Thay đổi CSDL/schema/ERD: **không có**.

## Phạm vi bằng chứng

- Chromium thực tế `/usr/bin/chromium` trong cloud; Playwright, FE Next.js và HTTP fixture chạy tại 3100/18082.
- **48 browser tests PASS**: 24 tình huống × desktop/mobile 390×844, 0 fail; lượt rà lại sau khi nối form đăng nhập chung với T24. Lệnh cloud: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:t24 --prefix src/frontend`.
- `npm run lint`, TypeScript `tsc --noEmit`, `npm run build`: đạt; nguồn runtime được biên dịch, không dùng artifact T19/T20 làm chứng minh T24.
- Ba live cases FE/BE/SQL Server: **BLOCKED / NOT RUN trong cloud**, vì `docker pull mcr.microsoft.com/mssql/server:2022-latest` trả Forbidden. Đã có mã test, lệnh chạy local và gate CI; không ghi PASS cho transaction/DB thật ở đợt T24 này.
- Test proxy không intercept request: cookie HttpOnly được cấp/thay qua Next rewrite, CSRF mới sau login và xóa cookie logout được xác nhận với HTTP fixture. Fixture không phải backend SQL Server.

## Expected / Actual

| Ca | Expected | Actual | Kết quả |
| --- | --- | --- | --- |
| UI01 Không có session | Chặn khu vực, không gọi API nghiệp vụ | Login gate hiện; số request orders=0 | PASS ×2 |
| UI02 Sai vai trò | Không có quyền điều phối | KHACH_HANG bị chặn, không có action gán | PASS ×2 |
| UI03 Đăng nhập | Lỗi credential hiện; đúng gửi CSRF và mở board | POST body/header được kiểm tra, đúng chuyển board | PASS ×2 |
| UI04 Đơn/lọc/phân trang/T23 | Query đúng, reset page, chặn khoảng ngày sai; link T23 | Trạng thái/ngày/page đúng, ngày sai không gửi, href đúng, form T23 mở và thông báo xem trước hiện | PASS ×2 |
| UI05 Tài xế | ONLINE/rảnh mặc định, lọc bận/hoạt động/page | Request drivers đúng, tên/xe/SĐT hiện | PASS ×2 |
| UI06 Chi tiết | Phân công từ BE; kiện/cước/journal đúng thứ tự | TX01 đang mở, lịch sử TX99 từ chối giữ nguyên, journal thuTu 1→2 | PASS ×2 |
| UI07 Không có tài xế | Không thể xác nhận gán | Rỗng có thông báo, nút disabled, không POST | PASS ×2 |
| UI08 Gán thành công | Cần chọn, CSRF/maTx đúng, một POST, tải lại | Nút khóa khi gửi; một POST, đơn rời danh sách sau đọc BE | PASS ×2 |
| UI09 Tài xế vừa bận | Thông báo, bỏ chọn và đọc gợi ý mới | 409 DRIVER_UNAVAILABLE; TX02 mới, nút chờ chọn lại | PASS ×2 |
| UI10 Đơn bị người khác gán | Giữ lỗi, tải lại trạng thái | 409 ORDER_STATE_CONFLICT; thông báo vẫn hiện sau đơn rời hàng đợi | PASS ×2 |
| UI11 Hủy | Lý do bắt buộc/trim, CSRF, đọc BE sau thành công | Khoảng trắng bị chặn; một POST lý do trim, detail DA_HUY | PASS ×2 |
| UI12 Quy tắc hủy | 300 giây không được hủy, DANG_GIAO không có action | Nút vô hiệu / action không hiện | PASS ×2 |
| UI13 Hết hạn từ BE | Không tự đổi trạng thái; khóa xác nhận cũ | 409 hết hạn giữ CHO_GAN; nút khóa | PASS ×2 |
| UI14 Mất mạng | Không tự retry POST; yêu cầu kiểm tra dữ liệu | Một POST bị abort, lỗi hiện, lựa chọn xóa | PASS ×2 |
| UI15 Session hết hạn | Khóa toàn bộ action | 401 SESSION_EXPIRED hiện gate đăng nhập | PASS ×2 |
| UI16 Tải lỗi/thử lại | Lỗi có retry, không fallback demo | 500 không có đơn giả; retry đọc dữ liệu fixture thành công | PASS ×2 |
| UI17 Bàn phím | Escape đóng và trả focus | Focus dialog → đóng → nút mở | PASS ×2 |
| UI18 Proxy/session | Cookie HttpOnly và CSRF đúng sau đổi session | Login/logout qua HTTP fixture thật với cookie và token mới; cookie logout xóa | PASS ×2 |
| UI19 Phản hồi đến trễ | Bộ lọc cũ không ghi đè mới | Response DA_GAN chậm không thay kết quả HOAN_TAT | PASS ×2 |
| UI20 Trang gợi ý | Request đúng trang, đổi trang bỏ chọn | TX02 trang 2 hiện, chưa chọn thì không xác nhận | PASS ×2 |
| UI21 Thời hạn khi modal mở | Đủ 300 giây phải khóa xác nhận | Clock tiến qua mốc, nút hủy khóa và thông báo | PASS ×2 |
| UI22 CSRF bị từ chối | Không báo thành công/không tự retry | 403 hiện lỗi; một POST, bỏ chọn | PASS ×2 |
| UI23 Gợi ý báo đơn đã đổi trạng thái | Không dùng lựa chọn cũ để gửi gán | GET gợi ý 409 hiện lỗi; nút khóa, không POST | PASS ×2 |
| UI24 Đường vào từ đăng nhập chung | Chưa có phiên: đăng nhập thật tại form chung rồi mở T24; có phiên: vào T24 ngay | Body đăng nhập `demo_dispatcher`, board hiện; bấm lại với phiên hiện tại mở thẳng board | PASS ×2 |

## Ca FE/BE/SQL Server thật còn cần chạy

Nguồn: `src/frontend/tests/t24-live/dispatch-live.spec.ts`; lệnh trong [T24-dispatcher.md](../docs/T24-dispatcher.md).

| Ca | Expected / dữ liệu đối chiếu | Actual cloud | Kết quả |
| --- | --- | --- | --- |
| LIVE01 Gán → chi tiết → hủy | Một phân công mở, đúng maTx; hủy có lý do/HUY_DON, không còn phân công mở, driver hết bận | Chưa dựng được SQL Server | BLOCKED / NOT RUN |
| LIVE02 Hai session cùng đơn | HTTP 200/409, UI loser hiện conflict, DB chỉ một phân công mở | Chưa dựng được SQL Server | BLOCKED / NOT RUN |
| LIVE03 Hai đơn cùng tài xế | HTTP 200/409 DRIVER_UNAVAILABLE; UI đọc gợi ý mới, DB một phân công mở cho driver | Chưa dựng được SQL Server | BLOCKED / NOT RUN |

Sau lượt live, chạy lại `scripts/check-design-v1-invariants.sql` hiện có và lưu dòng kết quả; không sửa script/schema. Gắn commit được test và kết quả CI/reviewer vào báo cáo trước khi đóng task.

## Phát hiện / retest

- Lần tải Chromium Playwright trong cloud bị CDN 403; dùng Chromium hệ thống để chạy UI thực tế. SQL Server MCR vẫn bị chặn, không thay bằng PostgreSQL/schema cũ.
- Lượt đầu có 26/36 test đạt: locator alert bắt cả route announcer của Next; fixture 500 chỉ lỗi một lần nên StrictMode đọc tiếp thành công; label select chưa đủ rõ. Sửa locator vào main, fixture giữ lỗi tới retry, thêm aria-label cho bộ lọc. Sau bổ sung UI19–22, retest **44/44 PASS** (lượt trước); lượt rà bổ sung có 46 ca.
- Đối chiếu DTO đã sửa Parcel theo contract `loaiHangHoa/ghiChuBaoQuan/khoiLuongKg`, không dùng trường demo `moTa/thuTu`.
- Giữ thông báo lỗi ở page sau refresh khi đơn rời hàng đợi để không mất bằng chứng conflict; UI10 retest đạt.
- Ô Điều Phối Viên trước đây dẫn đến form riêng vì trang đăng nhập chung chỉ có đăng nhập demo. Đã cho form chung đăng nhập backend thật khi chọn điều phối; logout trở về form chung. UI24 chạy desktop/mobile, toàn bộ 48 ca retest PASS. Không dùng mật khẩu demo cố định ở FE cho tài khoản tổng đài.

## Trạng thái bàn giao

Các chức năng frontend T24 và test đã triển khai. T23 vẫn có form xem trước, T24 cung cấp đường mở form và session thật; tích hợp tạo đơn/báo giá thuộc T23. Phần CSDL/backend không đổi. Chưa gọi T24 Done khi LIVE01–03, invariant, CI và review/merge còn thiếu kết quả.

## Rà lại yêu cầu và hướng dẫn khởi động

Đã đối chiếu lại dòng T24 trong project_brief: đơn chờ, tài xế, chi tiết, gán/hủy theo quyền, lấy tài xế từ phân công BE, xử lý không có tài xế/tài xế vừa bận và mở form T23 đều có implementation. Bổ sung khóa xác nhận khi đang đọc lại đơn hoặc order prop rời CHO_GAN; UI23 xác nhận lỗi đọc gợi ý không cho gửi gán. Giữ nguyên tất cả file backend, migration, SQL và tài liệu ERD/schema.

ESLint từng quét JS vendor trong báo cáo Playwright sinh ra sau ca thất bại. Đã thêm globalIgnores cho playwright-report và test-results, giữ lint toàn bộ source/test. Hướng dẫn T24 đã có lệnh BE/SQL Server từ gốc repo, cấu hình dev/test, health expected, seed và khởi động FE.
