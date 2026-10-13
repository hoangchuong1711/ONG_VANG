# Đặc tả mô hình dữ liệu

## Mini Ong Vàng

*Schema quan hệ làm cơ sở cập nhật ERD Class Diagram và backend*

**Phiên bản 1.0  •  Ngày 10 tháng 10 năm 2026**

> **Baseline hiện hành:** tài liệu này mô tả designV1 đã triển khai. [designTX](designTX.md) là phần thiết kế **đích, chưa triển khai** từ TX1 ngày 14/10/2026, bổ sung thanh toán tại điểm lấy/giao, kg, vị trí tài xế demo, đối soát COD và chia 20/80. Các quy tắc cũ như “chỉ thanh toán sau hoàn tất” vẫn đúng với BE hiện tại; khi làm TX3–TX7 phải dùng designTX cho phần thay đổi và thêm migration mới, không sửa lại lịch sử V1–V4.

Tài liệu xác định mô hình dữ liệu đích cho 12 use case của Mini Ong Vàng. Nhóm sử dụng danh sách bảng và cột ở phần 4 để dựng ERD, dùng phần 8 để sửa Class Diagram, và dùng phần 9 để cập nhật các task backend đã làm đến T12 cũng như các task tiếp theo.
Mô hình chốt 19 bảng ứng dụng và kỹ thuật. Quyết định chính là dùng enum cho mã hạng, gộp hồ sơ VIP vào khách hàng, lấy phân công làm nguồn tài xế của đơn, dùng chính sách có phiên bản bất biến và không lưu tổng cước suy diễn. Báo giá 300 giây và cơ chế chống tạo đơn lặp 24 giờ được giữ. Thanh toán chỉ diễn ra sau hoàn tất.
Đặc tả này độc lập hệ quản trị. Kiểu dữ liệu dưới đây là kiểu logic; không bao gồm DDL, function, view, trigger hay cấu hình vận hành. Không cần giữ tên lớp/bảng cũ nếu khác mô hình đích. Các thay đổi nghiệp vụ so với T12 được nêu rõ để cập nhật test và API cùng lúc.
### Cách đọc và sử dụng

| Phần | Nội dung | Sử dụng |
| --- | --- | --- |
| 1 | Phạm vi và quyết định | Chốt giới hạn nghiệp vụ trước khi viết lại code |
| 2 | Kiểu dữ liệu và enum | Thống nhất kiểu Java và miền giá trị |
| 3 và 4 | Danh sách bảng và từ điển dữ liệu | Tạo thuộc tính Entity và bảng |
| 5 và 6 | Quan hệ và ràng buộc xuyên bảng | Vẽ cardinality và bảo vệ tính nhất quán |
| 7 | Phân tích chuẩn hóa | Giải thích khóa và các giá trị không lưu dư |
| 8 và 9 | Class Diagram và task backend | Chia trách nhiệm lớp và công việc |
| 10 | Tiêu chí nghiệm thu | Kiểm thử mô hình mới |

Quy ước mức bắt buộc: các quy tắc mang mã AC, CU, DR, VE, MP, FA, SU, OR, PR, OS, PA, AS, EV, PY, ST, PE, QU, ID, AU và TX là yêu cầu của phiên bản này. Cột dẫn xuất trong API không phải cột lưu trong schema.

## 1. Phạm vi và các quyết định thiết kế

Phạm vi chính là giao hàng theo các UC đã chọn. Tên đề tài có đặt xe nhưng phiên bản này không thêm mô hình hành khách, ghế, chuyến nhiều điểm, ví nội bộ hoặc tính lương tài xế. Sự cố người nhận chưa nghe máy/từ chối nhận được lưu và giữ đơn đang giao để xử lý lại.
| Mã | Quyết định |
| --- | --- |
| D01 | Giữ 12 UC: 01, 02, 03, 04, 05, 08, 10, 12, 13, 14, 15 và 19. Không thêm UC đánh giá hay tích điểm. |
| D02 | Một tài khoản có một vai trò cố định. Tổng đài và chủ đội xe chỉ dùng TaiKhoan; không có bảng DieuPhoiVien riêng. |
| D03 | Khách có hạng THUONG, BAC, VANG hoặc KIM_CUONG; không có danh mục hạng động. Quyền lợi do chính sách theo phiên bản quyết định. |
| D04 | Giữ ma_kh và ma_tx riêng, không đổi chúng thành ma_tk. Điều này giúp ánh xạ API và lịch sử hiện có rõ ràng. |
| D05 | Tài xế có tối đa một xe hiện tại. Khi gán phải có xe hoạt động và giấy phép còn hạn; đây là điều kiện bổ sung so với kiểm tra T11 hiện tại. |
| D06 | Giữ công thức cước cơ bản cộng km nhân đơn giá; km_toi_thieu chỉ xác định phạm vi áp dụng. VIP giảm trên cước gốc cộng phụ thu. |
| D07 | Không sửa nội dung đơn/kiện/cước sau tạo. Chỉ vận hành trạng thái, phân công, sự kiện và thanh toán theo các thao tác được định nghĩa. |
| D08 | Tài xế bận và tài xế hoàn tất được xác định từ PhanCongDonHang. Không có don_hang.ma_tx hay phép suy luận bằng timestamp bằng nhau. |
| D09 | Thu cước sau HOAN_TAT, bằng tiền mặt hoặc VNPay Sandbox. Không thêm MoMo, trả trước, trả từng phần hay luồng hoàn tiền tự động. |
| D10 | Khoản thu bất thường vẫn được lưu, không xác nhận thanh toán đủ lần hai và phải đối soát. Việc trả lại tiền ngoài dự kiến được vận hành xử lý ngoài phạm vi 12 UC. |
| D11 | Báo giá được kiểm tra lại khi tạo đơn; không cam kết giữ giá. Cùng báo giá và key khác nhau có thể tạo hai đơn có chủ ý. |
| D12 | Mô hình là nguồn thiết kế mới. Dữ liệu cũ giữ hay nạp demo lại là quyết định triển khai riêng, chưa được suy ra từ tài liệu này. |

### Tách dữ liệu hiện tại khỏi dữ liệu lịch sử

Địa chỉ và SĐT người nhận nằm ở đơn vì mô tả một lần giao. Tên và SĐT của người dùng nằm ở tài khoản vì mô tả danh tính hiện tại. Phiên bản biểu phí/phụ thu/giảm giá đã công bố giữ nguyên nội dung để tham chiếu lịch sử không đổi. Tên người thực hiện hiển thị trong nhật ký được lấy từ tài khoản hiện tại; audit dùng mã tài khoản làm định danh, không dựa vào tên.

## 2. Kiểu dữ liệu và miền giá trị

| Kiểu logic | Định nghĩa |
| --- | --- |
| ID | Chuỗi định danh không rỗng tối đa 36 ký tự, bất biến và so sánh chính xác. Bản ghi mới dùng UUID dạng chuỗi; ID fixture hoặc dữ liệu chuyển đổi được giữ nếu không quá 36 ký tự. |
| Hash64 | Chuỗi 64 ký tự hex chữ thường biểu diễn SHA256; không phải ID người dùng. |
| Text n | Văn bản Unicode tối đa n ký tự. Trường bắt buộc không chấp nhận toàn khoảng trắng; trường tùy chọn trim rỗng chuyển thành NULL. |
| Moment | Thời điểm UTC, thống nhất độ chính xác mili giây. API dùng ISO 8601 có múi giờ. Ngày nghiệp vụ quy đổi theo Asia/Ho_Chi_Minh. |
| Date | Ngày lịch, không chứa giờ. Kiểm tra ngày hết hạn giấy phép theo ngày Việt Nam. |
| Money | Số thập phân chính xác 15 chữ số, 2 chữ số thập phân; không âm. Không dùng số thực nhị phân. |
| MoneyWhole | Money nhưng hai chữ số thập phân phải bằng 00; thể hiện VND nguyên đồng sau làm tròn. |
| Percent | Số thập phân 5 chữ số, 2 chữ số thập phân; trong [0,100]. |
| Distance | Số thập phân 10 chữ số, 2 chữ số thập phân; đơn vị km. Khoảng cách chuyến >0. |
| Weight | Số thập phân 10 chữ số, 2 chữ số thập phân; đơn vị kg; >0. |
| Integer và Boolean | Số nguyên theo miền trường; boolean chỉ true/false. Nullable được ghi riêng, không dùng giá trị 0/chuỗi rỗng thay NULL. |
| Document | JSON hợp lệ dưới dạng văn bản Unicode. Mỗi loại payload có version và schema kiểm tra riêng trong ứng dụng; không nhét quan hệ nghiệp vụ vào JSON. |

PK là khóa chính; FK là khóa ngoại; UQ là duy nhất; NN là không được NULL; N là cho phép NULL. Những điều kiện phụ thuộc hàng khác được liệt kê riêng, không giả định FK/CHECK một hàng tự kiểm tra được chúng.
### Các enum bắt buộc

| Enum | Giá trị |
| --- | --- |
| AccountRole | KHACH_HANG, TAI_XE, TONG_DAI, CHU_DOI_XE |
| AccountStatus | HOAT_DONG, KHOA |
| MembershipTier | THUONG, BAC, VANG, KIM_CUONG |
| DriverStatus | ONLINE, OFFLINE, NGHI |
| PolicyStatus | NHAP, CONG_BO |
| OrderStatus | CHO_GAN, DA_GAN, DA_LAY_HANG, DANG_GIAO, HOAN_TAT, DA_HUY |
| AssignmentOutcome | TU_CHOI, HOAN_TAT, HUY_DON |
| OrderEventType | TAO_DON, CHUYEN_TRANG_THAI, SU_CO |
| IncidentType | KHONG_LIEN_LAC_DUOC, TU_CHOI_NHAN |
| PaymentMethod | TIEN_MAT, VNPAY_QR |
| PaymentStatus | CHO_XU_LY, CHUA_RO_KET_QUA, THANH_CONG, THAT_BAI, DA_HUY |
| PaymentEventSource | VNPAY_IPN, VNPAY_QUERY, VNPAY_RETURN |
| PaymentEventResult | DA_AP_DUNG, KHONG_THAY_DOI, KHONG_HOP_LE, KHONG_KHOP, CAN_DOI_SOAT |
| RouteSource | FAKE, GOONG |
| AuditSource và AuditAction | Nguồn: NGUOI_DUNG, HE_THONG. Hành động: TAO, SUA, KHOA, MO_KHOA, CONG_BO, XOA. |

Enum ở Java và miền giá trị tại nơi lưu phải đồng bộ. Không persist ordinal của enum; thêm hoặc đổi giá trị là thay đổi hợp đồng cần sửa schema, DTO và test.
## 3. Danh sách thực thể đích

