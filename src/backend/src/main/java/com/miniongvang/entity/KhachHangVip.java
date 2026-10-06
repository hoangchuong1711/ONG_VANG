package com.miniongvang.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name="khach_hang_vip")
public class KhachHangVip {
    @Id @Column(name="ma_kh", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @MapsId @JoinColumn(name="ma_kh")
    private KhachHang khachHang;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_hang", nullable=false)
    private HangThanhVien hang;

    @Column(name="ma_the_vip", nullable=false, length=20)
    private String maTheVip;

    @Column(name="diem_tich_luy", nullable=false)
    private Integer diemTichLuy;

    @Column(name="ngay_het_han")
    private LocalDate ngayHetHan;

    @Column(name="ngay_dang_ky", nullable=false)
    private LocalDate ngayDangKy;

    public KhachHangVip() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public KhachHang getKhachHang() { return khachHang; }
    public void setKhachHang(KhachHang value) { this.khachHang = value; }

    public HangThanhVien getHang() { return hang; }
    public void setHang(HangThanhVien value) { this.hang = value; }

    public String getMaTheVip() { return maTheVip; }
    public void setMaTheVip(String value) { this.maTheVip = value; }

    public Integer getDiemTichLuy() { return diemTichLuy; }
    public void setDiemTichLuy(Integer value) { this.diemTichLuy = value; }

    public LocalDate getNgayHetHan() { return ngayHetHan; }
    public void setNgayHetHan(LocalDate value) { this.ngayHetHan = value; }

    public LocalDate getNgayDangKy() { return ngayDangKy; }
    public void setNgayDangKy(LocalDate value) { this.ngayDangKy = value; }
}
