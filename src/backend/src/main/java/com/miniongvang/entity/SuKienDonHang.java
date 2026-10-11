package com.miniongvang.entity;

import com.miniongvang.entity.enums.IncidentType;
import com.miniongvang.entity.enums.OrderEventType;
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
import java.time.Instant;

@Entity
@Table(name = "nhat_ky_don_hang")
public class SuKienDonHang {
    @Id @Column(name = "ma_su_kien", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @Column(name = "thu_tu", nullable = false)
    private int thuTu;
    @Enumerated(EnumType.STRING) @Column(name = "loai_su_kien", nullable = false, length = 40)
    private OrderEventType loaiSuKien;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai_truoc", length = 40)
    private OrderStatus trangThaiTruoc;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai_sau", nullable = false, length = 40)
    private OrderStatus trangThaiSau;
    @Column(name = "thoi_gian", nullable = false)
    private Instant thoiGian;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tk_thuc_hien", nullable = false)
    private TaiKhoan taiKhoanThucHien;
    @Enumerated(EnumType.STRING) @Column(name = "loai_su_co", length = 40)
    private IncidentType loaiSuCo;
    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    public SuKienDonHang() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public int getThuTu() { return thuTu; }
    public void setThuTu(int value) { thuTu = value; }
    public OrderEventType getLoaiSuKien() { return loaiSuKien; }
    public void setLoaiSuKien(OrderEventType value) { loaiSuKien = value; }
    public OrderStatus getTrangThaiTruoc() { return trangThaiTruoc; }
    public void setTrangThaiTruoc(OrderStatus value) { trangThaiTruoc = value; }
    public OrderStatus getTrangThaiSau() { return trangThaiSau; }
    public void setTrangThaiSau(OrderStatus value) { trangThaiSau = value; }
    public Instant getThoiGian() { return thoiGian; }
    public void setThoiGian(Instant value) { thoiGian = value; }
    public TaiKhoan getTaiKhoanThucHien() { return taiKhoanThucHien; }
    public void setTaiKhoanThucHien(TaiKhoan value) { taiKhoanThucHien = value; }
    public IncidentType getLoaiSuCo() { return loaiSuCo; }
    public void setLoaiSuCo(IncidentType value) { loaiSuCo = value; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String value) { ghiChu = value; }
}