| # | Bảng | Lớp | Vai trò |
| --- | --- | --- | --- |
| 1 | tai_khoan | TaiKhoan | Nghiệp vụ |
| 2 | khach_hang | KhachHang | Nghiệp vụ |
| 3 | tai_xe | TaiXe | Nghiệp vụ |
| 4 | phuong_tien | PhuongTien | Nghiệp vụ |
| 5 | chinh_sach_thanh_vien | ChinhSachThanhVien | Nghiệp vụ |
| 6 | cau_hinh_cuoc | BieuPhi | Nghiệp vụ |
| 7 | cau_hinh_phu_thu | ChinhSachPhuThu | Nghiệp vụ |
| 8 | don_hang | DonHang | Nghiệp vụ |
| 9 | cuoc_don_hang | CuocDonHang | Nghiệp vụ |
| 10 | phu_thu_don_hang | PhuThuDonHang | Nghiệp vụ |
| 11 | chi_tiet_kien_hang | KienHang | Nghiệp vụ |
| 12 | phan_cong_don_hang | PhanCongDonHang | Nghiệp vụ |
| 13 | nhat_ky_don_hang | SuKienDonHang | Nghiệp vụ |
| 14 | thanh_toan | LanThanhToan | Nghiệp vụ |
| 15 | xac_nhan_thanh_toan_don_hang | XacNhanThanhToanDonHang | Nghiệp vụ |
| 16 | su_kien_thanh_toan | SuKienThanhToan | Tích hợp |
| 17 | bao_gia | BaoGia | Kỹ thuật |
| 18 | yeu_cau_tao_don | YeuCauTaoDon | Kỹ thuật |
| 19 | nhat_ky_kiem_toan | NhatKyKiemToan | Kỹ thuật |

Không tính bảng lịch sử công cụ migration hoặc marker seed vào mô hình nghiệp vụ. Không có bảng danh mục role/trạng thái/hạng, không có hồ sơ tổng đài, bảng VIP riêng, bảng đánh giá hoặc bảng doanh thu.
### Các thuộc tính chỉ tính khi đọc

| Thuộc tính API | Nguồn xác định |
| --- | --- |
| maTx hiện tại | Phân công chưa kết thúc. Với đơn hoàn tất lấy phân công HOAN_TAT; đơn chờ/hủy không có tài xế đang phụ trách. |
| dangBanChuyen | Có phân công ket_thuc_luc=NULL của tài xế. |
| tienPhuThu | Tổng so_tien của các phiên bản phụ thu đã liên kết với đơn. |
| tongCuoc | cuoc_goc + tienPhuThu − tien_giam_gia. |
| trangThaiThanhToan | MIEN_CUOC nếu tổng=0; DA_THANH_TOAN nếu có xác nhận thanh toán đủ; DANG_XU_LY nếu có lần chưa rõ/đang chờ; còn lại CHUA_THANH_TOAN. |
| soTienConPhaiThu | 0 với miễn cước/xác nhận thanh toán đủ; còn lại bằng tổng cước. Không trừ một khoản nhận sai lệch chưa được xác nhận thanh toán đủ. |
| Tên hạng và tỷ lệ đã áp dụng | Chính sách được cuoc_don_hang tham chiếu; không lấy hạng hiện tại của khách để tính lại đơn cũ. |

## 4. Từ điển dữ liệu đầy đủ

Mỗi mục xác định đầy đủ các cột của một bảng. Thuộc tính không xuất hiện trong danh sách không được tự mang từ schema cũ sang. Các trường mở rộng phải có nghiệp vụ, cardinality và quy tắc nhất quán riêng.
### 4.1. TaiKhoan

**Bảng tai_khoan**

Danh tính đăng nhập dùng chung cho khách hàng, tài xế, tổng đài và chủ đội xe. Họ tên và số điện thoại của một người chỉ có nguồn chính tại đây.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_tk | ID | PK; NN | Định danh tài khoản bất biến. |
| username | Text 50 | UQ; NN | Tên đăng nhập chuẩn hóa chữ thường, bỏ khoảng trắng đầu cuối; không có khoảng trắng bên trong. |
| mat_khau_hash | Text 255 | NN | Hash mật khẩu; không lưu mật khẩu rõ và không đưa vào audit. |
| ho_ten | Text 100 | NN | Tên hiển thị của người dùng; sau trim phải còn ký tự. |
| so_dien_thoai | Text 10 | UQ khi có; N | SĐT chuẩn 0 và chín chữ số. Bắt buộc với khách/tài xế; tổng đài/quản trị có thể không có. |
| email | Text 150 | N | Thông tin liên hệ; không dùng làm khóa đăng nhập, không mặc định duy nhất. |
| vai_tro | AccountRole | NN | Một vai trò duy nhất; không đổi sau khi tài khoản được tạo. |
| trang_thai | AccountStatus | NN; HOAT_DONG | Khóa tài khoản không xóa lịch sử. |
| ngay_tao | Moment | NN; giờ hệ thống | Thời điểm tạo tài khoản. |
| lan_dang_nhap_cuoi | Moment | N | NULL nếu chưa đăng nhập thành công. |

- **AC01** Username và SĐT phải duy nhất theo dạng đã chuẩn hóa. Đăng ký khách dùng SĐT làm username ban đầu; username bất biến. Nếu đổi SĐT liên hệ sau này, đăng nhập vẫn dùng username đã cấp.
- **AC02** Tài khoản KHACH_HANG có đúng một hồ sơ khách; TAI_XE có đúng một hồ sơ tài xế; hai vai trò còn lại không cần bảng hồ sơ riêng. Không được gắn hồ sơ sai vai trò.
- **AC03** Đăng ký tài khoản và hồ sơ tương ứng phải cùng một thao tác nguyên tử. lan_dang_nhap_cuoi nếu có không trước ngay_tao.

**Chuẩn hóa:** Khóa ứng viên: ma_tk và username. SĐT khi có là khóa duy nhất có điều kiện. Mỗi khóa xác định các thuộc tính còn lại; không lặp họ tên/SĐT ở hồ sơ.

### 4.2. KhachHang

**Bảng khach_hang**

Hồ sơ khách và quyền lợi thành viên hiện tại. Không có thực thể KhachHangVIP riêng.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_kh | ID | PK; NN | Giữ định danh hồ sơ độc lập với tài khoản để giảm thay đổi API hiện tại. |
| ma_tk | ID | FK; UQ; NN | Tham chiếu tai_khoan.ma_tk; phải có vai trò KHACH_HANG. |
| dia_chi_mac_dinh | Text 255 | N | Tiện ích điền form; thay đổi không sửa địa chỉ đơn cũ. |
| ma_hang | MembershipTier | NN; THUONG | Tập hạng cố định; không lưu tên hạng hoặc tỷ lệ giảm tại khách. |
| thanh_vien_tu | Moment | N có điều kiện | Bắt buộc nếu ma_hang khác THUONG. |
| thanh_vien_den | Moment | N | NULL nghĩa là không thời hạn khi đã có thanh_vien_tu. |

- **CU01** THUONG có cả hai mốc thành viên bằng NULL. Hạng khác THUONG phải có mốc bắt đầu; mốc kết thúc nếu có phải lớn hơn bắt đầu.
- **CU02** Hiệu lực dùng khoảng [thanh_vien_tu, thanh_vien_den). Hết hạn không tự sửa hạng; quyền lợi thực tế bằng 0. Khi giao diện nhập ngày hết hạn, chuyển thành 00 giờ ngày kế tiếp theo giờ Việt Nam.
- **CU03** Không có điểm tích lũy, mã thẻ hay tự nâng hạng ở phiên bản này. Quản trị gán hạng và thời hạn; thay đổi được audit.

**Chuẩn hóa:** ma_kh và ma_tk đều là khóa ứng viên. Tỷ lệ giảm thuộc chính sách, không phụ thuộc gián tiếp vào ma_hang trong bảng này.

### 4.3. TaiXe

**Bảng tai_xe**

Hồ sơ vận hành tài xế. Trạng thái bận được suy ra từ phân công đang hoạt động.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_tx | ID | PK; NN | Định danh hồ sơ tài xế. |
| ma_tk | ID | FK; UQ; NN | Tham chiếu tai_khoan.ma_tk; vai trò TAI_XE. |
| cccd | Text 12 | UQ; NN | Đúng 12 chữ số; dữ liệu hạn chế hiển thị. |
| so_giay_phep | Text 50 | UQ; NN | Số giấy phép đã chuẩn hóa; không rỗng. |
| ngay_het_han_gplx | Date | NN | Có hiệu lực hết ngày này theo giờ Việt Nam. |
| trang_thai | DriverStatus | NN; OFFLINE | ONLINE, OFFLINE hoặc NGHI. Không chứa BUSY. |
| ranh_tu | Moment | N | Mốc vào hàng đợi rảnh khi ONLINE; NULL nếu bận hoặc không ONLINE. |

- **DR01** Chỉ gán khi tài khoản hoạt động, tài xế ONLINE, giấy phép chưa hết hạn, có phương tiện hoạt động và không có phân công chưa kết thúc.
- **DR02** Gán đơn đặt ranh_tu=NULL. Kết thúc phân công đặt ranh_tu=thời điểm hiện tại nếu vẫn ONLINE. Chuyển từ OFFLINE/NGHI sang ONLINE khi không bận đặt mốc mới; chuyển khỏi ONLINE xóa mốc.
- **DR03** Gợi ý theo ranh_tu tăng dần rồi ma_tx. Đây là ưu tiên rảnh lâu, không phải tính gần nhất; phiên bản này không cần cột vị trí tài xế.

**Chuẩn hóa:** ma_tx, ma_tk, cccd, so_giay_phep là các khóa ứng viên. ranh_tu là mốc vào hàng đợi hiện tại, không phải một cờ bận sao chép.

### 4.4. PhuongTien

**Bảng phuong_tien**

Phương tiện đăng ký hiện tại của tài xế. Giữ bảng riêng vì có mã, biển số, thuộc tính và trạng thái riêng.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_phuong_tien | ID | PK; NN | Định danh phương tiện. |
| ma_tx | ID | FK; UQ; NN | Tham chiếu tai_xe.ma_tx; tối đa một phương tiện hiện tại/tài xế. |
| bien_so_xe | Text 15 | UQ; NN | Dạng chuẩn chữ hoa, bỏ dấu phân cách khi lưu khóa so sánh. |
| loai_xe | Text 50 | NN | Tên loại xe dùng hiển thị; chưa có bảng giá riêng theo loại xe. |
| mau_xe | Text 30 | N | Thông tin mô tả. |
| dang_hoat_dong | Boolean | NN; true | Được sử dụng để xét điều kiện gán đơn. |

- **VE01** Tài xế có thể chưa đăng ký xe nhưng khi đó không đủ điều kiện nhận đơn. Không quản lý lịch sử xe đã chạy từng chuyến ở phiên bản này.
- **VE02** Không đổi chủ xe, thay xe hoặc tắt phương tiện khi tài xế còn phân công hoạt động. Xóa xe chỉ khi không còn phụ thuộc; thao tác quản trị phải audit.

**Chuẩn hóa:** ma_phuong_tien, ma_tx và bien_so_xe là các khóa ứng viên. Không lưu tên/SĐT tài xế trong xe.

### 4.5. ChinhSachThanhVien

**Bảng chinh_sach_thanh_vien**

Phiên bản chính sách giảm theo hạng. Mã hạng là enum; tỷ lệ là dữ liệu cấu hình.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_chinh_sach | ID | PK; NN | Định danh một phiên bản chính sách. |
| ma_hang | MembershipTier | NN; khác THUONG | Hạng được hưởng chính sách. |
| ty_le_giam | Percent | NN | Từ 0 đến 100; 10 nghĩa là 10 phần trăm. |
| hieu_luc_tu | Moment | NN | Bắt đầu khoảng áp dụng. |
| hieu_luc_den | Moment | N | Kết thúc không bao gồm; NULL nghĩa là chưa định thời điểm kết thúc. |
| trang_thai | PolicyStatus | NN; NHAP | NHAP hoặc CONG_BO. |

