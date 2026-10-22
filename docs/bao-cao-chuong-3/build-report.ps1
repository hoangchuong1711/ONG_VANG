$ErrorActionPreference = 'Stop'
$sourcePath = 'C:\Users\LENOVO\.codex\attachments\d57cea97-1c7c-403f-94c7-a5b87a75d140\Văn bản đã dán.txt'
$outputRoot = $PSScriptRoot
$sourceText = Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8
$sqlDir = Join-Path $outputRoot 'sql-tham-khao'
$shotDir = Join-Path $outputRoot 'sql-chup-anh'
New-Item -ItemType Directory -Path $sqlDir,$shotDir -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($true)
function Save-Text([string]$path, [string]$body) { [IO.File]::WriteAllText($path, $body, $utf8) }
$files = [ordered]@{}
foreach ($block in [regex]::Matches($sourceText, '(?ms)^```sql\s*\r?\n(.*?)^```')) {
    $body = $block.Groups[1].Value
    $match = [regex]::Match($body, '(?m)^-- FILE: (V\d+__[^\r\n]+\.sql)\s*$')
    if ($match.Success) {
        $name = $match.Groups[1].Value
        if (-not $files.Contains($name)) { $files[$name] = '' }
        $files[$name] += $body.TrimEnd() + "`r`n`r`n"
    }
}
if ($files.Count -ne 9) { throw "Expected nine source files; got $($files.Count)" }
foreach ($name in $files.Keys) { Save-Text (Join-Path $sqlDir $name) $files[$name] }
$setup = @'
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
'@
Save-Text (Join-Path $outputRoot '00_Tao_database_test.sql') $setup
$shots = [ordered]@{}
$shots['01_moi_truong'] = @'
SELECT DB_NAME() AS database_hien_tai,
       SERVERPROPERTY('ProductVersion') AS phien_ban,
       SERVERPROPERTY('Edition') AS phien_ban_cai_dat;
SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME();
'@
$shots['02_cau_truc'] = @'
SELECT name AS ten_bang FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
SELECT type_desc AS loai_doi_tuong, COUNT(*) AS so_luong
FROM sys.objects
WHERE schema_id = SCHEMA_ID('dbo') AND is_ms_shipped = 0
  AND type IN ('U','V','FN','IF','P','TR')
GROUP BY type_desc ORDER BY type_desc;
'@
$shots['03_rang_buoc'] = @'
-- Thử CHECK: khối lượng âm. Đơn 1 phải tồn tại sau khi nạp V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',999,N'Kiểm tra CHECK',-1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: dữ liệu âm được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử UNIQUE: cặp đơn 1, thứ tự kiện 1 đã có trong V9.
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES('50000000-0000-0000-0000-000000000001',1,N'Kiểm tra UNIQUE',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: thứ tự kiện trùng được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
GO
-- Thử FK: kiểm tra mã ngẫu nhiên chắc chắn chưa tồn tại trước khi INSERT.
DECLARE @don_khong_co UNIQUEIDENTIFIER = NEWID();
WHILE EXISTS(SELECT 1 FROM dbo.don_hang WHERE ma_don=@don_khong_co)
 SET @don_khong_co=NEWID();
BEGIN TRY
 BEGIN TRAN;
 INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg)
 VALUES(@don_khong_co,1,N'Kiểm tra FK',1);
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: đơn không tồn tại được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS noi_dung;
END CATCH;
'@
$shots['04_index'] = @'
SELECT t.name AS bang, i.name AS chi_muc,
       i.is_unique AS duy_nhat, i.filter_definition AS dieu_kien
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id
WHERE t.schema_id=SCHEMA_ID('dbo') AND i.name IS NOT NULL
 AND i.is_primary_key=0 AND i.is_unique_constraint=0
ORDER BY t.name,i.name;
'@
$shots['05_function'] = @'
SELECT dbo.fn_cuoc_km(20000,5,5000) AS cuoc_km,
       dbo.fn_cuoc_kg(2.50,1,3000) AS cuoc_kg,
       dbo.fn_tien_giam(55000,10) AS giam_tren_55000,
       dbo.fn_phan_cong_ty(49500) AS cong_ty_tren_49500;
-- Bốn ví dụ độc lập; không cộng các cột thành một báo giá.
-- Mong đợi: 45000; 4500; 5500; 9900.
'@
$shots['06_view'] = @'
SELECT TOP (12) ma_don,tong_cuoc,tien_cong_ty,tien_tai_xe
FROM dbo.v_chia_cuoc ORDER BY ma_don;
SELECT ma_tx,thu_nhap_tai_xe,cong_ty_duoc_huong,da_nop,
       con_phai_nop,dang_thanh_toan,chua_dua_vao_thanh_toan
FROM dbo.v_so_du_tai_xe ORDER BY ma_tx;
SELECT * FROM dbo.v_tai_xe_san_sang;
'@
$shots['07_thu_nhap'] = @'
DECLARE @den DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
SELECT * FROM dbo.fn_thu_nhap_tai_xe(
 '30000000-0000-0000-0000-000000000001','2000-01-01',@den);
-- Dùng khoảng rộng để bao phủ các đơn V9 dù ngày chụp khác ngày nạp.
'@
$shots['08_trigger'] = @'
-- Kiểm tra nhiều dòng: cả ba chính sách thành viên mẫu đã CONG_BO.
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;
BEGIN TRY
 BEGIN TRAN;
 UPDATE dbo.chinh_sach_thanh_vien
 SET ty_le_giam=ty_le_giam+1 WHERE trang_thai='CONG_BO';
 ROLLBACK;
 SELECT N'KHÔNG ĐẠT: sửa chính sách công bố được chấp nhận' AS danh_gia;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SELECT ERROR_NUMBER() AS ma_loi,ERROR_MESSAGE() AS noi_dung;
