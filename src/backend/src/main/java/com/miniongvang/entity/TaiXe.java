package com.miniongvang.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.miniongvang.entity.enums.DriverStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name="tai_xe")
public class TaiXe {
    @Id @Column(name="ma_tx", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk", nullable=false, unique=true)
    private TaiKhoan taiKhoan;

    @Column(name="ho_ten", nullable=false, length=100)
    private String hoTen;

    @Column(name="so_dien_thoai", nullable=false, length=15)
    private String soDienThoai;

    @Column(name="cccd", nullable=false, length=12)
    private String cccd;

    @Column(name="so_giay_phep", length=50)
    private String soGiayPhep;

    @Enumerated(EnumType.STRING) @Column(name="trang_thai", nullable=false, length=20)
    private DriverStatus trangThai;

    @Column(name="vi_tri_hien_tai", length=255)
    private String viTriHienTai;

    @Column(name="ngay_het_han_gplx")
    private LocalDate ngayHetHanGplx;

    @Column(name="ranh_tu")
    private Instant ranhTu;

    public TaiXe() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public TaiKhoan getTaiKhoan() { return taiKhoan; }
    public void setTaiKhoan(TaiKhoan value) { this.taiKhoan = value; }

    public String getHoTen() { return hoTen; }
    public void setHoTen(String value) { this.hoTen = value; }

    public String getSoDienThoai() { return soDienThoai; }
    public void setSoDienThoai(String value) { this.soDienThoai = value; }

    public String getCccd() { return cccd; }
    public void setCccd(String value) { this.cccd = value; }

    public String getSoGiayPhep() { return soGiayPhep; }
    public void setSoGiayPhep(String value) { this.soGiayPhep = value; }

    public DriverStatus getTrangThai() { return trangThai; }
    public void setTrangThai(DriverStatus value) { this.trangThai = value; }

    public String getViTriHienTai() { return viTriHienTai; }
    public void setViTriHienTai(String value) { this.viTriHienTai = value; }

    public LocalDate getNgayHetHanGplx() { return ngayHetHanGplx; }
    public void setNgayHetHanGplx(LocalDate value) { this.ngayHetHanGplx = value; }

    public Instant getRanhTu() { return ranhTu; }
    public void setRanhTu(Instant value) { this.ranhTu = value; }
}
