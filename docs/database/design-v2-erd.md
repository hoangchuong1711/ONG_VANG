# ERD designV2

Sơ đồ quan hệ của 16 bảng nghiệp vụ trong migration V1. Khóa và các quan hệ lấy từ
`V1__create_business_tables.sql`; các view, hàm và thủ tục không phải bảng nên không vẽ.

```mermaid
erDiagram
    tai_khoan {
        uniqueidentifier ma_tk PK
        nvarchar username UK
        varchar vai_tro
        bigint auth_version
    }
    khach_hang {
        uniqueidentifier ma_kh PK
        uniqueidentifier ma_tk FK,UK
        varchar ma_hang
    }
    tai_xe {
        uniqueidentifier ma_tx PK
        uniqueidentifier ma_tk FK,UK
        varchar trang_thai
    }
    phuong_tien {
        uniqueidentifier ma_phuong_tien PK
        uniqueidentifier ma_tx FK,UK
        nvarchar bien_so UK
    }
    cau_hinh_cuoc {
        uniqueidentifier ma_bieu_phi PK
        varchar trang_thai
        datetime2 hieu_luc_tu
    }
    chinh_sach_thanh_vien {
        uniqueidentifier ma_chinh_sach PK
        varchar ma_hang
        decimal ty_le_giam
    }
    cau_hinh_phu_thu {
        uniqueidentifier ma_phu_thu PK
        varchar ma_loai
        decimal so_tien
    }
    don_hang {
        uniqueidentifier ma_don PK
        uniqueidentifier ma_kh FK
        uniqueidentifier ma_tk_tao FK
        uniqueidentifier ma_bieu_phi FK
        uniqueidentifier ma_chinh_sach FK
        varchar trang_thai
    }
    chi_tiet_kien_hang {
        uniqueidentifier ma_kien PK
        uniqueidentifier ma_don FK
        decimal khoi_luong_kg
    }
    phu_thu_don_hang {
        uniqueidentifier ma_don PK,FK
        uniqueidentifier ma_phu_thu PK,FK
    }
    phan_cong_don_hang {
        uniqueidentifier ma_phan_cong PK
        uniqueidentifier ma_don FK
        uniqueidentifier ma_tx FK
        uniqueidentifier ma_tk_dieu_phoi FK
    }
    nhat_ky_don_hang {
        bigint ma_su_kien PK
        uniqueidentifier ma_don FK
        uniqueidentifier ma_tk FK
    }
    nhat_ky_kiem_toan {
        bigint ma_audit PK
        uniqueidentifier ma_tk FK
    }
    phan_chia_cuoc {
        uniqueidentifier ma_don PK,FK
        uniqueidentifier ma_phan_cong FK,UK
        uniqueidentifier ma_giao_dich_nop FK
    }
    giao_dich_nop_tien {
        uniqueidentifier ma_giao_dich PK
        uniqueidentifier ma_tx FK
        varchar ma_tham_chieu UK
        decimal so_tien_yeu_cau
    }
    su_kien_thanh_toan {
        bigint ma_su_kien PK
        uniqueidentifier ma_giao_dich FK
        varchar nguon
    }

    tai_khoan ||--o| khach_hang : "hồ sơ khách"
    tai_khoan ||--o| tai_xe : "hồ sơ tài xế"
    tai_xe ||--o| phuong_tien : "phương tiện"
    khach_hang ||--o{ don_hang : "đặt đơn"
    tai_khoan ||--o{ don_hang : "tạo đơn"
    cau_hinh_cuoc ||--o{ don_hang : "biểu phí chốt"
    chinh_sach_thanh_vien |o--o{ don_hang : "chính sách chốt"
    don_hang ||--|{ chi_tiet_kien_hang : "kiện hàng"
    don_hang ||--o{ phu_thu_don_hang : "phụ thu áp dụng"
    cau_hinh_phu_thu ||--o{ phu_thu_don_hang : "phiên bản phụ thu"
    don_hang ||--o{ phan_cong_don_hang : "lịch sử gán"
    tai_xe ||--o{ phan_cong_don_hang : "được gán"
    tai_khoan ||--o{ phan_cong_don_hang : "điều phối"
    don_hang ||--o{ nhat_ky_don_hang : "tiến trình"
    tai_khoan ||--o{ nhat_ky_don_hang : "ghi tiến trình"
    tai_khoan |o--o{ nhat_ky_kiem_toan : "người thao tác"
    don_hang ||--o| phan_chia_cuoc : "hoàn tất và thu đủ"
    phan_cong_don_hang ||--o| phan_chia_cuoc : "phân công hoàn tất"
    tai_xe ||--o{ giao_dich_nop_tien : "nộp công ty"
    giao_dich_nop_tien |o--o{ phan_chia_cuoc : "khoản được chốt"
    giao_dich_nop_tien |o--o{ su_kien_thanh_toan : "IPN hoặc tra cứu"
```

`phan_chia_cuoc` chỉ có khi tài xế xác nhận đã giao và thu đủ cước. Khóa ngoại
`ma_giao_dich_nop` có thể NULL; khi giao dịch được xác minh `KHONG_THU`, thủ tục tháo
liên kết này để khoản được nộp lại. `su_kien_thanh_toan.ma_giao_dich` cũng có thể NULL
để lưu callback không nhận diện được giao dịch.
