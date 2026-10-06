package com.miniongvang.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name="danh_gia_chuyen_di")
public class DanhGiaChuyenDi {
    @Id @Column(name="ma_danh_gia", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_don", nullable=false, unique=true)
    private DonHang donHang;

    @Column(name="so_sao", nullable=false)
    private Integer soSao;

    @Column(name="nhan_xet", columnDefinition="text")
    private String nhanXet;

    @Column(name="thoi_gian_danh_gia", nullable=false)
    private Instant thoiGianDanhGia;

    public DanhGiaChuyenDi() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public Integer getSoSao() { return soSao; }
    public void setSoSao(Integer value) { this.soSao = value; }

    public String getNhanXet() { return nhanXet; }
    public void setNhanXet(String value) { this.nhanXet = value; }

    public Instant getThoiGianDanhGia() { return thoiGianDanhGia; }
    public void setThoiGianDanhGia(Instant value) { this.thoiGianDanhGia = value; }
}
