# Thiết kế CSDL đề xuất — Mini Ong Vang / DBMS330284

Ngày cập nhật: 17/10/2026. **BẢN DỰ THẢO ĐỂ DUYỆT**, thay toàn bộ nội dung tổng hợp schema cũ. Chưa áp dụng vào DB, chưa thay migration, chưa sửa backend/frontend. SQL trong tài liệu là định nghĩa cho mô hình mới trên SQL Server 2022, không phải script nâng cấp V1–V12. Không chạy nguyên tài liệu trên database hiện tại. Các ví dụ kiểm thử/phân quyền ở cuối là các kịch bản riêng, không nối vào khối tạo đối tượng.

## 1. Chức năng thay đổi đã thống nhất

| Phần | Thiết kế mới |
|---|---|
| Khách trả cước | Khách trả trực tiếp cho tài xế bên ngoài hệ thống. Không quản lý tiền mặt hay ngân hàng của khách; không xác minh giao dịch của khách. Người đặt chịu trách nhiệm trả cước; không có lựa chọn người trả/phương thức trên đơn. |
| Hoàn tất giao hàng | Tài xế được phân công xác nhận đã giao và đã thu đủ cước đã chốt. Không gọi VNPay và không đợi VNPay để hoàn tất. Nếu chưa thu đủ thì chưa hoàn tất theo phạm vi này. |
| Chia thu nhập | Theo từng đơn hoàn tất: công ty hưởng 20% cước cuối cùng sau giảm giá và phụ thu; tài xế hưởng phần còn lại. Không xét phí cổng thanh toán. |
| Nộp tiền công ty | Tài xế tự bấm thanh toán bất cứ lúc nào; cộng dồn qua ngày, không hạn nộp, không chặn nhận đơn vì còn phải nộp. VNPay Sandbox chỉ dành cho tài xế → công ty. |
| Đợt nộp | Gom toàn bộ khoản dương chưa thuộc đợt nào. Một tài xế tối đa một đợt chưa hoàn tất. Không nhập số tiền tùy ý, không trả một phần đơn, không hủy/tách đợt. |
| Thử thanh toán lại | Giữ đợt cũ và các đơn của nó; tạo lần thử mới chỉ sau khi lần trước được xác minh không thu. Hết thời gian trên màn hình không đủ kết luận không thu. |
| Điều phối | Giữ tạo hộ/gán/từ chối/gán lại/theo dõi; bỏ thu COD và xác nhận tài xế nộp tiền. |
| Tài khoản | Giữ đăng nhập, phân quyền, đổi mật khẩu khi đăng nhập; bỏ quên mật khẩu/OTP/email reset. Giữ hash và auth_version để vô hiệu phiên cũ. |
| Giá/thành viên | Giữ giá theo km/kg, phụ thu, hạng và chính sách thành viên. Không tính lại đơn cũ theo giá mới. |
| Báo giá | Không lưu bảng báo giá tạm; tính xem trước, khi tạo đơn tính lại và yêu cầu người dùng chấp thuận nếu giá thay đổi. |
| Ngoài phạm vi | Tiền hàng thu hộ người bán, trả góp, hoàn tiền, công ty trả lương/chuyển tiền tài xế, ví điện tử, đánh giá khách hàng, GPS trực tiếp. Vị trí demo/bản đồ có thể giữ. |

**Ví dụ:** ba đơn có tổng cước 300.000đ → tài xế hưởng 240.000đ, phải nộp 60.000đ. Bấm nộp tạo đợt 60.000đ. Chạy thêm đơn 100.000đ trong lúc chờ → phát sinh mới 20.000đ; đợt cũ vẫn 60.000đ. Khi trả thành công, còn phải nộp 20.000đ. Thu nhập tài xế không bị trừ thêm 60.000đ.

Phân biệt: tiền khách được tài xế **khai báo đã thu**; tiền công ty **được hưởng**; tiền công ty **đã nhận qua VNPay**. Không gọi 20% là lợi nhuận ròng. Thu nhập lọc theo ngày hoàn tất; khoản còn phải nộp tính toàn lịch sử, không reset theo ngày/bộ lọc.

### 1.1. Bảng/cột bỏ, gộp, thay

- Bỏ `thanh_toan`, `xac_nhan_thanh_toan_don_hang` và bộ sự kiện thanh toán của khách.
- Đổi nhóm `dot_nop_cod`, `khoan_cod_trong_dot`, `lan_nop_cod`, `su_kien_nop_cod` thành `dot_nop_tien`, `chi_tiet_dot_nop`, `giao_dich_nop_tien`, `su_kien_thanh_toan`. Chi tiết đợt trỏ khoản chia cước, không trỏ giao dịch khách. Bỏ người điều phối nộp tiền.
- Giữ nhưng thiết kế lại `phan_chia_cuoc`; không FK tới thanh toán khách.
- Bỏ `password_reset_challenge`, `auth_rate_limit` của luồng reset.
- Gộp `cuoc_don_hang` vào `don_hang`; bỏ cột phiên bản biểu phí lặp lại và không lưu tổng cước độc lập.
- Bỏ `bao_gia`. Chọn phương án gọn: bỏ `yeu_cau_tao_don`, thay bằng khóa yêu cầu + hash nội dung trên đơn. Khóa chỉ duy nhất theo người tạo; cùng khóa nhưng khác nội dung phải từ chối.
- Bỏ `ben_thanh_toan`, `phuong_thuc_thanh_toan`. Giữ lịch sử phân công, kiện, phụ thu, nhật ký đơn và kiểm toán.
- Bảng Flyway/seed/công cụ không tính trong 18 bảng nghiệp vụ và không tạo ở bản này.

## 2. Mô hình quan hệ và lựa chọn thiết kế

18 bảng: `tai_khoan`, `khach_hang`, `tai_xe`, `phuong_tien`, `cau_hinh_cuoc`, `chinh_sach_thanh_vien`, `cau_hinh_phu_thu`, `don_hang`, `chi_tiet_kien_hang`, `phu_thu_don_hang`, `phan_cong_don_hang`, `nhat_ky_don_hang`, `nhat_ky_kiem_toan`, `phan_chia_cuoc`, `dot_nop_tien`, `chi_tiet_dot_nop`, `giao_dich_nop_tien`, `su_kien_thanh_toan`.

| Quan hệ | Bội số / ý nghĩa |
|---|---|
| Tài khoản → khách/tài xế | 1–0..1 mỗi loại, đúng vai trò; đăng ký phải tạo hồ sơ trong cùng transaction |
| Tài xế → xe | 1–0..1 theo phạm vi cũ; không quản lý đội xe nhiều xe/tài xế |
| Khách → đơn | 1–N; người tạo có thể là khách hoặc tổng đài |
| Đơn → kiện / phân công / nhật ký | 1–N; lịch sử phân công được giữ, tối đa một phân công còn mở |
| Đơn ↔ phụ thu | N–N qua `phu_thu_don_hang` |
| Biểu phí/chính sách → đơn | 1–N; chính sách giảm có thể NULL |
| Đơn → khoản chia | 1–0..1; chỉ phát sinh khi hoàn tất và xác nhận thu đủ |
| Phân công → khoản chia | 1–0..1; FK ghép bảo đảm phân công thuộc đúng đơn |
| Tài xế → đợt nộp | 1–N; tối đa một đợt chưa nộp xong |
| Đợt → chi tiết | 1–N theo thủ tục; khoản chia thuộc tối đa một đợt vĩnh viễn |
| Đợt → lần thử VNPay | 1–N; tối đa một lần chưa giải quyết, tối đa một thành công |
| Giao dịch → sự kiện | 1–N; sự kiện không nhận diện được giao dịch có FK NULL |

### 2.1. Chuẩn hóa và dữ liệu chốt

Khóa dùng UNIQUEIDENTIFIER trong **đề xuất mới**; đây là thay đổi kiểu so với NVARCHAR(36) hiện tại, cần đổi mapping Java hoặc giữ kiểu cũ đồng bộ khi triển khai. Tiền dùng DECIMAL(15,0), không FLOAT; thời gian UTC DATETIME2(3), hiển thị UTC+7. Khoảng thời gian lọc là [từ, đến).

Không lưu ma_tx trên đơn; suy từ phân công. Không lưu số dư tài xế độc lập. Không lưu tỷ lệ 20% có thể sửa: công thức cố định trong View/hàm. Khoản chia chỉ giữ khóa đơn, phân công và thời điểm; số tiền lấy từ giá đơn bất biến. Tổng đợt tính từ chi tiết; số tiền yêu cầu trong giao dịch là dữ liệu chốt gửi đối tác, phải đối chiếu tổng đợt.

Các cột cuoc_km, cuoc_kg, tien_giam trên đơn là kết quả định giá chốt khi tạo, không phải giá hiện hành. Không lặp tong_khoi_luong, tong_phu_thu, tong_cuoc thành cột vật lý. Phụ thu tham chiếu phiên bản bất biến. Địa chỉ/người nhận là thông tin của lần giao, không phụ thuộc địa chỉ mặc định mới của khách. Các bản ghi kỹ thuật JSON chỉ là chứng cứ trao đổi/audit, không thay dữ liệu quan hệ cốt lõi. Đây là cơ sở phân tích 3NF; snapshot và các cột kỹ thuật cần giải thích riêng, không khẳng định mọi dữ liệu dẫn xuất tự động đạt 3NF.

Đơn giá và kiện/phụ thu không sửa sau khi tạo: muốn thay nội dung đơn thì hủy trước lấy hàng rồi tạo lại. CRUD sửa/xóa áp dụng cho dữ liệu danh mục/hồ sơ và chính sách NHAP; đơn tài chính dùng hủy, không xóa vật lý. Chính sách công bố không sửa nội dung; chỉ đóng hiệu lực tương lai theo thủ tục quản trị cần bổ sung. Khoảng hiệu lực không được chồng trong cùng nhóm chính sách.

## 3. SQL tạo bảng đề xuất

Khối 3–7 là SQL định nghĩa; không có DROP DATABASE, USE, seed hay thao tác lên DB hiện tại. Thứ tự: bảng → index → hàm/view → trigger → thủ tục. Đã rà tĩnh, **chưa biên dịch/chạy SQL Server**. Những trách nhiệm chưa có thủ tục đầy đủ được đánh dấu ở mục 8, không xem bản thảo là backend hoàn chỉnh.

```sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
CREATE TABLE dbo.tai_khoan (
 ma_tk UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 username NVARCHAR(50) NOT NULL UNIQUE,
 mat_khau_hash NVARCHAR(255) NOT NULL,
 ho_ten NVARCHAR(100) NOT NULL,
 so_dien_thoai VARCHAR(10) NULL,
 email NVARCHAR(150) NULL,
 vai_tro VARCHAR(20) NOT NULL,
 trang_thai VARCHAR(15) NOT NULL DEFAULT 'HOAT_DONG',
 auth_version BIGINT NOT NULL DEFAULT 0,
 ngay_tao DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT ck_tk_role CHECK(vai_tro IN ('KHACH_HANG','TAI_XE','TONG_DAI','CHU_DOI_XE')),
 CONSTRAINT ck_tk_status CHECK(trang_thai IN ('HOAT_DONG','KHOA')),
 CONSTRAINT ck_tk_phone CHECK(so_dien_thoai IS NULL OR
   (LEN(so_dien_thoai)=10 AND so_dien_thoai NOT LIKE '%[^0-9]%' AND LEFT(so_dien_thoai,1)='0')),
 CONSTRAINT ck_tk_text CHECK(LEN(LTRIM(RTRIM(username)))>0 AND LEN(LTRIM(RTRIM(ho_ten)))>0 AND LEN(mat_khau_hash)>0),
 CONSTRAINT ck_tk_version CHECK(auth_version>=0)
);
CREATE TABLE dbo.khach_hang (
 ma_kh UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_khoan(ma_tk),
 dia_chi_mac_dinh NVARCHAR(255) NULL,
 ma_hang VARCHAR(15) NOT NULL DEFAULT 'THUONG',
 thanh_vien_tu DATETIME2(3) NULL, thanh_vien_den DATETIME2(3) NULL,
 CONSTRAINT ck_kh_hang CHECK(ma_hang IN ('THUONG','BAC','VANG','KIM_CUONG')),
 CONSTRAINT ck_kh_dates CHECK(
  (ma_hang='THUONG' AND thanh_vien_tu IS NULL AND thanh_vien_den IS NULL) OR
  (ma_hang<>'THUONG' AND thanh_vien_tu IS NOT NULL AND (thanh_vien_den IS NULL OR thanh_vien_den>thanh_vien_tu)))
);
CREATE TABLE dbo.tai_xe (
 ma_tx UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_khoan(ma_tk),
 cccd VARCHAR(12) NOT NULL UNIQUE, so_giay_phep NVARCHAR(50) NOT NULL UNIQUE,
 ngay_het_han_gplx DATE NOT NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'OFFLINE',
 ranh_tu DATETIME2(3) NULL,
 vi_tri_demo_dia_chi NVARCHAR(255) NULL,
 vi_tri_demo_lat DECIMAL(10,7) NULL, vi_tri_demo_lng DECIMAL(10,7) NULL,
 vi_tri_demo_luc DATETIME2(3) NULL,
 CONSTRAINT ck_tx_status CHECK(trang_thai IN ('ONLINE','OFFLINE','NGHI')),
 CONSTRAINT ck_tx_cccd CHECK(LEN(cccd)=12 AND cccd NOT LIKE '%[^0-9]%'),
 CONSTRAINT ck_tx_position CHECK(
  (vi_tri_demo_dia_chi IS NULL AND vi_tri_demo_lat IS NULL AND vi_tri_demo_lng IS NULL AND vi_tri_demo_luc IS NULL) OR
  (vi_tri_demo_dia_chi IS NOT NULL AND vi_tri_demo_lat IS NOT NULL AND vi_tri_demo_lng IS NOT NULL AND vi_tri_demo_luc IS NOT NULL
   AND vi_tri_demo_lat BETWEEN -90 AND 90 AND vi_tri_demo_lng BETWEEN -180 AND 180))
);
CREATE TABLE dbo.phuong_tien (
 ma_phuong_tien UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tx UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.tai_xe(ma_tx),
 bien_so NVARCHAR(15) NOT NULL UNIQUE, loai_xe NVARCHAR(50) NOT NULL,
 mau_xe NVARCHAR(30) NULL, dang_hoat_dong BIT NOT NULL DEFAULT 1
);
CREATE TABLE dbo.cau_hinh_cuoc (
 ma_bieu_phi UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ten NVARCHAR(100) NOT NULL,
 cuoc_co_ban DECIMAL(15,0) NOT NULL, don_gia_km DECIMAL(15,0) NOT NULL,
 km_toi_thieu DECIMAL(10,2) NOT NULL, km_toi_da DECIMAL(10,2) NOT NULL,
 kg_bao_gom DECIMAL(10,2) NOT NULL, kg_toi_da DECIMAL(10,2) NOT NULL,
 don_gia_kg DECIMAL(15,0) NOT NULL,
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_cuoc_values CHECK(cuoc_co_ban>=0 AND don_gia_km>=0 AND don_gia_kg>=0
  AND km_toi_thieu>=0 AND km_toi_da>=km_toi_thieu AND kg_bao_gom>=0 AND kg_toi_da>=kg_bao_gom),
 CONSTRAINT ck_cuoc_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_cuoc_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.chinh_sach_thanh_vien (
 ma_chinh_sach UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_hang VARCHAR(15) NOT NULL, ty_le_giam DECIMAL(5,2) NOT NULL,
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_cs_hang CHECK(ma_hang IN ('BAC','VANG','KIM_CUONG')),
 CONSTRAINT ck_cs_rate CHECK(ty_le_giam BETWEEN 0 AND 100),
 CONSTRAINT ck_cs_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_cs_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.cau_hinh_phu_thu (
 ma_phu_thu UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_loai VARCHAR(30) NOT NULL, ten NVARCHAR(100) NOT NULL,
 so_tien DECIMAL(15,0) NOT NULL CHECK(so_tien>=0),
 hieu_luc_tu DATETIME2(3) NOT NULL, hieu_luc_den DATETIME2(3) NULL,
 trang_thai VARCHAR(10) NOT NULL DEFAULT 'NHAP',
 CONSTRAINT ck_pt_dates CHECK(hieu_luc_den IS NULL OR hieu_luc_den>hieu_luc_tu),
 CONSTRAINT ck_pt_status CHECK(trang_thai IN ('NHAP','CONG_BO'))
);
CREATE TABLE dbo.don_hang (
 ma_don UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_kh UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.khach_hang(ma_kh),
 ma_tk_tao UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 khoa_yeu_cau VARCHAR(100) NOT NULL, hash_yeu_cau BINARY(32) NOT NULL,
 ma_bieu_phi UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.cau_hinh_cuoc(ma_bieu_phi),
 ma_chinh_sach UNIQUEIDENTIFIER NULL REFERENCES dbo.chinh_sach_thanh_vien(ma_chinh_sach),
 diem_lay NVARCHAR(255) NOT NULL, diem_giao NVARCHAR(255) NOT NULL,
 ten_nguoi_nhan NVARCHAR(100) NOT NULL, sdt_nguoi_nhan VARCHAR(10) NOT NULL,
 quang_duong_km DECIMAL(10,2) NOT NULL CHECK(quang_duong_km>0),
 thoi_gian_du_kien_giay INT NOT NULL CHECK(thoi_gian_du_kien_giay>0),
 nguon_lo_trinh VARCHAR(10) NOT NULL CHECK(nguon_lo_trinh IN ('GOONG','DEMO')),
 cuoc_km DECIMAL(15,0) NOT NULL, cuoc_kg DECIMAL(15,0) NOT NULL, tien_giam DECIMAL(15,0) NOT NULL,
 ghi_chu NVARCHAR(500) NULL,
 trang_thai VARCHAR(20) NOT NULL DEFAULT 'CHO_GAN',
 tao_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 hoan_tat_luc DATETIME2(3) NULL, huy_luc DATETIME2(3) NULL, ly_do_huy NVARCHAR(500) NULL,
 CONSTRAINT uq_don_request UNIQUE(ma_tk_tao,khoa_yeu_cau),
 CONSTRAINT ck_don_phone CHECK(LEN(sdt_nguoi_nhan)=10 AND sdt_nguoi_nhan NOT LIKE '%[^0-9]%' AND LEFT(sdt_nguoi_nhan,1)='0'),
 CONSTRAINT ck_don_money CHECK(cuoc_km>=0 AND cuoc_kg>=0 AND tien_giam BETWEEN 0 AND cuoc_km+cuoc_kg),
 CONSTRAINT ck_don_status CHECK(trang_thai IN ('CHO_GAN','DA_GAN','DA_LAY_HANG','DANG_GIAO','HOAN_TAT','DA_HUY')),
 CONSTRAINT ck_don_terminal CHECK(
  (trang_thai='HOAN_TAT' AND hoan_tat_luc IS NOT NULL AND hoan_tat_luc>=tao_luc AND huy_luc IS NULL AND ly_do_huy IS NULL) OR
  (trang_thai='DA_HUY' AND huy_luc IS NOT NULL AND huy_luc>=tao_luc AND ly_do_huy IS NOT NULL AND hoan_tat_luc IS NULL) OR
  (trang_thai NOT IN ('HOAN_TAT','DA_HUY') AND hoan_tat_luc IS NULL AND huy_luc IS NULL AND ly_do_huy IS NULL))
);
CREATE TABLE dbo.chi_tiet_kien_hang (
 ma_kien UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 thu_tu INT NOT NULL CHECK(thu_tu>0), loai_hang NVARCHAR(100) NOT NULL,
 khoi_luong_kg DECIMAL(10,2) NOT NULL CHECK(khoi_luong_kg>0), ghi_chu NVARCHAR(500) NULL,
 CONSTRAINT uq_kien_order UNIQUE(ma_don,thu_tu)
);
CREATE TABLE dbo.phu_thu_don_hang (
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_phu_thu UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.cau_hinh_phu_thu(ma_phu_thu),
 PRIMARY KEY(ma_don,ma_phu_thu)
);
CREATE TABLE dbo.phan_cong_don_hang (
 ma_phan_cong UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_tx UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_xe(ma_tx),
 ma_tk_dieu_phoi UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 bat_dau_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), ket_thuc_luc DATETIME2(3) NULL,
 ket_qua VARCHAR(15) NULL, ly_do NVARCHAR(500) NULL,
 CONSTRAINT uq_pc_pair UNIQUE(ma_don,ma_phan_cong),
 CONSTRAINT ck_pc_end CHECK((ket_thuc_luc IS NULL AND ket_qua IS NULL) OR
  (ket_thuc_luc IS NOT NULL AND ket_qua IS NOT NULL AND ket_thuc_luc>=bat_dau_luc AND ket_qua IN ('TU_CHOI','HOAN_TAT','HUY_DON')))
);
CREATE TABLE dbo.nhat_ky_don_hang (
 ma_su_kien BIGINT IDENTITY PRIMARY KEY,
 ma_don UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.don_hang(ma_don),
 ma_tk UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_khoan(ma_tk),
 loai VARCHAR(25) NOT NULL CHECK(loai IN ('TAO_DON','CHUYEN_TRANG_THAI','DEN_DIEM_NHAN','SU_CO')),
 trang_thai_truoc VARCHAR(20) NULL, trang_thai_sau VARCHAR(20) NOT NULL,
 thoi_gian DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), ghi_chu NVARCHAR(500) NULL
);
CREATE TABLE dbo.nhat_ky_kiem_toan (
 ma_audit BIGINT IDENTITY PRIMARY KEY,
 ma_tk UNIQUEIDENTIFIER NULL REFERENCES dbo.tai_khoan(ma_tk),
 doi_tuong VARCHAR(50) NOT NULL, ma_doi_tuong UNIQUEIDENTIFIER NOT NULL,
 hanh_dong VARCHAR(30) NOT NULL, thoi_gian DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 noi_dung NVARCHAR(MAX) NULL CHECK(noi_dung IS NULL OR ISJSON(noi_dung)=1)
);
CREATE TABLE dbo.phan_chia_cuoc (
 ma_don UNIQUEIDENTIFIER NOT NULL PRIMARY KEY REFERENCES dbo.don_hang(ma_don),
 ma_phan_cong UNIQUEIDENTIFIER NOT NULL UNIQUE,
 ghi_nhan_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT fk_chia_pc FOREIGN KEY(ma_don,ma_phan_cong) REFERENCES dbo.phan_cong_don_hang(ma_don,ma_phan_cong)
);
CREATE TABLE dbo.dot_nop_tien (
 ma_dot UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_tx UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.tai_xe(ma_tx),
 trang_thai VARCHAR(15) NOT NULL DEFAULT 'CHUA_NOP',
 tao_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), thanh_toan_luc DATETIME2(3) NULL,
 CONSTRAINT ck_dot_status CHECK(
  (trang_thai='CHUA_NOP' AND thanh_toan_luc IS NULL) OR
  (trang_thai='DA_NOP' AND thanh_toan_luc IS NOT NULL AND thanh_toan_luc>=tao_luc))
);
CREATE TABLE dbo.chi_tiet_dot_nop (
 ma_dot UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.dot_nop_tien(ma_dot),
 ma_don UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.phan_chia_cuoc(ma_don),
 PRIMARY KEY(ma_dot,ma_don)
);
CREATE TABLE dbo.giao_dich_nop_tien (
 ma_giao_dich UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
 ma_dot UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.dot_nop_tien(ma_dot),
 ma_tham_chieu VARCHAR(100) NOT NULL UNIQUE,
 so_tien_yeu_cau DECIMAL(15,0) NOT NULL CHECK(so_tien_yeu_cau>0),
 trang_thai VARCHAR(20) NOT NULL DEFAULT 'CHO_XU_LY',
 tao_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), giai_quyet_luc DATETIME2(3) NULL,
 ma_giao_dich_doi_tac VARCHAR(100) NULL, so_tien_thuc_nhan DECIMAL(15,0) NULL,
 payment_url NVARCHAR(2048) NULL,
 CONSTRAINT ck_gd_state CHECK(
  (trang_thai IN ('CHO_XU_LY','CHUA_RO_KET_QUA') AND giai_quyet_luc IS NULL AND ma_giao_dich_doi_tac IS NULL AND so_tien_thuc_nhan IS NULL) OR
  (trang_thai='KHONG_THU' AND giai_quyet_luc IS NOT NULL AND ma_giao_dich_doi_tac IS NULL AND so_tien_thuc_nhan IS NULL) OR
  (trang_thai='THANH_CONG' AND giai_quyet_luc IS NOT NULL AND ma_giao_dich_doi_tac IS NOT NULL AND so_tien_thuc_nhan IS NOT NULL AND so_tien_thuc_nhan=so_tien_yeu_cau)),
 CONSTRAINT ck_gd_time CHECK(giai_quyet_luc IS NULL OR giai_quyet_luc>=tao_luc)
);
CREATE TABLE dbo.su_kien_thanh_toan (
 ma_su_kien BIGINT IDENTITY PRIMARY KEY,
 ma_giao_dich UNIQUEIDENTIFIER NULL REFERENCES dbo.giao_dich_nop_tien(ma_giao_dich),
 nguon VARCHAR(15) NOT NULL CHECK(nguon IN ('IPN','QUERY','RETURN')),
 khoa_su_kien BINARY(32) NOT NULL,
 chu_ky_hop_le BIT NOT NULL,
 ket_qua VARCHAR(25) NOT NULL CHECK(ket_qua IN ('DA_AP_DUNG','KHONG_THAY_DOI','KHONG_HOP_LE','KHONG_KHOP','CAN_DOI_SOAT')),
 nhan_luc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 noi_dung_json NVARCHAR(MAX) NOT NULL CHECK(ISJSON(noi_dung_json)=1),
 CONSTRAINT uq_event UNIQUE(nguon,khoa_su_kien)
);
GO
```

