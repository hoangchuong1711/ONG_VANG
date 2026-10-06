package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class PhuThuDonHangId implements Serializable {
    @Column(name = "ma_don", length = 36)
    public String maDon;
    @Column(name = "ma_phu_thu", length = 36)
    public String maPhuThu;

    public PhuThuDonHangId() {}

    public PhuThuDonHangId(String maDon, String maPhuThu) {
        this.maDon = maDon;
        this.maPhuThu = maPhuThu;
    }

    @Override public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof PhuThuDonHangId that)) return false;
        return Objects.equals(maDon, that.maDon) && Objects.equals(maPhuThu, that.maPhuThu);
    }

    @Override public int hashCode() { return Objects.hash(maDon, maPhuThu); }
}
