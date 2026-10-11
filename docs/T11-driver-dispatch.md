# T11 — Điều phối tài xế trên designV1

Tổng đài xem đơn, tài xế và gợi ý bằng các endpoint trong [OpenAPI](../src/backend/src/main/webapp/openapi.json). Gợi ý cho đơn `CHO_GAN` đòi tài khoản hoạt động, tài xế `ONLINE` và rảnh, GPLX còn hạn, xe đang hoạt động, chưa từ chối đơn này. Sắp theo `ranhTu`, rồi ID. Khi gán, service khóa đơn → tài xế → tài khoản tài xế, kiểm tra lại toàn bộ điều kiện và ghi phân công, trạng thái đơn, mốc rảnh, event cùng transaction.

`PhanCongDonHang` là nguồn duy nhất của quan hệ đơn–tài xế. DB có unique index có điều kiện bảo vệ một phân công hoạt động trên mỗi đơn và mỗi tài xế. `Order.maTx` là giá trị suy từ phân công; `Order.maTkTao` là tài khoản tạo đơn. Từ chối chỉ ở `DA_GAN`: phân công kết thúc với outcome `TU_CHOI` và lý do, đơn về `CHO_GAN`, tài xế rảnh lại; cùng tài xế không được gán lại chính đơn đó. Không còn boolean `tuChoi` hoặc `don_hang.ma_tx`.

SQL Server test kiểm tra tranh chấp hai request gán; HTTP smoke hiện có 85 kiểm tra về quyền, CSRF, lọc, gán, từ chối và race. Các ca đổi xe/khóa account đồng thời cần thêm kiểm thử theo [ma trận ràng buộc](database/designV1-constraint-matrix.md).