- **MP01** UQ(ma_hang, hieu_luc_tu). Chính sách CONG_BO của cùng hạng không được chồng khoảng hiệu lực.
- **MP02** Giảm trên cước gốc đã làm tròn cộng phụ thu. Khách thường, hết hạn hoặc không có chính sách phù hợp được giảm 0; không tự lấy chính sách hạng khác.
- **MP03** Sau khi công bố, không sửa tỷ lệ/hạng/mốc bắt đầu. Cho phép đóng mốc kết thúc về hiện tại hoặc tương lai nhưng không viết lại quá khứ; đổi tỷ lệ bằng bản mới. Không xóa bản đã công bố.

**Chuẩn hóa:** ma_chinh_sach và (ma_hang, hieu_luc_tu) là khóa ứng viên. Cùng một hạng có thể có nhiều tỷ lệ theo phiên bản nên ma_hang không xác định ty_le_giam.

### 4.6. BieuPhi

**Bảng cau_hinh_cuoc**

Phiên bản biểu phí giao hàng. Công thức giữ cước cơ bản cộng toàn bộ số km nhân đơn giá.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_bieu_phi | ID | PK; NN | Định danh phiên bản. |
| ten_bieu_phi | Text 100 | NN | Tên mô tả của phiên bản; không phải khóa. |
| cuoc_co_ban | Money | NN | Không âm; tiền trước bước làm tròn cước gốc. |
| don_gia_km | Money | NN | Đơn giá không âm cho mỗi km. |
| km_toi_thieu | Distance | NN; 0.00 | Giới hạn áp dụng, không phải số km miễn phí. |
| km_toi_da | Distance | N | Nếu có phải >= km_toi_thieu; ngoài ra vẫn áp giới hạn phục vụ chung. |
| hieu_luc_tu | Moment | NN | Mốc áp dụng bắt đầu. |
| hieu_luc_den | Moment | N | Kết thúc không bao gồm. |
| trang_thai | PolicyStatus | NN; NHAP | Chỉ CONG_BO mới được chọn. |

- **FA01** Không có hai biểu phí CONG_BO đồng thời khớp cùng thời điểm và cùng quãng đường. Khoảng km bao gồm cả hai đầu; hai khoảng cùng chứa một điểm biên là chồng lấn.
- **FA02** Không tìm thấy biểu phí: từ chối báo giá/tạo đơn. Nếu dữ liệu lỗi khiến khớp nhiều bản: báo lỗi cấu hình, không chọn tùy tiện theo ID.
- **FA03** Nội dung tính giá và tên phiên bản bất biến sau công bố; chỉ được đóng hiệu lực có kiểm soát như MP03. Bản cũ còn tham chiếu phải được giữ.

**Chuẩn hóa:** ma_bieu_phi là khóa ứng viên. Không dùng ten_bieu_phi làm khóa tự nhiên vì các phiên bản có thể dùng lại tên.

### 4.7. ChinhSachPhuThu

**Bảng cau_hinh_phu_thu**

Các phụ thu toàn cục cố định theo thời gian. Chưa có phụ thu theo vùng, trọng lượng hoặc mã khuyến mại.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_phu_thu | ID | PK; NN | Định danh phiên bản phụ thu. |
| ma_loai_phu_thu | Text 30 | NN | Mã ổn định của loại phụ thu; các phiên bản cùng loại dùng cùng mã. |
| ten_phu_thu | Text 150 | NN | Tên hiển thị của phiên bản. |
| so_tien | MoneyWhole | NN | Số tiền VND nguyên đồng, không âm. |
| hieu_luc_tu | Moment | NN | Mốc áp dụng bắt đầu. |
| hieu_luc_den | Moment | N | Kết thúc không bao gồm. |
| trang_thai | PolicyStatus | NN; NHAP | Chỉ phiên bản CONG_BO đang hiệu lực được cộng. |

- **SU01** UQ(ma_loai_phu_thu, hieu_luc_tu). Cùng loại không chồng hiệu lực khi công bố. Các loại khác nhau được cộng dồn.
- **SU02** Tên, mã loại và số tiền bất biến sau công bố. Dòng phụ thu đơn chỉ tham chiếu phiên bản, không sao chép tên/số tiền.
- **SU03** Bỏ khu_vuc_ap_dung và trạng thái ký tự 0 trong bảng nối vì chưa có nghiệp vụ sử dụng. Nếu mở rộng phụ thu có công thức phải sửa mô hình và đặc tả trước.

**Chuẩn hóa:** ma_phu_thu và (ma_loai_phu_thu, hieu_luc_tu) là khóa ứng viên. Mã loại không xác định số tiền/tên vì các phiên bản có thể khác nhau.

### 4.8. DonHang

**Bảng don_hang**

Đơn giao hàng là gốc của các kiện, cước và lịch sử. Không lưu tài xế hiện tại hoặc tổng cước trực tiếp.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_don | ID | PK; NN | Mã đơn duy nhất dùng trong API và tra cứu; không tạo thêm mã hiển thị chưa có nhu cầu. |
| ma_kh | ID | FK; NN | Khách sở hữu đơn, tham chiếu khach_hang. |
| ma_tk_tao | ID | FK; NN | Tài khoản tạo đơn; có thể là khách hoặc tổng đài. |
| thoi_gian_tao | Moment | NN; giờ hệ thống | Mốc bắt đầu tính điều kiện hủy. |
| trang_thai | OrderStatus | NN; CHO_GAN | Trạng thái vận hành hiện tại. |
| diem_lay_hang | Text 255 | NN | Địa chỉ đã chuẩn hóa tại lúc tạo; không trỏ đến địa chỉ mặc định đang thay đổi. |
| diem_giao_hang | Text 255 | NN | Địa chỉ giao đã chuẩn hóa tại lúc tạo. |
| sdt_nguoi_nhan | Text 10 | NN | SĐT nhận hàng của đơn; có thể khác SĐT khách. |
| quang_duong_km | Distance | NN | >0 và <= giới hạn phục vụ khi tạo; dùng kết quả backend kiểm tra. |
| thoi_gian_du_kien_giay | Integer | NN | Thời gian lộ trình ước tính, >0. |
| nguon_lo_trinh | RouteSource | NN | FAKE hoặc GOONG; không chứa khóa API. |
| ghi_chu_giao_hang | Text 500 | N | Ghi chú sau trim; rỗng được chuyển thành NULL. |
| thoi_gian_hoan_tat | Moment | N có điều kiện | Có và chỉ có khi HOAN_TAT. |
| thoi_gian_huy | Moment | N có điều kiện | Có và chỉ có khi DA_HUY. |
| ly_do_huy | Text 500 | N có điều kiện | Bắt buộc, không rỗng khi DA_HUY. |

- **OR01** Khi commit tạo đơn phải có đúng một cuoc_don_hang, ít nhất một kiện và một mốc tạo đơn. FK một chiều không tự bảo đảm số lượng tối thiểu này.
- **OR02** Khách chỉ tạo cho chính mình; tổng đài được tạo hộ. ma_tk_tao luôn là danh tính từ session đã xác thực.
- **OR03** Chủ đơn, người tạo, lộ trình, địa chỉ, số nhận hàng và nội dung tính cước bất biến sau tạo. Không có API sửa đơn đã chốt trong phạm vi này.
- **OR04** Các mốc kết thúc không trước thời điểm tạo và không cùng tồn tại. ma_tx và ma_nv cũ được bỏ; tài xế lấy từ phân công, người tạo lấy từ ma_tk_tao.

**Chuẩn hóa:** ma_don là khóa ứng viên. Không lưu tên khách/nhân viên, tài xế suy diễn hoặc tổng tiền. Trạng thái hiện tại là trạng thái của thực thể, lịch sử là các sự kiện riêng.

### 4.9. CuocDonHang

**Bảng cuoc_don_hang**

Cước gốc và giảm giá đã chấp thuận cho một đơn. Snapshot được chuẩn hóa bằng tham chiếu chính sách bất biến.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_don | ID | PK; FK; NN | Tham chiếu don_hang; một bản cước cho mỗi đơn. |
| ma_bieu_phi | ID | FK; NN | Phiên bản cau_hinh_cuoc dùng lúc chốt. |
| ma_chinh_sach_giam | ID | FK; N | Phiên bản chinh_sach_thanh_vien thực sự áp dụng; NULL nếu không được áp dụng. |
| cuoc_goc | MoneyWhole | NN | Cước cơ bản + km × đơn giá, làm tròn HALF_UP nguyên đồng lúc chốt. |
| tien_giam_gia | MoneyWhole | NN; 0.00 | Số tiền giảm đã làm tròn và giới hạn tại thời điểm tạo đơn. |

- **PR01** Không lưu tien_phu_thu, tong_cuoc, tên biểu phí, tên hạng hay tỷ lệ giảm lặp tại đây. Tổng phụ thu lấy từ các phiên bản đã gắn với đơn.
- **PR02** ma_chinh_sach_giam=NULL thì tien_giam_gia=0; chiều ngược lại không bắt buộc vì tỷ lệ 0 hoặc làm tròn có thể cho tiền giảm 0.
- **PR03** 0 <= tien_giam_gia <= cuoc_goc + tổng phụ thu. Cả hàng cước và tập phụ thu của đơn đều bất biến sau transaction tạo.
- **PR04** Giá trị cước gốc/giảm chốt là sự kiện tiền của đơn. Mọi đối chiếu công thức dùng đúng phiên bản đã gắn, không dùng chính sách hiện hành.

**Chuẩn hóa:** ma_don xác định toàn bộ hàng. ma_bieu_phi không xác định cuoc_goc vì còn khoảng cách ở đơn; chính sách giảm không xác định tiền giảm vì còn cơ sở tính của đơn. Không lưu thuộc tính tổng suy diễn trong quan hệ.

### 4.10. PhuThuDonHang

**Bảng phu_thu_don_hang**

Quan hệ áp dụng một phiên bản phụ thu lên một đơn.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_don | ID | PK thành phần; FK; NN | Tham chiếu don_hang. |
| ma_phu_thu | ID | PK thành phần; FK; NN | Tham chiếu cau_hinh_phu_thu. |

- **OS01** PK(ma_don, ma_phu_thu) chặn áp dụng lặp một phiên bản. Một đơn chỉ được gắn tối đa một phiên bản của cùng ma_loai_phu_thu.
- **OS02** Phiên bản phải CONG_BO và có hiệu lực tại thoi_gian_tao của đơn. Chỉ thêm trong transaction tạo đơn; sau commit không sửa/xóa tập liên kết.
- **OS03** Không lưu so_tien_tinh và ten_phu_thu_snapshot. Vì phụ thu là số cố định và bản công bố bất biến, việc sao chép số tiền sẽ tạo phụ thuộc bộ phận ma_phu_thu → so_tien.

**Chuẩn hóa:** Quan hệ chỉ gồm khóa ghép và không có thuộc tính không khóa, nên không có phụ thuộc bộ phận/bắc cầu cần loại. Số tiền và tên thuộc phiên bản chính sách.

### 4.11. KienHang

**Bảng chi_tiet_kien_hang**

Một hàng cho một kiện của đơn; số thứ tự giúp giữ ổn định cách hiển thị và so sánh.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_kien | ID | PK; NN | Định danh kiện. |
| ma_don | ID | FK; NN | Tham chiếu don_hang. |
| thu_tu | Integer | NN | Từ 1; duy nhất trong đơn. |
| loai_hang_hoa | Text 100 | NN | Loại/mô tả ngắn, không rỗng. |
| khoi_luong_kg | Weight | NN | >0; tối đa 99 999 999.99 theo miền số hiện tại. |
| ghi_chu_bao_quan | Text 500 | N | Ghi chú của kiện. |