END CATCH;
SELECT ma_hang,ty_le_giam,trang_thai FROM dbo.chinh_sach_thanh_vien;
'@
$shots['09_sp'] = @'
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
'@
$shots['10_du_lieu_mau'] = @'
SELECT N'Tài khoản' AS doi_tuong,COUNT(*) AS so_luong FROM dbo.tai_khoan
UNION ALL SELECT N'Đơn hàng',COUNT(*) FROM dbo.don_hang
UNION ALL SELECT N'Kiện hàng',COUNT(*) FROM dbo.chi_tiet_kien_hang
UNION ALL SELECT N'Liên kết phụ thu',COUNT(*) FROM dbo.phu_thu_don_hang
UNION ALL SELECT N'Phân công',COUNT(*) FROM dbo.phan_cong_don_hang
UNION ALL SELECT N'Khoản chia',COUNT(*) FROM dbo.phan_chia_cuoc
UNION ALL SELECT N'Giao dịch nộp',COUNT(*) FROM dbo.giao_dich_nop_tien;
SELECT trang_thai,COUNT(*) AS so_don FROM dbo.don_hang GROUP BY trang_thai;
SELECT trang_thai,COUNT(*) AS so_giao_dich
FROM dbo.giao_dich_nop_tien GROUP BY trang_thai;
SELECT ma_don FROM dbo.v_chia_cuoc
WHERE tien_cong_ty+tien_tai_xe<>tong_cuoc;
SELECT ma_tx FROM dbo.v_so_du_tai_xe
WHERE con_phai_nop<>dang_thanh_toan+chua_dua_vao_thanh_toan
 OR cong_ty_duoc_huong<>da_nop+con_phai_nop;
SELECT ma_don FROM dbo.phan_cong_don_hang
WHERE ket_thuc_luc IS NULL GROUP BY ma_don HAVING COUNT(*)>1;
-- Ba truy vấn cuối phải trả về 0 dòng nếu các bất biến trên được giữ.
'@
$shotHeader = @'
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
'@
foreach ($name in $shots.Keys) { Save-Text (Join-Path $shotDir ($name+'.sql')) ($shotHeader+"`r`n"+$shots[$name]) }

$benchmarks = @(
 @{Name='ix_don_customer_time';Table='don_hang';DDL='CREATE INDEX ix_don_customer_time ON dbo.don_hang(ma_kh,tao_luc DESC) INCLUDE(trang_thai);';Query="SELECT TOP (50) ma_don,tao_luc,trang_thai FROM dbo.don_hang WHERE ma_kh='20000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;"},
 @{Name='ix_don_queue';Table='don_hang';DDL='CREATE INDEX ix_don_queue ON dbo.don_hang(trang_thai,tao_luc) INCLUDE(ma_kh);';Query="SELECT TOP (50) ma_don,ma_kh,tao_luc FROM dbo.don_hang WHERE trang_thai='CHO_GAN' ORDER BY tao_luc;"},
 @{Name='ix_pc_driver_time';Table='phan_cong_don_hang';DDL='CREATE INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang(ma_tx,bat_dau_luc DESC) INCLUDE(ma_don,ket_qua);';Query="SELECT TOP (50) ma_don,bat_dau_luc,ket_qua FROM dbo.phan_cong_don_hang WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY bat_dau_luc DESC;"},
 @{Name='ix_log_order_time';Table='nhat_ky_don_hang';DDL='CREATE INDEX ix_log_order_time ON dbo.nhat_ky_don_hang(ma_don,thoi_gian,ma_su_kien);';Query="SELECT ma_su_kien,thoi_gian FROM dbo.nhat_ky_don_hang WHERE ma_don='50000000-0000-0000-0000-000000000001' ORDER BY thoi_gian,ma_su_kien;"},
 @{Name='ix_gd_driver_time';Table='giao_dich_nop_tien';DDL='CREATE INDEX ix_gd_driver_time ON dbo.giao_dich_nop_tien(ma_tx,tao_luc DESC) INCLUDE(trang_thai,so_tien_yeu_cau);';Query="SELECT TOP (50) tao_luc,trang_thai,so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tx='30000000-0000-0000-0000-000000000001' ORDER BY tao_luc DESC;"}
)
$benchText = $shotHeader + @'

-- Bật Query > Include Actual Execution Plan trước khi chạy.
-- Chỉ chọn chạy TRỌN một khối BEGIN TRY ... END CATCH và GO tương ứng.
-- Chỉ xóa/tạo index thường trong transaction; ROLLBACK khôi phục index gốc.
-- Không chạy đồng thời ứng dụng trên database thử trong lúc đo.
-- Bộ 30 đơn chỉ minh họa cách đo, không đủ chứng minh hiệu năng ở quy mô lớn.

'@
foreach ($b in $benchmarks) {
 $benchText += @"
-- Đo $($b.Name)
BEGIN TRY
 BEGIN TRAN;
 DROP INDEX $($b.Name) ON dbo.$($b.Table);
 PRINT N'TRUOC INDEX: $($b.Name)';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 $($b.Query)
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 $($b.DDL)
 PRINT N'SAU INDEX: $($b.Name)';
 SET STATISTICS IO ON;
 SET STATISTICS TIME ON;
 $($b.Query)
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 ROLLBACK;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 SET STATISTICS IO OFF;
 SET STATISTICS TIME OFF;
 THROW;
END CATCH;
GO

"@
}
Save-Text (Join-Path $shotDir '11_do_hieu_nang_index.sql') $benchText

$report = @'
# CHƯƠNG 3. CÀI ĐẶT CƠ SỞ DỮ LIỆU TRÊN SQL SERVER

Trên cơ sở thiết kế ở Chương 2, chương này trình bày bộ script tạo cơ sở dữ liệu ONG VÀNG trên SQL Server. Nội dung gồm tạo bảng và ràng buộc, xây dựng index, function, view, trigger, stored procedure và dữ liệu mẫu. Mỗi nhóm đối tượng có giải thích và hướng dẫn tạo ảnh minh chứng.

**Ghi chú khi hoàn thiện báo cáo:** Bộ SQL dưới đây được trích từ bản thiết kế designV2 do nhóm cung cấp. Tài liệu này chưa xác nhận các script đã thực thi thành công trên SQL Server. Các giá trị nêu trong phần kiểm tra là kết quả mong đợi. Sau khi chạy, thay hướng dẫn trong dấu ngoặc vuông bằng ảnh thật và viết nhận xét theo kết quả quan sát. Không ghi “đã kiểm thử thành công” nếu chưa có bằng chứng.

