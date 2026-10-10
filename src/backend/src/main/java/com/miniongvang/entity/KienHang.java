package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "chi_tiet_kien_hang")
public class KienHang {
    @Id @Column(name = "ma_kien", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @Column(name = "thu_tu", nullable = false)
    private int thuTu;
    @Column(name = "loai_hang_hoa", nullable = false, length = 100)
    private String loaiHangHoa;
    @Column(name = "khoi_luong_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal khoiLuongKg;
    @Column(name = "ghi_chu_bao_quan", length = 500)
    private String ghiChuBaoQuan;

    public KienHang() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public int getThuTu() { return thuTu; }
    public void setThuTu(int value) { thuTu = value; }
    public String getLoaiHangHoa() { return loaiHangHoa; }
    public void setLoaiHangHoa(String value) { loaiHangHoa = value; }
    public BigDecimal getKhoiLuongKg() { return khoiLuongKg; }
    public void setKhoiLuongKg(BigDecimal value) { khoiLuongKg = value; }
    public String getGhiChuBaoQuan() { return ghiChuBaoQuan; }
    public void setGhiChuBaoQuan(String value) { ghiChuBaoQuan = value; }
}
