package com.miniongvang.entity;

import com.miniongvang.entity.enums.MembershipTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "khach_hang")
public class KhachHang {
    @Id @Column(name = "ma_kh", nullable = false, length = 36)
    private String id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tk", nullable = false, unique = true)
    private TaiKhoan taiKhoan;
    @Column(name = "dia_chi_mac_dinh", length = 255)
    private String diaChiMacDinh;
    @Enumerated(EnumType.STRING) @Column(name = "ma_hang", nullable = false, length = 40)
    private MembershipTier maHang = MembershipTier.THUONG;
    @Column(name = "thanh_vien_tu")
    private Instant thanhVienTu;
    @Column(name = "thanh_vien_den")
    private Instant thanhVienDen;


    public KhachHang() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public TaiKhoan getTaiKhoan() { return taiKhoan; }
    public void setTaiKhoan(TaiKhoan value) { taiKhoan = value; }
    public String getDiaChiMacDinh() { return diaChiMacDinh; }
    public void setDiaChiMacDinh(String value) { diaChiMacDinh = value; }
    public MembershipTier getMaHang() { return maHang; }
    public void setMaHang(MembershipTier value) { maHang = value; }
    public Instant getThanhVienTu() { return thanhVienTu; }
    public void setThanhVienTu(Instant value) { thanhVienTu = value; }
    public Instant getThanhVienDen() { return thanhVienDen; }
    public void setThanhVienDen(Instant value) { thanhVienDen = value; }

}
