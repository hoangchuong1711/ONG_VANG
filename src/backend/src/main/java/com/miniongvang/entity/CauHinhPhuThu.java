package com.miniongvang.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name="cau_hinh_phu_thu")
public class CauHinhPhuThu {
    @Id @Column(name="ma_phu_thu", length=36)
    private String id;

    @Column(name="ten_phu_thu", nullable=false, length=150)
    private String tenPhuThu;

    @Column(name="so_tien_phu_thu", nullable=false, precision=15, scale=2)
    private BigDecimal soTienPhuThu;

    @Column(name="khu_vuc_ap_dung", length=255)
    private String khuVucApDung;

    @Column(name="dang_kich_hoat", nullable=false)
    private Boolean dangKichHoat;

    public CauHinhPhuThu() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public String getTenPhuThu() { return tenPhuThu; }
    public void setTenPhuThu(String value) { this.tenPhuThu = value; }

    public BigDecimal getSoTienPhuThu() { return soTienPhuThu; }
    public void setSoTienPhuThu(BigDecimal value) { this.soTienPhuThu = value; }

    public String getKhuVucApDung() { return khuVucApDung; }
    public void setKhuVucApDung(String value) { this.khuVucApDung = value; }

    public Boolean getDangKichHoat() { return dangKichHoat; }
    public void setDangKichHoat(Boolean value) { this.dangKichHoat = value; }
}
