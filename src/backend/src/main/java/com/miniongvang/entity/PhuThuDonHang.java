package com.miniongvang.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "phu_thu_don_hang")
public class PhuThuDonHang {
    @EmbeddedId private PhuThuDonHangId id;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("maDon") @JoinColumn(name = "ma_don")
    private DonHang donHang;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("maPhuThu") @JoinColumn(name = "ma_phu_thu")
    private CauHinhPhuThu phuThu;
    @Column(name = "so_tien_tinh", nullable = false, precision = 15, scale = 2)
    private BigDecimal soTienTinh;
    @Column(name = "ly_do", length = 255) private String lyDo;
    @Column(name = "trang_thai", nullable = false, length = 20) private String trangThai;
    @Column(name = "thoi_gian_ap_dung", nullable = false) private Instant thoiGianApDung;
    @Column(name = "ten_phu_thu_snapshot", nullable = false, length = 150) private String tenPhuThuSnapshot;

    public PhuThuDonHang() {}

    public PhuThuDonHangId getId() { return id; }
    public void setId(PhuThuDonHangId value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public CauHinhPhuThu getPhuThu() { return phuThu; }
    public void setPhuThu(CauHinhPhuThu value) { this.phuThu = value; }

    public BigDecimal getSoTienTinh() { return soTienTinh; }
    public void setSoTienTinh(BigDecimal value) { this.soTienTinh = value; }

    public String getLyDo() { return lyDo; }
    public void setLyDo(String value) { this.lyDo = value; }

    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String value) { this.trangThai = value; }

    public Instant getThoiGianApDung() { return thoiGianApDung; }
    public void setThoiGianApDung(Instant value) { this.thoiGianApDung = value; }

    public String getTenPhuThuSnapshot() { return tenPhuThuSnapshot; }
    public void setTenPhuThuSnapshot(String value) { this.tenPhuThuSnapshot = value; }
}