- **PA01** UQ(ma_don, thu_tu). Một đơn có 1..n kiện. Các thứ tự khi tạo phải liên tiếp từ 1.
- **PA02** Kiện không được chuyển sang đơn khác, sửa hoặc xóa sau khi chốt. Không thêm ảnh xác nhận khi chưa có UC tải ảnh; triển khai sau cần đặc tả riêng.

**Chuẩn hóa:** ma_kien và (ma_don, thu_tu) là khóa ứng viên; loại, khối lượng, ghi chú phụ thuộc toàn bộ khóa, không phụ thuộc riêng vào ma_don.

### 4.12. PhanCongDonHang

**Bảng phan_cong_don_hang**

Mỗi hàng là một lần gán, gồm cả lần tài xế từ chối. Đây là nguồn duy nhất về tài xế phụ trách đơn.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_phan_cong | ID | PK; NN | Định danh lần gán. |
| ma_don | ID | FK; NN | Đơn được gán. |
| ma_tx | ID | FK; NN | Tài xế được gán. |
| ma_tk_dieu_phoi | ID | FK; NN | Tài khoản tổng đài thực hiện gán. |
| bat_dau_luc | Moment | NN | Thời điểm gán thành công. |
| ket_thuc_luc | Moment | N | NULL nghĩa là đang hoạt động. |
| ket_qua_ket_thuc | AssignmentOutcome | N | TU_CHOI, HOAN_TAT hoặc HUY_DON khi đã kết thúc. |
| ly_do | Text 500 | N có điều kiện | Bắt buộc khi TU_CHOI; ghi chú kết thúc nếu cần. |

- **AS01** Tối đa một hàng ket_thuc_luc=NULL cho mỗi ma_don; tối đa một hàng như vậy cho mỗi ma_tx.
- **AS02** ket_thuc_luc và ket_qua_ket_thuc cùng NULL hoặc cùng có; kết thúc >= bắt đầu. Mỗi đơn tối đa một hàng có kết quả HOAN_TAT.
- **AS03** Tài xế đã có TU_CHOI với một đơn không được gán lại chính đơn đó; vẫn được nhận đơn khác.
- **AS04** Tài xế thực hiện đơn hoàn tất được nhận diện bằng ket_qua_ket_thuc=HOAN_TAT. Không so hai timestamp để suy ra người thực hiện; bỏ cờ tu_choi cũ.

**Chuẩn hóa:** ma_phan_cong là khóa ứng viên. ma_don và ma_tx riêng lẻ không là khóa vì có lịch sử. Tính duy nhất có điều kiện chỉ áp dụng trên các hàng đang hoạt động/hoàn tất.

### 4.13. SuKienDonHang

**Bảng nhat_ky_don_hang**

Lịch sử nghiệp vụ gồm tạo đơn, chuyển trạng thái và ghi nhận sự cố; chỉ thêm mới.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_su_kien | ID | PK; NN | Định danh sự kiện. |
| ma_don | ID | FK; NN | Đơn liên quan. |
| thu_tu | Integer | NN | Thứ tự tăng liên tiếp trong đơn, cấp khi đã khóa đơn. |
| loai_su_kien | OrderEventType | NN | TAO_DON, CHUYEN_TRANG_THAI hoặc SU_CO. |
| trang_thai_truoc | OrderStatus | N | NULL duy nhất cho sự kiện TAO_DON. |
| trang_thai_sau | OrderStatus | NN | Với sự cố bằng trạng thái trước. |
| thoi_gian | Moment | NN | Giờ hệ thống tại lúc ghi nhận. |
| ma_tk_thuc_hien | ID | FK; NN | Danh tính người thực hiện đã xác thực. |
| loai_su_co | IncidentType | N có điều kiện | Chỉ có khi loai_su_kien=SU_CO. |
| ghi_chu | Text 500 | N có điều kiện | Bắt buộc cho sự cố, từ chối và hủy. |

- **EV01** UQ(ma_don, thu_tu). TAO_DON là thứ tự 1, trước=NULL, sau=CHO_GAN. CHUYEN_TRANG_THAI phải có hai trạng thái khác nhau và là cạnh hợp lệ.
- **EV02** SU_CO chỉ khi trước=sau=DANG_GIAO, có loại và lý do. Chuyển trạng thái thông thường có loai_su_co=NULL.
- **EV03** Sắp lịch sử bằng thu_tu, không bằng UUID hoặc timestamp có thể trùng. Không lưu lặp họ tên/vai trò người thực hiện; giao diện lấy tên hiện tại, không tuyên bố đó là tên lịch sử.

**Chuẩn hóa:** ma_su_kien và (ma_don, thu_tu) là khóa ứng viên. Dữ kiện một sự kiện khác với trạng thái hiện tại của đơn; không sao chép thuộc tính hiện tại của tài khoản.

### 4.14. LanThanhToan

**Bảng thanh_toan**

Một yêu cầu thanh toán hoặc xác nhận tiền mặt. Trạng thái thành công mô tả khoản thu thực tế, không tự đồng nghĩa xác nhận thanh toán đủ đơn.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_giao_dich | ID | PK; NN | Định danh lần thanh toán. |
| ma_don | ID | FK; NN | Đơn được thanh toán; phải HOAN_TAT khi khởi tạo. |
| ma_tham_chieu | Text 100 | UQ; NN | Mã yêu cầu do hệ thống cấp, cả tiền mặt cũng có mã nội bộ; bất biến qua retry. |
| phuong_thuc | PaymentMethod | NN | TIEN_MAT hoặc VNPAY_QR. |
| trang_thai | PaymentStatus | NN; CHO_XU_LY | Trạng thái lần thử, không phải trạng thái giao hàng. |
| tao_luc | Moment | NN | Thời điểm tạo yêu cầu. |
| giai_quyet_luc | Moment | N | Thời điểm hệ thống nhận kết quả cuối; chưa rõ thì NULL. |
| ma_giao_dich_doi_tac | Text 100 | UQ khi có; N | Mã VNPay; bắt buộc với online thành công; NULL với tiền mặt. |
| so_tien_thuc_nhan | MoneyWhole | N | Khoản thu đã xác thực; >0 khi THANH_CONG, NULL ở trạng thái khác. |
| thu_luc | Moment | N | Thời điểm nhận tiền đã xác thực; có khi và chỉ khi THANH_CONG. |
| ma_tk_xac_nhan | ID | FK; N | Người xác nhận tiền mặt; online để NULL vì do kênh hệ thống xác thực. |

- **PY01** Không lưu so_tien_yeu_cau lặp lại cước cố định của đơn. Số yêu cầu gửi đi lấy từ tổng cước đã chốt. Dữ liệu thực nhận là sự thật phía thanh toán, có thể sai lệch và phải giữ để đối soát.
- **PY02** Mỗi đơn tối đa một lần CHO_XU_LY hoặc CHUA_RO_KET_QUA tại một thời điểm, xét cả hai phương thức. Không tạo lần mới nếu đơn đã được xác nhận thanh toán đủ.
- **PY03** Tiền mặt thành công phải do tài xế có phân công HOAN_TAT của đơn hoặc tổng đài xác nhận. Khách không tự xác nhận thu tiền. Online chỉ nhận kết quả đã xác thực chữ ký/đối soát.
- **PY04** Không áp UNIQUE(ma_don) cho mọi lần thành công thực tế: nếu cổng trả thêm một khoản thu ngoài dự kiến vẫn ghi nhận, nhưng không xác nhận thanh toán đủ lần hai và phải đánh dấu sự kiện CAN_DOI_SOAT.
- **PY05** CHO_XU_LY/CHUA_RO_KET_QUA có giai_quyet_luc=NULL; trạng thái cuối có mốc giải quyết >= tao_luc. Tiền mặt không đi qua CHUA_RO_KET_QUA. Đơn miễn cước không có yêu cầu thanh toán.

**Chuẩn hóa:** ma_giao_dich và ma_tham_chieu là khóa ứng viên; mã đối tác là duy nhất có điều kiện. ma_don không xác định số thực nhận vì có nhiều lần thử và có thể có sai lệch. Không lưu tổng cước trong bảng này.

### 4.15. XacNhanThanhToanDonHang

**Bảng xac_nhan_thanh_toan_don_hang**

Liên kết duy nhất giữa đơn và lần thanh toán hợp lệ được chấp nhận trả đủ cước.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_don | ID | PK; FK; NN | Đơn đã được xác nhận thanh toán đủ. |
| ma_giao_dich | ID | FK; UQ; NN | Một lần thanh toán thành công thuộc chính ma_don này. |

- **ST01** Ràng buộc cặp (ma_don, ma_giao_dich) phải tồn tại ở thanh_toan. Chỉ FK riêng từng cột là chưa đủ để ngăn gắn payment của đơn khác.
- **ST02** Chỉ tạo khi đơn HOAN_TAT, cước >0, giao dịch THANH_CONG và số thực nhận bằng tổng cước. Một payment dùng tối đa một lần; một đơn có tối đa một hàng xác nhận thanh toán đủ.
- **ST03** Không lưu lại số tiền/ngày thu tại đây. Không sửa/xóa hàng sau xác nhận thanh toán đủ trong phạm vi không hỗ trợ đảo giao dịch.

**Chuẩn hóa:** Cả ma_don và ma_giao_dich đều là khóa ứng viên. Quan hệ không có thuộc tính không khóa.

### 4.16. SuKienThanhToan

**Bảng su_kien_thanh_toan**

Dấu vết thông báo và đối soát của VNPay; lưu được cả thông báo sai/không khớp mà không làm thay đổi đơn.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_su_kien | ID | PK; NN | Định danh sự kiện tích hợp. |
| ma_giao_dich | ID | FK; N | Lần thanh toán khớp sau tra cứu; NULL nếu không xác định được. |
| nguon | PaymentEventSource | NN | VNPAY_IPN, VNPAY_QUERY hoặc VNPAY_RETURN. |
| khoa_su_kien | Hash64 | NN; UQ cùng nguon | Hash thông điệp chuẩn hóa đầy đủ, gồm dữ liệu xác thực; không chỉ hash mã đơn. |
| nhan_luc | Moment | NN | Thời điểm backend nhận thông điệp. |
| chu_ky_hop_le | Boolean | NN | Kết quả kiểm tra; không tin giá trị do client khai. |
| ket_qua_xu_ly | PaymentEventResult | NN | DA_AP_DUNG, KHONG_THAY_DOI, KHONG_HOP_LE, KHONG_KHOP hoặc CAN_DOI_SOAT. |
| noi_dung_json | Document | NN | Thông điệp đã lọc bí mật; giữ nguyên để giải thích kết quả xử lý. |

- **PE01** UQ(nguon, khoa_su_kien). Thông điệp lặp đúng nội dung trả kết quả xử lý cũ. Các thông điệp khác nhau cùng mã tham chiếu vẫn được lưu để xử lý thứ tự và kết quả đến muộn.
- **PE02** Return từ trình duyệt chỉ phục vụ hiển thị/khởi động tra cứu, không đủ để đánh dấu thu tiền. Chỉ IPN hoặc kết quả truy vấn được xác thực mới cập nhật thanh_toan.
- **PE03** Ghi sự kiện, cập nhật payment và xác nhận thanh toán đủ nếu có phải cùng một đơn vị nguyên tử. Thông điệp không hợp lệ không cập nhật payment; thông điệp không biết mã vẫn được giữ với FK NULL.