## 4. Index và ràng buộc duy nhất

Index duy nhất bảo vệ bất biến ngay cả khi có hai request. Index thường phục vụ tra cứu cụ thể; không tính tạo nhiều index là đã chứng minh hiệu năng.

```sql
CREATE UNIQUE INDEX ux_tk_phone ON dbo.tai_khoan(so_dien_thoai) WHERE so_dien_thoai IS NOT NULL;
CREATE UNIQUE INDEX ux_pc_open_order ON dbo.phan_cong_don_hang(ma_don) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_open_driver ON dbo.phan_cong_don_hang(ma_tx) WHERE ket_thuc_luc IS NULL;
CREATE UNIQUE INDEX ux_pc_done ON dbo.phan_cong_don_hang(ma_don) WHERE ket_qua='HOAN_TAT';
CREATE UNIQUE INDEX ux_dot_open ON dbo.dot_nop_tien(ma_tx) WHERE trang_thai='CHUA_NOP';
-- Một filter IS NULL bao phủ cả hai trạng thái chưa giải quyết, không dùng hai index rời.
CREATE UNIQUE INDEX ux_gd_open ON dbo.giao_dich_nop_tien(ma_dot) WHERE giai_quyet_luc IS NULL;
CREATE UNIQUE INDEX ux_gd_success ON dbo.giao_dich_nop_tien(ma_dot) WHERE trang_thai='THANH_CONG';
CREATE UNIQUE INDEX ux_gd_partner ON dbo.giao_dich_nop_tien(ma_giao_dich_doi_tac) WHERE ma_giao_dich_doi_tac IS NOT NULL;
CREATE UNIQUE INDEX ux_arrival ON dbo.nhat_ky_don_hang(ma_don) WHERE loai='DEN_DIEM_NHAN';
CREATE INDEX ix_don_customer_time ON dbo.don_hang(ma_kh,tao_luc DESC) INCLUDE(trang_thai);
CREATE INDEX ix_don_queue ON dbo.don_hang(trang_thai,tao_luc) INCLUDE(ma_kh);
CREATE INDEX ix_pc_driver_time ON dbo.phan_cong_don_hang(ma_tx,bat_dau_luc DESC) INCLUDE(ma_don,ket_qua);
CREATE INDEX ix_log_order_time ON dbo.nhat_ky_don_hang(ma_don,thoi_gian,ma_su_kien);
CREATE INDEX ix_dot_driver_time ON dbo.dot_nop_tien(ma_tx,tao_luc DESC) INCLUDE(trang_thai);
CREATE INDEX ix_gd_batch_time ON dbo.giao_dich_nop_tien(ma_dot,tao_luc DESC) INCLUDE(trang_thai,so_tien_yeu_cau);
CREATE INDEX ix_audit_object ON dbo.nhat_ky_kiem_toan(doi_tuong,ma_doi_tuong,thoi_gian DESC);
GO
```

## 5. Năm Function và các View phục vụ ứng dụng

Công thức giữ cách tính cũ: cước km = cơ bản + km × đơn giá; km_toi_thieu là điều kiện phạm vi, không phải km miễn phí. Giảm giá chỉ áp dụng cước km + kg, không giảm phụ thu. Các tham số âm/ngoài phạm vi phải bị thủ tục từ chối trước khi gọi hàm.

```sql
CREATE OR ALTER FUNCTION dbo.fn_cuoc_km(@co_ban DECIMAL(15,0), @km DECIMAL(10,2), @don_gia DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@co_ban+@km*@don_gia,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_cuoc_kg(@kg DECIMAL(10,2), @bao_gom DECIMAL(10,2), @don_gia DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(CASE WHEN @kg>@bao_gom THEN (@kg-@bao_gom)*@don_gia ELSE 0 END,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_tien_giam(@cuoc DECIMAL(15,0), @ty_le DECIMAL(5,2))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@cuoc*@ty_le/100,0)); END;
GO
CREATE OR ALTER FUNCTION dbo.fn_phan_cong_ty(@tong DECIMAL(15,0))
RETURNS DECIMAL(15,0) AS
BEGIN RETURN CONVERT(DECIMAL(15,0),ROUND(@tong*CAST(0.20 AS DECIMAL(3,2)),0)); END;
GO
CREATE OR ALTER VIEW dbo.v_cuoc_don AS
SELECT d.ma_don,d.ma_kh,d.trang_thai,d.tao_luc,d.hoan_tat_luc,
 d.cuoc_km,d.cuoc_kg,d.tien_giam,
 COALESCE(p.phu_thu,0) AS phu_thu,
 CONVERT(DECIMAL(15,0),d.cuoc_km+d.cuoc_kg-d.tien_giam+COALESCE(p.phu_thu,0)) AS tong_cuoc
FROM dbo.don_hang d OUTER APPLY (
 SELECT SUM(c.so_tien) phu_thu FROM dbo.phu_thu_don_hang x
 JOIN dbo.cau_hinh_phu_thu c ON c.ma_phu_thu=x.ma_phu_thu WHERE x.ma_don=d.ma_don
) p;
GO
CREATE OR ALTER VIEW dbo.v_chia_cuoc AS
SELECT c.ma_don,p.ma_tx,c.ghi_nhan_luc,v.tong_cuoc,
 dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_cong_ty,
 v.tong_cuoc-dbo.fn_phan_cong_ty(v.tong_cuoc) AS tien_tai_xe
FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong
JOIN dbo.v_cuoc_don v ON v.ma_don=c.ma_don;
GO
CREATE OR ALTER VIEW dbo.v_tong_dot_nop AS
SELECT d.ma_dot,d.ma_tx,d.trang_thai,d.tao_luc,d.thanh_toan_luc,
 COUNT(c.ma_don) AS so_don,COALESCE(SUM(c.tien_cong_ty),0) AS tong_tien
FROM dbo.dot_nop_tien d LEFT JOIN dbo.chi_tiet_dot_nop x ON x.ma_dot=d.ma_dot
LEFT JOIN dbo.v_chia_cuoc c ON c.ma_don=x.ma_don
GROUP BY d.ma_dot,d.ma_tx,d.trang_thai,d.tao_luc,d.thanh_toan_luc;
GO
CREATE OR ALTER VIEW dbo.v_so_du_tai_xe AS
SELECT t.ma_tx,
 COALESCE(SUM(c.tong_cuoc),0) AS tong_cuoc_da_thu,
 COALESCE(SUM(c.tien_tai_xe),0) AS thu_nhap_tai_xe,
 COALESCE(SUM(c.tien_cong_ty),0) AS cong_ty_duoc_huong,
 COALESCE(SUM(CASE WHEN d.trang_thai='DA_NOP' THEN c.tien_cong_ty ELSE 0 END),0) AS da_nop,
 COALESCE(SUM(CASE WHEN d.trang_thai='DA_NOP' THEN 0 ELSE c.tien_cong_ty END),0) AS con_phai_nop,
 COALESCE(SUM(CASE WHEN d.trang_thai='CHUA_NOP' THEN c.tien_cong_ty ELSE 0 END),0) AS dang_trong_dot,
 COALESCE(SUM(CASE WHEN x.ma_dot IS NULL THEN c.tien_cong_ty ELSE 0 END),0) AS phat_sinh_moi
FROM dbo.tai_xe t LEFT JOIN dbo.v_chia_cuoc c ON c.ma_tx=t.ma_tx
LEFT JOIN dbo.chi_tiet_dot_nop x ON x.ma_don=c.ma_don
LEFT JOIN dbo.dot_nop_tien d ON d.ma_dot=x.ma_dot GROUP BY t.ma_tx;
GO
CREATE OR ALTER VIEW dbo.v_don_cho_dieu_phoi AS
SELECT ma_don,ma_kh,diem_lay,diem_giao,tao_luc FROM dbo.don_hang WHERE trang_thai='CHO_GAN';
GO
CREATE OR ALTER VIEW dbo.v_tai_xe_san_sang AS
SELECT t.ma_tx,k.ho_ten,t.ranh_tu,p.bien_so FROM dbo.tai_xe t
JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx
WHERE t.trang_thai='ONLINE' AND k.trang_thai='HOAT_DONG' AND p.dang_hoat_dong=1
 AND t.ngay_het_han_gplx>=CONVERT(DATE,DATEADD(HOUR,7,SYSUTCDATETIME()))
 AND NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang a WHERE a.ma_tx=t.ma_tx AND a.ket_thuc_luc IS NULL);
GO
CREATE OR ALTER VIEW dbo.v_cong_ty_thuc_nhan_ngay AS
SELECT CONVERT(DATE,DATEADD(HOUR,7,giai_quyet_luc)) AS ngay_vn,
 SUM(so_tien_thuc_nhan) AS thuc_nhan,COUNT_BIG(*) AS so_giao_dich
FROM dbo.giao_dich_nop_tien WHERE trang_thai='THANH_CONG'
GROUP BY CONVERT(DATE,DATEADD(HOUR,7,giai_quyet_luc));
GO
CREATE OR ALTER FUNCTION dbo.fn_thu_nhap_tai_xe(@ma_tx UNIQUEIDENTIFIER,@tu DATETIME2(3),@den DATETIME2(3))
RETURNS TABLE AS RETURN (
 SELECT COUNT_BIG(*) AS so_don,COALESCE(SUM(tong_cuoc),0) AS tong_cuoc,
 COALESCE(SUM(tien_tai_xe),0) AS thu_nhap,COALESCE(SUM(tien_cong_ty),0) AS phan_cong_ty
 FROM dbo.v_chia_cuoc WHERE ma_tx=@ma_tx AND ghi_nhan_luc>=@tu AND ghi_nhan_luc<@den
);
GO
```

