package com.miniongvang.entity;

import com.miniongvang.entity.enums.MembershipTier;
import com.miniongvang.entity.enums.PolicyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "chinh_sach_thanh_vien")
public class ChinhSachThanhVien {
    @Id @Column(name = "ma_chinh_sach", nullable = false, length = 36)
    private String id;

    @Enumerated(EnumType.STRING) @Column(name = "ma_hang", nullable = false, length = 40)
    private MembershipTier hang;

    @Column(name = "ty_le_giam", nullable = false, precision = 5, scale = 2)
    private BigDecimal tyLeGiam;

    @Column(name = "hieu_luc_tu", nullable = false)
    private Instant hieuLucTu;

    @Column(name = "hieu_luc_den")
    private Instant hieuLucDen;

    @Enumerated(EnumType.STRING) @Column(name = "trang_thai", nullable = false, length = 40)
    private PolicyStatus trangThai;

    public ChinhSachThanhVien() {}
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public MembershipTier getHang() { return hang; }
    public void setHang(MembershipTier hang) { this.hang = hang; }
    public BigDecimal getTyLeGiam() { return tyLeGiam; }
    public void setTyLeGiam(BigDecimal tyLeGiam) { this.tyLeGiam = tyLeGiam; }
    public Instant getHieuLucTu() { return hieuLucTu; }
    public void setHieuLucTu(Instant hieuLucTu) { this.hieuLucTu = hieuLucTu; }
    public Instant getHieuLucDen() { return hieuLucDen; }
    public void setHieuLucDen(Instant hieuLucDen) { this.hieuLucDen = hieuLucDen; }
    public PolicyStatus getTrangThai() { return trangThai; }
    public void setTrangThai(PolicyStatus trangThai) { this.trangThai = trangThai; }
}
