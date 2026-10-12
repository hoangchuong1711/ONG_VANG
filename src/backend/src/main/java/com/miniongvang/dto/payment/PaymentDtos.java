package com.miniongvang.dto.payment;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for payment endpoints. */
public final class PaymentDtos {
    private PaymentDtos() {}

    public record CreatePaymentRequest(PaymentMethod phuongThuc) {}
    public record ConfirmCashRequest(String soTienDaThu) {}

    public record IpnResponse(String RspCode, String Message) {}

    public record Payment(String maGiaoDich, String maDon, String soTien, PaymentMethod phuongThuc,
                              PaymentStatus trangThai, String maGiaoDichDoiTac, String taoLuc,
                              String thoiGianThanhToan, String paymentUrl, boolean daXacNhanDu,
                              String soTienThucNhan, boolean canDoiSoat) {}

    public record PaymentPage(List<Payment> items, int page, int size, long totalElements, long totalPages) {}
}
