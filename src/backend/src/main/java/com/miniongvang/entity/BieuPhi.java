package com.miniongvang.entity;

import com.miniongvang.entity.enums.PolicyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "cau_hinh_cuoc")
public class BieuPhi {
    @Id @Column(name = "ma_bieu_phi", nullable = false, length = 36)
    private String id;

    @Column(name = "ten_bieu_phi", nullable = false, length = 100)
    private String tenBieuPhi;
    @Column(name = "cuoc_co_ban", nullable = false, precision = 15, scale = 2)
    private BigDecimal cuocCoBan;
    @Column(name = "don_gia_km", nullable = false, precision = 15, scale = 2)
    private BigDecimal donGiaKm;
    @Column(name = "phien_ban", nullable = false)
    private int phienBan = 1;
    @Column(name = "kg_bao_gom", nullable = false, precision = 10, scale = 2)
    private BigDecimal kgBaoGom = BigDecimal.ONE;
    @Column(name = "don_gia_kg", nullable = false, precision = 15, scale = 2)
    private BigDecimal donGiaKg = new BigDecimal("3000.00");
    @Column(name = "kg_toi_da", nullable = false, precision = 10, scale = 2)
    private BigDecimal kgToiDa = new BigDecimal("30.00");
    @Column(name = "km_toi_thieu", nullable = false, precision = 10, scale = 2)
    private BigDecimal kmToiThieu;
    @Column(name = "km_toi_da", precision = 10, scale = 2)
    private BigDecimal kmToiDa;
    @Column(name = "hieu_luc_tu", nullable = false)
    private Instant hieuLucTu;
    @Column(name = "hieu_luc_den")
    private Instant hieuLucDen;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
    private PolicyStatus trangThai;

    public BieuPhi() {}
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenBieuPhi() { return tenBieuPhi; }
    public void setTenBieuPhi(String value) { tenBieuPhi = value; }
    public BigDecimal getCuocCoBan() { return cuocCoBan; }
    public void setCuocCoBan(BigDecimal value) { cuocCoBan = value; }
    public BigDecimal getDonGiaKm() { return donGiaKm; }
    public void setDonGiaKm(BigDecimal value) { donGiaKm = value; }
    public int getPhienBan() { return phienBan; }
    public void setPhienBan(int value) { phienBan = value; }
    public BigDecimal getKgBaoGom() { return kgBaoGom; }
    public void setKgBaoGom(BigDecimal value) { kgBaoGom = value; }
    public BigDecimal getDonGiaKg() { return donGiaKg; }
    public void setDonGiaKg(BigDecimal value) { donGiaKg = value; }
    public BigDecimal getKgToiDa() { return kgToiDa; }
    public void setKgToiDa(BigDecimal value) { kgToiDa = value; }
    public BigDecimal getKmToiThieu() { return kmToiThieu; }
    public void setKmToiThieu(BigDecimal value) { kmToiThieu = value; }
    public BigDecimal getKmToiDa() { return kmToiDa; }
    public void setKmToiDa(BigDecimal value) { kmToiDa = value; }
    public Instant getHieuLucTu() { return hieuLucTu; }
    public void setHieuLucTu(Instant value) { hieuLucTu = value; }
    public Instant getHieuLucDen() { return hieuLucDen; }
    public void setHieuLucDen(Instant value) { hieuLucDen = value; }
    public PolicyStatus getTrangThai() { return trangThai; }
    public void setTrangThai(PolicyStatus value) { trangThai = value; }
}