## 3.1. Môi trường và tổ chức cài đặt

### 3.1.1. Môi trường triển khai

Cơ sở dữ liệu được thiết kế cho SQL Server 2022, sử dụng schema dbo. SQL Server Management Studio (SSMS) được dùng để mở script, thực thi truy vấn và quan sát kết quả. Cơ sở dữ liệu thử nghiệm có tên mini_ong_vang_design_v2_test và được tạo riêng, không thay thế cơ sở dữ liệu designV1 đang sử dụng.

Tài khoản thực hiện cài đặt cần có quyền tạo các đối tượng và role/user. Quyền này phục vụ triển khai; tài khoản ứng dụng khi vận hành phải được giới hạn theo chức năng. Chi tiết phân quyền được trình bày tại Chương 4.

**[Cách có Hình 3.1: kết nối SQL Server bằng SSMS. Chỉ khi tên database chưa tồn tại, mở và chạy file 00_Tao_database_test.sql. Nếu đã có database cùng tên, kiểm tra nguồn gốc và dữ liệu trước, không xóa hoặc chạy lại bộ tạo bảng tùy tiện. Sau đó chạy truy vấn dưới đây, chụp câu lệnh và Results. Không đưa thông tin mật khẩu/kết nối bí mật vào ảnh.]**

{{SHOT:01_moi_truong}}

*[Chèn Hình 3.1. Môi trường SQL Server và cơ sở dữ liệu thử nghiệm.]*

Ảnh cần thể hiện tên cơ sở dữ liệu và phiên bản SQL Server thực tế. Nếu môi trường chạy khác SQL Server 2022, cần ghi đúng phiên bản quan sát được và kiểm tra khả năng tương thích trước khi kết luận.

### 3.1.2. Tổ chức các tệp SQL

| Tệp | Nội dung |
|---|---|
| V1__create_business_tables.sql | Tạo 16 bảng và ràng buộc |
| V2__create_indexes.sql | Tạo 7 index duy nhất có điều kiện và 7 index tra cứu |
| V3__create_fare_functions.sql | Tạo 4 hàm tính tiền |
| V4__create_business_views.sql | Tạo 8 view |
| V5__create_driver_income_function.sql | Tạo hàm trả về bảng thu nhập |
| V6__create_integrity_triggers.sql | Tạo 9 trigger |
| V7__create_business_procedures.sql | Tạo 12 stored procedure |
| V8__create_roles_and_permissions.sql | Tạo role/user và quyền, giải thích ở Chương 4 |
| V9__insert_demo_data.sql | Nạp dữ liệu mẫu |

Các tệp đính kèm nằm trong thư mục sql-tham-khao, được tách nguyên nội dung theo dòng -- FILE: của bản thiết kế. Đây là bộ script phục vụ báo cáo, chưa tự thay đổi cấu hình migration của ứng dụng.

### 3.1.3. Thứ tự thực hiện

Với phương án chạy thủ công để lấy minh chứng, mở lần lượt V1 đến V9 bằng SSMS, chọn đúng database thử ở mỗi cửa sổ và chỉ chạy tệp tiếp theo khi tệp trước hoàn thành không có lỗi. Giữ các dòng GO và SET có sẵn. Không chạy lại V1 hoặc V9 trên database đã có dữ liệu. Không bọc toàn bộ V7 trong transaction bên ngoài.

Trong cấu hình Flyway dự kiến, V1–V8 thuộc thư mục schema, V9 thuộc thư mục demo. Chỉ chọn một cơ chế triển khai cho cùng database: database đã tạo thủ công không được xem là đã có lịch sử migration Flyway hợp lệ. Nếu muốn kiểm thử Flyway, dùng một database mới riêng với cấu hình phù hợp và tắt Java seed.

Các truy vấn chụp ảnh dữ liệu trong chương này thực hiện sau khi đã nạp V9. Phần tạo function trả về thu nhập đặt sau phần view vì hàm sử dụng v_chia_cuoc.

## 3.2. Tạo bảng và ràng buộc toàn vẹn

### 3.2.1. Script tạo các bảng

Bộ tạo bảng triển khai 16 quan hệ đã mô tả ở Chương 2. Các bảng được tạo theo thứ tự để đối tượng được tham chiếu tồn tại trước. Riêng khóa ngoại từ khoản chia đến giao dịch nộp tiền được bổ sung bằng ALTER TABLE sau khi tạo bảng giao dịch.

{{SQL:V1__create_business_tables.sql}}

### 3.2.2. Khóa chính, khóa ngoại và ràng buộc duy nhất

Khóa chính xác định từng bản ghi; khóa ngoại giữ liên kết giữa các bảng. Ví dụ, chi_tiet_kien_hang.ma_don phải trỏ đến đơn tồn tại. Cặp (ma_don, ma_phu_thu) là khóa chính của bảng liên kết, ngăn phụ thu trùng. Khóa ngoại ghép của phan_chia_cuoc bảo đảm phân công được chọn thuộc đúng đơn, thay vì chỉ kiểm tra mã phân công tồn tại.

UNIQUE được dùng cho tên đăng nhập, biển số và các khóa yêu cầu ghép. Điều kiện duy nhất chỉ áp dụng cho một số dòng, như số điện thoại khác NULL hoặc phân công đang mở, được triển khai bằng index có điều kiện tại mục 3.3.

### 3.2.3. Miền giá trị và giá trị mặc định

CHECK giới hạn trạng thái, khối lượng, số tiền và quan hệ giữa các mốc thời gian. NOT NULL yêu cầu các dữ liệu bắt buộc. DEFAULT hỗ trợ khởi tạo mã, trạng thái và thời điểm tạo. Các điều kiện bắt buộc có giá trị cần kiểm tra IS NOT NULL khi phù hợp vì CHECK không tự từ chối kết quả UNKNOWN do NULL.

