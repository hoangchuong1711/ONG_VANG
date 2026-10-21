# Kịch bản trình bày SQL Server: Đăng nhập, phân quyền và tài khoản

Tài liệu này là kịch bản chạy trực tiếp trên SSMS 22, tập trung vào thiết kế CSDL và minh chứng hành vi. Nội dung lấy từ các migration SQL Server của designV2: V2 (index), V6 (trigger), V7/V12/V13 (stored procedure), V8 (role/user và quyền).

> Chọn đúng database đã migrate designV2 trước khi chạy. Các lệnh bên dưới là truy vấn trình bày, không phải migration. Không chạy phần thay đổi dữ liệu trên database cần giữ nguyên nếu chưa hiểu rõ tác động.

## 1. Kiểm tra hiện diện các đối tượng

```sql
SELECT s.name AS schema_name, o.name AS object_name, o.type_desc
FROM sys.objects AS o
JOIN sys.schemas AS s ON s.schema_id = o.schema_id
WHERE o.name IN (
  N'ux_tk_phone', N'tr_kh_role', N'tr_tx_role', N'tr_tk_role_audit',
  N'usp_dang_ky_khach', N'usp_admin_trang_thai_khach',
  N'usp_admin_quan_ly_tong_dai', N'usp_cap_nhat_ho_so_tai_khoan',
  N'usp_doi_mat_khau_tai_khoan'
)
ORDER BY o.type_desc, o.name;

SELECT 'INDEX' AS loai, COUNT(*) AS so_luong
FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.tai_khoan') AND name=N'ux_tk_phone'
UNION ALL
SELECT 'TRIGGER', COUNT(*) FROM sys.triggers
WHERE name IN (N'tr_kh_role',N'tr_tx_role',N'tr_tk_role_audit')
UNION ALL
SELECT 'STORED PROCEDURE', COUNT(*) FROM sys.procedures
WHERE name IN (N'usp_dang_ky_khach',N'usp_admin_trang_thai_khach',
 N'usp_admin_quan_ly_tong_dai',N'usp_cap_nhat_ho_so_tai_khoan',N'usp_doi_mat_khau_tai_khoan');
```

Nhóm này có 1 index, 3 trigger và 5 stored procedure; không có function hay view riêng. Cả 5 procedure trong danh sách có transaction và xử lý lỗi `TRY...CATCH` (một số thao tác nội bộ khác nằm ở procedure quản lý tài xế, ngoài danh sách nhóm trình bày).

## 2. Index duy nhất có lọc: `ux_tk_phone`

```sql
SELECT i.name, i.is_unique, i.has_filter, i.filter_definition,
       c.name AS indexed_column
FROM sys.indexes AS i
JOIN sys.index_columns AS ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
JOIN sys.columns AS c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE i.object_id=OBJECT_ID(N'dbo.tai_khoan') AND i.name=N'ux_tk_phone';
```

Index này đảm bảo số điện thoại không bị trùng, nhưng chỉ áp dụng cho dòng có `so_dien_thoai IS NOT NULL`. Nó cũng hỗ trợ tìm tài khoản theo số điện thoại. So sánh kế hoạch thực thi cho truy vấn có thể dùng index:

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SET SHOWPLAN_TEXT ON;
GO
SELECT ma_tk, username, ho_ten
FROM dbo.tai_khoan
WHERE so_dien_thoai = '0900000000';
GO
SET SHOWPLAN_TEXT OFF;
SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
```

Trong SSMS có thể bật **Include Actual Execution Plan** (Ctrl+M), rồi chạy riêng truy vấn trên để xem kế hoạch thực tế và số logical reads. Để đối chiếu trên bảng nhỏ, SQL Server có thể vẫn chọn scan vì scan rẻ hơn; `INDEX` hint chỉ dùng để minh họa đường truy cập, không phải khuyến nghị production:

```sql
SELECT ma_tk, username, ho_ten
FROM dbo.tai_khoan WITH (INDEX(ux_tk_phone))
WHERE so_dien_thoai = '0900000000';
```

Khi dữ liệu còn ít, chênh lệch thời gian có thể không đáng kể. Bằng chứng phù hợp hơn là index được chọn và số logical reads; không nên khẳng định truy vấn nhanh hơn đáng kể nếu phép đo không cho thấy điều đó. Index được migration tạo để đảm bảo duy nhất và phục vụ tra cứu.

Kiểm tra ràng buộc duy nhất mà không lưu thay đổi: lệnh chủ động gây lỗi được bắt lại bên trong transaction và rollback.

```sql
DECLARE @sdt VARCHAR(10) = (
  SELECT TOP (1) so_dien_thoai FROM dbo.tai_khoan
  WHERE so_dien_thoai IS NOT NULL ORDER BY ma_tk
);
IF @sdt IS NULL
  THROW 50000, N'Cần có ít nhất một tài khoản có số điện thoại để chạy demo.', 1;

