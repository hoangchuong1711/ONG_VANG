package com.miniongvang.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name="hang_thanh_vien")
public class HangThanhVien {
    @Id @Column(name="ma_hang", length=20)
    private String id;

    @Column(name="ten_hang", nullable=false, length=50)
    private String tenHang;

    @Column(name="phan_tram_giam_gia", nullable=false, precision=5, scale=2)
    private BigDecimal phanTramGiamGia;

    @Column(name="nguong_chi_tieu", nullable=false, precision=15, scale=2)
    private BigDecimal nguongChiTieu;

    @Column(name="mo_ta", length=255)
    private String moTa;

    public HangThanhVien() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public String getTenHang() { return tenHang; }
    public void setTenHang(String value) { this.tenHang = value; }

    public BigDecimal getPhanTramGiamGia() { return phanTramGiamGia; }
    public void setPhanTramGiamGia(BigDecimal value) { this.phanTramGiamGia = value; }

    public BigDecimal getNguongChiTieu() { return nguongChiTieu; }
    public void setNguongChiTieu(BigDecimal value) { this.nguongChiTieu = value; }

    public String getMoTa() { return moTa; }
    public void setMoTa(String value) { this.moTa = value; }
}