Ứng dụng gọi ba hàm giá khi báo giá/tạo đơn; View chia cước dùng fn_phan_cong_ty; màn thu nhập gọi TVF fn_thu_nhap_tai_xe. Màn công nợ dùng v_so_du_tai_xe không lọc ngày. View tổng đợt không JOIN trực tiếp các lần thử VNPay để tránh nhân số tiền do nhiều lần thử.

## 6. Trigger và ranh giới toàn vẹn

Trigger xử lý theo tập inserted/deleted, không giả định một dòng. Không dùng trigger gọi HTTP/VNPay. Trigger nhật ký là nơi duy nhất ghi sự kiện tạo/chuyển trạng thái; code chỉ ghi đến điểm nhận/sự cố. SESSION_CONTEXT('ma_tk') do backend xác thực thiết lập trên kết nối, không lấy trực tiếp từ body của khách; thiếu ngữ cảnh thì từ chối thao tác đơn. Đây là hợp đồng tích hợp, không phải cơ chế chống giả mạo dành cho người tự có quyền kết nối DB.

```sql
CREATE OR ALTER TRIGGER dbo.tr_kh_role ON dbo.khach_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'KHACH_HANG')
  THROW 51001,N'Hồ sơ khách sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tx_role ON dbo.tai_xe AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.tai_khoan t ON t.ma_tk=i.ma_tk WHERE t.vai_tro<>'TAI_XE')
  THROW 51002,N'Hồ sơ tài xế sai vai trò',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_tk_role_audit ON dbo.tai_khoan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.vai_tro<>d.vai_tro)
  THROW 51003,N'Không đổi vai trò tài khoản đã tạo',1;
 INSERT dbo.nhat_ky_kiem_toan(ma_tk,doi_tuong,ma_doi_tuong,hanh_dong,noi_dung)
 SELECT TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk')),'TAI_KHOAN',i.ma_tk,'DOI_TRANG_THAI',
  (SELECT d.trang_thai AS truoc,i.trang_thai AS sau FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
 FROM inserted i JOIN deleted d ON d.ma_tk=i.ma_tk WHERE i.trang_thai<>d.trang_thai;
 -- Không ghi hash/mật khẩu/token vào audit.
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_don_transition_log ON dbo.don_hang AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 IF @actor IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.tai_khoan WHERE ma_tk=@actor AND trang_thai='HOAT_DONG')
  THROW 51004,N'Thiếu tài khoản thao tác hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don
  WHERE d.ma_don IS NULL AND i.trang_thai<>'CHO_GAN') THROW 51005,N'Đơn mới phải chờ gán',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don WHERE i.trang_thai<>d.trang_thai AND NOT(
  (d.trang_thai='CHO_GAN' AND i.trang_thai IN ('DA_GAN','DA_HUY')) OR
  (d.trang_thai='DA_GAN' AND i.trang_thai IN ('CHO_GAN','DA_LAY_HANG','DA_HUY')) OR
  (d.trang_thai='DA_LAY_HANG' AND i.trang_thai='DANG_GIAO') OR
  (d.trang_thai='DANG_GIAO' AND i.trang_thai='HOAN_TAT')))
  THROW 51006,N'Chuyển trạng thái không hợp lệ',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_don=i.ma_don
  WHERE EXISTS(SELECT i.ma_kh,i.ma_tk_tao,i.khoa_yeu_cau,i.hash_yeu_cau,i.ma_bieu_phi,i.ma_chinh_sach,
   i.cuoc_km,i.cuoc_kg,i.tien_giam,i.quang_duong_km,i.diem_lay,i.diem_giao,i.ten_nguoi_nhan,i.sdt_nguoi_nhan
   EXCEPT SELECT d.ma_kh,d.ma_tk_tao,d.khoa_yeu_cau,d.hash_yeu_cau,d.ma_bieu_phi,d.ma_chinh_sach,
   d.cuoc_km,d.cuoc_kg,d.tien_giam,d.quang_duong_km,d.diem_lay,d.diem_giao,d.ten_nguoi_nhan,d.sdt_nguoi_nhan))
  THROW 51007,N'Không sửa nội dung/giá đơn đã tạo',1;
 INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
 SELECT i.ma_don,@actor,CASE WHEN d.ma_don IS NULL THEN 'TAO_DON' ELSE 'CHUYEN_TRANG_THAI' END,d.trang_thai,i.trang_thai
 FROM inserted i LEFT JOIN deleted d ON d.ma_don=i.ma_don WHERE d.ma_don IS NULL OR d.trang_thai<>i.trang_thai;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_chia_hop_le ON dbo.phan_chia_cuoc AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51008,N'Khoản chia đã ghi nhận không sửa/xóa',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.don_hang d ON d.ma_don=i.ma_don
  JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=i.ma_phan_cong
  WHERE d.trang_thai<>'HOAN_TAT' OR p.ket_qua IS NULL OR p.ket_qua<>'HOAN_TAT')
  THROW 51009,N'Chỉ ghi nhận chia cước cho phân công hoàn tất',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_chi_tiet_dot ON dbo.chi_tiet_dot_nop AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51010,N'Không sửa/xóa khoản đã gom vào đợt',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.dot_nop_tien d ON d.ma_dot=i.ma_dot
  JOIN dbo.v_chia_cuoc c ON c.ma_don=i.ma_don
  WHERE c.ma_tx<>d.ma_tx OR c.tien_cong_ty<=0 OR d.trang_thai<>'CHUA_NOP'
   OR EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien g WHERE g.ma_dot=d.ma_dot))
  THROW 51011,N'Khoản nộp sai tài xế hoặc đợt đã chốt',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_gd_bao_ve ON dbo.giao_dich_nop_tien AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_giao_dich=d.ma_giao_dich WHERE i.ma_giao_dich IS NULL)
  THROW 51012,N'Không xóa giao dịch',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ma_giao_dich=i.ma_giao_dich
  WHERE i.ma_dot<>d.ma_dot OR i.ma_tham_chieu<>d.ma_tham_chieu OR i.so_tien_yeu_cau<>d.so_tien_yeu_cau
   OR (d.giai_quyet_luc IS NOT NULL AND EXISTS(SELECT i.trang_thai,i.giai_quyet_luc,i.ma_giao_dich_doi_tac,i.so_tien_thuc_nhan
     EXCEPT SELECT d.trang_thai,d.giai_quyet_luc,d.ma_giao_dich_doi_tac,d.so_tien_thuc_nhan)))
  THROW 51013,N'Không đổi định danh/số tiền/kết quả đã chốt',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.v_tong_dot_nop v ON v.ma_dot=i.ma_dot
  WHERE i.so_tien_yeu_cau<>v.tong_tien OR v.so_don=0)
  THROW 51014,N'Số tiền giao dịch không khớp chi tiết đợt',1;
END;
GO
```

Ba trigger chính sách bên dưới giữ nội dung phiên bản đã công bố; cho phép đóng hieu_luc_den một lần ở tương lai. Việc kiểm tra chồng thời gian cần thủ tục công bố lấy khóa theo nhóm, nêu ở mục 8. Không chỉ dựa vào UNIQUE mốc bắt đầu.

```sql
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_cuoc ON dbo.cau_hinh_cuoc AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_bieu_phi=d.ma_bieu_phi
 WHERE d.trang_thai='CONG_BO' AND (i.ma_bieu_phi IS NULL
  OR EXISTS(SELECT i.ten,i.cuoc_co_ban,i.don_gia_km,i.km_toi_thieu,i.km_toi_da,i.kg_bao_gom,i.kg_toi_da,i.don_gia_kg,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ten,d.cuoc_co_ban,d.don_gia_km,d.km_toi_thieu,d.km_toi_da,d.kg_bao_gom,d.kg_toi_da,d.don_gia_kg,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_chinh_sach_thanh_vien ON dbo.chinh_sach_thanh_vien AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_chinh_sach=d.ma_chinh_sach
 WHERE d.trang_thai='CONG_BO' AND (i.ma_chinh_sach IS NULL
  OR EXISTS(SELECT i.ma_hang,i.ty_le_giam,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_hang,d.ty_le_giam,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_policy_cau_hinh_phu_thu ON dbo.cau_hinh_phu_thu AFTER UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.ma_phu_thu=d.ma_phu_thu
 WHERE d.trang_thai='CONG_BO' AND (i.ma_phu_thu IS NULL
  OR EXISTS(SELECT i.ma_loai,i.ten,i.so_tien,i.hieu_luc_tu,i.trang_thai EXCEPT SELECT d.ma_loai,d.ten,d.so_tien,d.hieu_luc_tu,d.trang_thai)
  OR EXISTS(SELECT i.hieu_luc_den EXCEPT SELECT d.hieu_luc_den)
   AND (d.hieu_luc_den IS NOT NULL OR i.hieu_luc_den IS NULL OR i.hieu_luc_den<=SYSUTCDATETIME())))
  THROW 51015,N'Phiên bản công bố không được sửa/xóa nội dung',1;
END;
GO
```

Đã có 10 trigger có mã cụ thể. Các FK/CHECK không thay kiểm tra quyền trên từng dòng. Quy tắc “đơn có ít nhất một kiện”, “mọi đơn hoàn tất có khoản chia”, “đợt luôn có chi tiết”, và “DA_NOP có đúng giao dịch thành công” phải được giữ bởi thủ tục transaction và chặn DML trực tiếp; không tuyên bố FK một chiều tự bảo đảm những điều này.

## 7. Stored Procedure và transaction

Các thủ tục ghi bên dưới tự sở hữu transaction, không gọi bên trong transaction Java đang mở. JDBC gọi ở chế độ phù hợp và không giữ khóa trong lúc người dùng mở VNPay. Cùng tài xế dùng khóa `nop:<ma_tx>` cho gom đợt, thử thanh toán, ghi nhận hoàn tất và callback. Luồng điều phối dùng khóa `dieu-phoi` trước rồi mới lấy khóa tài chính tài xế; không đảo thứ tự. Đây là phương án ưu tiên dễ chứng minh cho bài học, chấp nhận tuần tự hóa điều phối; sau này có thể thay khóa toàn cục bằng khóa theo đơn/tài xế có thứ tự cố định.

Các tham số được coi là dữ liệu đầu vào; danh tính actor luôn từ kết nối backend đã xác thực. Các thủ tục kiểm tra vai trò và quyền sở hữu bổ sung. Role SQL giới hạn ai được EXECUTE; backend không đưa mật khẩu DB cho trình duyệt.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_khoa @tai_nguyen NVARCHAR(255) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @r INT;
 EXEC @r=sys.sp_getapplock @Resource=@tai_nguyen,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @r<0 THROW 51100,N'Không lấy được khóa nghiệp vụ; thử lại toàn bộ thao tác',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_actor @ma_tk UNIQUEIDENTIFIER OUTPUT,@vai_tro VARCHAR(20) OUTPUT AS
