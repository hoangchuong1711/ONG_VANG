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
