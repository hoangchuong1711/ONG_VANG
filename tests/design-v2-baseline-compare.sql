SET NOCOUNT ON;
CREATE TABLE #catalog(db sysname,kind varchar(30),name nvarchar(400),value nvarchar(max));
DECLARE @catalog nvarchar(max)=N'
INSERT #catalog
SELECT DB_NAME(), ''column'', CONCAT(t.name,''.'',c.name),
 (SELECT ty.name AS type,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,dc.definition AS default_value FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id WHERE t.is_ms_shipped=0;
INSERT #catalog
SELECT DB_NAME(),''object'',name,type FROM sys.objects WHERE is_ms_shipped=0 AND type IN (''U'',''V'',''P'',''FN'',''IF'',''TF'',''TR'');
INSERT #catalog
SELECT DB_NAME(),''index'',CONCAT(t.name,''.'',CASE WHEN i.is_primary_key=1 OR i.is_unique_constraint=1 THEN CONCAT(''constraint_index_'',i.index_id) ELSE i.name END),
 (SELECT i.is_unique,i.is_primary_key,i.is_unique_constraint,i.type,i.filter_definition,
 (SELECT c.name,ic.key_ordinal,ic.is_descending_key,ic.is_included_column FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id ORDER BY ic.index_column_id FOR JSON PATH) AS columns FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id WHERE i.name IS NOT NULL AND t.is_ms_shipped=0;
INSERT #catalog
SELECT DB_NAME(),''check'',CONCAT(OBJECT_NAME(parent_object_id),''.'',name),definition FROM sys.check_constraints;
INSERT #catalog
SELECT DB_NAME(),''foreign_key'',CONCAT(OBJECT_NAME(f.parent_object_id),''.'',CASE WHEN f.is_system_named=1 THEN OBJECT_NAME(f.referenced_object_id) ELSE f.name END),
 (SELECT OBJECT_NAME(f.referenced_object_id) AS target,f.delete_referential_action,f.update_referential_action,
 (SELECT COL_NAME(fc.parent_object_id,fc.parent_column_id) AS source_column,COL_NAME(fc.referenced_object_id,fc.referenced_column_id) AS target_column FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id ORDER BY fc.constraint_column_id FOR JSON PATH) AS columns FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
FROM sys.foreign_keys f;
INSERT #catalog
SELECT DB_NAME(),''permission'',CONCAT(USER_NAME(grantee_principal_id),''.'',class_desc,''.'',CASE WHEN class=1 THEN OBJECT_NAME(major_id) WHEN class=3 THEN SCHEMA_NAME(major_id) ELSE '''' END,''.'',minor_id,''.'',permission_name),state_desc
FROM sys.database_permissions WHERE USER_NAME(grantee_principal_id) LIKE ''r[_]%'';
INSERT #catalog
SELECT DB_NAME(),''membership'',CONCAT(USER_NAME(role_principal_id),''.'',USER_NAME(member_principal_id)),''member'' FROM sys.database_role_members WHERE USER_NAME(role_principal_id) LIKE ''r[_]%'';
';
EXEC mini_ong_vang_design_v2_demo.sys.sp_executesql @catalog;
EXEC mini_ong_vang_design_v2_test.sys.sp_executesql @catalog;
-- Intentional new policy: only dispatchers may assign orders in the fresh schema.
IF EXISTS (SELECT 1 FROM #catalog WHERE db='mini_ong_vang_design_v2_test'
 AND kind='permission' AND name='r_chu_doi_xe.OBJECT_OR_COLUMN.usp_phan_cong.0.EXECUTE')
 THROW 52959,'Owner still has SQL assignment permission',1;
DELETE FROM #catalog WHERE db='mini_ong_vang_design_v2_demo' AND kind='permission'
 AND name='r_chu_doi_xe.OBJECT_OR_COLUMN.usp_phan_cong.0.EXECUTE';
IF EXISTS (SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_demo'
 EXCEPT SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_test')
 OR EXISTS (SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_test'
 EXCEPT SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_demo')
BEGIN
 SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_demo'
 EXCEPT SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_test';
 SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_test'
 EXCEPT SELECT kind,name,value FROM #catalog WHERE db='mini_ong_vang_design_v2_demo';
 THROW 52950,'Consolidated catalog differs from original migrations',1;
END;
PRINT 'PASS: catalog matches legacy except intentional removal of owner assignment permission';
IF (SELECT COUNT(*) FROM dbo.tai_khoan)<>8 OR (SELECT COUNT(*) FROM dbo.don_hang)<>9
 OR EXISTS(SELECT 1 FROM dbo.don_hang WHERE trang_thai<>'CHO_GAN')
 OR EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien)
 THROW 52951,'Demo counts/status mismatch',1;
IF EXISTS(SELECT username,mat_khau_hash,vai_tro,trang_thai FROM dbo.tai_khoan
 EXCEPT SELECT username,mat_khau_hash,vai_tro,trang_thai FROM mini_ong_vang_design_v2_demo.dbo.tai_khoan)
 THROW 52952,'Demo account values mismatch',1;
IF EXISTS(SELECT ma_don,ma_kh,diem_lay,diem_giao,cuoc_km,cuoc_kg,tien_giam,trang_thai FROM dbo.don_hang
 EXCEPT SELECT ma_don,ma_kh,diem_lay,diem_giao,cuoc_km,cuoc_kg,tien_giam,trang_thai FROM mini_ong_vang_design_v2_demo.dbo.don_hang)
 THROW 52953,'Demo orders mismatch',1;
IF EXISTS(SELECT ma_don,tong_cuoc FROM dbo.v_cuoc_don EXCEPT SELECT ma_don,tong_cuoc FROM mini_ong_vang_design_v2_demo.dbo.v_cuoc_don)
 THROW 52954,'Demo fares mismatch',1;
PRINT 'PASS: eight demo accounts/password hashes, nine pending orders and calculated fares match';
IF (SELECT COUNT(*) FROM mini_ong_vang_baseline_schema.dbo.cau_hinh_cuoc)<>1
 OR (SELECT COUNT(*) FROM mini_ong_vang_baseline_schema.dbo.chinh_sach_thanh_vien)<>3
 OR (SELECT COUNT(*) FROM mini_ong_vang_baseline_schema.dbo.cau_hinh_phu_thu)<>2
 OR EXISTS(SELECT 1 FROM mini_ong_vang_baseline_schema.dbo.tai_khoan)
 THROW 52955,'Non-demo configuration mismatch',1;
PRINT 'PASS: non-demo installation has pricing and no demo accounts';
DECLARE @actor uniqueidentifier=(SELECT ma_tk FROM dbo.tai_khoan WHERE username='demo_dispatcher'),
 @driver_actor uniqueidentifier=(SELECT ma_tk FROM dbo.tai_khoan WHERE username='0800000001'),
 @driver uniqueidentifier=(SELECT ma_tx FROM dbo.tai_xe WHERE ma_tk=(SELECT ma_tk FROM dbo.tai_khoan WHERE username='0800000001')),
 @order uniqueidentifier=(SELECT TOP(1) ma_don FROM dbo.don_hang ORDER BY ma_don),
 @second uniqueidentifier=(SELECT TOP(1) ma_don FROM dbo.don_hang ORDER BY ma_don DESC);
DECLARE @owner uniqueidentifier=(SELECT ma_tk FROM dbo.tai_khoan WHERE username='demo_admin');
EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@owner;
BEGIN TRY
 EXEC dbo.usp_phan_cong @ma_don=@order,@ma_tx=@driver;
 THROW 52960,'Owner was allowed to assign an order',1;
END TRY
BEGIN CATCH
 IF ERROR_NUMBER()<>51201 THROW;
END CATCH;
IF (SELECT trang_thai FROM dbo.don_hang WHERE ma_don=@order)<>'CHO_GAN'
 OR EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang WHERE ma_don=@order)
 THROW 52961,'Denied owner request changed assignment data',1;
PRINT 'PASS: owner assignment denied with no data changes';
EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@actor;
EXEC dbo.usp_phan_cong @ma_don=@order,@ma_tx=@driver;
BEGIN TRY
 EXEC dbo.usp_phan_cong @ma_don=@second,@ma_tx=@driver;
 THROW 52956,'Busy driver was assigned twice',1;
END TRY
BEGIN CATCH
 IF ERROR_NUMBER()<>51203 THROW;
END CATCH;
IF (SELECT trang_thai FROM dbo.don_hang WHERE ma_don=@second)<>'CHO_GAN'
 THROW 52957,'Rejected assignment modified order',1;
EXEC sys.sp_set_session_context @key=N'ma_tk',@value=@driver_actor;
EXEC dbo.usp_tien_trinh @ma_don=@order,@hanh_dong='LAY_HANG';
EXEC dbo.usp_tien_trinh @ma_don=@order,@hanh_dong='BAT_DAU_GIAO';
EXEC dbo.usp_tien_trinh @ma_don=@order,@hanh_dong='DEN_DIEM_NHAN';
EXEC dbo.usp_hoan_tat @ma_don=@order,@xac_nhan_thu_du=1;
EXEC dbo.usp_hoan_tat @ma_don=@order,@xac_nhan_thu_du=1;
IF (SELECT COUNT(*) FROM dbo.phan_chia_cuoc WHERE ma_don=@order)<>1
 OR EXISTS(SELECT 1 FROM dbo.v_chia_cuoc WHERE ma_don=@order AND (tien_tai_xe+tien_cong_ty<>tong_cuoc OR tien_cong_ty<>dbo.fn_phan_cong_ty(tong_cuoc)))
 THROW 52958,'Completion retry or fare division failed',1;
PRINT 'PASS: assignment, rejected duplicate assignment rollback, delivery progress, completion retry and fare division';
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

