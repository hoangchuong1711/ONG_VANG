package com.miniongvang.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name="cau_hinh_cuoc")
public class CauHinhCuoc {
    @Id @Column(name="ma_bieu_phi", length=36)
    private String id;

    @Column(name="ten_bieu_phi", nullable=false, length=100)
    private String tenBieuPhi;

    @Column(name="cuoc_co_ban", nullable=false, precision=15, scale=2)
    private BigDecimal cuocCoBan;

    @Column(name="don_gia_km", nullable=false, precision=15, scale=2)
    private BigDecimal donGiaKm;

    @Column(name="km_toi_thieu", nullable=false, precision=10, scale=2)
    private BigDecimal kmToiThieu;

    @Column(name="km_toi_da", precision=10, scale=2)
    private BigDecimal kmToiDa;

    @Column(name="ngay_bat_dau", nullable=false)
    private LocalDate ngayBatDau;

    @Column(name="ngay_ket_thuc")
    private LocalDate ngayKetThuc;

    @Column(name="dang_kich_hoat", nullable=false)
    private Boolean dangKichHoat;

    public CauHinhCuoc() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public String getTenBieuPhi() { return tenBieuPhi; }
    public void setTenBieuPhi(String value) { this.tenBieuPhi = value; }

    public BigDecimal getCuocCoBan() { return cuocCoBan; }
    public void setCuocCoBan(BigDecimal value) { this.cuocCoBan = value; }

    public BigDecimal getDonGiaKm() { return donGiaKm; }
    public void setDonGiaKm(BigDecimal value) { this.donGiaKm = value; }

    public BigDecimal getKmToiThieu() { return kmToiThieu; }
    public void setKmToiThieu(BigDecimal value) { this.kmToiThieu = value; }

    public BigDecimal getKmToiDa() { return kmToiDa; }
    public void setKmToiDa(BigDecimal value) { this.kmToiDa = value; }

    public LocalDate getNgayBatDau() { return ngayBatDau; }
    public void setNgayBatDau(LocalDate value) { this.ngayBatDau = value; }

    public LocalDate getNgayKetThuc() { return ngayKetThuc; }
    public void setNgayKetThuc(LocalDate value) { this.ngayKetThuc = value; }

    public Boolean getDangKichHoat() { return dangKichHoat; }
    public void setDangKichHoat(Boolean value) { this.dangKichHoat = value; }
}
