package com.miniongvang.security;

import com.miniongvang.entity.enums.AccountRole;

/** Authenticated identity passed into business services, independent of the public User DTO. */
public record ActorContext(String maNguoiDung, String hoTen, AccountRole vaiTro,
                           String maKh, String maTx) {}
