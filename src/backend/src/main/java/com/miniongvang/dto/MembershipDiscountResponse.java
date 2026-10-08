package com.miniongvang.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Internal T08 result. T09 rounds monetary values at the final quote step, before API serialization. */
public record MembershipDiscountResponse(
        String maHang,
        String tenHang,
        LocalDate ngayHetHan,
        boolean conHieuLuc,
        BigDecimal phanTramGiamGia,
        BigDecimal tienGiamGia) {
}