BEGIN
 SET NOCOUNT ON;
 SET @ma_tk=TRY_CONVERT(UNIQUEIDENTIFIER,SESSION_CONTEXT(N'ma_tk'));
 SET @vai_tro=NULL;
 SELECT @vai_tro=vai_tro FROM dbo.tai_khoan WHERE ma_tk=@ma_tk AND trang_thai='HOAT_DONG';
 IF @vai_tro IS NULL THROW 51101,N'Phiên không hợp lệ hoặc tài khoản bị khóa',1;
END;
GO
```

### 7.1. Tạo đơn — TX1

Đầu vào kiện JSON: [{"thu_tu":1,"loai_hang":"Sách","kg":2.5}]; phụ thu JSON: mảng chuỗi UUID. JSON chỉ là tham số vận chuyển, không lưu thay các dòng kiện/phụ thu. Backend chuẩn hóa nội dung và tự tính SHA-256; không tin hash do trình duyệt cung cấp. Khoảng cách/thời gian do backend lấy từ provider, không tin số km trong request người dùng. Giá xem trước truyền lại để so với giá vừa tính; khác giá thì rollback và yêu cầu xác nhận lại.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_tao_don
 @ma_kh UNIQUEIDENTIFIER,@khoa VARCHAR(100),@hash BINARY(32),
 @diem_lay NVARCHAR(255),@diem_giao NVARCHAR(255),@ten_nhan NVARCHAR(100),@sdt_nhan VARCHAR(10),
 @km DECIMAL(10,2),@giay INT,@nguon VARCHAR(10),@kien_json NVARCHAR(MAX),@phu_thu_json NVARCHAR(MAX),
 @gia_da_dong_y DECIMAL(15,0)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@now DATETIME2(3)=SYSUTCDATETIME(),@id UNIQUEIDENTIFIER,@oldhash BINARY(32);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') THROW 51102,N'Không được tạo đơn',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk
   WHERE k.ma_kh=@ma_kh AND t.trang_thai='HOAT_DONG' AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51103,N'Khách hàng không hợp lệ',1;
  DECLARE @lock NVARCHAR(255)=N'tao-don:'+CONVERT(NVARCHAR(36),@actor);
  EXEC dbo.usp_khoa @lock;
  SELECT @id=ma_don,@oldhash=hash_yeu_cau FROM dbo.don_hang WHERE ma_tk_tao=@actor AND khoa_yeu_cau=@khoa;
  IF @id IS NOT NULL
  BEGIN
   IF @oldhash<>@hash THROW 51104,N'Khóa tạo đơn đã dùng cho nội dung khác',1;
   COMMIT; SELECT @id AS ma_don; RETURN;
  END;
  IF @km IS NULL OR @km<=0 OR @giay IS NULL OR @giay<=0 OR @gia_da_dong_y IS NULL
   OR @khoa IS NULL OR LEN(@khoa)=0 OR @hash IS NULL
   OR ISNULL(ISJSON(@kien_json),0)<>1 OR LEFT(LTRIM(@kien_json),1)<>'['
   OR ISNULL(ISJSON(@phu_thu_json),0)<>1 OR LEFT(LTRIM(@phu_thu_json),1)<>'['
   THROW 51105,N'Dữ liệu tạo đơn không hợp lệ',1;
  DECLARE @kien TABLE(thu_tu INT,loai NVARCHAR(100),kg DECIMAL(10,2));
  INSERT @kien SELECT thu_tu,loai,kg FROM OPENJSON(@kien_json)
   WITH(thu_tu INT '$.thu_tu',loai NVARCHAR(100) '$.loai_hang',kg DECIMAL(10,2) '$.kg');
  IF NOT EXISTS(SELECT 1 FROM @kien) OR EXISTS(SELECT 1 FROM @kien WHERE thu_tu IS NULL OR thu_tu<=0 OR kg IS NULL OR kg<=0 OR loai IS NULL OR LEN(LTRIM(RTRIM(loai)))=0)
   OR EXISTS(SELECT thu_tu FROM @kien GROUP BY thu_tu HAVING COUNT(*)>1)
   THROW 51106,N'Kiện hàng không hợp lệ',1;
  DECLARE @pt TABLE(id UNIQUEIDENTIFIER);
  INSERT @pt SELECT TRY_CONVERT(UNIQUEIDENTIFIER,value) FROM OPENJSON(@phu_thu_json);
  IF EXISTS(SELECT 1 FROM @pt WHERE id IS NULL) OR EXISTS(SELECT id FROM @pt GROUP BY id HAVING COUNT(*)>1)
   THROW 51107,N'Phụ thu không hợp lệ hoặc trùng',1;
  EXEC dbo.usp_khoa N'chinh-sach';
  DECLARE @kg DECIMAL(10,2)=(SELECT SUM(kg) FROM @kien),@bp UNIQUEIDENTIFIER,@cs UNIQUEIDENTIFIER,
   @ckm DECIMAL(15,0),@ckg DECIMAL(15,0),@giam DECIMAL(15,0)=0,@phuthu DECIMAL(15,0),@rate DECIMAL(5,2)=0;
  IF (SELECT COUNT(*) FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
   THROW 51108,N'Phải có đúng một biểu phí đang hiệu lực',1;
  SELECT @bp=ma_bieu_phi,@ckm=dbo.fn_cuoc_km(cuoc_co_ban,@km,don_gia_km),@ckg=dbo.fn_cuoc_kg(@kg,kg_bao_gom,don_gia_kg)
  FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den)
   AND @km BETWEEN km_toi_thieu AND km_toi_da AND @kg<=kg_toi_da;
  IF @bp IS NULL THROW 51109,N'Ngoài phạm vi km/kg',1;
  DECLARE @hang VARCHAR(15)='THUONG';
  SELECT @hang=ma_hang FROM dbo.khach_hang WITH(UPDLOCK,HOLDLOCK)
   WHERE ma_kh=@ma_kh AND thanh_vien_tu<=@now AND (thanh_vien_den IS NULL OR @now<thanh_vien_den);
  IF @hang<>'THUONG'
  BEGIN
   IF (SELECT COUNT(*) FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den))<>1
    THROW 51110,N'Chính sách thành viên thiếu hoặc chồng',1;
   SELECT @cs=ma_chinh_sach,@rate=ty_le_giam FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=@hang AND trang_thai='CONG_BO'
    AND hieu_luc_tu<=@now AND (hieu_luc_den IS NULL OR @now<hieu_luc_den);
  END;
  SET @giam=dbo.fn_tien_giam(@ckm+@ckg,@rate);
  IF EXISTS(SELECT 1 FROM @pt x LEFT JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id
   WHERE p.ma_phu_thu IS NULL OR p.trang_thai<>'CONG_BO' OR p.hieu_luc_tu>@now OR p.hieu_luc_den<=@now)
   OR EXISTS(SELECT p.ma_loai FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id GROUP BY p.ma_loai HAVING COUNT(*)>1)
   THROW 51111,N'Phụ thu không hiệu lực hoặc trùng loại',1;
  SELECT @phuthu=COALESCE(SUM(p.so_tien),0) FROM @pt x JOIN dbo.cau_hinh_phu_thu p ON p.ma_phu_thu=x.id;
  IF @gia_da_dong_y<>@ckm+@ckg-@giam+@phuthu THROW 51112,N'Giá thay đổi; cần khách xác nhận lại',1;
  SET @id=NEWID();
  INSERT dbo.don_hang(ma_don,ma_kh,ma_tk_tao,khoa_yeu_cau,hash_yeu_cau,ma_bieu_phi,ma_chinh_sach,diem_lay,diem_giao,
   ten_nguoi_nhan,sdt_nguoi_nhan,quang_duong_km,thoi_gian_du_kien_giay,nguon_lo_trinh,cuoc_km,cuoc_kg,tien_giam,tao_luc)
  VALUES(@id,@ma_kh,@actor,@khoa,@hash,@bp,@cs,@diem_lay,@diem_giao,@ten_nhan,@sdt_nhan,@km,@giay,@nguon,@ckm,@ckg,@giam,@now);
  INSERT dbo.chi_tiet_kien_hang(ma_don,thu_tu,loai_hang,khoi_luong_kg) SELECT @id,thu_tu,loai,kg FROM @kien;
  INSERT dbo.phu_thu_don_hang(ma_don,ma_phu_thu) SELECT @id,id FROM @pt;
  COMMIT; SELECT @id AS ma_don;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.2. Phân công — TX2

```sql
CREATE OR ALTER PROCEDURE dbo.usp_phan_cong @ma_don UNIQUEIDENTIFIER,@ma_tx UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('TONG_DAI','CHU_DOI_XE') THROW 51201,N'Không có quyền điều phối',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang WITH(UPDLOCK,HOLDLOCK) WHERE ma_don=@ma_don AND trang_thai='CHO_GAN')
   THROW 51202,N'Đơn không chờ gán',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.v_tai_xe_san_sang WHERE ma_tx=@ma_tx) THROW 51203,N'Tài xế không sẵn sàng',1;
  INSERT dbo.phan_cong_don_hang(ma_don,ma_tx,ma_tk_dieu_phoi) VALUES(@ma_don,@ma_tx,@actor);
  UPDATE dbo.don_hang SET trang_thai='DA_GAN' WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=NULL WHERE ma_tx=@ma_tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.3. Hoàn tất và xác nhận thu đủ — TX3

Xác nhận thu đủ là hành động của tài xế, không phải xác nhận ngân hàng. Cước 0 vẫn hoàn tất và có khoản chia 0, không tạo yêu cầu VNPay 0 đồng. Giữ sự kiện đến điểm nhận trước hoàn tất.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_hoan_tat @ma_don UNIQUEIDENTIFIER,@xac_nhan_thu_du BIT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@now DATETIME2(3)=SYSUTCDATETIME();
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' OR ISNULL(@xac_nhan_thu_du,0)<>1 THROW 51301,N'Cần tài xế xác nhận thu đủ',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51302,N'Thiếu hồ sơ tài xế',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  IF EXISTS(SELECT 1 FROM dbo.phan_chia_cuoc c JOIN dbo.phan_cong_don_hang p ON p.ma_phan_cong=c.ma_phan_cong WHERE c.ma_don=@ma_don AND p.ma_tx=@tx)
  BEGIN COMMIT; RETURN; END;
  SELECT @pc=p.ma_phan_cong FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL AND d.trang_thai='DANG_GIAO';
  IF @pc IS NULL THROW 51303,N'Không đúng tài xế hoặc trạng thái',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
   THROW 51304,N'Chưa xác nhận đến điểm nhận',1;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=@now,ket_qua='HOAN_TAT' WHERE ma_phan_cong=@pc;
  UPDATE dbo.don_hang SET trang_thai='HOAN_TAT',hoan_tat_luc=@now WHERE ma_don=@ma_don;
  INSERT dbo.phan_chia_cuoc(ma_don,ma_phan_cong,ghi_nhan_luc) VALUES(@ma_don,@pc,@now);
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN @now ELSE NULL END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.4. Gom đợt nộp — TX4

