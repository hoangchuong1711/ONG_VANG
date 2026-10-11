package com.miniongvang.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

/** The pair of references is the entire persisted row. */
@Entity
@Table(name = "phu_thu_don_hang")
public class PhuThuDonHang {
    @EmbeddedId
    private PhuThuDonHangId id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("maDon") @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("maPhuThu") @JoinColumn(name = "ma_phu_thu", nullable = false)
    private ChinhSachPhuThu chinhSachPhuThu;


    public PhuThuDonHang() {}
    public PhuThuDonHangId getId() { return id; }
    public void setId(PhuThuDonHangId value) { id = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public ChinhSachPhuThu getChinhSachPhuThu() { return chinhSachPhuThu; }
    public void setChinhSachPhuThu(ChinhSachPhuThu value) { chinhSachPhuThu = value; }

}