BEGIN TRY
  BEGIN TRAN;
  INSERT dbo.tai_khoan(ma_tk, username, mat_khau_hash, ho_ten, so_dien_thoai, vai_tro)
  VALUES(NEWID(), N'demo_index_rollback', REPLICATE(N'x',60), N'Demo', @sdt, 'KHACH_HANG');
  ROLLBACK;
  SELECT N'Không phát sinh lỗi: hãy xác nhận index đã tồn tại.' AS ket_qua;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK;
  SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS thong_bao;
END CATCH;
```

Kết quả mong đợi là lỗi duplicate key từ `ux_tk_phone`; bản ghi thử không được lưu. Nếu bảng đang rỗng, bỏ qua minh họa này.

## 3. Trigger kiểm tra toàn vẹn và ghi audit

`tr_kh_role` đảm bảo hồ sơ khách hàng tham chiếu tài khoản có vai trò `KHACH_HANG`; `tr_tx_role` áp dụng tương tự cho hồ sơ tài xế. `tr_tk_role_audit` chặn đổi vai trò sau khi tạo tài khoản và ghi audit khi đổi trạng thái; không ghi mật khẩu/hash/token vào audit.

Xem định nghĩa trigger đã cài:

```sql
EXEC sys.sp_helptext N'dbo.tr_kh_role';
EXEC sys.sp_helptext N'dbo.tr_tx_role';
EXEC sys.sp_helptext N'dbo.tr_tk_role_audit';
```

Xem audit trạng thái gần đây:

```sql
SELECT TOP (20) ma_tk, doi_tuong, ma_doi_tuong, hanh_dong, noi_dung, thoi_gian
FROM dbo.nhat_ky_kiem_toan
WHERE doi_tuong=N'TAI_KHOAN'
ORDER BY thoi_gian DESC;
```

Có thể minh họa nhánh lỗi đổi vai trò bằng cách thử trên một tài khoản trong transaction. Dùng giá trị `ma_tk` có thật; `ROLLBACK` để không lưu nếu trigger không chặn vì cấu hình khác:

```sql
DECLARE @tk UNIQUEIDENTIFIER = (SELECT TOP (1) ma_tk FROM dbo.tai_khoan ORDER BY username);
BEGIN TRY
  BEGIN TRAN;
  UPDATE dbo.tai_khoan SET vai_tro='TAI_XE' WHERE ma_tk=@tk;
  ROLLBACK;
  SELECT N'Không có lỗi; kiểm tra trigger/schema của database.' AS ket_qua;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK;
  SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS thong_bao;