```sql
CREATE OR ALTER PROCEDURE dbo.usp_tao_dot_nop AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@dot UNIQUEIDENTIFIER;
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' THROW 51401,N'Chỉ tài xế tự tạo đợt',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51402,N'Thiếu hồ sơ tài xế',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  SELECT @dot=ma_dot FROM dbo.dot_nop_tien WHERE ma_tx=@tx AND trang_thai='CHUA_NOP';
  IF @dot IS NULL
  BEGIN
   SET @dot=NEWID();
   INSERT dbo.dot_nop_tien(ma_dot,ma_tx) VALUES(@dot,@tx);
   INSERT dbo.chi_tiet_dot_nop(ma_dot,ma_don)
   SELECT @dot,c.ma_don FROM dbo.v_chia_cuoc c WHERE c.ma_tx=@tx AND c.tien_cong_ty>0
    AND NOT EXISTS(SELECT 1 FROM dbo.chi_tiet_dot_nop x WHERE x.ma_don=c.ma_don);
   IF @@ROWCOUNT=0 THROW 51403,N'Không có khoản mới phải nộp',1;
  END;
  COMMIT; SELECT * FROM dbo.v_tong_dot_nop WHERE ma_dot=@dot;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.5. Tạo lần thử VNPay — TX5

Mỗi đợt đã thanh toán không tạo thêm lần thử. Lần chưa rõ kết quả trả về để tiếp tục/tra cứu, không tự tạo lần mới. Backend ký URL sau COMMIT; nếu ký/tạo URL lỗi thì khôi phục URL từ cùng mã tham chiếu, không mở lần thử khác. payment_url có thể không lưu và được tái tạo bởi backend; trường hiện tại là tùy chọn.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_tao_lan_nop @ma_dot UNIQUEIDENTIFIER AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@gd UNIQUEIDENTIFIER,@tien DECIMAL(15,0);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' THROW 51501,N'Chỉ tài xế thanh toán',1;
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  IF @tx IS NULL THROW 51502,N'Thiếu hồ sơ tài xế',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  IF NOT EXISTS(SELECT 1 FROM dbo.dot_nop_tien WHERE ma_dot=@ma_dot AND ma_tx=@tx AND trang_thai='CHUA_NOP')
   THROW 51503,N'Đợt không thuộc tài xế hoặc đã nộp',1;
  SELECT @gd=ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_dot=@ma_dot AND giai_quyet_luc IS NULL;
  IF @gd IS NULL
  BEGIN
   SELECT @tien=tong_tien FROM dbo.v_tong_dot_nop WHERE ma_dot=@ma_dot;
   IF @tien IS NULL OR @tien<=0 THROW 51504,N'Đợt không có khoản phải nộp',1;
   SET @gd=NEWID();
   INSERT dbo.giao_dich_nop_tien(ma_giao_dich,ma_dot,ma_tham_chieu,so_tien_yeu_cau)
    VALUES(@gd,@ma_dot,REPLACE(CONVERT(VARCHAR(36),@gd),'-',''),@tien);
  END;
  COMMIT; SELECT * FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=@gd;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.6. Áp dụng kết quả VNPay đã được backend xác minh — TX6

Thủ tục nội bộ này chỉ cấp EXECUTE cho tài khoản worker thanh toán, không cho bốn role người dùng. Backend trước đó phải kiểm tra chữ ký, merchant, mã tham chiếu, mã phản hồi/trạng thái đối tác, đơn vị tiền và số tiền. Tham số @thanh_cong=0 chỉ dùng khi có bằng chứng chắc chắn KHONG_THU; timeout/Return đóng cửa sổ không được gọi nhánh này. @so_tien là số tiền yêu cầu do đối tác trả về, đã đổi về VND. Return không được dùng để quyết toán.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_ap_dung_ket_qua_nop
 @ma_tham_chieu VARCHAR(100),@nguon VARCHAR(15),@khoa BINARY(32),@json NVARCHAR(MAX),
 @thanh_cong BIT,@so_tien DECIMAL(15,0),@ma_doi_tac VARCHAR(100)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  IF @nguon IS NULL OR @nguon NOT IN ('IPN','QUERY') OR @thanh_cong IS NULL OR @so_tien IS NULL
   OR @khoa IS NULL OR ISNULL(ISJSON(@json),0)<>1 THROW 51601,N'Kết quả xác minh không hợp lệ',1;
  DECLARE @gd UNIQUEIDENTIFIER,@dot UNIQUEIDENTIFIER,@tx UNIQUEIDENTIFIER,@expected DECIMAL(15,0),
   @status VARCHAR(20),@partner VARCHAR(100),@now DATETIME2(3)=SYSUTCDATETIME();
  SELECT @gd=g.ma_giao_dich,@dot=g.ma_dot,@tx=d.ma_tx FROM dbo.giao_dich_nop_tien g
   JOIN dbo.dot_nop_tien d ON d.ma_dot=g.ma_dot WHERE g.ma_tham_chieu=@ma_tham_chieu;
  IF @gd IS NULL THROW 51602,N'Không tìm thấy giao dịch; backend ghi sự kiện không khớp riêng',1;
  DECLARE @lock NVARCHAR(255)=N'nop:'+CONVERT(NVARCHAR(36),@tx);
  EXEC dbo.usp_khoa @lock;
  IF EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan WHERE nguon=@nguon AND khoa_su_kien=@khoa)
  BEGIN COMMIT; RETURN; END;
  SELECT @expected=so_tien_yeu_cau,@status=trang_thai,@partner=ma_giao_dich_doi_tac
   FROM dbo.giao_dich_nop_tien WITH(UPDLOCK,HOLDLOCK) WHERE ma_giao_dich=@gd;
  IF @so_tien<>@expected OR (@thanh_cong=1 AND (@ma_doi_tac IS NULL OR LEN(@ma_doi_tac)=0))
  BEGIN
   INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
    VALUES(@gd,@nguon,@khoa,1,'KHONG_KHOP',@json);
   COMMIT; SELECT 'KHONG_KHOP' AS ket_qua; RETURN;
  END;
  IF @status IN ('THANH_CONG','KHONG_THU')
  BEGIN
   DECLARE @result VARCHAR(25)=CASE WHEN (@status='THANH_CONG' AND @thanh_cong=1 AND @partner=@ma_doi_tac)
    OR (@status='KHONG_THU' AND @thanh_cong=0) THEN 'KHONG_THAY_DOI' ELSE 'CAN_DOI_SOAT' END;
   INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
    VALUES(@gd,@nguon,@khoa,1,@result,@json);
   COMMIT; SELECT @result AS ket_qua; RETURN;
  END;
  UPDATE dbo.giao_dich_nop_tien SET trang_thai=CASE WHEN @thanh_cong=1 THEN 'THANH_CONG' ELSE 'KHONG_THU' END,
   giai_quyet_luc=@now,so_tien_thuc_nhan=CASE WHEN @thanh_cong=1 THEN @so_tien END,
   ma_giao_dich_doi_tac=CASE WHEN @thanh_cong=1 THEN @ma_doi_tac END WHERE ma_giao_dich=@gd;
  IF @thanh_cong=1 UPDATE dbo.dot_nop_tien SET trang_thai='DA_NOP',thanh_toan_luc=@now WHERE ma_dot=@dot;
  INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json)
   VALUES(@gd,@nguon,@khoa,1,'DA_AP_DUNG',@json);
  COMMIT; SELECT 'DA_AP_DUNG' AS ket_qua;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

Sự kiện sai chữ ký/không tìm thấy mã tham chiếu phải ghi bằng đường ghi log riêng đã giới hạn quyền; không gọi thủ tục áp dụng kết quả. Hash sự kiện do backend tính từ payload đã chuẩn hóa + nguồn, không nhận khóa chống trùng do người dùng tự đặt. Sự kiện mâu thuẫn cần cảnh báo đối soát, không tự đảo khoản nộp, không tự hoàn tiền. Nếu lỗi UNIQUE mã đối tác giữa hai giao dịch, rollback và ghi sự kiện cảnh báo trong transaction riêng sau rollback.

### 7.7. Tiến trình giao / từ chối — TX7

```sql
CREATE OR ALTER PROCEDURE dbo.usp_tien_trinh @ma_don UNIQUEIDENTIFIER,@hanh_dong VARCHAR(25),@ghi_chu NVARCHAR(500)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER,@pc UNIQUEIDENTIFIER,@state VARCHAR(20);
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role<>'TAI_XE' THROW 51701,N'Chỉ tài xế cập nhật tiến trình',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
  SELECT @pc=p.ma_phan_cong,@state=d.trang_thai FROM dbo.phan_cong_don_hang p JOIN dbo.don_hang d ON d.ma_don=p.ma_don
   WHERE p.ma_don=@ma_don AND p.ma_tx=@tx AND p.ket_thuc_luc IS NULL;
  IF @pc IS NULL THROW 51702,N'Không có phân công đang hoạt động của tài xế',1;
  IF @hanh_dong='LAY_HANG' AND @state='DA_GAN'
   UPDATE dbo.don_hang SET trang_thai='DA_LAY_HANG' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='BAT_DAU_GIAO' AND @state='DA_LAY_HANG'
   UPDATE dbo.don_hang SET trang_thai='DANG_GIAO' WHERE ma_don=@ma_don;
  ELSE IF @hanh_dong='TU_CHOI' AND @state='DA_GAN' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
  BEGIN
   UPDATE dbo.phan_cong_don_hang SET ket_qua='TU_CHOI',ket_thuc_luc=SYSUTCDATETIME(),ly_do=@ghi_chu WHERE ma_phan_cong=@pc;
   UPDATE dbo.don_hang SET trang_thai='CHO_GAN' WHERE ma_don=@ma_don;
   UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  END
  ELSE IF @hanh_dong='DEN_DIEM_NHAN' AND @state='DANG_GIAO'
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.nhat_ky_don_hang WHERE ma_don=@ma_don AND loai='DEN_DIEM_NHAN')
    INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau)
     VALUES(@ma_don,@actor,'DEN_DIEM_NHAN',@state,@state);
  END
  ELSE IF @hanh_dong='SU_CO' AND @state='DANG_GIAO' AND LEN(LTRIM(RTRIM(@ghi_chu)))>0
   INSERT dbo.nhat_ky_don_hang(ma_don,ma_tk,loai,trang_thai_truoc,trang_thai_sau,ghi_chu)
    VALUES(@ma_don,@actor,'SU_CO',@state,@state,@ghi_chu);
  ELSE THROW 51703,N'Hành động không hợp lệ cho trạng thái hiện tại',1;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.8. Hủy trước lấy hàng — TX8

```sql
CREATE OR ALTER PROCEDURE dbo.usp_huy_don @ma_don UNIQUEIDENTIFIER,@ly_do NVARCHAR(500) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
  EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
  IF @role NOT IN ('KHACH_HANG','TONG_DAI','CHU_DOI_XE') OR @ly_do IS NULL OR LEN(LTRIM(RTRIM(@ly_do)))=0
   THROW 51801,N'Không được hủy hoặc thiếu lý do',1;
  EXEC dbo.usp_khoa N'dieu-phoi';
  IF NOT EXISTS(SELECT 1 FROM dbo.don_hang d JOIN dbo.khach_hang k ON k.ma_kh=d.ma_kh
   WHERE d.ma_don=@ma_don AND d.trang_thai IN ('CHO_GAN','DA_GAN') AND (@role<>'KHACH_HANG' OR k.ma_tk=@actor))
   THROW 51802,N'Không đúng chủ đơn hoặc đã lấy hàng',1;
  SELECT @tx=ma_tx FROM dbo.phan_cong_don_hang WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.phan_cong_don_hang SET ket_thuc_luc=SYSUTCDATETIME(),ket_qua='HUY_DON',ly_do=@ly_do
   WHERE ma_don=@ma_don AND ket_thuc_luc IS NULL;
  UPDATE dbo.don_hang SET trang_thai='DA_HUY',huy_luc=SYSUTCDATETIME(),ly_do_huy=@ly_do WHERE ma_don=@ma_don;
  UPDATE dbo.tai_xe SET ranh_tu=CASE WHEN trang_thai='ONLINE' THEN SYSUTCDATETIME() END WHERE ma_tx=@tx;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
```

### 7.9. Báo cáo của tài xế