Ví dụ, đơn HOAN_TAT phải có thời điểm hoàn tất và không có thông tin hủy; giao dịch THANH_CONG phải có số tiền thực nhận bằng số tiền yêu cầu. Những điều kiện liên bảng như “mỗi đơn phải có một kiện” còn cần thủ tục và hạn chế quyền ghi trực tiếp.

### 3.2.4. Kiểm tra cấu trúc và ràng buộc

**[Cách có Hình 3.2: sau V1–V9, Refresh mục Tables trong Object Explorer rồi chạy 02_cau_truc.sql. Chụp danh sách bảng và bảng đếm đối tượng. Database thử sạch dự kiến có 16 bảng nghiệp vụ, 8 view, 4 scalar function, 1 inline table-valued function, 9 trigger và 12 SP. Nếu xuất hiện bảng công cụ như sysdiagrams hoặc lịch sử Flyway, phân biệt với 16 bảng nghiệp vụ.]**

{{SHOT:02_cau_truc}}

*[Chèn Hình 3.2. Danh sách bảng và các đối tượng đã tạo.]*

**[Cách có Hình 3.3: chạy lần lượt ba ví dụ trong 03_rang_buoc.sql. Mỗi ví dụ nằm trong TRY/CATCH và hoàn tác dữ liệu. Chụp câu INSERT cùng Results chứa mã lỗi, nội dung lỗi. Có thể ghép ba ảnh thành Hình 3.3a–c. Chỉ kết luận đúng khi lỗi nêu đúng CHECK khối lượng, UNIQUE thứ tự kiện hoặc FK đơn tương ứng; lỗi khác không được xem là đạt.]**

{{SHOT:03_rang_buoc}}

*[Chèn Hình 3.3. Kiểm tra CHECK, UNIQUE và khóa ngoại.]*

Kết quả mong đợi là khối lượng âm, thứ tự kiện trùng và mã đơn không tồn tại đều bị từ chối. Mã lỗi thường là 547 đối với CHECK/FK, 2601 hoặc 2627 đối với trùng khóa; nội dung lỗi và tên ràng buộc là căn cứ xác định đúng nguyên nhân.

## 3.3. Xây dựng chỉ mục — Index

### 3.3.1. Chỉ mục duy nhất bảo vệ nghiệp vụ

Bảy index duy nhất có điều kiện bảo vệ số điện thoại không trùng khi có giá trị; một phân công mở trên mỗi đơn và mỗi tài xế; một phân công hoàn tất trên mỗi đơn; một giao dịch chưa giải quyết trên mỗi tài xế; mã đối tác không trùng và sự kiện đến điểm nhận không lặp.

Việc lọc giai_quyet_luc IS NULL bao phủ cả CHO_XU_LY và CHUA_RO_KET_QUA. Tách thành hai index theo từng trạng thái sẽ không bảo đảm một tài xế chỉ có một giao dịch chưa giải quyết nói chung.

### 3.3.2. Chỉ mục hỗ trợ truy vấn

Bảy index thường phục vụ tra cứu đơn của khách, hàng đợi, lịch sử phân công, nhật ký, giao dịch của tài xế, khoản chia theo giao dịch và lịch sử kiểm toán. Các cột INCLUDE bổ sung dữ liệu cần đọc mà không thay đổi thứ tự khóa index.

{{SQL:V2__create_indexes.sql}}

**[Cách có Hình 3.4: chạy 04_index.sql, chụp Results có tên bảng, tên index, is_unique và điều kiện lọc. Danh sách dự kiến có 14 index được tạo riêng ở V2; không tính index tự sinh từ PK/UNIQUE.]**

{{SHOT:04_index}}

*[Chèn Hình 3.4. Các index phục vụ ràng buộc và truy vấn.]*

### 3.3.3. Đánh giá hiệu quả chỉ mục

Hiệu quả index cần được đánh giá bằng cùng truy vấn, cùng tham số và cùng bộ dữ liệu trước và sau khi tạo. Số liệu gồm logical reads, CPU time, elapsed time và kế hoạch thực thi. Không kết luận mọi truy vấn có index đều nhanh hơn; với bảng nhỏ, SQL Server có thể chọn scan hợp lý.

**[Cách có Hình 3.5: mở 11_do_hieu_nang_index.sql, bật Query > Include Actual Execution Plan. Chọn chạy trọn một khối BEGIN TRY đến END CATCH kèm GO. Tệp có 5 trường hợp: lịch sử đơn khách, hàng đợi, phân công tài xế, nhật ký đơn, giao dịch nộp. Mỗi khối bỏ một index thường trong transaction, chạy truy vấn trước, tạo lại index, chạy truy vấn sau rồi ROLLBACK để khôi phục trạng thái ban đầu. Không chạy riêng đoạn DROP; không bỏ index duy nhất bảo vệ nghiệp vụ.]**

**[Chụp hai phần: tab Execution Plan cho truy vấn SELECT trước/sau và tab Messages có dấu TRUOC INDEX/SAU INDEX cùng STATISTICS IO, TIME. Có thể dùng Hình 3.5a–e hoặc đưa các trường hợp còn lại vào phụ lục. Không dùng chi phí phần trăm của các lệnh CREATE INDEX để kết luận truy vấn nhanh hơn.]**

*[Chèn Hình 3.5. So sánh kế hoạch thực thi và số liệu truy vấn trước/sau index.]*

| Truy vấn | Logical reads trước/sau | CPU trước/sau (ms) | Thời gian trước/sau (ms) | Kế hoạch trước/sau |
|---|---|---|---|---|
| Lịch sử đơn khách | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Hàng đợi | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Lịch sử phân công | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Nhật ký đơn | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |
| Giao dịch tài xế | [Điền số đo] | [Điền số đo] | [Điền số đo] | [Điền quan sát] |

Bộ V9 có 30 đơn chỉ phù hợp minh họa cách đo. Để đánh giá hiệu năng có ý nghĩa, cần chuẩn bị bộ dữ liệu thử lớn hơn, cập nhật statistics và chạy nhiều lượt với cùng điều kiện. Ghi nhận khác biệt về cache; không lấy một lần chạy làm kết luận chung. Tài liệu chưa có số đo thực tế nên chưa khẳng định mức cải thiện.

