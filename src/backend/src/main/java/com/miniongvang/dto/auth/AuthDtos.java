package com.miniongvang.dto.auth;

import com.miniongvang.entity.enums.*;

/** JSON contract types for auth endpoints. */
public final class AuthDtos {
    private AuthDtos() {}

    public record Csrf(String csrfToken, String headerName) {}

    public record RegisterRequest(String hoTen, String soDienThoai, String password,
                                  String email, String diaChiMacDinh) {}

    public record LoginRequest(String username, String password) {}

    public record User(String maNguoiDung, String hoTen, AccountRole vaiTro,
                           String maKh, String maTx) {}
}
