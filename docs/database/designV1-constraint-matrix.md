# Ma trận thực thi ràng buộc designV1

Đây là ma trận trách nhiệm ràng buộc, không phải bảng PASS/FAIL tự động. Trạng thái triển khai và bằng chứng trên DB test/dev nằm ở [báo cáo M1](designV1-M1-audit-2026-10-11.md). Flyway V1 tạo schema, V2 bảo vệ nội dung policy đã công bố; `scripts/check-design-v1-invariants.sql` đối chiếu các bất biến liên bảng. Các hàng T13–T20 vẫn thuộc M2.

Quy ước: **DB** là PK/FK/UQ/CHECK/index; **BE** là validation hoặc transaction; **Đối chiếu** là truy vấn kiểm tra trạng thái nhiều bảng. Ràng buộc có thể được bảo vệ ở nhiều lớp. Mã `DTxx` trỏ tới tiêu chí nghiệm thu tương ứng trong [designV1.md](designV1.md).

| Mã trong designV1 | Điều kiện cần giữ | DB | BE / transaction | Kiểm tra nghiệm thu |
| --- | --- | --- | --- | --- |
| AC01 | Username và SĐT chuẩn hóa không trùng | UQ username; filtered UQ SĐT khi khác NULL | Chuẩn hóa trước ghi; bắt duplicate/race | DT02 và hai đăng ký đồng thời |
| AC02–03 | Hồ sơ đúng role; account + hồ sơ cùng ghi | PK/FK/UQ hồ sơ theo account | Role immutable; tạo/rollback nguyên tử | DT01; truy vấn đối chiếu profile-role |
| CU01–02 | Hạng và khoảng thành viên hợp lệ; hết hạn giảm 0 | CHECK hạng/mốc và mốc cuối > đầu | Tính theo khoảng [đầu, cuối), timezone Việt Nam | DT05 tại trước/đúng/sau mốc |
| CU03 | Không có tích điểm/tự nâng hạng | N/A | API chỉ cho quy trình quản trị được xác thực | Kiểm tra contract không phát sinh UC |
| DR01–03 | Tài xế đủ role/status/GPLX/xe và không bận; hàng đợi chính xác | UQ GPLX; unique active assignment | Đọc lại sau khóa đơn + tài xế; cập nhật `ranh_tu` | DT11–13, truy vấn queue |
| VE01–02 | Tối đa một xe hiện tại; xe hợp lệ khi gán | UQ `ma_tx`, biển số | Không thay xe khi assignment đang hoạt động | DT12; tranh chấp thay xe/gán |
| MP01–03 | Policy cùng hạng không chồng; nội dung công bố bất biến | UQ hạng + đầu; check mốc; có thể bổ sung cơ chế DB chống overlap | Serialize theo hạng khi công bố; kiểm tra lại; policy mới thay đổi giá | DT03–05, hai lần công bố đồng thời |
| FA01–03 | Biểu phí duy nhất khớp thời gian + khoảng km; phiên bản lịch sử bất biến | UQ ứng viên; check mốc/km; index theo phạm vi | Kiểm tra không, một, hoặc nhiều kết quả; không chọn tùy tiện | DT03–04, DT06–09 |
| SU01–03 | Phụ thu cố định theo phiên bản, không chồng cùng loại | UQ loại + đầu; check mốc/tiền | Một đơn áp dụng tối đa một phiên bản mỗi loại; policy immutable | DT03–04, DT06 |
| OR01 | Commit tạo đơn có đúng một cước, ít nhất một kiện và event tạo | FK, PK shared, UQ thứ tự | Một transaction tạo mọi thành phần | DT10 và inject lỗi giữa các lần ghi |
| OR02–04 | Actor xác thực; nội dung và giá chốt không bị đổi; mốc nhất quán | FK, CHECK nội bộ | Quyền sở hữu, immutability và chronology | DT08, DT25–26 |
| PR01–04 | Không lưu tổng/snapshot thừa; giảm trong giới hạn; tham chiếu policy đúng | PK/FK/CHECK tiền | Tính tổng từ cước + phụ thu − giảm; chốt transaction | DT06, DT27 |
| OS01–03 | Một phiên bản phụ thu mỗi loại/đơn; chỉ policy công bố, đúng thời điểm | PK `(ma_don, ma_phu_thu)` | Kiểm tra loại và thời gian khi tạo; không sửa liên kết sau commit | DT03, DT10 |
| PA01–02 | Thứ tự kiện từ 1 liên tiếp; không sửa/chuyển kiện sau chốt | UQ `(ma_don, thu_tu)`; check miền | Khóa đơn, thêm toàn bộ kiện nguyên tử | DT10, DT27 |
| AS01–04 | Một assignment hoạt động/đơn và/tài xế; kết quả/mốc cùng NULL; hoàn tất duy nhất; người từ chối không gán lại cùng đơn | Filtered UQ cho active, completed và cặp đơn/tài xế đã từ chối; CHECK result/time | Khóa đúng thứ tự; từ chối/gán lại theo policy | DT11–15; truy vấn phát hiện cặp trái phép |
| EV01–03 | Thứ tự event duy nhất; cạnh trạng thái hợp lệ; incident ở DANG_GIAO | UQ `(ma_don, thu_tu)`; CHECK hàng | State machine tuần tự hóa trên đơn; event cùng transaction | DT14–17; kiểm tra event cuối khớp trạng thái |
| PY01–05 | Attempt có mã riêng; tối đa một chưa giải quyết; thực thu khác tiền phải thu; miễn cước không tạo payment | PK/UQ reference; unique index riêng cho từng trạng thái pending; CHECK trạng thái ↔ mốc/số tiền; filtered UQ provider reference | Chỉ bắt đầu sau HOAN_TAT; xác thực actor/kênh; khóa đơn | DT18, DT20–24 |
| ST01–03 | Một xác nhận/đơn; giao dịch phải của đúng đơn; chỉ xác nhận khoản thu đủ | PK ma_don, UQ ma_giao_dich, FK ghép `(ma_don, ma_giao_dich)` | Đơn HOAN_TAT, payment success, thực thu khớp cước; ghi trong transaction | DT20–23; cố gắn payment đơn A sang B |
| PE01–03 | Event tích hợp dedup theo nguồn/hash; invalid/unmatched được giữ nhưng không cập nhật payment | UQ `(nguon, khoa_su_kien)`, FK nullable | Xác thực chữ ký; một transaction event/payment/xác nhận; Return không tự xác nhận | DT19–23; callback lặp/sai chữ ký/đến muộn |
| QU01–04 | Quote immutable, chủ sở hữu đúng, TTL đúng 300 giây, có phiên bản biểu phí | FK khách/biểu phí, CHECK hết hạn > tạo | So request/route/policy; hết hạn tại đúng mốc | DT07–09 |
| ID01–03 | Replay actor + operation + key; payload giống trả response gốc; request và đơn cùng commit | PK hash, FK/UQ ma_don | Lock actor, đọc lại sau khóa; response JSON được version hóa | DT08–10; retry đồng thời, hết hạn đúng biên |
| AU01–03 | Audit actor/source hợp lệ; không chứa secret; chỉ append; cùng transaction thay đổi | FK nullable; CHECK source/actor | Snapshot đã lọc; thêm audit trước commit | DT26; rollback không để audit thành công giả |
| TX01–08 | Các thay đổi aggregate phải cùng commit hoặc rollback | FK và unique làm lớp cuối | Một owner transaction; không gọi ngoài trong lúc giữ khóa; khóa theo thứ tự thống nhất | Integration test rollback và concurrency |

