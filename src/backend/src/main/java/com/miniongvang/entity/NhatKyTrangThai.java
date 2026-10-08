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

@Entity
@Table(name="nhat_ky_trang_thai")
public class NhatKyTrangThai {
    @Id @Column(name="ma_nhat_ky", length=36)
    private String id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_don", nullable=false)
    private DonHang donHang;

    @Column(name="thoi_gian_ghi_nhan", nullable=false)
    private Instant thoiGianGhiNhan;

    @Enumerated(EnumType.STRING) @Column(name="trang_thai", nullable=false, length=20)
    private OrderStatus trangThai;

    @Column(name="nguoi_thuc_hien", length=100)
    private String nguoiThucHien;

    @Column(name="vi_do", precision=10, scale=7)
    private BigDecimal viDo;

    @Column(name="kinh_do", precision=10, scale=7)
    private BigDecimal kinhDo;

    @Column(name="ghi_chu_su_co", length=500)
    private String ghiChuSuCo;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk_thuc_hien")
    private TaiKhoan taiKhoanThucHien;

    @Column(name="vai_tro_thuc_hien", length=20)
    private String vaiTroThucHien;

    public NhatKyTrangThai() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public Instant getThoiGianGhiNhan() { return thoiGianGhiNhan; }
    public void setThoiGianGhiNhan(Instant value) { this.thoiGianGhiNhan = value; }

    public OrderStatus getTrangThai() { return trangThai; }
    public void setTrangThai(OrderStatus value) { this.trangThai = value; }

    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String value) { this.nguoiThucHien = value; }

    public BigDecimal getViDo() { return viDo; }
    public void setViDo(BigDecimal value) { this.viDo = value; }

    public BigDecimal getKinhDo() { return kinhDo; }
    public void setKinhDo(BigDecimal value) { this.kinhDo = value; }

    public String getGhiChuSuCo() { return ghiChuSuCo; }
    public void setGhiChuSuCo(String value) { this.ghiChuSuCo = value; }

    public TaiKhoan getTaiKhoanThucHien() { return taiKhoanThucHien; }
    public void setTaiKhoanThucHien(TaiKhoan value) { this.taiKhoanThucHien = value; }

    public String getVaiTroThucHien() { return vaiTroThucHien; }
    public void setVaiTroThucHien(String value) { this.vaiTroThucHien = value; }
}