**Chuẩn hóa:** Khóa ứng viên: ma_su_kien và (nguon, khoa_su_kien). Document là thông điệp tích hợp nguyên khối, không phải mô hình thay thế cho bảng đơn/cước.

### 4.17. BaoGia

**Bảng bao_gia**

Báo giá ngắn hạn dùng T09 và T10 để kiểm tra chủ sở hữu, đầu vào và sự thay đổi giá.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_bao_gia | ID | PK; NN | Định danh báo giá. |
| ma_kh | ID | FK; NN | Khách hưởng báo giá, kể cả khi tổng đài yêu cầu hộ. |
| ma_bieu_phi | ID | FK; NN | Biểu phí đã được sử dụng; bổ sung FK còn thiếu ở schema cũ. |
| tao_luc | Moment | NN | Mốc báo giá được ghi nhận sau khi lấy lộ trình. |
| het_han_luc | Moment | NN | Bằng tao_luc cộng 300 giây. |
| yeu_cau_json | Document | NN | Đầu vào chuẩn hóa gồm khách, lộ trình và danh sách kiện theo thứ tự. |
| ket_qua_json | Document | NN | Kết quả báo giá và thông tin phiên bản cần so sánh. |

- **QU01** Không sửa báo giá đã tạo. Đúng het_han_luc là hết hạn. Chủ báo giá phải bằng khách của yêu cầu tạo đơn.
- **QU02** Khi tạo đơn phải kiểm tra lại lộ trình, kiện, chính sách áp dụng và breakdown; thay đổi trả QUOTE_CHANGED, không tự chấp nhận giá mới.
- **QU03** Một báo giá còn hạn có thể dùng cho nhiều ý định tạo đơn với key khác nhau, giữ hành vi T10. Không coi báo giá là vé dùng một lần.
- **QU04** Payload là bộ nhớ so khớp ngắn hạn, không dùng làm nguồn báo cáo. Các trường lặp trong payload phải khớp metadata lúc ghi; dọn báo giá hết hạn không ảnh hưởng đơn đã tạo.

**Chuẩn hóa:** ma_bao_gia là khóa. Đây là kho thông điệp đóng băng có thời hạn; không dùng hình thức JSON để tuyên bố mô hình nghiệp vụ bên trong đạt 3NF. Các quan hệ nghiệp vụ chính vẫn nằm ở bảng riêng.

### 4.18. YeuCauTaoDon

**Bảng yeu_cau_tao_don**

Ghi nhớ kết quả tạo đơn thành công để chống tác dụng lặp khi retry.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| request_id | Hash64 | PK; NN | SHA256(ma_tk + operation + Idempotency-Key) với quy tắc phân cách cố định. |
| ma_tk | ID | FK; NN | Tài khoản thực hiện, không phải mặc định khách của đơn. |
| ma_don | ID | FK; UQ; NN | Đơn đã tạo thành công từ yêu cầu này. |
| request_json | Document | NN | Payload chuẩn hóa để phát hiện dùng lại key với nội dung khác. |
| response_json | Document | NN | HTTP body thành công gốc, không dựng lại từ đơn đã thay đổi trạng thái. |
| expires_at | Moment | NN | Bằng thời điểm tạo đơn cộng 24 giờ. |

- **ID01** Cùng tài khoản/key/payload còn hạn trả HTTP 201 và response gốc, không gọi bản đồ hay xét lại báo giá. Khác payload trả IDEMPOTENCY_CONFLICT.
- **ID02** Bản ghi này và toàn bộ đơn được commit cùng nhau. Nếu lỗi, rollback cả hai; không có đơn đã commit nhưng chưa có khóa gửi lặp.
- **ID03** Từ đúng expires_at được tái sử dụng key cho ý định mới. Thay thế bản ghi cache không sửa/xóa đơn cũ. Xóa cache hết hạn không xóa lịch sử đơn.

**Chuẩn hóa:** request_id và ma_don là khóa ứng viên. Request/response là chứng từ kỹ thuật phục vụ replay, không phải bản sao nghiệp vụ dùng cho tính toán.

### 4.19. NhatKyKiemToan

**Bảng nhat_ky_kiem_toan**

Theo dõi các thay đổi quản trị và thao tác nhạy cảm; không thay thế nhật ký đơn hoặc sự kiện thanh toán.
| Cột | Kiểu | Khóa và NULL | Ý nghĩa |
| --- | --- | --- | --- |
| ma_audit | ID | PK; NN | Định danh audit. |
| ma_tk_thuc_hien | ID | FK; N | NULL chỉ cho tác vụ hệ thống đã định danh. |
| nguon | AuditSource | NN | NGUOI_DUNG hoặc HE_THONG. |
| loai_doi_tuong | Text 50 | NN | Tên loại thực thể được tác động. |
| ma_doi_tuong | Text 100 | NN | Định danh đối tượng tại lúc thao tác; tham chiếu mô tả, không là FK đa hình. |
| hanh_dong | AuditAction | NN | TAO, SUA, KHOA, MO_KHOA, CONG_BO hoặc XOA. |
| thoi_gian | Moment | NN | Giờ hệ thống. |
| truoc_json | Document | N | Trạng thái trước đã lọc dữ liệu nhạy cảm. |
| sau_json | Document | N | Trạng thái sau đã lọc dữ liệu nhạy cảm. |
| ly_do | Text 500 | N | Lý do thay đổi nếu có. |

- **AU01** NGUOI_DUNG bắt buộc ma_tk_thuc_hien; HE_THONG không mạo danh người dùng. Chỉ thêm mới, không chỉnh/xóa qua API thông thường.
- **AU02** Không ghi password/hash, session token, khóa bản đồ/VNPay hay toàn bộ CCCD. ma_doi_tuong là thông tin lịch sử để audit cả đối tượng đã xóa, không giả vờ là FK quan hệ.
- **AU03** Audit thuộc cùng đơn vị nguyên tử với thay đổi thành công. Log request bị từ chối thuộc log ứng dụng, không được mô tả như audit thay đổi đã commit.

**Chuẩn hóa:** ma_audit xác định sự kiện kiểm toán. Các document trước/sau là bằng chứng lịch sử nguyên khối, không được dùng làm cơ sở FK/truy vấn nghiệp vụ.

## 5. Quan hệ để dựng ERD

Cột cha nằm bên trái, cột FK ở con nằm bên phải. Ký hiệu 1 → 0..n nghĩa là một cha có thể chưa có con hoặc có nhiều con; một con có đúng một cha nếu FK không NULL. Các ngoại lệ FK nullable được mô tả tại dòng tương ứng.
| Mã | Cha | Con và FK | Bội số | Điều kiện |
| --- | --- | --- | --- | --- |
| R01 | tai_khoan.ma_tk | khach_hang.ma_tk | 1 → 0..1 | Khách phải có hồ sơ; FK UQ và quy tắc role. |
| R02 | tai_khoan.ma_tk | tai_xe.ma_tk | 1 → 0..1 | Tài xế phải có hồ sơ; FK UQ và quy tắc role. |
| R03 | tai_xe.ma_tx | phuong_tien.ma_tx | 1 → 0..1 | Một xe hiện tại/tài xế; có xe mới được gán. |
| R04 | khach_hang.ma_kh | don_hang.ma_kh | 1 → 0..n | Mỗi đơn có đúng một chủ sở hữu. |
| R05 | tai_khoan.ma_tk | don_hang.ma_tk_tao | 1 → 0..n | Mỗi đơn có đúng một người tạo. |
| R06 | don_hang.ma_don | cuoc_don_hang.ma_don | 1 → 1 | FK+PK chỉ cho 0..1 vật lý; bắt buộc tồn tại khi commit tạo đơn. |
| R07 | cau_hinh_cuoc.ma_bieu_phi | cuoc_don_hang.ma_bieu_phi | 1 → 0..n | Mỗi cước dùng một phiên bản biểu phí. |
| R08 | chinh_sach_thanh_vien.ma_chinh_sach | cuoc_don_hang.ma_chinh_sach_giam | 1 → 0..n | Mỗi cước có 0..1 chính sách giảm. |
| R09 | don_hang.ma_don | phu_thu_don_hang.ma_don | 1 → 0..n | Nửa thứ nhất của quan hệ nhiều nhiều phụ thu. |
| R10 | cau_hinh_phu_thu.ma_phu_thu | phu_thu_don_hang.ma_phu_thu | 1 → 0..n | Mỗi liên kết chọn đúng một phiên bản. |
| R11 | don_hang.ma_don | chi_tiet_kien_hang.ma_don | 1 → 1..n | Tối thiểu một kiện khi commit. |
| R12 | don_hang.ma_don | phan_cong_don_hang.ma_don | 1 → 0..n | Lịch sử nhiều lần; tối đa một lần hoạt động. |
| R13 | tai_xe.ma_tx | phan_cong_don_hang.ma_tx | 1 → 0..n | Tài xế có nhiều lịch sử; tối đa một việc hoạt động. |
| R14 | tai_khoan.ma_tk | phan_cong_don_hang.ma_tk_dieu_phoi | 1 → 0..n | Người gán là tổng đài. |
| R15 | don_hang.ma_don | nhat_ky_don_hang.ma_don | 1 → 1..n | Tối thiểu sự kiện tạo đơn. |
| R16 | tai_khoan.ma_tk | nhat_ky_don_hang.ma_tk_thuc_hien | 1 → 0..n | Sự kiện có một actor. |
| R17 | don_hang.ma_don | thanh_toan.ma_don | 1 → 0..n | Không phải quan hệ một một. |
| R18 | tai_khoan.ma_tk | thanh_toan.ma_tk_xac_nhan | 1 → 0..n | Mỗi payment có 0..1 người xác nhận tiền mặt. |
| R19 | don_hang.ma_don | xac_nhan_thanh_toan_don_hang.ma_don | 1 → 0..1 | Miễn cước không cần một hàng xác nhận thanh toán đủ. |
| R20 | thanh_toan.ma_giao_dich | xac_nhan_thanh_toan_don_hang.ma_giao_dich | 1 → 0..1 | Phải cùng đơn; kiểm soát cặp order/payment. |
| R21 | thanh_toan.ma_giao_dich | su_kien_thanh_toan.ma_giao_dich | 1 → 0..n | Sự kiện chưa khớp có FK NULL. |
| R22 | khach_hang.ma_kh | bao_gia.ma_kh | 1 → 0..n | Một báo giá cho một khách. |
| R23 | cau_hinh_cuoc.ma_bieu_phi | bao_gia.ma_bieu_phi | 1 → 0..n | Tham chiếu biểu phí hợp lệ. |
| R24 | tai_khoan.ma_tk | yeu_cau_tao_don.ma_tk | 1 → 0..n | Phạm vi chống lặp theo actor. |
| R25 | don_hang.ma_don | yeu_cau_tao_don.ma_don | 1 → 0..1 | Cache có thể hết hạn/xóa; đơn vẫn tồn tại. |
| R26 | tai_khoan.ma_tk | nhat_ky_kiem_toan.ma_tk_thuc_hien | 1 → 0..n | Audit hệ thống có actor NULL. |

### Quy tắc xóa và vòng đời

