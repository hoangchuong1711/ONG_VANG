# Thiết kế persistence T03

Tên bảng/cột chi tiết là SQL trong V1/V2; bảng này ghi cardinality và cách Entity map sau migration.

| Quan hệ | Cardinality và cơ chế |
| --- | --- |
| TaiKhoan → KhachHang / TaiXe / DieuPhoiVien | Mỗi hồ sơ có một tài khoản; tài khoản có tối đa một hồ sơ đúng role, composite FK cố định role chống gắn sai loại |
| KhachHang → KhachHangVip | 1 → 0..1, shared PK/MapsId; khách thường không có hồ sơ VIP |
| HangThanhVien → KhachHangVip | 1 → nhiều |
| TaiXe → PhuongTien | 1 → 0..1, unique ma_tx |
| KhachHang / TaiXe / DieuPhoiVien / CauHinhCuoc → DonHang | 1 → nhiều; tài xế và điều phối trên đơn nullable |
| DonHang → SnapshotCuocDonHang | 1 → 0..1 ở FK; luồng tạo aggregate bắt buộc có một snapshot |
| DonHang → ChiTietKienHang / NhatKyTrangThai | 1 → nhiều; DAO tạo aggregate yêu cầu ít nhất một kiện và một event |
| DonHang ↔ CauHinhPhuThu | Nhiều ↔ nhiều qua PhuThuDonHang có khóa ghép và số tiền/tên snapshot |
| DonHang / TaiXe → PhanCongDonHang | 1 → nhiều lịch sử, tối đa một hàng ket_thuc_luc null cho mỗi đơn/tài xế |
| DonHang → ThanhToan | 1 → nhiều attempt, không còn OneToOne của v0 |
| DonHang → DanhGiaChuyenDi | 1 → 0..1, chưa public API |

Khóa ngoại không tự bảo đảm trạng thái đơn khớp assignment hoặc số tiền payment bằng snapshot. Service T10–T15 kiểm tra và cập nhật cùng transaction. T03 chứng minh DAO dùng được cùng EntityManager và DB chặn xung đột cuối cùng.

Các lớp hạ tầng: `PersistenceListener` quản lý vòng đời `PersistenceContext`; context sở hữu HikariDataSource/EntityManagerFactory và chạy Flyway; `TransactionRunner` cung cấp một EntityManager cho toàn unit of work. `BaseDAO<T>` chỉ find/persist, các DAO cụ thể có truy vấn theo nhiệm vụ. Không có Spring/container transaction ngầm.

Trình tự tạo đơn ở tầng persistence: service mở runner → kiểm tra dữ liệu → DAO.persistAggregate → persist đơn → snapshot/kiện/phụ thu → nhật ký → flush/commit. Lỗi ở bất kỳ bước nào rollback toàn transaction. DTO được dựng trước khi đóng EntityManager.

Trình tự phân công để T11 sử dụng: mở transaction → lock đơn → lock tài xế → đọc lại quyền/precondition/assignment → cập nhật đơn + assignment + nhật ký → commit. Partial unique và version đơn phát hiện cạnh tranh. Không xóa assignment cũ khi tài xế kết thúc hoặc từ chối.