## 3.4. Xây dựng hàm tính cước — Function

### 3.4.1. Hàm tính cước theo quãng đường

fn_cuoc_km nhận cước cơ bản, quãng đường và đơn giá. Kết quả bằng cước cơ bản cộng quãng đường nhân đơn giá, làm tròn đến đồng. Giới hạn km được kiểm tra ở thủ tục tạo đơn; km_toi_thieu không phải số km miễn phí.

### 3.4.2. Hàm tính cước theo khối lượng

fn_cuoc_kg nhận tổng khối lượng, mức được bao gồm và đơn giá. Chỉ phần khối lượng vượt mức bao gồm được tính thêm; nếu không vượt thì kết quả bằng 0.

### 3.4.3. Hàm tính tiền giảm giá

fn_tien_giam nhận tổng tiền trước giảm và tỷ lệ giảm phần trăm. Trong nghiệp vụ tạo đơn, cơ sở giảm gồm cước km, cước kg và phụ thu. Kết quả làm tròn đến đồng.

### 3.4.4. Hàm tính phần công ty được hưởng

fn_phan_cong_ty trả về 20% tổng cước cuối cùng, làm tròn đến đồng. Phần tài xế được xác định bằng tổng cước trừ phần công ty để tổng hai phần luôn khớp.

{{SQL:V3__create_fare_functions.sql}}

**[Cách có Hình 3.6: chạy 05_function.sql, chụp câu SELECT và một dòng kết quả. Đây là bốn ví dụ độc lập, không cộng các cột thành một báo giá.]**

{{SHOT:05_function}}

*[Chèn Hình 3.6. Kết quả gọi bốn hàm tính tiền.]*

Kết quả mong đợi lần lượt là 45.000 đồng, 4.500 đồng, 5.500 đồng và 9.900 đồng. Nếu kết quả thực tế khác, cần kiểm tra định nghĩa hàm và tham số trước khi nhận xét.

## 3.5. Xây dựng khung nhìn — View

### 3.5.1. Các view tính cước và công nợ

v_cuoc_don tính tổng cước từ các thành phần giá chốt và phụ thu. v_chia_cuoc xác định tài xế của khoản chia, phần công ty và phần tài xế. v_giao_dich_nop tổng hợp số khoản và tổng tiền đang gắn với mỗi giao dịch. v_so_du_tai_xe tổng hợp thu nhập, phần công ty, đã nộp, còn phải nộp và phần đang thanh toán theo toàn bộ lịch sử.

Tên v_so_du_tai_xe không có nghĩa đây là ví điện tử. View tổng hợp dữ liệu nghiệp vụ; không có thao tác nạp/rút số dư. Các khoản đang thanh toán vẫn nằm trong khoản còn phải nộp cho đến khi giao dịch thành công.

### 3.5.2. Các view hỗ trợ điều phối

v_don_cho_dieu_phoi liệt kê đơn CHO_GAN. v_tai_xe_san_sang chọn tài xế trực tuyến, có thời điểm rảnh, tài khoản và phương tiện hoạt động, giấy phép còn hạn và không có phân công mở. Việc loại tài xế đã từ chối một đơn cụ thể cần thực hiện thêm trong truy vấn gợi ý và thủ tục gán; view sẵn sàng không nhận mã đơn.

### 3.5.3. Các view phục vụ quản lý

v_cong_ty_thuc_nhan_ngay tổng hợp tiền của giao dịch thành công theo ngày Việt Nam. v_phien_ban_chinh_sach hợp nhất thông tin phiên bản của ba nhóm chính sách, phục vụ kiểm tra và quản lý thời gian hiệu lực.

{{SQL:V4__create_business_views.sql}}

### 3.5.4. Ví dụ truy vấn và kết quả

**[Cách có Hình 3.7: chạy 06_view.sql sau V9. Chụp bảng chia cước và bảng công nợ; có thể tách thành Hình 3.7a–b. Chụp thêm danh sách tài xế sẵn sàng nếu cần minh họa điều phối. Không cần chụp đủ tám view nếu ảnh không bổ sung thông tin.]**

{{SHOT:06_view}}

*[Chèn Hình 3.7. Truy vấn chia cước, công nợ và tài xế sẵn sàng.]*

Với dữ liệu V9 chưa thay đổi, dự kiến có 12 khoản chia. Các giao dịch mẫu đều đang chờ nên tiền đã nộp bằng 0; điều đó không có nghĩa thu nhập tài xế bằng 0. Tài xế 3 dự kiến sẵn sàng ngay sau nạp; kết quả còn phụ thuộc thời điểm kiểm tra và các thay đổi dữ liệu sau đó.

## 3.6. Xây dựng hàm thống kê thu nhập tài xế

### 3.6.1. Mục đích và tham số

fn_thu_nhap_tai_xe là hàm trả về bảng, nhận mã tài xế, thời điểm bắt đầu và kết thúc. Hàm thống kê số đơn, tổng cước, thu nhập tài xế và phần công ty trong khoảng [từ, đến), dựa trên thời điểm ghi nhận khoản chia. Trong nghiệp vụ hoàn tất, thời điểm này được ghi cùng thời điểm hoàn tất đơn.

Hàm phục vụ lọc thu nhập theo thời gian. Công nợ vẫn phải lấy từ view toàn lịch sử, không sử dụng khoảng thời gian này để bỏ các khoản chưa nộp trước đó.

### 3.6.2. Script và ví dụ sử dụng

{{SQL:V5__create_driver_income_function.sql}}

**[Cách có Hình 3.8: chạy 07_thu_nhap.sql, chụp tham số và bảng kết quả. Dữ liệu V9 gán bốn đơn hoàn tất cho tài xế 1 nên số đơn mong đợi là 4 nếu chưa thay đổi dữ liệu.]**

{{SHOT:07_thu_nhap}}

*[Chèn Hình 3.8. Thống kê thu nhập tài xế theo khoảng thời gian.]*

## 3.7. Xây dựng Trigger

