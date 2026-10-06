package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="phuong_tien")
public class PhuongTien {
    @Id @Column(name="ma_phuong_tien", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tx", nullable=false, unique=true)
    private TaiXe taiXe;

    @Column(name="bien_so_xe", nullable=false, length=15)
    private String bienSoXe;

    @Column(name="loai_xe", nullable=false, length=50)
    private String loaiXe;

    @Column(name="mau_xe", length=20)
    private String mauXe;

    @Column(name="so_khung", length=50)
    private String soKhung;

    @Column(name="tinh_trang_hoat_dong", nullable=false)
    private Boolean tinhTrangHoatDong;

    public PhuongTien() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public TaiXe getTaiXe() { return taiXe; }
    public void setTaiXe(TaiXe value) { this.taiXe = value; }

    public String getBienSoXe() { return bienSoXe; }
    public void setBienSoXe(String value) { this.bienSoXe = value; }

    public String getLoaiXe() { return loaiXe; }
    public void setLoaiXe(String value) { this.loaiXe = value; }

    public String getMauXe() { return mauXe; }
    public void setMauXe(String value) { this.mauXe = value; }

    public String getSoKhung() { return soKhung; }
    public void setSoKhung(String value) { this.soKhung = value; }

    public Boolean getTinhTrangHoatDong() { return tinhTrangHoatDong; }
    public void setTinhTrangHoatDong(Boolean value) { this.tinhTrangHoatDong = value; }
}
