package com.miniongvang.dto.quote;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for quote endpoints. */
public final class FareDtos {
    private FareDtos() {}

    public record Surcharge(String maPhuThu, String tenPhuThu, String soTienTinh) {}

    public record Fare(String cuocGoc, String tienPhuThu, String tienGiamGia,
                       String tongCuoc, String donViTien, List<Surcharge> phuThu,
                       String cuocKm, String cuocKhoiLuong, String tongKhoiLuongKg,
                       String maBieuPhi, int phienBanBieuPhi) {
        public Fare(String cuocGoc, String tienPhuThu, String tienGiamGia,
                    String tongCuoc, String donViTien, List<Surcharge> phuThu) {
            this(cuocGoc, tienPhuThu, tienGiamGia, tongCuoc, donViTien, phuThu,
                    cuocGoc, "0.00", "0.00", null, 0);
        }
    }
}
