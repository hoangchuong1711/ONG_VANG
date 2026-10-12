package com.miniongvang.dto.quote;
import com.miniongvang.dto.quote.FareDtos.Fare;
import com.miniongvang.dto.route.RouteDtos.Route;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for quote endpoints. */
public final class QuoteDtos {
    private QuoteDtos() {}

    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        public record Parcel(String loaiHangHoa, String ghiChuBaoQuan, String khoiLuongKg) {}

    public record CreateQuote(String maKh, String diemLayHang, String diemGiaoHang,
                              List<Parcel> kienHang) {}

    public record MembershipView(String maHang, String tenHang, String phanTramGiamGia,
                                     String ngayHetHan, boolean conHieuLuc) {}

    public record Quote(String maBaoGia, String hetHanLuc, Route loTrinh,
                            Fare cuoc, MembershipView hangThanhVien) {}
}
