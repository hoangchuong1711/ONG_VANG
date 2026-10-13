package com.miniongvang.entity;

import com.miniongvang.entity.enums.OrderStatus;
import com.miniongvang.entity.enums.RouteSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "don_hang")
public class DonHang {
    @Id @Column(name = "ma_don", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_kh", nullable = false)
    private KhachHang khachHang;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tk_tao", nullable = false)
    private TaiKhoan taiKhoanTao;
    @Column(name = "thoi_gian_tao", nullable = false)
    private Instant thoiGianTao;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
    private OrderStatus trangThai = OrderStatus.CHO_GAN;
    @Column(name = "diem_lay_hang", nullable = false, length = 255)
    private String diemLayHang;
    @Column(name = "diem_giao_hang", nullable = false, length = 255)
    private String diemGiaoHang;
    @Column(name = "sdt_nguoi_nhan", nullable = false, length = 10)
    private String sdtNguoiNhan;
    @Column(name = "quang_duong_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal quangDuongKm;
    @Column(name = "thoi_gian_du_kien_giay", nullable = false)
    private int thoiGianDuKienGiay;
    @Enumerated(EnumType.STRING) @Column(name = "nguon_lo_trinh", nullable = false, length = 40)
    private RouteSource nguonLoTrinh;
    @Column(name = "ghi_chu_giao_hang", length = 500)
    private String ghiChuGiaoHang;
    @Column(name = "thoi_gian_hoan_tat")
    private Instant thoiGianHoanTat;
    @Column(name = "thoi_gian_huy")
    private Instant thoiGianHuy;
    @Column(name = "ly_do_huy", length = 500)
    private String lyDoHuy;


    public DonHang() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public KhachHang getKhachHang() { return khachHang; }
    public void setKhachHang(KhachHang value) { khachHang = value; }
    public TaiKhoan getTaiKhoanTao() { return taiKhoanTao; }
    public void setTaiKhoanTao(TaiKhoan value) { taiKhoanTao = value; }
    public Instant getThoiGianTao() { return thoiGianTao; }
    public void setThoiGianTao(Instant value) { thoiGianTao = value; }
    public OrderStatus getTrangThai() { return trangThai; }
    public void setTrangThai(OrderStatus value) { trangThai = value; }
    public String getDiemLayHang() { return diemLayHang; }
    public void setDiemLayHang(String value) { diemLayHang = value; }
    public String getDiemGiaoHang() { return diemGiaoHang; }
    public void setDiemGiaoHang(String value) { diemGiaoHang = value; }
    public String getSdtNguoiNhan() { return sdtNguoiNhan; }
    public void setSdtNguoiNhan(String value) { sdtNguoiNhan = value; }
    public BigDecimal getQuangDuongKm() { return quangDuongKm; }
    public void setQuangDuongKm(BigDecimal value) { quangDuongKm = value; }
    public int getThoiGianDuKienGiay() { return thoiGianDuKienGiay; }
    public void setThoiGianDuKienGiay(int value) { thoiGianDuKienGiay = value; }
    public RouteSource getNguonLoTrinh() { return nguonLoTrinh; }
    public void setNguonLoTrinh(RouteSource value) { nguonLoTrinh = value; }
    public String getGhiChuGiaoHang() { return ghiChuGiaoHang; }
    public void setGhiChuGiaoHang(String value) { ghiChuGiaoHang = value; }
    public Instant getThoiGianHoanTat() { return thoiGianHoanTat; }
    public void setThoiGianHoanTat(Instant value) { thoiGianHoanTat = value; }
    public Instant getThoiGianHuy() { return thoiGianHuy; }
    public void setThoiGianHuy(Instant value) { thoiGianHuy = value; }
    public String getLyDoHuy() { return lyDoHuy; }
    public void setLyDoHuy(String value) { lyDoHuy = value; }

}
