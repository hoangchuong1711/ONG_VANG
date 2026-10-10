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
@Table(name = "cau_hinh_phu_thu")
public class ChinhSachPhuThu {
    @Id @Column(name = "ma_phu_thu", nullable = false, length = 36)
    private String id;

    @Column(name = "ma_loai_phu_thu", nullable = false, length = 30)
    private String maLoaiPhuThu;
    @Column(name = "ten_phu_thu", nullable = false, length = 150)
    private String tenPhuThu;
    @Column(name = "so_tien", nullable = false, precision = 15, scale = 2)
    private BigDecimal soTien;
    @Column(name = "hieu_luc_tu", nullable = false)
    private Instant hieuLucTu;
    @Column(name = "hieu_luc_den")
    private Instant hieuLucDen;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
    private PolicyStatus trangThai;

    public ChinhSachPhuThu() {}
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMaLoaiPhuThu() { return maLoaiPhuThu; }
    public void setMaLoaiPhuThu(String value) { maLoaiPhuThu = value; }
    public String getTenPhuThu() { return tenPhuThu; }
    public void setTenPhuThu(String value) { tenPhuThu = value; }
    public BigDecimal getSoTien() { return soTien; }
    public void setSoTien(BigDecimal value) { soTien = value; }
    public Instant getHieuLucTu() { return hieuLucTu; }
    public void setHieuLucTu(Instant value) { hieuLucTu = value; }
    public Instant getHieuLucDen() { return hieuLucDen; }
    public void setHieuLucDen(Instant value) { hieuLucDen = value; }
    public PolicyStatus getTrangThai() { return trangThai; }
    public void setTrangThai(PolicyStatus value) { trangThai = value; }
}
