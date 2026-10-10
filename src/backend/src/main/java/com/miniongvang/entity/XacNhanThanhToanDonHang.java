package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "xac_nhan_thanh_toan_don_hang")
public class XacNhanThanhToanDonHang {
    @Id @Column(name = "ma_don", nullable = false, length = 36)
    private String maDon;
    @MapsId @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_giao_dich", nullable = false, unique = true)
    private LanThanhToan lanThanhToan;

    public XacNhanThanhToanDonHang() {}
    public String getMaDon() { return maDon; }
    public void setMaDon(String value) { maDon = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public LanThanhToan getLanThanhToan() { return lanThanhToan; }
    public void setLanThanhToan(LanThanhToan value) { lanThanhToan = value; }
}
