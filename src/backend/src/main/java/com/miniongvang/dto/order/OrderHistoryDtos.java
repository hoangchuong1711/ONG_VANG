package com.miniongvang.dto.order;
import com.miniongvang.dto.dispatch.DispatchDtos.Event;
import com.miniongvang.dto.order.OrderDtos.PaymentSummary;
import com.miniongvang.dto.quote.FareDtos.Fare;
import com.miniongvang.dto.quote.QuoteDtos.Parcel;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for order endpoints. */
public final class OrderHistoryDtos {
    private OrderHistoryDtos() {}

    public record FarePolicy(String maBieuPhi, String tenBieuPhi, String cuocCoBan, String donGiaKm,
                                 String kmToiThieu, String kmToiDa, String hieuLucTu, String hieuLucDen) {}

    public record DiscountPolicy(String maChinhSach, String hang, String tyLeGiam, String hieuLucTu, String hieuLucDen) {}

    public record SurchargePolicy(String maPhuThu, String maLoaiPhuThu, String tenPhuThu, String soTien,
                                      String hieuLucTu, String hieuLucDen) {}

    public record PolicyVersions(FarePolicy bieuPhi, DiscountPolicy giamGia, List<SurchargePolicy> phuThu) {}

    public record Assignment(String maPhanCong, String maTx, String maTkDieuPhoi, String batDauLuc,
                                 String ketThucLuc, String ketQuaKetThuc, String lyDo) {}

    public record Confirmation(String maGiaoDich, String phuongThuc, String soTienThucNhan, String thuLuc, String maTkXacNhan) {}

    public record Detail(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
                            String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx, String maTkTao,
                            Fare cuoc, List<Parcel> kienHang, PaymentSummary thanhToan,
                            String hoanTatLuc, String huyLuc, PolicyVersions phienBanChinhSach, List<Assignment> phanCong,
                             Confirmation xacNhanThanhToan, List<Event> nhatKy) {}
}
