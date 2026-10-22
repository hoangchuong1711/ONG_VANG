-- Chỉ chạy khi tên database này CHƯA tồn tại.
-- Nếu đã tồn tại: kiểm tra nội dung, không xóa hoặc chạy lại V1/V9 tùy tiện.
USE master;
GO
CREATE DATABASE mini_ong_vang_design_v2_test;
GO
USE mini_ong_vang_design_v2_test;
GO
SELECT DB_NAME() AS database_hien_tai;
-- Mở từng file V1 -> V9; chọn database trên trước mỗi lần chạy.
-- Không chạy các file này trên database designV1 đang sử dụng.