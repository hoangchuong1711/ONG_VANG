package com.miniongvang.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="chi_tiet_kien_hang")
public class ChiTietKienHang {
    @Id @Column(name="ma_kien_hang", length=36)
    private String id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_don", nullable=false)
    private DonHang donHang;

    @Column(name="loai_hang_hoa", nullable=false, length=100)
    private String loaiHangHoa;

    @Column(name="hinh_anh_xac_nhan", length=500)
    private String hinhAnhXacNhan;

    @Column(name="khoi_luong_kg", nullable=false, precision=10, scale=2)
    private BigDecimal khoiLuongKg;

    @Column(name="ghi_chu_bao_quan", length=500)
    private String ghiChuBaoQuan;

    public ChiTietKienHang() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public String getLoaiHangHoa() { return loaiHangHoa; }
    public void setLoaiHangHoa(String value) { this.loaiHangHoa = value; }

    public String getHinhAnhXacNhan() { return hinhAnhXacNhan; }
    public void setHinhAnhXacNhan(String value) { this.hinhAnhXacNhan = value; }

    public BigDecimal getKhoiLuongKg() { return khoiLuongKg; }
    public void setKhoiLuongKg(BigDecimal value) { this.khoiLuongKg = value; }

    public String getGhiChuBaoQuan() { return ghiChuBaoQuan; }
    public void setGhiChuBaoQuan(String value) { this.ghiChuBaoQuan = value; }
}
