package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "phuong_tien")
public class PhuongTien {
    @Id @Column(name = "ma_phuong_tien", nullable = false, length = 36)
    private String id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tx", nullable = false, unique = true)
    private TaiXe taiXe;
    @Column(name = "bien_so_xe", nullable = false, length = 15)
    private String bienSoXe;
    @Column(name = "loai_xe", nullable = false, length = 50)
    private String loaiXe;
    @Column(name = "mau_xe", length = 30)
    private String mauXe;
    @Column(name = "dang_hoat_dong", nullable = false)
    private boolean dangHoatDong = true;

    @Transient private String legacySoKhung;

    public PhuongTien() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public TaiXe getTaiXe() { return taiXe; }
    public void setTaiXe(TaiXe value) { taiXe = value; }
    public String getBienSoXe() { return bienSoXe; }
    public void setBienSoXe(String value) { bienSoXe = value; }
    public String getLoaiXe() { return loaiXe; }
    public void setLoaiXe(String value) { loaiXe = value; }
    public String getMauXe() { return mauXe; }
    public void setMauXe(String value) { mauXe = value; }
    public boolean isDangHoatDong() { return dangHoatDong; }
    public void setDangHoatDong(boolean value) { dangHoatDong = value; }

    @Deprecated public String getSoKhung() { return legacySoKhung; }
    @Deprecated public void setSoKhung(String value) { legacySoKhung = value; }
    @Deprecated public Boolean getTinhTrangHoatDong() { return dangHoatDong; }
    @Deprecated public void setTinhTrangHoatDong(Boolean value) { dangHoatDong = Boolean.TRUE.equals(value); }
}
