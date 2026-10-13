# TX3 — Tạo đơn theo địa chỉ thật và biểu phí km/kg

## Cách chạy

- `ROUTE_PROVIDER=goong` và `GOONG_API_KEY` trong `.env` của backend để nhận địa chỉ tùy ý. Key không gửi xuống FE. Goong geocode hai địa chỉ rồi lấy quãng đường và thời gian; lỗi không tìm thấy/ngoài giới hạn/nhà cung cấp/timeout có mã riêng. Giới hạn tuyến mặc định `ROUTE_MAX_DISTANCE_KM=30`.
- `ROUTE_PROVIDER=fake` chỉ nhận các địa chỉ fixture trong [T07](T07-route-provider.md). Quote và chi tiết đơn hiển thị `FAKE` dưới nhãn **DEMO · fixture**; không dùng fixture để khẳng định địa chỉ hay km thực tế.
- FE khách dùng cookie session và CSRF của BE qua rewrite `/api/*`; khách chỉ tạo đơn cho chính tài khoản đang đăng nhập. Các trang điều phối viên giữ nguyên giao diện trên `develop` để xử lý ở TX4. BE vẫn phân biệt khách tự tạo và tổng đài tạo hộ qua `maKh`, `maTkTao` và phân quyền; smoke API kiểm tra cả hai luồng.

## Biểu phí và snapshot

Migration V5 bổ sung `phien_ban`, `kg_bao_gom`, `don_gia_kg`, `kg_toi_da` vào `cau_hinh_cuoc`. Mỗi hàng có ID duy nhất, trạng thái công bố và khoảng thời gian hiệu lực; không sửa nội dung phiên bản đã công bố. Tạo phiên bản mới bằng một hàng mới và chấm dứt phiên bản trước ở ranh giới tương lai.

Biểu phí demo v1: cước cố định **20.000 ₫** + **5.000 ₫/km**; **1,00 kg** đầu đã gồm, phần vượt **3.000 ₫/kg**; tổng tối đa **30,00 kg**. Km là số BE nhận từ route, làm tròn 2 chữ số thập phân. Cước km và cước kg tính riêng rồi làm tròn từng khoản đến VND bằng `HALF_UP`. Phụ thu cố định công bố, còn hiệu lực được cộng sau cước km/kg. Giảm hạng thành viên được tính trên **cước km + cước kg + phụ thu**, sau đó `HALF_UP` đến VND và không vượt quá tổng trước giảm. Tổng = cước km + cước kg + phụ thu − giảm; có thể bằng 0.

Quote có hạn **300 giây**. BE lưu địa chỉ nhập, tuyến chuẩn hóa do Goong xác thực, kiện/kg, khách, bên trả và phương thức trả. Khi tạo đơn, BE đối chiếu dữ liệu nhập với quote trong DB rồi tính lại biểu phí, phụ thu và hạng theo thời điểm tạo. BE dùng tuyến đã chốt trong quote để tránh vượt giới hạn gọi Goong và tránh thay đổi km/thời gian giữa hai lần gọi; khác quote trả `QUOTE_CHANGED`, hết hạn trả `QUOTE_EXPIRED`. Đơn lưu ID phiên bản biểu phí, cước km, cước kg, tổng kg, cước gốc và giảm; phụ thu và chính sách giảm gắn phiên bản đã công bố. `cuoc_goc` giữ nghĩa tổng **km + kg** để các báo cáo V1 vẫn tính đúng.

API tạo đơn yêu cầu `Idempotency-Key`. BE cấp `maDon`, chốt tổng và tạo event `TAO_DON`; FE chỉ hiển thị response. Cùng actor/key/payload trả lại response cũ; payload khác trả `IDEMPOTENCY_CONFLICT`. `benThanhToan` và `phuongThucThanhToan` lưu trên đơn để TX6 thu đúng mốc sau này.

## Kiểm thử

`docker-compose.tx3-test.yml` mở stack test riêng trên 11433/18081/13001 và database `mini_ong_vang_test`. Dùng `-p mini-ong-vang-tx3 -f docker-compose.yml -f docker-compose.tx3-test.yml`; đặt `--env-file` tới `.env` hiện có. `tools/api/tx3-smoke.mjs` có guard tên DB; `TX3_DEMO_PASSWORD` bật kiểm tra tổng đài và `TX3_DB_TESTS=1` bật các ca có đổi thời gian/chính sách trong **DB test cô lập**. Kịch bản này đổi biểu phí demo của DB test thành bản miễn cước, nên chỉ chạy trên DB test mới.

Đã chạy: Maven test; TypeScript, ESLint và Next production build; OpenAPI validator 283 examples; smoke tạo đơn 24 kiểm tra, lịch sử 27 kiểm tra, điều phối 96 kiểm tra, TX3 36 kiểm tra trên Docker DB test. Font dùng chuỗi dự phòng trong CSS để build không phụ thuộc mạng Google Fonts. Goong thật đã trả tuyến 1,42 km/391 giây và tạo đơn `CHO_GAN` qua proxy FE bằng `tools/api/tx3-goong-smoke.mjs`; key chỉ ở môi trường backend. Thử nghiệm đã phát hiện HTTP 429 khi geocode lặp ở bước tạo đơn và được sửa bằng cách dùng tuyến đã chốt trong quote. Script DB có thể dùng `TX3_SQL_CONTAINER` khi tên Docker project khác mặc định.