### 3.7.1. Kiểm tra vai trò và kiểm toán tài khoản

tr_kh_role và tr_tx_role kiểm tra loại tài khoản khi thêm hoặc sửa hồ sơ. tr_tk_role_audit ngăn thay đổi vai trò tài khoản đã tạo và ghi kiểm toán khi trạng thái tài khoản thay đổi; không ghi mật khẩu vào nhật ký.

### 3.7.2. Kiểm soát trạng thái và nhật ký đơn

tr_don_transition_log yêu cầu tài khoản thao tác hợp lệ trong SESSION_CONTEXT, kiểm tra trạng thái ban đầu và các bước chuyển hợp lệ, bảo vệ các thuộc tính nội dung/giá đã chốt được liệt kê trong trigger. Trigger tự ghi sự kiện tạo đơn và chuyển trạng thái. Việc bảo vệ đầy đủ dữ liệu nguồn còn dựa vào hạn chế DML trực tiếp và các thủ tục được cấp quyền.

### 3.7.3. Bảo vệ dữ liệu tài chính

tr_chia_hop_le kiểm tra nguồn khoản chia, ngăn xóa hoặc sửa nguồn và kiểm soát liên kết giao dịch. tr_gd_bao_ve bảo vệ định danh, số tiền và kết quả đã chốt; khi giao dịch thành công còn kiểm tra tổng tiền khoản chia liên kết. Các trigger không gọi HTTP hoặc VNPay.

### 3.7.4. Bảo vệ chính sách đã công bố

Ba trigger tr_policy_cau_hinh_cuoc, tr_policy_chinh_sach_thanh_vien và tr_policy_cau_hinh_phu_thu ngăn sửa/xóa nội dung phiên bản đã công bố. Chúng cho phép đóng thời điểm kết thúc một lần ở tương lai theo điều kiện. Việc kiểm tra chồng thời gian được thực hiện thêm tại thủ tục quản lý chính sách.

{{SQL:V6__create_integrity_triggers.sql}}

### 3.7.5. Kiểm thử hoạt động

Các trigger sử dụng inserted/deleted theo tập dữ liệu, không giả định mỗi lệnh chỉ tác động một dòng. Ví dụ sau cố thay đổi tỷ lệ giảm của nhiều chính sách đã công bố và đọc dữ liệu trước/sau.

**[Cách có Hình 3.9: chạy trọn 08_trigger.sql sau V9. Chụp câu UPDATE, thông báo lỗi và kết quả trước/sau. Mong đợi lỗi 51015 với nội dung không được sửa/xóa phiên bản công bố; các tỷ lệ 5, 10, 15 vẫn giữ nguyên. Nếu lỗi khác xuất hiện, chưa kết luận trigger đã hoạt động đúng. Đây là thử nghiệm nhiều dòng cho trigger chính sách; chưa thay thế kiểm thử tất cả chín trigger.]**

{{SHOT:08_trigger}}

*[Chèn Hình 3.9. Trigger từ chối sửa nhiều chính sách đã công bố.]*

## 3.8. Xây dựng Stored Procedure

### 3.8.1. Nhóm quản lý đơn hàng

usp_tao_don kiểm tra người tạo, khóa yêu cầu, kiện hàng và phụ thu; chọn chính sách, tính lại giá và tạo dữ liệu đồng bộ. Nếu giá thay đổi so với giá đã đồng ý, thủ tục từ chối để người dùng xác nhận lại. usp_doc_don đọc danh sách hoặc chi tiết theo quyền và hỗ trợ phân trang. usp_huy_don cho phép hủy trước lấy hàng, đóng phân công và giải phóng tài xế nếu có.

### 3.8.2. Nhóm phân công và giao hàng

usp_phan_cong kiểm tra đơn chờ, tài xế đủ điều kiện và việc đã từ chối trước đó trước khi gán. usp_tien_trinh xử lý lấy hàng, bắt đầu giao, đến điểm nhận, từ chối và sự cố theo trạng thái. usp_hoan_tat yêu cầu đúng tài xế, đã đến điểm nhận và xác nhận thu đủ, sau đó ghi hoàn tất và khoản chia cùng một transaction.

### 3.8.3. Nhóm thanh toán và thu nhập

usp_bat_dau_thanh_toan trả lại giao dịch phù hợp nếu yêu cầu lặp hoặc còn giao dịch chưa giải quyết; nếu không thì gom các khoản chưa nộp dương để tạo giao dịch mới. Việc ký URL VNPay do backend thực hiện sau commit.

usp_ap_dung_ket_qua_nop chỉ nhận kết quả mà backend đã xác minh. Thủ tục đối chiếu số tiền, chống sự kiện lặp, ghi nhận thành công hoặc không thu; kết quả mâu thuẫn được ghi để đối soát. RETURN không được dùng để quyết toán. usp_thu_nhap_cua_toi trả hai tập kết quả: thu nhập theo khoảng thời gian và công nợ toàn lịch sử của tài xế trong phiên.

### 3.8.4. Nhóm quản lý dữ liệu

usp_quan_ly_chinh_sach hỗ trợ lưu/xóa nháp, công bố và đóng hiệu lực; kiểm tra các phiên bản không chồng thời gian. usp_quan_ly_phuong_tien hỗ trợ thêm, sửa, ngừng hoạt động hoặc xóa khi đủ điều kiện. usp_dang_ky_khach tạo tài khoản và hồ sơ trong cùng transaction; BCrypt hash được backend tạo trước khi gọi.