- Không cascade xóa lịch sử đơn, phân công, cước, thanh toán, xác nhận thanh toán đủ và sự kiện. Các bản ghi lịch sử không có chức năng xóa vật lý thông thường.
- Tài khoản đã tham gia nghiệp vụ dùng KHOA thay vì xóa. Tài xế/khách đã có đơn hoặc phân công không được xóa hồ sơ.
- Chính sách NHAP chưa được dùng có thể CRUD và xóa; chính sách CONG_BO không xóa, thay đổi bằng phiên bản kế tiếp. Đóng hiệu lực không làm mất lịch sử.
- Báo giá và cache chống lặp được dọn theo thời hạn. Xóa cache không xóa đơn. Audit và sự kiện tích hợp không xóa qua API thông thường.
- Hủy thao tác chưa commit dùng rollback; không coi rollback là nghiệp vụ xóa một đơn đã tồn tại.
- Đường nối từ ma_hang đến enum không phải FK đến một bảng HangThanhVien. ERD ghi miền giá trị; Class Diagram thể hiện enum và association đến chính sách khi cần.
## 6. Ràng buộc xuyên bảng và vòng đời

### 6.1. Chuyển trạng thái đơn

| Từ | Đến | Actor và điều kiện | Tác động đồng thời |
| --- | --- | --- | --- |
| Chưa tồn tại | CHO_GAN | Khách của đơn hoặc tổng đài; báo giá hợp lệ | Tạo đơn, kiện, cước, phụ thu, sự kiện 1 và cache chống lặp. |
| CHO_GAN | DA_GAN | Tổng đài; tài xế đủ DR01 và chưa từ chối đơn | Thêm phân công, xóa ranh_tu, ghi sự kiện. |
| DA_GAN | CHO_GAN | Tài xế đang được gán; lý do bắt buộc | Đóng phân công TU_CHOI, giải phóng tài xế, ghi sự kiện. |
| DA_GAN | DA_LAY_HANG | Tài xế của phân công đang hoạt động | Ghi trạng thái và một sự kiện. |
| DA_LAY_HANG | DANG_GIAO | Tài xế của phân công đang hoạt động | Ghi trạng thái và một sự kiện. |
| DANG_GIAO | HOAN_TAT | Tài xế của phân công đang hoạt động | Ghi mốc hoàn tất, đóng HOAN_TAT, giải phóng tài xế, ghi sự kiện. |
| CHO_GAN hoặc DA_GAN | DA_HUY | Khách sở hữu hoặc tổng đài; giờ hiện tại < tạo + 300 giây | Ghi mốc/lý do hủy, đóng HUY_DON nếu có, giải phóng tài xế, ghi sự kiện. |
| DANG_GIAO | DANG_GIAO | Tài xế phụ trách; ghi sự cố hợp lệ | Chỉ thêm sự kiện SU_CO; giữ tài xế bận và không đặt mốc hoàn tất. |

Không có cạnh khác. HOAN_TAT và DA_HUY là trạng thái kết thúc. Khi lấy hàng trở đi không hủy theo UC-14. Retry đúng trạng thái tiến trình hiện tại trả thành công và không tạo event mới; retry trạng thái cũ sau khi đơn tiến xa hơn trả xung đột. Retry hoàn tất phải nhận diện tài xế bằng phân công HOAN_TAT và không cập nhật tài xế đang nhận đơn mới.
Sự cố là hành vi thêm sự kiện: mỗi POST hợp lệ là một lần ghi nhận, có thể có nhiều sự cố cùng nội dung; không áp quy tắc retry trạng thái cho sự cố. Hai request cùng một chuyển trạng thái phải chỉ tạo một event. Số thứ tự sự kiện được cấp trong cùng khóa của đơn.
Bất biến khi commit: CHO_GAN không có phân công hoạt động hoặc hoàn tất; DA_GAN, DA_LAY_HANG và DANG_GIAO có đúng một phân công hoạt động và chưa có phân công hoàn tất; HOAN_TAT không có phân công hoạt động và có đúng một phân công kết thúc HOAN_TAT; DA_HUY không có phân công hoạt động hoặc hoàn tất. Các lần TU_CHOI trước đó vẫn được giữ. Trạng thái đơn và sự kiện chuyển trạng thái cuối cùng phải khớp nhau.
### 6.2. Trạng thái thanh toán

| Tình huống | Quy tắc |
| --- | --- |
| Bắt đầu | Chỉ đơn HOAN_TAT, tổng >0, chưa xác nhận thanh toán đủ và không còn yêu cầu chưa giải quyết. |
| Chờ sang chưa rõ | Online timeout/mất phản hồi chuyển CHUA_RO_KET_QUA hoặc giữ trạng thái chờ có đối soát; không tự ghi thất bại cuối cùng. |
| Kết quả xác thực | CHO_XU_LY hoặc CHUA_RO_KET_QUA chuyển THANH_CONG, THAT_BAI hoặc DA_HUY theo kết quả có thẩm quyền. |
| Thông báo đến muộn | Thông báo thành công đã xác thực có thể sửa nhận định thất bại/hủy trước đó. Ghi khoản thu thực tế; chỉ xác nhận thanh toán đủ nếu chưa có xác nhận thanh toán đủ và đúng tiền. |
| Đã thành công | Không hạ xuống chờ/thất bại do một thông báo đến muộn. Thông tin mâu thuẫn được ghi CAN_DOI_SOAT. |
| Sai tiền hoặc thu hai lần | Ghi nhận sự thật khoản thu; không tạo xác nhận thanh toán đủ sai/đúp. Đưa vào đối soát. Không tự coi phần nhận sai là trả một phần của đơn. |
| Miễn cước | Trả MIEN_CUOC và 0 phải thu, không sinh payment hay xác nhận thanh toán đủ giả. |

### 6.3. Quy tắc tính cước và thời gian

- Chọn đúng một biểu phí CONG_BO, hiệu lực tại thời điểm xét, có km_toi_thieu <= km và (km_toi_da=NULL hoặc km <= km_toi_da). Chính sách chồng lấn phải bị phát hiện, không dùng findFirst làm quy tắc giá.
- cuoc_goc = HALF_UP(cuoc_co_ban + quang_duong_km × don_gia_km, 0). Các phụ thu là số nguyên đồng của phiên bản cố định. subtotal = cuoc_goc + tổng phụ thu.
- Nếu thành viên và chính sách còn hiệu lực: tien_giam_gia = min(subtotal, HALF_UP(subtotal × ty_le_giam / 100, 0)). Nếu không đủ điều kiện: giảm 0.
- tong_cuoc = subtotal − tien_giam_gia. Kiểm tra mọi khoản và tổng không âm, không vượt 9 999 999 999 999.00 VND; từ chối tạo đơn nếu tràn.
- Mỗi thao tác nguyên tử dùng một mốc giờ chuẩn. Khi đã chờ khóa mới kiểm tra lại hết hạn báo giá/hủy; không dùng thời điểm nhận HTTP từ trước khi chờ.
- Với cả ba loại chính sách: hieu_luc_den là NULL hoặc lớn hơn hieu_luc_tu. Chỉ bản NHAP được sửa nội dung; công bố và đóng hiệu lực phải kiểm tra lại chồng lấn trong cùng thao tác nguyên tử.
- Thời gian hiệu lực dùng khoảng đầu bao gồm, cuối không bao gồm. Bộ lọc ngày/tuần/tháng đổi từ giờ Việt Nam thành các mốc UTC; tuần bắt đầu thứ Hai.
- Khoảng cách phục vụ tối đa là cấu hình ứng dụng có kiểm soát, mặc định demo 30.00 km; không suy ra giới hạn phục vụ chỉ từ biểu phí. Thay đổi cấu hình phải cập nhật test biên.
### 6.4. Các đơn vị nguyên tử

| Mã | Thao tác | Các thay đổi cùng thành công hoặc cùng rollback |
| --- | --- | --- |
| TX01 | Đăng ký | Tài khoản + hồ sơ khách, hoặc tài khoản + hồ sơ tài xế ở luồng quản trị. |
| TX02 | Tạo đơn | Kiểm tra/replay key, kiểm tra báo giá và giá, đơn, cước, phụ thu, kiện, sự kiện tạo, response chống lặp. |
| TX03 | Gán | Đọc lại điều kiện sau khóa; thêm phân công, đổi trạng thái đơn, cập nhật hàng đợi tài xế, thêm sự kiện. |
| TX04 | Từ chối | Đóng phân công TU_CHOI, đơn về CHO_GAN, cập nhật hàng đợi, thêm sự kiện. |
| TX05 | Tiến trình và hoàn tất | Kiểm tra đúng người; chuyển trạng thái, đóng phân công nếu hoàn tất, mốc giờ, hàng đợi, sự kiện. |
| TX06 | Hủy | Kiểm tra quyền/tuổi/trạng thái, hủy đơn, đóng phân công nếu có, hàng đợi, sự kiện. |
| TX07 | Ghi nhận tiền | Ghi sự kiện hợp lệ nếu online, cập nhật lần thử, tạo xác nhận thanh toán đủ đúng tiền hoặc ghi nhận cần đối soát. |
| TX08 | Công bố chính sách | Kiểm tra không chồng hiệu lực, công bố bản mới/đóng bản cũ hợp lệ, ghi audit. |

Các luồng sửa đơn/phân công/thanh toán phải tuần tự hóa theo đơn; luồng gán và hoàn tất giữ thứ tự khóa đơn rồi tài xế rồi tài khoản tài xế. Thao tác tạo đơn cùng actor/key phải kiểm tra lại key sau khi chờ khóa. Gọi bản đồ/VNPay nằm ngoài transaction DB; kết quả ghi lại bằng một đơn vị ngắn. Một thao tác chỉ có một chủ sở hữu transaction và một nơi ghi mỗi loại sự kiện.
### 6.5. Quyền dữ liệu và báo cáo

| Actor | Phạm vi dữ liệu |
| --- | --- |
| KHACH_HANG | Tạo, xem, hủy hợp lệ và khởi tạo thanh toán cho đơn của mình. Không xác nhận đã thu tiền. |
| TAI_XE | Xem phân công hiện hành và lịch sử không bị từ chối; thực hiện tiến trình/sự cố chỉ khi là người phụ trách. Xác nhận tiền mặt chỉ cho đơn mình hoàn tất. |
| TONG_DAI | Tạo hộ khách, xem dữ liệu điều phối, gán/hủy theo quy tắc, xác nhận tiền mặt. Không được tự khai vai trò trong request. |
| CHU_DOI_XE | Quản trị tài khoản/phương tiện/chính sách và xem báo cáo. Không mặc định được giả danh tài xế để bỏ qua state machine. |

Báo cáo giá trị hoàn tất lọc theo thoi_gian_hoan_tat; tiền thực nhận lọc theo thu_luc. Tiền được xác nhận thanh toán đủ và khoản thu chưa được phân bổ phải trình bày riêng để đối soát. Công nợ cuối kỳ là cước của đơn hoàn tất trước mốc cuối, trừ đơn có xác nhận thanh toán đủ với thu_luc trước mốc đó; giao dịch thu sau kỳ không xóa công nợ của kỳ trước. Không cộng doanh thu chuyến và tiền thu thành một chỉ tiêu. Tổng hợp các tập một nhiều trước khi ghép để không nhân tiền theo số kiện/sự kiện.
## 7. Cơ sở chuẩn hóa và kiểm tra nhất quán

