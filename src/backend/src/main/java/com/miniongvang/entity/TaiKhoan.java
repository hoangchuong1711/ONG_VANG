package com.miniongvang.entity;

import java.time.Instant;

import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name="tai_khoan")
public class TaiKhoan {
    @Id @Column(name="ma_tk", length=36)
    private String id;

    @Column(name="username", nullable=false, length=50)
    private String username;

    @Column(name="email", length=150)
    private String email;

    @Column(name="mat_khau_hash", nullable=false, length=255)
    private String matKhauHash;

    @Enumerated(EnumType.STRING) @Column(name="vai_tro", nullable=false, length=20)
    private AccountRole vaiTro;

    @Enumerated(EnumType.STRING) @Column(name="trang_thai", nullable=false, length=20)
    private AccountStatus trangThai;

    @Column(name="ho_ten", nullable=false, length=100)
    private String hoTen;

    @Column(name="ngay_tao", nullable=false)
    private Instant ngayTao;

    @Column(name="lan_dang_nhap_cuoi")
    private Instant lanDangNhapCuoi;

    public TaiKhoan() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public String getUsername() { return username; }
    public void setUsername(String value) { this.username = value; }

    public String getEmail() { return email; }
    public void setEmail(String value) { this.email = value; }

    public String getMatKhauHash() { return matKhauHash; }
    public void setMatKhauHash(String value) { this.matKhauHash = value; }

    public AccountRole getVaiTro() { return vaiTro; }
    public void setVaiTro(AccountRole value) { this.vaiTro = value; }

    public AccountStatus getTrangThai() { return trangThai; }
    public void setTrangThai(AccountStatus value) { this.trangThai = value; }

    public String getHoTen() { return hoTen; }
    public void setHoTen(String value) { this.hoTen = value; }

    public Instant getNgayTao() { return ngayTao; }
    public void setNgayTao(Instant value) { this.ngayTao = value; }

    public Instant getLanDangNhapCuoi() { return lanDangNhapCuoi; }
    public void setLanDangNhapCuoi(Instant value) { this.lanDangNhapCuoi = value; }
}