END CATCH;
```

Kết quả đúng theo migration là lỗi 51003, “Không đổi vai trò tài khoản đã tạo”. Trigger là lớp bảo vệ toàn vẹn ở CSDL, nên tác dụng kể cả khi cập nhật không đi qua giao diện ứng dụng.

## 4. Stored procedure và transaction: đăng ký khách hàng

Procedure đăng ký tạo đồng thời một dòng tài khoản và một hồ sơ khách hàng. Hai thao tác nằm trong một transaction: nếu bước tạo hồ sơ thất bại, tài khoản cũng được rollback. `TRY...CATCH`, `XACT_STATE()`/`ROLLBACK` và `THROW` giúp trả lỗi cho bên gọi mà không để dữ liệu nửa chừng.

Đọc chữ ký và nội dung procedure:

```sql
EXEC sys.sp_help N'dbo.usp_dang_ky_khach';
EXEC sys.sp_helptext N'dbo.usp_dang_ky_khach';
```

Demo thành công có thể dùng một username chưa tồn tại. Gói gọi trong transaction bên ngoài để cuối cùng rollback toàn bộ dữ liệu demo; hash bên dưới chỉ có hình dạng BCrypt hợp lệ để vượt kiểm tra định dạng, không phải mật khẩu sử dụng được.

```sql
DECLARE @username NVARCHAR(50) = N'demo_ssms_' + REPLACE(CONVERT(NVARCHAR(36),NEWID()),N'-',N'');
BEGIN TRY
  BEGIN TRAN;
  EXEC dbo.usp_dang_ky_khach
    @username=@username,
    @hash=N'$2a$10$12345678901234567890123456789012345678901234567890123',
    @ho_ten=N'Demo SSMS rollback', @sdt='0999999999', @email=NULL;
  ROLLBACK;
  SELECT @username AS username_demo, N'Đã rollback sau khi procedure chạy thành công' AS ket_qua;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK;
  SELECT ERROR_NUMBER() AS ma_loi, ERROR_MESSAGE() AS thong_bao;
END CATCH;
```

Transaction lồng nhau trong SQL Server không độc lập: `COMMIT` ở procedure chỉ giảm `@@TRANCOUNT`; transaction ngoài cùng mới quyết định ghi bền vững. Vì vậy `ROLLBACK` ngoài cùng hoàn tác cả hai insert. Có thể kiểm tra lỗi validation bằng cách gọi lại với username test khác và hash sai; procedure phải trả lỗi, không tạo tài khoản.

## 5. Các procedure còn lại trong nhóm

```sql
EXEC sys.sp_helptext N'dbo.usp_admin_trang_thai_khach';
EXEC sys.sp_helptext N'dbo.usp_admin_quan_ly_tong_dai';
EXEC sys.sp_helptext N'dbo.usp_cap_nhat_ho_so_tai_khoan';
EXEC sys.sp_helptext N'dbo.usp_doi_mat_khau_tai_khoan';
```

- `usp_admin_trang_thai_khach`: kiểm tra người thao tác là chủ đội xe đang hoạt động; khóa/mở khóa tài khoản, tăng `auth_version`, ghi audit trong cùng transaction. Khóa tài khoản làm phiên/token cũ mất hiệu lực theo logic xác thực.
- `usp_admin_quan_ly_tong_dai`: nghiệp vụ quản lý tài khoản tổng đài; có khóa giao dịch để tránh thao tác đồng thời xung đột.
- `usp_cap_nhat_ho_so_tai_khoan`: cập nhật hồ sơ của tài khoản trong session hiện tại, kèm audit và kiểm tra trạng thái hoạt động.
- `usp_doi_mat_khau_tai_khoan`: nhận hash BCrypt mới và `auth_version` hiện tại; cập nhật có điều kiện, tăng version để vô hiệu phiên cũ; nếu phiên đã thay đổi thì báo lỗi.

Các procedure dùng `SESSION_CONTEXT(N'ma_tk')` làm định danh tài khoản thực hiện nghiệp vụ. Khi demo các thao tác cần danh tính quản trị, phải dùng `ma_tk` thực sự có vai trò phù hợp và tài khoản `HOAT_DONG`; không giả định `demo_chudoi` là một tài khoản nghiệp vụ có thể tự động quản trị.

## 6. Role, user và kiểm chứng quyền

Migration tạo 4 role người dùng nghiệp vụ và 4 user demo tương ứng, ngoài ra còn có role/user nội bộ cho backend xác thực và xử lý thanh toán. Các user demo được tạo `WITHOUT LOGIN`, chỉ mô phỏng thành viên database role, không phải SQL Server login độc lập.

```sql
SELECT r.name AS role_name, m.name AS member_name
FROM sys.database_role_members AS drm
JOIN sys.database_principals AS r ON r.principal_id=drm.role_principal_id
JOIN sys.database_principals AS m ON m.principal_id=drm.member_principal_id
WHERE r.name IN (N'r_khach_hang',N'r_tai_xe',N'r_tong_dai',N'r_chu_doi_xe')
ORDER BY r.name,m.name;