Phân tích áp dụng cho lược đồ logic và các phụ thuộc hàm nghiệp vụ đã nêu trong từng bảng. 1NF yêu cầu mỗi thuộc tính giữ một giá trị của miền đã định nghĩa; 2NF loại phụ thuộc bộ phận vào khóa ghép; 3NF yêu cầu mỗi phụ thuộc không tầm thường X → A có X là siêu khóa hoặc A là thuộc tính khóa. Một cột ID mới không tự biến quan hệ thành 3NF.
| Nhóm | Cơ sở chuẩn hóa |
| --- | --- |
| Danh tính và hồ sơ | Tên/SĐT chỉ tại tai_khoan. Hồ sơ có ma_tk duy nhất nên cả khóa hồ sơ và FK tài khoản là khóa ứng viên. Không có tên hạng/tỷ lệ hiện tại lặp theo từng khách. |
| Chính sách phiên bản | ID phiên bản xác định nội dung của phiên bản. Mã hạng/mã loại phụ thu không xác định tỷ lệ/số tiền vì có lịch sử nhiều phiên bản. |
| Đơn và cước | Không lưu tổng cước hoặc tổng phụ thu. Cước gốc và tiền giảm được chốt theo đơn; các đầu vào đầy đủ nằm ở nhiều quan hệ nên ID biểu phí riêng lẻ không xác định cước của tất cả đơn. |
| Phụ thu áp dụng | Bảng nối chỉ có khóa ghép. Số tiền phụ thu cố định thuộc bản chính sách; không lặp vào bảng nối để tránh phụ thuộc bộ phận. |
| Kiện và sự kiện | Các thuộc tính phụ thuộc vào từng kiện/sự kiện hoặc khóa ứng viên (đơn, thứ tự), không chỉ phụ thuộc vào đơn. |
| Phân công | Giữ lịch sử từng lần gán. Không lưu ma_tx hiện tại ở đơn và không lưu cờ BUSY tại tài xế. Kết quả kết thúc là dữ liệu nghiệp vụ, không suy luận từ thời điểm. |
| Thanh toán và xác nhận thanh toán đủ | Yêu cầu, khoản thu thực tế và liên kết xác nhận thanh toán đủ có ý nghĩa riêng. Không chép tổng cước/ngày thu vào bảng xác nhận thanh toán đủ. Không ép nhiều lần thử thành quan hệ một một. |

### Các dữ liệu kỹ thuật được tách rõ

bao_gia, yeu_cau_tao_don, su_kien_thanh_toan và nhat_ky_kiem_toan chứa document để lưu thông điệp/cache/bằng chứng. Một document là một giá trị nguyên khối trong miền của nó; tài liệu không dùng điều đó để chứng minh các đối tượng lồng trong JSON là quan hệ chuẩn hóa. Không dùng các bản sao này làm nguồn báo cáo, tổng tiền hay quyền sở hữu. Khi lập báo cáo học phần, trình bày riêng lõi quan hệ 3NF và mục đích của các kho thông điệp này.
ranh_tu là mốc của hàng đợi hiện tại. trang_thai của đơn và payment là trạng thái hiện hành, còn các event ghi nhận diễn biến. Đây là các dữ kiện có quan hệ nhất quán cần cập nhật nguyên tử; chuẩn hóa không thay thế state machine hay khóa truy cập đồng thời.
### Các điều SQL khóa ngoại không tự bảo đảm

- Đơn phải có ít nhất một kiện, một cước và một sự kiện sau commit.
- Tài khoản phải có đúng hồ sơ phù hợp vai trò; role không tự đúng chỉ nhờ FK ma_tk.
- Chính sách không chồng hiệu lực; dòng phụ thu đúng phiên bản tại lúc tạo đơn.
- Tổng giảm không vượt cước; một lần thanh toán được chọn xác nhận thanh toán đủ phải cùng đơn, thành công và đúng tiền.
- Trạng thái đơn, phân công hiện hành/kết thúc và nhật ký phải phù hợp; quyền thao tác phải lấy từ người dùng đã xác thực.
Những điều này là bất biến thiết kế, bắt buộc triển khai và test sau này bằng cơ chế phù hợp. Tài liệu không khẳng định chỉ tạo PK/FK là đã bảo vệ đầy đủ nghiệp vụ.

## 8. Ánh xạ để dựng Class Diagram

Tên lớp tại phần 3 là tên đích. Entity thể hiện dữ liệu và association; Service điều phối use case; Repository truy cập dữ liệu. Không yêu cầu mỗi class là một bảng và không yêu cầu mọi getter tính toán trở thành cột lưu.
| Lớp hoặc nhóm | Thuộc tính và quan hệ cần thể hiện | Phương thức trách nhiệm |
| --- | --- | --- |
| TaiKhoan | ID, username, hash, tên, SĐT, role/status; 0..1 KhachHang hoặc TaiXe | isActive; khóa/mở qua AccountService. Không trả hash trong DTO. |
| KhachHang | TaiKhoan 1; MembershipTier; thời hạn; DonHang 0..n | hasActiveMembership(at); không tự tính điểm. |
| TaiXe | TaiKhoan 1; PhuongTien 0..1; PhanCongDonHang 0..n | Điều kiện nhận đơn do DispatchService xét cùng dữ liệu phân công. |
| DonHang | KhachHang 1; TaiKhoan người tạo 1; CuocDonHang 1; KienHang 1..n; SuKienDonHang 1..n; PhanCong 0..n | canTransitionTo; canCancelAt; không gọi DB/bản đồ trực tiếp trong Entity. |
| CuocDonHang | Biểu phí 1; chính sách giảm 0..1; cước gốc/giảm; phụ thu nằm qua đơn | Tổng là giá trị tính từ bộ dữ liệu đã nạp; không gọi cấu hình hiện tại. |
| PhanCongDonHang | DonHang 1; TaiXe 1; người gán 1; mốc và kết quả kết thúc | isActive; kết thúc theo outcome qua DispatchService. |
| LanThanhToan | DonHang 1; mã tham chiếu; phương thức/kết quả; số thực nhận | Kiểm tra trạng thái; PaymentService xử lý đối soát và quyền xác nhận. |
| XacNhanThanhToanDonHang | DonHang 1; LanThanhToan 1 | Chỉ hình thành nếu thỏa ST01–ST03. |
| BaoGia và YeuCauTaoDon | Các cache có thời hạn, association đến khách/actor/đơn | isExpired(at); so khớp/replay do Service điều phối. |

### Các Service và chữ ký định hướng

| Service | Phương thức chính | Điểm phải thể hiện trên Sequence Diagram |
| --- | --- | --- |
| AuthService | registerCustomer; authenticate; currentUser | Tạo tài khoản và hồ sơ cùng đơn vị; user tổng đài không còn maNv. |
| MembershipService | evaluate(customer, subtotal, at) | Tìm chính sách đúng hạng/thời gian; enum không chứa tỷ lệ cố định. |
| FareService | calculate(route, policies, customer, at) | Một công thức chính thức, HALF_UP, các khoản tiền không âm. |
| QuoteService | createQuote(actor, customer, input) | Gọi RouteProvider trước phần ghi DB; lưu báo giá bất biến. |
| OrderService | createOrder(actor, key, command) | Replay trước gọi ngoài; khóa/kiểm tra lại; commit đơn và response chung. |
| DispatchService | suggest; assign; reject; transition; recordIncident | Khóa, đọc lại điều kiện, association phân công, event có thứ tự. |
| CancellationService | cancel(actor, orderId, reason) | Tuổi <300 giây sau khóa; đóng đúng phân công. |
| PaymentService | start; confirmCash; applyVerifiedEvent; reconcile | Không lấy redirect làm bằng chứng; nhận thực tế và xác nhận thanh toán đủ tách riêng. |
| ReportService | customerHistory; revenue; receivablesAt | Dùng tiêu chí ngày và nguồn tiền đúng, phân quyền, không nhân bản phép cộng. |

Tên phương thức là hợp đồng trách nhiệm để vẽ và triển khai, không phải cam kết giữ nguyên chữ ký Java cũ. Không thêm method thao tác DB vào lớp enum. DTO Order vẫn có thể có maTx, tongCuoc và payment summary dù các giá trị này không còn là cột trực tiếp.

## 9. Đối chiếu schema cũ và các task backend

Hiện tại đến T12
Mô hình mới
Ảnh hưởng
tai_khoan và hồ sơ cùng có ho_ten
Tên/SĐT tập trung tại tai_khoan
Sửa đăng ký, lấy User/Driver DTO, seed và test.
khach_hang_vip và hang_thanh_vien
Hạng/thời hạn ở khach_hang; chính sách phiên bản riêng
Thay Entity/DAO membership; xác định mapping hạng seed cũ sang enum.
dieu_phoi_vien và ma_nv
TONG_DAI là TaiKhoan; đơn có ma_tk_tao
Bỏ kiểm tra actor.maNv; dùng maNguoiDung. API bỏ maNv, thêm maTkTao.
don_hang.ma_tx và cờ tu_choi
Phân công là nguồn chính; enum kết quả kết thúc
Sửa quyền tài xế, truy vấn busy, hoàn tất và retry.
snapshot có tổng/tên/tỷ lệ lặp
cuoc_don_hang chỉ giữ khoản chốt và FK phiên bản
Sửa DTO assembler và query summary; tổng tính từ dữ kiện chuẩn.
phụ thu đơn có số tiền/tên/trạng thái 0
Bảng nối chỉ order và phiên bản phụ thu
Thay phép join; không mất giá lịch sử vì policy bất biến.
nhat_ky_trang_thai có tên/role actor
nhat_ky_don_hang có loại và thứ tự
Sửa Event DTO và phân trang theo thu_tu; actor theo ID.
thanh_toan một success tối đa bằng index
Khoản nhận thực tế + xac_nhan_thanh_toan_don_hang
Summary đã thanh toán dựa xác nhận thanh toán đủ; ghi nhận bất thường ở event.
bao_gia metadata chưa FK biểu phí
Bổ sung quan hệ và payload version
Giữ TTL/so khớp T09–T10.
order_creation_request
Đổi tên thành yeu_cau_tao_don
Giữ nguyên replay 24 giờ và transaction semantics.
danh_gia_chuyen_di và thuộc tính chưa dùng
Không thuộc mô hình đích
Bỏ mapping/seed liên quan, không tự thêm UC mới.

