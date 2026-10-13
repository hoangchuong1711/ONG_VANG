package com.miniongvang.dto.order;
import com.miniongvang.dto.quote.FareDtos.Fare;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for order endpoints. */
public final class OrderDtos {
    private OrderDtos() {}

    public record CreateOrder(String maBaoGia, String maKh, String diemLayHang, String diemGiaoHang,
                              String sdtNguoiNhan, String ghiChuGiaoHang, List<Parcel> kienHang,
                              String tenNguoiNhan, String benThanhToan, String phuongThucThanhToan) {
        public CreateOrder(String maBaoGia, String maKh, String diemLayHang, String diemGiaoHang,
                           String sdtNguoiNhan, String ghiChuGiaoHang, List<Parcel> kienHang) {
            this(maBaoGia, maKh, diemLayHang, diemGiaoHang, sdtNguoiNhan, ghiChuGiaoHang,
                    kienHang, null, "NGUOI_DAT", "TIEN_MAT");
        }
    }

    public record PaymentSummary(String trangThai, String soTienConPhaiThu, boolean canDoiSoat) {
            public PaymentSummary(String trangThai, String soTienConPhaiThu) {
                this(trangThai, soTienConPhaiThu, false);
            }
        }

    public record Order(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
                            String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx, String maTkTao,
                            Fare cuoc, List<Parcel> kienHang, PaymentSummary thanhToan,
                            String hoanTatLuc, String huyLuc, String tenNguoiNhan,
                            String benThanhToan, String phuongThucThanhToan, String nguonLoTrinh) {
        public Order(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
                     String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx,
                     String maTkTao, Fare cuoc, List<Parcel> kienHang, PaymentSummary thanhToan,
                     String hoanTatLuc, String huyLuc) {
            this(maDon, thoiGianTao, diemLayHang, diemGiaoHang, sdtNguoiNhan, quangDuongKm,
                    ghiChuGiaoHang, trangThai, maKh, maTx, maTkTao, cuoc, kienHang, thanhToan,
                    hoanTatLuc, huyLuc, null, "NGUOI_DAT", "TIEN_MAT", null);
        }
    }
}