SELECT USER_NAME() AS current_db_user, IS_MEMBER(N'r_khach_hang') AS is_customer,
       IS_MEMBER(N'r_chu_doi_xe') AS is_fleet_owner;
```

Xem các quyền cấp, từ chối và quyền thực thi procedure:

```sql
SELECT grantee.name AS principal_name, p.permission_name, p.state_desc,
       OBJECT_SCHEMA_NAME(p.major_id) AS schema_name, OBJECT_NAME(p.major_id) AS object_name
FROM sys.database_permissions AS p
JOIN sys.database_principals AS grantee ON grantee.principal_id=p.grantee_principal_id
WHERE grantee.name IN (N'r_khach_hang',N'r_tai_xe',N'r_tong_dai',N'r_chu_doi_xe',N'r_auth_backend')
ORDER BY grantee.name,p.state_desc,p.permission_name;
```

Có thể mô phỏng quyền bằng `EXECUTE AS USER`, kiểm tra, rồi luôn `REVERT`:

```sql
EXECUTE AS USER=N'demo_khach';
SELECT USER_NAME() AS dang_gia_lap, HAS_PERMS_BY_NAME(N'dbo.tai_khoan',N'OBJECT',N'SELECT') AS duoc_doc_tai_khoan,
       HAS_PERMS_BY_NAME(N'dbo.usp_tao_don',N'OBJECT',N'EXECUTE') AS duoc_goi_tao_don;
REVERT;
```

Khách hàng được cấp quyền thực thi procedure nghiệp vụ, nhưng bị `DENY SELECT` trên `tai_khoan` và `DENY` thao tác ghi trực tiếp schema. Đây là nguyên tắc cấp quyền tối thiểu: ứng dụng gọi thủ tục được phép, không tự do đọc hash mật khẩu hay sửa bảng tùy ý. `GRANT` cấp quyền, `DENY` từ chối rõ ràng; `REVOKE` gỡ một quyền đã cấp/từ chối về trạng thái kế thừa mặc định. User `WITHOUT LOGIN` chỉ chạy được trong mô phỏng database bằng `EXECUTE AS USER`.

## 7. Tóm tắt số lượng để thuyết trình

| Thành phần | Số lượng trong nhóm | Ví dụ |
|---|---:|---|
| Index | 1 | `ux_tk_phone` (unique, filtered) |
| Trigger | 3 | `tr_kh_role`, `tr_tx_role`, `tr_tk_role_audit` |
| Function | 0 | Không có function riêng trong nhóm |
| View | 0 | Không có view riêng trong nhóm |
| Stored procedure | 5 | Đăng ký, trạng thái khách, quản lý tổng đài, cập nhật hồ sơ, đổi mật khẩu |
| Procedure có transaction | 5 | Cả 5 procedure trên |
| Role nghiệp vụ | 4 | Khách hàng, tài xế, tổng đài, chủ đội xe |
| User demo nghiệp vụ | 4 | `demo_khach`, `demo_taixe`, `demo_tongdai`, `demo_chudoi` |

Khi vấn đáp, nên mở lần lượt: metadata/index → plan và phép đo → trigger và lỗi bị chặn → một procedure thành công/lỗi và rollback → quyền role. Nhấn mạnh rằng index vừa tăng tốc tra cứu vừa cưỡng chế duy nhất; trigger bảo vệ quy tắc toàn vẹn ở CSDL; transaction giữ các cập nhật liên quan cùng thành công hoặc cùng thất bại; role chỉ được cấp đúng quyền nghiệp vụ cần dùng.
