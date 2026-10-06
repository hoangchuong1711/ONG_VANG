package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="khach_hang")
public class KhachHang {
    @Id @Column(name="ma_kh", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk", nullable=false, unique=true)
    private TaiKhoan taiKhoan;

    @Column(name="ho_ten", nullable=false, length=100)
    private String hoTen;

    @Column(name="so_dien_thoai", nullable=false, length=15)
    private String soDienThoai;

    @Column(name="dia_chi_mac_dinh", length=255)
    private String diaChiMacDinh;

    @OneToOne(mappedBy="khachHang", fetch=FetchType.LAZY)
    private KhachHangVip vip;

    public KhachHang() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public TaiKhoan getTaiKhoan() { return taiKhoan; }
    public void setTaiKhoan(TaiKhoan value) { this.taiKhoan = value; }

    public String getHoTen() { return hoTen; }
    public void setHoTen(String value) { this.hoTen = value; }

    public String getSoDienThoai() { return soDienThoai; }
    public void setSoDienThoai(String value) { this.soDienThoai = value; }

    public String getDiaChiMacDinh() { return diaChiMacDinh; }
    public void setDiaChiMacDinh(String value) { this.diaChiMacDinh = value; }

    public KhachHangVip getVip() { return vip; }
    public void setVip(KhachHangVip value) { this.vip = value; }
}
