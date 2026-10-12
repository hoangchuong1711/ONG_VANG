package com.miniongvang.dto.route;

import com.miniongvang.entity.enums.*;

/** JSON contract types for route endpoints. */
public final class RouteDtos {
    private RouteDtos() {}

    public record EstimateRequest(String diemLayHang, String diemGiaoHang) {}

    public record Route(String diemLayHang, String diemGiaoHang, String quangDuongKm,
                            long thoiGianDuKienGiay, boolean trongPhamVi, String nguon) {}
}
