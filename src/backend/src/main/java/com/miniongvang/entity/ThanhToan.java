package com.miniongvang.entity;

import java.math.BigDecimal;
import java.time.Instant;

import com.miniongvang.entity.enums.PaymentMethod;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name="thanh_toan")
public class ThanhToan {
    @Id @Column(name="ma_giao_dich", length=36)
    private String id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_don", nullable=false)
    private DonHang donHang;

    @Column(name="so_tien", nullable=false, precision=15, scale=2)
    private BigDecimal soTien;

    @Column(name="ma_tham_chieu", length=100)
    private String maThamChieu;

    @Column(name="ma_giao_dich_doi_tac", length=100)
    private String maGiaoDichDoiTac;

    @Enumerated(EnumType.STRING) @Column(name="phuong_thuc", nullable=false, length=20)
    private PaymentMethod phuongThuc;

    @Column(name="nha_cung_cap", length=30)
    private String nhaCungCap;

    @Enumerated(EnumType.STRING) @Column(name="trang_thai", nullable=false, length=20)
    private PaymentStatus trangThai;

    @Column(name="thoi_gian_thanh_toan")
    private Instant thoiGianThanhToan;

    @Column(name="tao_luc", nullable=false)
    private Instant taoLuc;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk_xac_nhan")
    private TaiKhoan taiKhoanXacNhan;

    public ThanhToan() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public BigDecimal getSoTien() { return soTien; }
    public void setSoTien(BigDecimal value) { this.soTien = value; }

    public String getMaThamChieu() { return maThamChieu; }
    public void setMaThamChieu(String value) { this.maThamChieu = value; }

    public String getMaGiaoDichDoiTac() { return maGiaoDichDoiTac; }
    public void setMaGiaoDichDoiTac(String value) { this.maGiaoDichDoiTac = value; }

    public PaymentMethod getPhuongThuc() { return phuongThuc; }
    public void setPhuongThuc(PaymentMethod value) { this.phuongThuc = value; }

    public String getNhaCungCap() { return nhaCungCap; }
    public void setNhaCungCap(String value) { this.nhaCungCap = value; }

    public PaymentStatus getTrangThai() { return trangThai; }
    public void setTrangThai(PaymentStatus value) { this.trangThai = value; }

    public Instant getThoiGianThanhToan() { return thoiGianThanhToan; }
    public void setThoiGianThanhToan(Instant value) { this.thoiGianThanhToan = value; }

    public Instant getTaoLuc() { return taoLuc; }
    public void setTaoLuc(Instant value) { this.taoLuc = value; }

    public TaiKhoan getTaiKhoanXacNhan() { return taiKhoanXacNhan; }
    public void setTaiKhoanXacNhan(TaiKhoan value) { this.taiKhoanXacNhan = value; }
}