| Thủ tục | Đầu vào chính | Kết quả hoặc tác động |
|---|---|---|
| usp_tao_don | Khách, khóa/hash yêu cầu, giao nhận, km/thời gian, JSON kiện/phụ thu, giá đồng ý | Mã đơn đã tạo hoặc mã đơn của yêu cầu lặp |
| usp_doc_don | Mã đơn tùy chọn, trang, kích thước trang | Danh sách; chi tiết kiện/phụ thu/nhật ký nếu đọc một đơn |
| usp_huy_don | Mã đơn, lý do | Hủy đơn hợp lệ và đóng phân công |
| usp_phan_cong | Mã đơn, tài xế | Phân công mới và cập nhật đơn/tài xế |
| usp_tien_trinh | Mã đơn, hành động, ghi chú | Cập nhật tiến trình hoặc nhật ký |
| usp_hoan_tat | Mã đơn, xác nhận thu đủ | Hoàn tất và ghi khoản chia |
| usp_bat_dau_thanh_toan | Khóa yêu cầu | Trả giao dịch nộp tiền |
| usp_ap_dung_ket_qua_nop | Tham chiếu, nguồn, khóa sự kiện, JSON, kết quả, số tiền, mã đối tác | Áp dụng kết quả đã xác minh hoặc ghi tình huống cần kiểm tra |
| usp_thu_nhap_cua_toi | Từ ngày, đến ngày | Thu nhập và công nợ của tài xế |
| usp_quan_ly_chinh_sach | Hành động, loại, mã, JSON, thời điểm đóng | Lưu hoặc cập nhật vòng đời chính sách |
| usp_quan_ly_phuong_tien | Hành động, tài xế và thông tin xe | Thay đổi phương tiện theo điều kiện |
| usp_dang_ky_khach | Tên đăng nhập, hash, họ tên, SĐT, email | Mã tài khoản và mã khách |

Bộ script dưới đây chứa đầy đủ 12 thủ tục theo thứ tự của bản thiết kế. Thủ tục ghi tự quản lý transaction, không gọi trong một transaction Java hoặc transaction thử nghiệm đang mở. Các câu thử chỉ đọc ở mục tiếp theo không thay đổi dữ liệu nghiệp vụ. Các kịch bản rollback, tranh chấp và quyền thực tế được dành cho Chương 4.

{{SQL:V7__create_business_procedures.sql}}

### 3.8.5. Ví dụ gọi thủ tục và kết quả

**[Cách có Hình 3.10: mở 09_sp.sql bằng kết nối quản trị database thử, chạy toàn bộ khối. Khối này gắn tài khoản tài xế 1 vào SESSION_CONTEXT, gọi báo cáo và danh sách đơn, sau đó khôi phục ngữ cảnh cũ. Chụp EXEC và các Results: báo cáo thu nhập, công nợ và tối đa 5 đơn. Dữ liệu mẫu chưa đổi dự kiến có 4 đơn hoàn tất trong báo cáo thu nhập.]**

{{SHOT:09_sp}}

*[Chèn Hình 3.10. Gọi stored procedure xem thu nhập và danh sách đơn của tài xế.]*

Ngữ cảnh ở ví dụ do người thử chủ động thiết lập, chỉ phục vụ kiểm tra chức năng. Đây không phải bằng chứng SQL đã chống giả mạo người dùng hay đã kiểm thử các Role/User. Khi tích hợp, backend phải lấy tài khoản từ phiên đã xác thực và đặt/xóa ngữ cảnh đúng vòng đời kết nối.

## 3.9. Nạp dữ liệu mẫu và kiểm tra kết quả

### 3.9.1. Xây dựng dữ liệu mẫu

Bộ V9 dự kiến tạo 8 tài khoản: 3 khách hàng, 3 tài xế, 1 tổng đài và 1 chủ đội xe. Dữ liệu gồm 30 đơn, 60 kiện, 37 liên kết phụ thu, 16 phân công và 12 khoản chia. Các trường hợp khách thường, thành viên còn hạn và thành viên hết hạn được bố trí để minh họa điều kiện giảm giá.

Trạng thái cuối dự kiến là 12 HOAN_TAT, 14 CHO_GAN, 2 DA_HUY, 1 DA_GAN và 1 DANG_GIAO. Ba giao dịch nộp mẫu đều đang chờ; không có giao dịch thành công giả. Vị trí tài xế để NULL cho đến khi được xác minh theo quy trình demo.

### 3.9.2. Script nạp dữ liệu

V9 chỉ cho phép chạy trên database demo/test có tên quy định và chưa có dữ liệu. Script giữ các ràng buộc, trigger đang bật, thực hiện nạp trong một transaction và kiểm tra số lượng trước commit. Không chạy Java seed đồng thời và không chạy lại V9 để ghi đè dữ liệu.

{{SQL:V9__insert_demo_data.sql}}

### 3.9.3. Kiểm tra sau khi nạp

**[Cách có Hình 3.11: chạy 10_du_lieu_mau.sql. Chụp bảng số lượng và thống kê trạng thái. Các truy vấn cuối trả 0 dòng là kết quả tốt đối với những bất biến được kiểm tra, không phải lỗi không có dữ liệu. Nếu số lượng khác dự kiến, kiểm tra database đã chọn và các thao tác phát sinh sau nạp.]**

{{SHOT:10_du_lieu_mau}}

*[Chèn Hình 3.11. Đối chiếu dữ liệu mẫu và các điều kiện nhất quán.]*

| Nội dung | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|
| Bảng nghiệp vụ / View / Function / Trigger / SP | 16 / 8 / 5 / 9 / 12 | [Điền sau khi chạy] |
| Tài khoản / Đơn / Kiện | 8 / 30 / 60 | [Điền sau khi chạy] |
| Liên kết phụ thu / Phân công / Khoản chia | 37 / 16 / 12 | [Điền sau khi chạy] |
| Giao dịch mẫu | 3 đang chờ; 0 thành công | [Điền sau khi chạy] |
| Vi phạm tổng tiền chia | 0 dòng | [Điền sau khi chạy] |
| Vi phạm công nợ | 0 dòng | [Điền sau khi chạy] |
| Đơn có nhiều phân công đang mở | 0 dòng | [Điền sau khi chạy] |

## 3.10. Tổng kết chương

Chương 3 trình bày bộ script triển khai thiết kế designV2 trên SQL Server, gồm 16 bảng nghiệp vụ, 14 index tạo riêng, 5 function, 8 view, 9 trigger và 12 stored procedure. Các đối tượng phối hợp để tính cước, điều phối, ghi nhận hoàn tất, chia cước và quản lý việc tài xế nộp tiền công ty.

