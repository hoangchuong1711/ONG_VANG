package com.miniongvang.entity;

import com.miniongvang.entity.enums.PaymentMethod;
import com.miniongvang.entity.enums.PaymentStatus;
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
@Table(name = "thanh_toan")
public class LanThanhToan {
    @Id @Column(name = "ma_giao_dich", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @Column(name = "ma_tham_chieu", nullable = false, length = 100)
    private String maThamChieu;
    @Enumerated(EnumType.STRING) @Column(name = "phuong_thuc", nullable = false, length = 40)
    private PaymentMethod phuongThuc;
    @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
    private PaymentStatus trangThai;
    @Column(name = "tao_luc", nullable = false)
    private Instant taoLuc;
    @Column(name = "giai_quyet_luc")
    private Instant giaiQuyetLuc;
    @Column(name = "ma_giao_dich_doi_tac", length = 100)
    private String maGiaoDichDoiTac;
    @Column(name = "so_tien_thuc_nhan", precision = 15, scale = 2)
    private BigDecimal soTienThucNhan;
    @Column(name = "thu_luc")
    private Instant thuLuc;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_tk_xac_nhan")
    private TaiKhoan taiKhoanXacNhan;

    public LanThanhToan() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public String getMaThamChieu() { return maThamChieu; }
    public void setMaThamChieu(String value) { maThamChieu = value; }
    public PaymentMethod getPhuongThuc() { return phuongThuc; }
    public void setPhuongThuc(PaymentMethod value) { phuongThuc = value; }
    public PaymentStatus getTrangThai() { return trangThai; }
    public void setTrangThai(PaymentStatus value) { trangThai = value; }
    public Instant getTaoLuc() { return taoLuc; }
    public void setTaoLuc(Instant value) { taoLuc = value; }
    public Instant getGiaiQuyetLuc() { return giaiQuyetLuc; }
    public void setGiaiQuyetLuc(Instant value) { giaiQuyetLuc = value; }
    public String getMaGiaoDichDoiTac() { return maGiaoDichDoiTac; }
    public void setMaGiaoDichDoiTac(String value) { maGiaoDichDoiTac = value; }
    public BigDecimal getSoTienThucNhan() { return soTienThucNhan; }
    public void setSoTienThucNhan(BigDecimal value) { soTienThucNhan = value; }
    public Instant getThuLuc() { return thuLuc; }
    public void setThuLuc(Instant value) { thuLuc = value; }
    public TaiKhoan getTaiKhoanXacNhan() { return taiKhoanXacNhan; }
    public void setTaiKhoanXacNhan(TaiKhoan value) { taiKhoanXacNhan = value; }
}
