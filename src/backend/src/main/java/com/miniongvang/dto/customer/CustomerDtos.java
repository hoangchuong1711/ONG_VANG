package com.miniongvang.dto.customer;
import com.miniongvang.dto.quote.QuoteDtos.MembershipView;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for customer endpoints. */
public final class CustomerDtos {
    private CustomerDtos() {}

    public record Customer(String maKh, String hoTen, String soDienThoai, String email,
                               String diaChiMacDinh, MembershipView hangThanhVien) {}

    public record CustomerPage(List<Customer> items, int page, int size,
                                   long totalElements, long totalPages) {}
}