Bộ dữ liệu mẫu và các truy vấn kiểm tra cung cấp cơ sở tạo minh chứng thực thi. Tại thời điểm soạn tài liệu, chưa có ảnh hoặc số đo SQL Server được thu thập trong lần thực hiện này; mức độ hoàn thành cần được cập nhật theo kết quả chạy thực tế. Phần tiếp theo phân tích transaction, xử lý đồng thời và phân quyền Role/User.

---

## Hướng dẫn biên tập ảnh — bỏ mục này khỏi bản nộp cuối

1. Mở file SQL tương ứng trong sql-chup-anh. Chạy phần USE/SET đầu file trước, rồi chọn trọn ví dụ cần chụp. Chọn Results to Grid, mở Results hoặc Messages theo hướng dẫn.
2. Tăng cỡ chữ để đọc được cả câu lệnh và kết quả. Chụp vùng có thông tin cần chứng minh, tránh chụp toàn màn hình khi chữ quá nhỏ.
3. Dùng Windows + Shift + S để chụp vùng. Trong Word, dán hoặc chèn ảnh, căn giữa và đặt In Line with Text. Giữ tỷ lệ ảnh, không kéo méo.
4. Đặt chú thích ở dưới ảnh theo đúng số hình. Bên dưới ghi “Nguồn: Nhóm thực hiện” nếu nhóm tự chạy và chụp. Với ảnh nhiều phần, dùng a, b, c và mô tả từng phần.
5. Đoạn nhận xét phải nêu thao tác, kết quả quan sát và điều kiện được chứng minh. Ví dụ chỉ dùng sau khi đã thấy đúng lỗi: “Lệnh thêm kiện có khối lượng -1 bị từ chối bởi ràng buộc CHECK. Kết quả cho thấy dữ liệu khối lượng âm không được ghi nhận.”
6. Không dùng ảnh chỉ có dòng “Commands completed successfully” để chứng minh toàn bộ nghiệp vụ đúng. Cần thấy dữ liệu hoặc lỗi cụ thể tương ứng.
7. Bản này chứa toàn bộ SQL để tra cứu và sử dụng. Nếu báo cáo quá dài, chuyển các khối định nghĩa đầy đủ sang phụ lục và giữ đoạn tiêu biểu cùng giải thích trong chương; luôn dẫn đúng tệp/phụ lục. Không chạy cả văn bản Markdown như một script SQL.
8. Các thử nghiệm trong chương chưa thay thế kiểm thử toàn bộ hệ thống, 12 thủ tục hoặc chín trigger. Chương 4 bổ sung kịch bản tạo đơn, gán, hoàn tất, hủy, thanh toán, callback lặp, rollback, hai phiên đồng thời và quyền truy cập.
'@
foreach ($name in $files.Keys) {
 $report = $report.Replace('{{SQL:'+$name+'}}', ('```sql'+"`r`n"+$files[$name].TrimEnd()+"`r`n"+'```'))
}
foreach ($name in $shots.Keys) {
 $report = $report.Replace('{{SHOT:'+$name+'}}', ('```sql'+"`r`n"+$shots[$name].TrimEnd()+"`r`n"+'```'))
}
if ($report -match '\{\{(SQL|SHOT):') { throw 'Unresolved report marker' }
Save-Text (Join-Path $outputRoot 'CHUONG_3_CAI_DAT_CSDL.md') $report
$readme = @'
# Bộ Chương 3 — ONG VÀNG designV2

- CHUONG_3_CAI_DAT_CSDL.md: nội dung chương đầy đủ, SQL và chỗ chèn ảnh.
- 00_Tao_database_test.sql: tạo DB thử khi tên này chưa tồn tại.
- sql-tham-khao: V1–V9 tách nguyên văn từ tài liệu người dùng, chưa chạy SQL Server.
- sql-chup-anh: 10 nhóm truy vấn chụp ảnh và 1 tệp đo 5 index.

Chỉ dùng trên DB thử mới. Chọn đúng mini_ong_vang_design_v2_test trước mỗi file V1–V9; chạy theo thứ tự và dừng nếu có lỗi. V8 phục vụ chương phân quyền và là bước cần trước V9. Không chạy lại V1/V9 hoặc ghép vào DB designV1. Không bật Java seed. Các tệp này chưa được tích hợp vào migration ứng dụng.

Lấy ảnh sau khi V1–V9 hoàn tất. Mỗi thử nghiệm sửa dữ liệu trong sql-chup-anh đều tự rollback; không thêm transaction ngoài các stored procedure tự quản transaction. File đo index chỉ dùng ở DB thử, chạy trọn từng khối để khôi phục index. Bộ 30 đơn không đủ để khẳng định cải thiện hiệu năng lớn.

Tài liệu chưa chứa kết quả thực thi hoặc ảnh thật. Không thay “mong đợi” bằng “đạt” trước khi chạy và đối chiếu.
'@
Save-Text (Join-Path $outputRoot 'README.md') $readme
$allSql = ($files.Values -join "`r`n")
$counts = [ordered]@{
 tables = ([regex]::Matches($allSql,'(?im)^CREATE TABLE dbo\.')).Count
 indexes = ([regex]::Matches($allSql,'(?im)^CREATE (?:UNIQUE )?INDEX ')).Count
 functions = ([regex]::Matches($allSql,'(?im)^CREATE OR ALTER FUNCTION ')).Count
 views = ([regex]::Matches($allSql,'(?im)^CREATE OR ALTER VIEW ')).Count
 triggers = ([regex]::Matches($allSql,'(?im)^CREATE OR ALTER TRIGGER ')).Count
 procedures = ([regex]::Matches($allSql,'(?im)^CREATE OR ALTER PROCEDURE ')).Count
}
if ($counts.tables -ne 16 -or $counts.indexes -ne 14 -or $counts.functions -ne 5 -or $counts.views -ne 8 -or $counts.triggers -ne 9 -or $counts.procedures -ne 12) { throw 'Object count mismatch' }
$counts | ConvertTo-Json
Write-Output "Report generated: $($report.Length) characters; SQL files: $($files.Count)"