```sql
CREATE OR ALTER PROCEDURE dbo.usp_thu_nhap_cua_toi @tu DATETIME2(3),@den DATETIME2(3) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @actor UNIQUEIDENTIFIER,@role VARCHAR(20),@tx UNIQUEIDENTIFIER;
 EXEC dbo.usp_actor @actor OUTPUT,@role OUTPUT;
 IF @role<>'TAI_XE' OR @tu IS NULL OR @den IS NULL OR @tu>=@den THROW 51901,N'Không đúng quyền/khoảng thời gian',1;
 SELECT @tx=ma_tx FROM dbo.tai_xe WHERE ma_tk=@actor;
 SELECT * FROM dbo.fn_thu_nhap_tai_xe(@tx,@tu,@den);
 SELECT * FROM dbo.v_so_du_tai_xe WHERE ma_tx=@tx; -- Không lọc ngày cho công nợ.
END;
GO
```

## 8. Quy tắc cần phối hợp code / phần cần hoàn thiện khi triển khai

| Quy tắc | Đã có trong bản SQL | Công việc backend hoặc SQL tiếp theo |
|---|---|---|
| Xác nhận khách đã trả | TX3 ghi hoàn tất + khoản chia | UI yêu cầu xác nhận rõ; không khẳng định đã xác minh ngân hàng khách |
| Giá lịch sử | Giá chốt trên đơn; trigger policy; trigger không đổi giá đơn | Chặn INSERT/UPDATE/DELETE kiện và phụ thu ngoài TX1. Không cấp DML trực tiếp. Nếu bổ sung sửa đơn sau này phải thiết kế lại cơ chế chốt, không chỉ mở quyền UPDATE |
| Khoản chia phụ thuộc giá bất biến | View suy tiền từ đơn/chính sách | Cấm thay phân công đã kết thúc, cấm sửa/xóa khoản chia và tài liệu nguồn; chỉ cho phép các đường thủ tục định nghĩa |
| Đợt giữ nguyên | Chi tiết không sửa/xóa, không thêm khi đã có lần thử | Khi chưa có lần thử, chỉ TX4 được phép thêm chi tiết. Không mở endpoint thêm đơn vào đợt đã tạo |
| Đúng trạng thái đợt | TX6 đổi giao dịch + đợt trong một transaction | Không mở API sửa trạng thái đợt thủ công |
| Chính sách không chồng | TX1 phát hiện biểu phí/thành viên thiếu/chồng tại thời điểm dùng | Viết usp_cong_bo_chinh_sach lấy khóa chinh-sach giống TX1, kiểm tra overlap `a.tu < b.den AND b.tu < a.den` với NULL là vô hạn, đóng bản cũ trong tương lai và ghi audit cùng transaction. Chưa có mã thủ tục công bố đầy đủ ở bản này |
| Đăng ký/hồ sơ | FK unique + trigger đúng vai trò | Thủ tục đăng ký tạo tài khoản + hồ sơ cùng transaction, bcrypt/Argon2 ở Java; tuyệt đối không lưu mật khẩu rõ. Chưa có SQL CRUD auth đầy đủ |
| Đổi mật khẩu | Cột hash/auth_version | Xác minh mật khẩu cũ ở Java; cập nhật hash + tăng auth_version theo điều kiện phiên bản cũ; kiểm tra phiên bản ở mỗi phiên. Không log hash |
| Quyền người dùng | Role SQL + kiểm tra vai trò/sở hữu trong các SP | Backend tự gắn ma_tk từ session vào SESSION_CONTEXT trước mỗi request, xóa khi trả connection về pool; không cho người dùng tự chọn actor. Kiểm tra auth_version và CSRF ở ứng dụng |
| Thay đổi trạng thái tài xế/xe | TX2 kiểm tra sẵn sàng | Các thủ tục đổi trực/khóa tài khoản/đổi xe dùng khóa dieu-phoi; cấm đổi xe hoặc khóa hồ sơ đang có phân công nếu không có quy trình xử lý. Chưa có CRUD quản trị đầy đủ |
| VNPay | Giao dịch, sự kiện, số tiền, mã tham chiếu unique, TX6 | Xác minh chữ ký/merchant/currency/response code; IPN/query đáng tin mới ghi thành công; Return chỉ hiển thị/tra cứu. Dùng đơn vị số tiền đúng tài liệu VNPay khi chuyển VND ↔ payload |
| Timeout và retry | ux_gd_open chặn lần chưa giải quyết thứ hai | Worker đánh dấu CHUA_RO_KET_QUA và query; chỉ KHONG_THU sau bằng chứng. Không mở lại chỉ vì thời gian trôi qua. Chưa có job/endpoint query trong tài liệu |
| Lỗi giữa DB commit và gửi HTTP | Mã tham chiếu cố định, khóa request tạo đơn, đợt mở tái sử dụng | Retry phải trả cùng đối tượng; không bấm lại thành giao dịch mới khi kết quả chưa rõ |
| Sự kiện mâu thuẫn | CAN_DOI_SOAT, không đảo kết quả | Hiện cảnh báo cho chủ đội xe; nghiệp vụ hoàn tiền/điều chỉnh không tự triển khai trong phạm vi này |
| CRUD báo cáo môn học | Schema + các nghiệp vụ chính đủ chỗ tích hợp | Bổ sung SP thêm/sửa/xóa danh mục NHAP/xe chưa dùng/hồ sơ chưa phát sinh theo FK; tra cứu có phân trang và giới hạn theo actor. Không coi UI localStorage hiện tại là CRUD SQL Server |

Lưu ý thiết kế: SQL Server CHECK chấp nhận UNKNOWN do NULL, nên các nhánh bắt buộc có giá trị đã dùng IS NOT NULL. Ràng buộc ngày giấy phép so với hôm nay đặt ở nghiệp vụ gán, không chỉ CHECK lúc INSERT. FK ngăn tham chiếu không tồn tại nhưng không tự chứng minh người gọi được thao tác bản ghi đó.

**Chốt tài chính:** không lưu snapshot tổng cước lần hai trong phan_chia_cuoc để giảm dư thừa; đổi lại phải giữ nguyên đơn/kiện/phụ thu/policy đã dùng. Nếu sau này cho điều chỉnh cước sau hoàn tất, cần thêm nghiệp vụ điều chỉnh và lịch sử, không chỉnh trực tiếp dữ liệu nguồn. Chính sách 80/20 thay đổi trong tương lai cũng cần phiên bản/snapshot mới; bản này cố định 80/20 theo phạm vi đã thống nhất.

## 9. Phân quyền SQL Server: bốn role nghiệp vụ và worker nội bộ

Không dùng sa/db_owner cho backend. Bốn role dưới đây là quyền SQL thực, không chỉ enum ứng dụng. User WITHOUT LOGIN dùng cho bài demo EXECUTE AS trong DB, **chưa phải tài khoản JDBC đăng nhập được**. Khi triển khai, quản trị tạo LOGIN riêng bằng secret bên ngoài tài liệu và CREATE USER FOR LOGIN tương ứng. Backend có thể dùng pool theo vai trò và một pool worker callback; việc chọn pool phải do session đã xác thực, không do request tự khai. Không cấp worker cho khách/tài xế.

```sql
CREATE ROLE r_khach_hang;
CREATE ROLE r_tai_xe;
CREATE ROLE r_tong_dai;
CREATE ROLE r_chu_doi_xe;
CREATE ROLE r_payment_worker;
CREATE USER demo_khach WITHOUT LOGIN;
CREATE USER demo_taixe WITHOUT LOGIN;
CREATE USER demo_tongdai WITHOUT LOGIN;
CREATE USER demo_chudoi WITHOUT LOGIN;
CREATE USER demo_payment WITHOUT LOGIN;
ALTER ROLE r_khach_hang ADD MEMBER demo_khach;
ALTER ROLE r_tai_xe ADD MEMBER demo_taixe;
ALTER ROLE r_tong_dai ADD MEMBER demo_tongdai;
ALTER ROLE r_chu_doi_xe ADD MEMBER demo_chudoi;
ALTER ROLE r_payment_worker ADD MEMBER demo_payment;
GO
GRANT EXECUTE ON dbo.usp_tao_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_huy_don TO r_khach_hang;
GRANT EXECUTE ON dbo.usp_tao_don TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_huy_don TO r_tong_dai;
GRANT SELECT ON dbo.v_don_cho_dieu_phoi TO r_tong_dai;
GRANT SELECT ON dbo.v_tai_xe_san_sang TO r_tong_dai;
GRANT EXECUTE ON dbo.usp_tien_trinh TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_hoan_tat TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_tao_dot_nop TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_tao_lan_nop TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_thu_nhap_cua_toi TO r_tai_xe;
GRANT EXECUTE ON dbo.usp_tao_don TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_phan_cong TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_huy_don TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_chia_cuoc TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_so_du_tai_xe TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_tong_dot_nop TO r_chu_doi_xe;
GRANT SELECT ON dbo.v_cong_ty_thuc_nhan_ngay TO r_chu_doi_xe;
GRANT EXECUTE ON dbo.usp_ap_dung_ket_qua_nop TO r_payment_worker;
DENY SELECT ON dbo.tai_khoan TO r_khach_hang;
DENY SELECT ON dbo.tai_khoan TO r_tai_xe;
DENY SELECT ON dbo.tai_khoan TO r_tong_dai;
DENY SELECT ON dbo.tai_khoan TO r_chu_doi_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_khach_hang;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tai_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_tong_dai;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_chu_doi_xe;
DENY INSERT,UPDATE,DELETE ON SCHEMA::dbo TO r_payment_worker;
GO
-- Ví dụ cấp tạm quyền xem tổng đợt cho tổng đài rồi thu hồi (trạng thái cuối: không có quyền).
GRANT SELECT ON dbo.v_tong_dot_nop TO r_tong_dai;
REVOKE SELECT ON dbo.v_tong_dot_nop FROM r_tong_dai;
GO
```

Ownership chaining cùng chủ sở hữu dbo cho phép SP tĩnh được cấp EXECUTE truy cập bảng dù user không được DML trực tiếp. Không dùng dynamic SQL hoặc EXECUTE AS OWNER tràn lan để vượt kiểm tra quyền. Helper usp_actor/usp_khoa không cấp EXECUTE trực tiếp. Khách/tài xế không được SELECT view toàn bộ dữ liệu; truy vấn của mình phải đi qua SP kiểm tra actor. Bản này chưa có đầy đủ SP đọc hồ sơ/lịch sử khách, sẽ bổ sung cùng CRUD.

Giới hạn tin cậy: SESSION_CONTEXT do backend đặt không chống được người đã nắm credential DB của pool. Để demo cô lập theo từng cá nhân ở DB trực tiếp, ánh xạ DB user → ma_tk trong bảng/ cấu hình được quản trị bảo vệ, thay vì cho demo user tự đặt ma_tk. Không tuyên bố đã có row-level security. Với web, credential chỉ nằm ở backend; demo kiểm tra quyền role và sở hữu dùng đúng mô hình này.

## 10. Kịch bản transaction, lỗi và đồng thời để bảo vệ bài

Các bước dưới là **kế hoạch kiểm thử**, chưa chạy và chưa có kết quả đo. Dùng DB thử riêng sau khi duyệt thiết kế, seed tài khoản/hồ sơ/chính sách/đơn bằng dữ liệu nhất quán.

