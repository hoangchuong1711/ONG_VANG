package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/** Persisted fare facts for one order; the total is deliberately derived at read time. */
@Entity
@Table(name = "cuoc_don_hang")
public class CuocDonHang {
    @Id @Column(name = "ma_don", nullable = false, length = 36)
    private String maDon;

    @MapsId @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_bieu_phi", nullable = false)
    private BieuPhi bieuPhi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_chinh_sach_giam")
    private ChinhSachThanhVien chinhSachGiam;

    @Column(name = "cuoc_goc", nullable = false, precision = 15, scale = 2)
    private BigDecimal cuocGoc;
    @Column(name = "tien_giam_gia", nullable = false, precision = 15, scale = 2)
    private BigDecimal tienGiamGia;

    public CuocDonHang() {}
    public String getMaDon() { return maDon; }
    public void setMaDon(String maDon) { this.maDon = maDon; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang donHang) { this.donHang = donHang; }
    public BieuPhi getBieuPhi() { return bieuPhi; }
    public void setBieuPhi(BieuPhi bieuPhi) { this.bieuPhi = bieuPhi; }
    public ChinhSachThanhVien getChinhSachGiam() { return chinhSachGiam; }
    public void setChinhSachGiam(ChinhSachThanhVien value) { chinhSachGiam = value; }
    public BigDecimal getCuocGoc() { return cuocGoc; }
    public void setCuocGoc(BigDecimal cuocGoc) { this.cuocGoc = cuocGoc; }
    public BigDecimal getTienGiamGia() { return tienGiamGia; }
    public void setTienGiamGia(BigDecimal tienGiamGia) { this.tienGiamGia = tienGiamGia; }
}
