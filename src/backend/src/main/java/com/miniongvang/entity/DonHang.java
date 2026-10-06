package com.miniongvang.entity;

import java.math.BigDecimal;
import java.time.Instant;

import com.miniongvang.entity.enums.OrderStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name="don_hang")
public class DonHang {
    @Id @Column(name="ma_don", length=36)
    private String id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_kh", nullable=false)
    private KhachHang khachHang;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tx")
    private TaiXe taiXe;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_nv")
    private DieuPhoiVien dieuPhoiVien;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_bieu_phi", nullable=false)
    private CauHinhCuoc bieuPhi;

    @Column(name="thoi_gian_tao", nullable=false)
    private Instant thoiGianTao;

    @Enumerated(EnumType.STRING) @Column(name="trang_thai", nullable=false, length=20)
    private OrderStatus trangThai;

    @Column(name="diem_lay_hang", nullable=false, length=255)
    private String diemLayHang;

    @Column(name="diem_giao_hang", nullable=false, length=255)
    private String diemGiaoHang;

    @Column(name="sdt_nguoi_nhan", nullable=false, length=15)
    private String sdtNguoiNhan;

    @Column(name="quang_duong_km", nullable=false, precision=10, scale=2)
    private BigDecimal quangDuongKm;

    @Column(name="ghi_chu_giao_hang", length=500)
    private String ghiChuGiaoHang;

    @Column(name="thoi_gian_huy")
    private Instant thoiGianHuy;

    @Column(name="ly_do_huy", length=500)
    private String lyDoHuy;

    @Column(name="thoi_gian_hoan_tat")
    private Instant thoiGianHoanTat;

    @Version @Column(name="version", nullable=false)
    private Long version;

    public DonHang() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public KhachHang getKhachHang() { return khachHang; }
    public void setKhachHang(KhachHang value) { this.khachHang = value; }

    public TaiXe getTaiXe() { return taiXe; }
    public void setTaiXe(TaiXe value) { this.taiXe = value; }

    public DieuPhoiVien getDieuPhoiVien() { return dieuPhoiVien; }
    public void setDieuPhoiVien(DieuPhoiVien value) { this.dieuPhoiVien = value; }

    public CauHinhCuoc getBieuPhi() { return bieuPhi; }
    public void setBieuPhi(CauHinhCuoc value) { this.bieuPhi = value; }

    public Instant getThoiGianTao() { return thoiGianTao; }
    public void setThoiGianTao(Instant value) { this.thoiGianTao = value; }

    public OrderStatus getTrangThai() { return trangThai; }
    public void setTrangThai(OrderStatus value) { this.trangThai = value; }

    public String getDiemLayHang() { return diemLayHang; }
    public void setDiemLayHang(String value) { this.diemLayHang = value; }

    public String getDiemGiaoHang() { return diemGiaoHang; }
    public void setDiemGiaoHang(String value) { this.diemGiaoHang = value; }

    public String getSdtNguoiNhan() { return sdtNguoiNhan; }
    public void setSdtNguoiNhan(String value) { this.sdtNguoiNhan = value; }

    public BigDecimal getQuangDuongKm() { return quangDuongKm; }
    public void setQuangDuongKm(BigDecimal value) { this.quangDuongKm = value; }

    public String getGhiChuGiaoHang() { return ghiChuGiaoHang; }
    public void setGhiChuGiaoHang(String value) { this.ghiChuGiaoHang = value; }

    public Instant getThoiGianHuy() { return thoiGianHuy; }
    public void setThoiGianHuy(Instant value) { this.thoiGianHuy = value; }

    public String getLyDoHuy() { return lyDoHuy; }
    public void setLyDoHuy(String value) { this.lyDoHuy = value; }

    public Instant getThoiGianHoanTat() { return thoiGianHoanTat; }
    public void setThoiGianHoanTat(Instant value) { this.thoiGianHoanTat = value; }

    public Long getVersion() { return version; }
    public void setVersion(Long value) { this.version = value; }
}
