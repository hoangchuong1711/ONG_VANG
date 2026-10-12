package com.miniongvang.dto.quote;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for quote endpoints. */
public final class FareDtos {
    private FareDtos() {}

    public record Surcharge(String maPhuThu, String tenPhuThu, String soTienTinh) {}

    public record Fare(String cuocGoc, String tienPhuThu, String tienGiamGia,
                           String tongCuoc, String donViTien, List<Surcharge> phuThu) {}
}