SQL Server filtered index chỉ hỗ trợ điều kiện so sánh đơn giản theo [tài liệu Microsoft](https://learn.microsoft.com/sql/relational-databases/indexes/create-filtered-indexes); vì vậy không gộp hai trạng thái pending bằng một predicate `IN`. Hai index riêng là lớp chặn từng trạng thái; transaction phải tuần tự hóa theo `ma_don` để ngăn tạo đồng thời CHO_XU_LY và CHUA_RO_KET_QUA.

## Bất biến liên bảng bắt buộc kiểm tra

1. Tài khoản KHACH_HANG có một hồ sơ khách, TAI_XE có một hồ sơ tài xế; role khác không có hai hồ sơ này. FK đơn lẻ không bảo đảm sự khớp role.
2. CHO_GAN: không assignment hoạt động/hoàn tất. DA_GAN, DA_LAY_HANG, DANG_GIAO: đúng một assignment hoạt động, chưa có outcome HOAN_TAT. HOAN_TAT: không assignment hoạt động và đúng một outcome HOAN_TAT. DA_HUY: không assignment hoạt động hoặc outcome HOAN_TAT. Lịch sử TU_CHOI vẫn được giữ.
3. `cuoc_don_hang` phải có đúng một hàng cho đơn đã commit. `chi_tiet_kien_hang` và `nhat_ky_don_hang` phải có ít nhất một hàng; event đầu là TAO_DON ở thứ tự 1, trạng thái sau CHO_GAN.
4. `cuoc_don_hang.ma_chinh_sach_giam` nếu có phải đúng hạng và hiệu lực tại lúc tạo đơn; phụ thu phải cùng loại chỉ có tối đa một bản trên một đơn, đúng hiệu lực.
5. Xác nhận thanh toán tham chiếu đúng cặp đơn/giao dịch, giao dịch thành công và thực thu bằng giá cuối. Có thể có nhiều payment success thực tế nhưng tối đa một giao dịch được chọn xác nhận.
6. Mỗi đơn chỉ có tối đa một payment CHO_XU_LY/CHUA_RO_KET_QUA; đơn đã xác nhận đủ hoặc miễn cước không tạo lần mới.

Các bất biến này cần code tạo dữ liệu hợp lệ cùng một transaction và bộ truy vấn đối chiếu sau migration/seed. Kết quả đối chiếu phải bằng 0 bản ghi vi phạm trước khi cho backend phục vụ traffic.
