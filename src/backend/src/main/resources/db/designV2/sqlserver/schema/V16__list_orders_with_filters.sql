CREATE OR ALTER PROCEDURE dbo.usp_doc_don_trang
 @trang_thai VARCHAR(20)=NULL, @page INT=0, @size INT=20
AS
BEGIN
 SET NOCOUNT ON;
 IF @page IS NULL OR @page<0 OR @size IS NULL OR @size NOT BETWEEN 1 AND 100
  THROW 52302,N'Sai phan trang',1;
 IF @trang_thai IS NOT NULL AND @trang_thai NOT IN
  ('CHO_GAN','DA_GAN','DA_LAY_HANG','DANG_GIAO','HOAN_TAT','DA_HUY')
  THROW 52304,N'Sai trang thai don',1;

 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),
         @role VARCHAR(20), @offset BIGINT=CONVERT(BIGINT,@page)*@size;
 SELECT @role=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG';
 IF @role IS NULL THROW 51101,N'Phien khong hop le',1;

 DECLARE @visible TABLE(ma_don UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @visible(ma_don)
 SELECT d.ma_don FROM dbo.don_hang d
 JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
 WHERE (@trang_thai IS NULL OR d.trang_thai=@trang_thai)
   AND (@role IN ('TONG_DAI','CHU_DOI_XE')
     OR (@role='KHACH_HANG' AND k.ma_tk=@actor)
     OR (@role='TAI_XE' AND EXISTS (
       SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx
       WHERE p.ma_don=d.ma_don AND t.ma_tk=@actor AND (p.ket_qua IS NULL OR p.ket_qua<>'TU_CHOI'))))
 OPTION(RECOMPILE);

 SELECT COUNT_BIG(*) AS total FROM @visible;
 SELECT d.*,v.tong_cuoc FROM dbo.don_hang d
 JOIN @visible q ON q.ma_don=d.ma_don
 JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don
 ORDER BY d.tao_luc DESC,d.ma_don
 OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
END;
GO

GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_doc_don_trang TO r_chu_doi_xe;
