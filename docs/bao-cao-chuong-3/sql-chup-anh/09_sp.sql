-- Chạy trên SSMS sau khi đã chạy V1-V9 thành công vào DB thử mới.
-- Chọn từng ví dụ để chụp, không ghép file này vào migration.
USE mini_ong_vang_design_v2_test;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
GO
-- Kiểm tra chức năng đọc bằng tài khoản quản trị DB trong môi trường thử.
-- Đây chưa phải minh chứng phân quyền SQL Role/User (trình bày ở Chương 4).
DECLARE @actor_cu SQL_VARIANT=SESSION_CONTEXT(N'ma_tk');
DECLARE @actor UNIQUEIDENTIFIER='10000000-0000-0000-0000-000000000201';
DECLARE @tu DATETIME2(3)='2000-01-01';
DECLARE @den DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
BEGIN TRY
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor;
 EXEC dbo.usp_thu_nhap_cua_toi @tu=@tu,@den=@den;
 EXEC dbo.usp_doc_don @ma_don=NULL,@page=0,@size=5;
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_cu;
END TRY
BEGIN CATCH
 EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor_cu;
 THROW;
END CATCH;