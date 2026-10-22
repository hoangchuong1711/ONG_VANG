# Bộ Chương 3 — ONG VÀNG designV2

- CHUONG_3_CAI_DAT_CSDL.md: nội dung chương đầy đủ, SQL và chỗ chèn ảnh.
- 00_Tao_database_test.sql: tạo DB thử khi tên này chưa tồn tại.
- sql-tham-khao: V1–V9 tách nguyên văn từ tài liệu người dùng, chưa chạy SQL Server.
- sql-chup-anh: 10 nhóm truy vấn chụp ảnh và 1 tệp đo 5 index.

Chỉ dùng trên DB thử mới. Chọn đúng mini_ong_vang_design_v2_test trước mỗi file V1–V9; chạy theo thứ tự và dừng nếu có lỗi. V8 phục vụ chương phân quyền và là bước cần trước V9. Không chạy lại V1/V9 hoặc ghép vào DB designV1. Không bật Java seed. Các tệp này chưa được tích hợp vào migration ứng dụng.

Lấy ảnh sau khi V1–V9 hoàn tất. Mỗi thử nghiệm sửa dữ liệu trong sql-chup-anh đều tự rollback; không thêm transaction ngoài các stored procedure tự quản transaction. File đo index chỉ dùng ở DB thử, chạy trọn từng khối để khôi phục index. Bộ 30 đơn không đủ để khẳng định cải thiện hiệu năng lớn.

Tài liệu chưa chứa kết quả thực thi hoặc ảnh thật. Không thay “mong đợi” bằng “đạt” trước khi chạy và đối chiếu.