| TX | Thành phần phải commit cùng nhau | Thử lỗi/rollback |
|---|---|---|
| TX1 tạo đơn | Đơn + kiện + phụ thu + log trigger | Trùng thứ tự kiện / sai phụ thu / giá thay đổi → không có đơn mồ côi |
| TX2 phân công | Phân công + trạng thái đơn + hàng đợi tài xế + log | Tài xế bận → không đổi đơn; cố tình gây lỗi sau INSERT phân công trong bản test → rollback tất cả |
| TX3 hoàn tất | Kết thúc phân công + hoàn tất đơn + chia cước + tài xế rảnh + log | Chưa đến điểm nhận/không xác nhận thu đủ → không có thu nhập; lỗi trước COMMIT → không hoàn tất dở |
| TX4 tạo đợt | Header + toàn bộ chi tiết tại thời điểm chốt | Không có khoản mới → không lưu đợt rỗng; hai request → cùng đợt mở |
| TX5 tạo lần thử | Kiểm tra đợt + tạo giao dịch hoặc tái dùng giao dịch chưa giải quyết | Giao dịch còn chờ → không tạo thêm; lỗi tạo URL không mở lần thử thứ hai |
| TX6 áp dụng VNPay | Kết quả giao dịch + trạng thái đợt + sự kiện | Sai số tiền → chỉ lưu cảnh báo; lỗi cập nhật đợt → rollback thành công giao dịch |
| TX7 tiến trình | Trạng thái + log; từ chối còn đóng phân công và trả tài xế rảnh | Sai tài xế/thứ tự → không đổi dữ liệu |
| TX8 hủy | Hủy đơn + đóng phân công + giải phóng tài xế + log | Đã lấy hàng → từ chối, không ảnh hưởng thu nhập |

### 10.1. Demo hai tổng đài cùng gán

1. Hai session thử, hai tài khoản tổng đài hợp lệ, cùng một đơn CHO_GAN.
2. Session A BEGIN TRAN rồi gọi usp_khoa 'dieu-phoi', giữ khóa trong khi quan sát session B (không gọi SP tự quản transaction lồng vào A).
3. Session B gọi usp_phan_cong; phải chờ khóa hoặc timeout có thông báo.
4. A ROLLBACK để nhả khóa; B hoàn tất gán. Gọi lại gán đơn đó từ A → bị từ chối vì không còn CHO_GAN.
5. Kiểm tra chỉ một phân công mở. Demo bổ sung cùng tài xế/hai đơn: chỉ một thành công nhờ kiểm tra dưới khóa + unique index.

Để demo đúng một thao tác gán đang thực thi rồi tranh chấp, có thể dùng bản sao thủ tục trong DB test với điểm dừng sau lấy khóa; không thêm WAITFOR vào thủ tục chính. Trình bày khóa ứng dụng dùng chủ sở hữu Transaction, được nhả lúc commit/rollback; mã trả về âm phải được xử lý.

### 10.2. Demo tài chính bắt buộc

- Ba đơn chia 60.000đ → tạo một đợt 60.000đ. Hoàn tất thêm đơn chia 20.000đ → tổng còn phải nộp 80.000đ, đợt cũ 60.000đ, phát sinh mới 20.000đ.
- Callback thành công hai lần (cùng hash và khác hash) → chỉ một thành công, không cộng tiền hai lần; trả cùng kết quả nghiệp vụ.
- Callback sai tiền/chữ ký/merchant → không chuyển DA_NOP.
- Đóng tab/hết hạn URL → không tự thành KHONG_THU; vẫn chặn tạo lần thử mới đến khi tra cứu chắc chắn.
- Sau KHONG_THU đã xác minh → tạo lần thử mới cùng đợt, vẫn 60.000đ. Nếu xuất hiện kết quả mâu thuẫn muộn → CAN_DOI_SOAT, không tự đảo nợ.
- Callback và tạo lần thử đồng thời → khóa cùng tài xế + unique index giữ một kết quả hợp lệ.
- Nộp 60.000đ xong → còn 20.000đ, thu nhập tài xế không đổi. Ngày hôm sau vẫn còn 20.000đ.
- Người khác gọi ma_dot/ma_don không thuộc mình → từ chối. Vai trò tổng đài không EXECUTE thủ tục áp dụng kết quả thanh toán.
- Insert/update nhiều dòng để kiểm tra trigger; không chỉ test từng dòng.

### 10.3. Truy vấn đối chiếu bất biến sau kiểm thử

```sql
-- Kỳ vọng 0 dòng cho từng SELECT dưới đây.
SELECT d.ma_don FROM dbo.don_hang d WHERE d.trang_thai='HOAN_TAT'
 AND NOT EXISTS(SELECT 1 FROM dbo.phan_chia_cuoc c WHERE c.ma_don=d.ma_don);
SELECT d.ma_don FROM dbo.don_hang d
 WHERE NOT EXISTS(SELECT 1 FROM dbo.chi_tiet_kien_hang k WHERE k.ma_don=d.ma_don);
SELECT d.ma_dot FROM dbo.dot_nop_tien d
 WHERE NOT EXISTS(SELECT 1 FROM dbo.chi_tiet_dot_nop x WHERE x.ma_dot=d.ma_dot);
SELECT d.ma_dot FROM dbo.dot_nop_tien d WHERE
 (d.trang_thai='DA_NOP' AND NOT EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien g WHERE g.ma_dot=d.ma_dot AND g.trang_thai='THANH_CONG')) OR
 (d.trang_thai='CHUA_NOP' AND EXISTS(SELECT 1 FROM dbo.giao_dich_nop_tien g WHERE g.ma_dot=d.ma_dot AND g.trang_thai='THANH_CONG'));
SELECT x.ma_dot,x.ma_don FROM dbo.chi_tiet_dot_nop x JOIN dbo.dot_nop_tien d ON d.ma_dot=x.ma_dot
 JOIN dbo.v_chia_cuoc c ON c.ma_don=x.ma_don WHERE d.ma_tx<>c.ma_tx OR c.tien_cong_ty<=0;
SELECT * FROM dbo.v_so_du_tai_xe WHERE con_phai_nop<0 OR con_phai_nop<>dang_trong_dot+phat_sinh_moi
 OR cong_ty_duoc_huong<>da_nop+con_phai_nop;
SELECT g.ma_giao_dich FROM dbo.giao_dich_nop_tien g JOIN dbo.v_tong_dot_nop v ON v.ma_dot=g.ma_dot
 WHERE g.so_tien_yeu_cau<>v.tong_tien;
```

## 11. Minh chứng index và đối chiếu rubric

Chọn ít nhất năm truy vấn: lịch sử đơn của khách (ix_don_customer_time), hàng đợi (ix_don_queue), lịch sử tài xế (ix_pc_driver_time), nhật ký đơn (ix_log_order_time), lịch sử đợt (ix_dot_driver_time). Seed dữ liệu đủ lớn/phân bố hợp lý trong DB test, cập nhật statistics, dùng cùng tham số và cùng dữ liệu trước/sau. Bật Actual Execution Plan và SET STATISTICS IO, TIME ON; ghi logical reads, CPU, elapsed time, scan/seek. Chạy vài lượt để phân biệt warm cache; không kết luận từ một lần đo.

Ví dụ truy vấn đo (thay UUID bằng khách đã seed):

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
DECLARE @kh UNIQUEIDENTIFIER='00000000-0000-0000-0000-000000000001';
SELECT TOP (50) ma_don,tao_luc,trang_thai FROM dbo.don_hang
WHERE ma_kh=@kh ORDER BY tao_luc DESC;
SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

So sánh ở hai bản DB thử giống nhau hoặc bỏ/tạo lại **chỉ index thường đang đánh giá** trong DB test. Không xóa unique index bảo vệ nghiệp vụ để lấy số đo. Không bịa số phần trăm cải thiện; bảng nhỏ có thể scan hiệu quả hơn. Với UUID ngẫu nhiên làm clustered PK mặc định, cần đo fragmentation/page split khi dữ liệu lớn; đây là đánh đổi để tương thích cách sinh ID hiện tại, không tuyên bố tối ưu mọi tải.

| Yêu cầu đề bài | Nội dung bản đề xuất | Trạng thái |
|---|---|---|
| ≥8 bảng có quan hệ, phân tích 3NF | 18 bảng, bảng quan hệ mục 2, PK/FK mục 3 | Có thiết kế; cần vẽ ERD từ bản đã duyệt |
| ≥5 CHECK/UNIQUE/DEFAULT | Vai trò, trạng thái, tiền, kg, thời gian, mã tham chiếu, số điện thoại… | Có SQL |
| ≥5 trigger | 10 trigger ở mục 6 | Có SQL; chưa chạy multi-row/rollback test |
| ≥5 view | 7 view ở mục 5 | Có SQL; cần tích hợp màn hình |
| ≥5 index, có non-PK và đo hiệu năng | Unique + 7 index tra cứu thường ở mục 4 | Có SQL; chưa có kết quả đo |
| ≥5 SP, TRY/CATCH | 8 SP transaction, SP thu nhập, 2 helper | Có SQL; CRUD/auth/chính sách còn cần bổ sung |
| ≥5 UDF | 4 scalar + 1 inline TVF | Có SQL và vị trí sử dụng |
| ≥5 nghiệp vụ transaction | TX1–TX8 | Có SQL; chưa có bằng chứng chạy |
| Tranh chấp đồng thời | Gán đơn, gom đợt, callback/retry | Có kịch bản; chưa demo |
| ≥4 Role/Login | 4 role nghiệp vụ + worker, 5 user WITHOUT LOGIN cho demo | Có SQL role/user; login thực cấu hình sau |
| GRANT/REVOKE/DENY | Mục 9 | Có SQL; cần test EXECUTE AS/ứng dụng |
| App gọi SP/Function, CRUD/search/report | Kiến trúc đích gọi các SP/View/UDF, mục 8 | Chưa sửa code, không ghi đã hoàn thành |
| Báo cáo/backup/demo | Dùng thiết kế đã duyệt làm cơ sở | Tài liệu này không thay báo cáo 50–100 trang, backup hay demo thật |

## 12. Lộ trình chuyển code sau khi duyệt

1. Duyệt tên bảng/cột, kiểu UUID, quy tắc đợt không hủy, giá bất biến và phạm vi CRUD. Vẽ ERD/lược đồ quan hệ từ 18 bảng này.
2. Tạo nhánh/DB thử riêng và script tạo mới được kiểm thử; không sửa migration đã áp dụng. Chuyển dữ liệu cũ cần kế hoạch riêng, không tự coi thanh toán cũ là khoản tài xế đã thu theo luồng mới.
3. Đổi entity/DAO và đưa từng nghiệp vụ vào SP; tránh Java vừa tự ghi cùng bảng vừa gọi SP để ghi lặp. Không lồng transaction tùy tiện.
4. Bỏ UI lựa chọn phương thức/người trả, thanh toán khách, COD điều phối, quên mật khẩu. Thêm xác nhận đã giao + thu đủ và màn công nợ tài xế.
5. Chuyển VNPay sang mã tham chiếu giao dịch nộp tiền; sửa IPN/Return/query, job xử lý chưa rõ, chống trùng và quyền worker.
6. Bổ sung CRUD quản trị thực, các SP đọc theo actor, quản lý chính sách, đăng ký/đổi mật khẩu và cấu hình pool/role. Thực hiện checklist mục 8.
7. Chạy kiểm thử DB/API/UI trên DB test, lưu bằng chứng rollback, concurrency, quyền và index; chỉ sau đó viết migration/seed và cập nhật báo cáo chính thức.

### Tài liệu kỹ thuật đối chiếu

- Microsoft Learn — [DML trigger xử lý nhiều dòng](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data?view=sql-server-ver17): căn cứ thiết kế inserted/deleted theo tập.
- Microsoft Learn — [Filtered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver17): căn cứ index chỉ một phân công/đợt/lần thử đang mở; không dùng computed column trong filter.
- Microsoft Learn — [sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql?view=sql-server-ver17): khóa theo transaction và kiểm tra mã trả về.
- Nguồn nghiệp vụ cũ: migration designV1 V1–V12 và nội dung csdl.md trước lần viết lại. Nguồn yêu cầu môn học: hướng dẫn/rubric DBMS330284 do người dùng cung cấp. Tài liệu VNPay cụ thể cần đối chiếu lại khi triển khai adapter; phần này chưa khẳng định payload/API sandbox đã được cập nhật hay kiểm thử.