Các hợp đồng API cần cập nhật công khai
- User không còn maNv. Tổng đài được nhận diện bằng maNguoiDung và vaiTro=TONG_DAI. maKh/maTx vẫn là ID hồ sơ.
- Order bỏ maNv và thêm maTkTao. maTx là trường suy diễn; với đơn hủy trả NULL, lịch sử tài xế xem ở phân công.
- Event bổ sung thuTu, loaiSuKien, trangThaiTruoc/trangThaiSau và maTkThucHien; nếu giữ tên hiển thị thì phải ghi đó là tên hiện tại.
- Breakdown tiền giữ tên trường cuocGoc, tienPhuThu, tienGiamGia, tongCuoc và danh sách phụ thu để giảm thay đổi FE. Metadata hạng có thể trả maHang enum và maChinhSach phiên bản.
- Báo giá vẫn maBaoGia và hetHanLuc; khi thay schema payload phải tăng version và không đọc cache phiên bản cũ bằng DTO mới một cách ngầm định.
- Khi triển khai đổi schema, cache ngắn hạn cũ có thể hết hạn trước cutover hoặc có bộ đọc tương thích. Quyết định này thuộc kế hoạch dữ liệu, không được bỏ qua vì bảng chỉ là cache.
Điều chỉnh công việc theo task
| Task | Việc phải điều chỉnh | Điều kiện hoàn thành |
| --- | --- | --- |
| T01 và T03 | Vẽ lại ERD/Class theo tài liệu; Entity/DAO và bộ seed đích; kiểm tra ràng buộc liên bảng | Không còn cột/bảng cũ ngoài đặc tả; mapping đủ 19 bảng và 26 quan hệ. |
| T04 và T05 | Cập nhật OpenAPI/Postman/DTO và fixture chạy test | Hợp đồng API đồng bộ; test DB bắt buộc không bị skip ngầm. |
| T06 | Ghi tên/SĐT một chỗ; bỏ hồ sơ tổng đài; kiểm tra role/profile | Đăng nhập/đăng ký và quyền hiện có không mất; rollback profile. |
| T07 | Chuẩn hóa lộ trình có nguồn và thời gian; giữ phạm vi phục vụ | Sai địa chỉ/timeout/ngoài vùng vẫn có test; nguồn route được lưu đúng. |
| T08 | Hạng enum + chính sách phiên bản; bỏ tích điểm/mã thẻ | Biên hiệu lực theo Moment; hết hạn, thiếu policy, tỷ lệ 0/100. |
| T09 | Chọn chính sách không chồng; tính theo công thức đã chốt; version payload | Không chọn findFirst khi cấu hình mâu thuẫn; báo giá 300 giây. |
| T10 | Lưu cuoc/links phụ thu mới; maTkTao; event có thứ tự; replay | Tất cả aggregate và idempotency cùng commit; không nhận tiền từ client. |
| T11 | Gán theo phân công duy nhất; kiểm tra xe/giấy phép; kết quả TU_CHOI | Hai người gán cùng đơn/tài xế chỉ một thắng; người từ chối không gán lại. |
| T12 | Bỏ truy cập order.taiXe và timestamp equality; outcome HOAN_TAT | Retry đơn cũ không ảnh hưởng đơn mới; event thứ tự ổn định; rollback đủ. |
| T13 | Hủy bằng maTkTao/chủ đơn đúng quyền; đóng HUY_DON | 299.999 giây hợp lệ nếu trạng thái đúng; 300 giây bị chặn; race với lấy hàng. |
| T14 và T15 | Payment attempts, event và xác nhận thanh toán đủ; chỉ thu sau hoàn tất | Sai tiền, lặp, timeout, đến muộn, tiền mặt sai người đều có kết quả rõ. |
| T16 và T17 | Lịch sử/giá trị chuyến/tiền thu/công nợ từ nguồn mới | Kỳ rỗng ra 0; quyền đúng; không nhân tiền do join; công nợ đúng thời điểm. |
| T18 đến T20 | Hồi quy xuyên 12 UC, đối chiếu tài liệu, chuẩn bị demo | Mọi thay đổi API/mô hình có test và traceability; không gọi test cũ pass là chứng minh schema mới. |

## 10. Tiêu chí nghiệm thu mô hình

Các tình huống sau bổ sung vào bộ test hiện có. Đây là tiêu chí thiết kế, chưa phải bảng kết quả đã chạy. Mỗi case khi triển khai cần có dữ liệu đầu vào, Expected, Actual, PASS/FAIL và Bug ID nếu thất bại.
| Mã | Tình huống | Kết quả bắt buộc |
| --- | --- | --- |
| DT01 | Tạo hồ sơ sai role hoặc hai hồ sơ cùng tài khoản | Bị từ chối; không có tài khoản/hồ sơ dở dang. |
| DT02 | Đăng ký hai request cùng SĐT | Chỉ một tài khoản; request còn lại nhận lỗi trùng. |
| DT03 | Công bố hai chính sách cùng phạm vi hiệu lực | Bị chặn; không chọn ngẫu nhiên bản đầu. |
| DT04 | Đổi tỷ lệ/số tiền của policy đã công bố | Bị chặn; bản mới không làm đổi cước đơn cũ. |
| DT05 | Biên thành viên và chính sách tại đúng mốc hết hạn | Không áp giảm ở mốc cuối; không phụ thuộc timezone máy chạy. |
| DT06 | Cước lẻ, tỷ lệ 0/100, giảm bằng cước, tiền tràn | Làm tròn đúng; miễn cước không tạo payment; tràn bị từ chối. |
| DT07 | Báo giá đúng 300 giây hoặc giá/lộ trình/kiện thay đổi | Hết hạn/QUOTE_CHANGED, không tự chốt giá mới. |
| DT08 | Retry tạo cùng key/payload khi route đang lỗi | Response gốc được trả; không tạo đơn nữa. |
| DT09 | Cùng key khác payload hoặc key hết hạn đúng 24 giờ | Xung đột khi còn hạn; hết hạn được tạo mới hợp lệ, đơn cũ còn nguyên. |
| DT10 | Lỗi sau khi ghi đơn nhưng trước event/response cache | Không tồn tại phần đơn/cước/kiện/cache đã commit một phần. |
| DT11 | Hai request cùng gán một đơn hoặc hai đơn giành một tài xế | Tối đa một phân công hoạt động đúng mỗi đối tượng. |
| DT12 | Tài xế thiếu xe, xe tắt, giấy phép hết hạn hoặc tài khoản khóa | Không được gán; đề xuất và gán thực kiểm tra cùng quy tắc. |
| DT13 | Từ chối rồi gán lại cùng tài xế trên cùng đơn | Bị chặn; lịch sử từ chối được giữ. |
| DT14 | Nhảy/lùi trạng thái và retry chuyển trạng thái | Cạnh sai bị chặn; retry hiện tại không thêm event. |
| DT15 | Hoàn tất rồi tài xế nhận đơn mới, retry hoàn tất đơn cũ | Không đóng phân công mới; không sửa mốc hoàn tất cũ. |
| DT16 | Hủy trước và đúng 300 giây; hủy tranh chấp lấy hàng | Chỉ chuyển trạng thái hợp lệ thắng; không có tài xế bận bị sót. |
| DT17 | Nhiều event cùng timestamp | Thứ tự hiển thị và phân trang vẫn xác định bằng thu_tu. |
| DT18 | Khởi tạo thanh toán trước hoàn tất hoặc đơn miễn cước | Bị từ chối hoặc trả miễn cước, không gọi VNPay. |
| DT19 | Return thành công nhưng IPN chưa xác thực | Chưa đánh dấu đã thu/xác nhận thanh toán đủ. |
| DT20 | Callback lặp, sai chữ ký, sai tiền, timeout, thành công đến muộn | Không mất dấu khoản thu; không hạ thành công; không xác nhận thanh toán đủ sai/đúp. |
| DT21 | Gắn payment thành công của đơn A để xác nhận thanh toán đủ đơn B | Bị từ chối bởi quy tắc cặp đơn/payment. |
| DT22 | Khách tự xác nhận tiền mặt hoặc tài xế không hoàn tất đơn xác nhận | Bị từ chối. |
| DT23 | Hai khoản thu thực tế cùng báo thành công | Lưu được cả bằng chứng, chỉ một xác nhận thanh toán đủ; khoản còn lại cần đối soát. |
| DT24 | Đơn hoàn tất kỳ trước, thu tiền kỳ sau | Công nợ cuối kỳ trước vẫn đúng; chỉ tiêu tiền thu nằm kỳ sau. |
| DT25 | Đổi ID để đọc đơn/sự kiện của người khác | Bị từ chối; tài xế từng từ chối không có quyền nếu không có quan hệ hợp lệ khác. |
| DT26 | Xóa tài khoản/chính sách/đơn đã có lịch sử | Không mất lịch sử; dùng khóa/hết hiệu lực theo quy tắc. |
| DT27 | Đơn có nhiều kiện, nhiều phụ thu, nhiều payment event | Tổng cước/tiền thu không bị nhân lên khi truy vấn báo cáo. |

### Dữ liệu demo tối thiểu

- Đủ bốn vai trò; khách thường, khách hạng còn hạn, hết hạn, chưa bắt đầu; chính sách giảm 0 và 100 phần trăm.
- Tài xế rảnh, bận, nghỉ/offline, bị khóa, thiếu xe, xe không hoạt động và hết hạn giấy phép.
- Đơn ở mọi trạng thái; lịch sử từng từ chối, hoàn tất và hủy; nhiều sự kiện cùng thời điểm nhưng khác thứ tự.
- Đơn miễn cước; đơn hoàn tất chưa thu; thất bại rồi thành công; chưa rõ kết quả; thành công đúng tiền đã xác nhận thanh toán đủ; khoản thu sai/chưa được xác nhận thanh toán đủ.
- Policy phiên bản cũ/mới, báo giá còn/hết hạn và cache gửi lặp còn/hết hạn. Chỉ dùng thông tin cá nhân hư cấu trong fixture.
## 11. Hồ sơ đối chiếu và bàn giao

Bản thiết kế được đối chiếu với hai yêu cầu môn học do nhóm cung cấp và mã nguồn dự án đến T12. Những đường dẫn sau là điểm bắt đầu để cập nhật, không phải nguồn schema đích thay thế tài liệu này.
| Nguồn | Vai trò |
| --- | --- |
| Yêu cầu môn Hệ quản trị cơ sở dữ liệu DBMS330284 | Yêu cầu mô hình quan hệ, chuẩn hóa tối thiểu 3NF, khóa/ràng buộc và hồ sơ thiết kế. |
| Yêu cầu Mini Ong Vàng môn Công nghệ phần mềm | 12 UC, luồng thay thế, kiến trúc ba tầng và truy vết thiết kế đến test. |
| docs/project_brief.md | Phạm vi hiện hành: thu sau hoàn tất, VNPay Sandbox, quy tắc thời gian/báo cáo. |
| docs/T08-membership-policy.md và docs/T09-quote.md | Chính sách giảm và hành vi báo giá hiện tại. |
| docs/T10-order-creation.md | Báo giá, chủ đơn/người tạo và idempotency 24 giờ. |
| docs/T11-driver-dispatch.md và docs/T12-delivery-progress.md | Gán/từ chối/hoàn tất/sự cố và quyền truy cập. |
| src/backend/src/main/resources/db/designV1/sqlserver/V1 và V2 | Migration SQL Server hiện hành; V1 tạo schema, V2 bảo vệ chính sách đã công bố. |
| src/backend/src/main/java/com/miniongvang/service và DAO | Điểm refactor công thức, transaction, quyền và truy vấn. |
| docs/database/designV1-M1-audit-2026-10-11.md | Kết quả kiểm tra local T06–T12 trên schema mới; báo cáo PostgreSQL cũ chỉ còn trong lịch sử Git. |

### Sản phẩm phải có khi triển khai xong

- ERD đủ 19 bảng và các cardinality của phần 5; đánh dấu rõ các miền enum và quan hệ bắt buộc khi commit.
- Class Diagram đủ Entity/enum/Service/Repository liên quan; không vẽ thuộc tính DTO dẫn xuất thành cột lưu.
- Từ điển dữ liệu và mã hiện thực không lệch tên, nullability, khóa hoặc quy tắc thời gian trong tài liệu.
- OpenAPI, seed, test và mô tả task được cập nhật đồng bộ với các thay đổi phần 9.
- Bảng kết quả kiểm thử đã thực chạy cho các bất biến phần 10, kèm bằng chứng rollback và truy cập đồng thời.
Thiết kế logic và tài liệu này là đầu vào cho giai đoạn triển khai. Việc chọn hệ quản trị, cơ chế cưỡng chế từng bất biến và phương án chuyển dữ liệu sẽ được quyết định trong kế hoạch kỹ thuật tiếp theo; không làm thay đổi ý nghĩa quan hệ đã mô tả.
