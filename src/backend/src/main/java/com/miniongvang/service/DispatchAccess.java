package com.miniongvang.service;

import com.miniongvang.security.ActorContext;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManager;
import java.util.Arrays;

/** Database-backed authorization shared by dispatch reads and writes. */
final class DispatchAccess {
    private DispatchAccess() {}

    static TaiKhoan actor(EntityManager em,ActorContext actor,AccountRole... roles) {
        if (actor==null || actor.maNguoiDung()==null || !Arrays.asList(roles).contains(actor.vaiTro()))
            throw new SecurityException("Role not allowed");
        TaiKhoan account=em.find(TaiKhoan.class,actor.maNguoiDung());
        if (account==null || account.getTrangThai()!=AccountStatus.HOAT_DONG || account.getVaiTro()!=actor.vaiTro())
            throw new SecurityException("Account unavailable");
        String bound=switch(actor.vaiTro()) {
            case TONG_DAI -> account.getId();
            case TAI_XE -> { var p=actor.maTx()==null?null:em.find(TaiXe.class,actor.maTx()); yield p==null?null:p.getTaiKhoan().getId(); }
            case KHACH_HANG -> { var p=actor.maKh()==null?null:em.find(KhachHang.class,actor.maKh()); yield p==null?null:p.getTaiKhoan().getId(); }
            default -> null;
        };
        if (!account.getId().equals(bound)) throw new SecurityException("Profile mismatch");
        return account;
    }
}
