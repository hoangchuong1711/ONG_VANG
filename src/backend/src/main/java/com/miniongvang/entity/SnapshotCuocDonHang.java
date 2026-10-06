package com.miniongvang.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="snapshot_cuoc_don_hang")
public class SnapshotCuocDonHang {
    @Id @Column(name="ma_don", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @MapsId @JoinColumn(name="ma_don")
    private DonHang donHang;

    @Column(name="ten_bieu_phi", nullable=false, length=100)
    private String tenBieuPhi;

    @Column(name="cuoc_goc", nullable=false, precision=15, scale=2)
    private BigDecimal cuocGoc;

    @Column(name="tien_phu_thu", nullable=false, precision=15, scale=2)
    private BigDecimal tienPhuThu;

    @Column(name="tien_giam_gia", nullable=false, precision=15, scale=2)
    private BigDecimal tienGiamGia;

    @Column(name="tong_cuoc", nullable=false, precision=15, scale=2)
    private BigDecimal tongCuoc;

    @Column(name="don_vi_tien", nullable=false, length=3)
    private String donViTien;

    @Column(name="ten_hang_ap_dung", length=50)
    private String tenHangApDung;

    @Column(name="phan_tram_giam_gia", precision=5, scale=2)
    private BigDecimal phanTramGiamGia;

    public SnapshotCuocDonHang() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public String getTenBieuPhi() { return tenBieuPhi; }
    public void setTenBieuPhi(String value) { this.tenBieuPhi = value; }

    public BigDecimal getCuocGoc() { return cuocGoc; }
    public void setCuocGoc(BigDecimal value) { this.cuocGoc = value; }

    public BigDecimal getTienPhuThu() { return tienPhuThu; }
    public void setTienPhuThu(BigDecimal value) { this.tienPhuThu = value; }

    public BigDecimal getTienGiamGia() { return tienGiamGia; }
    public void setTienGiamGia(BigDecimal value) { this.tienGiamGia = value; }

    public BigDecimal getTongCuoc() { return tongCuoc; }
    public void setTongCuoc(BigDecimal value) { this.tongCuoc = value; }

    public String getDonViTien() { return donViTien; }
    public void setDonViTien(String value) { this.donViTien = value; }

    public String getTenHangApDung() { return tenHangApDung; }
    public void setTenHangApDung(String value) { this.tenHangApDung = value; }

    public BigDecimal getPhanTramGiamGia() { return phanTramGiamGia; }
    public void setPhanTramGiamGia(BigDecimal value) { this.phanTramGiamGia = value; }
}
