package com.miniongvang.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="phan_cong_don_hang")
public class PhanCongDonHang {
    @Id @Column(name="ma_phan_cong", length=36)
    private String id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_don", nullable=false)
    private DonHang donHang;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tx", nullable=false)
    private TaiXe taiXe;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk_dieu_phoi")
    private TaiKhoan taiKhoanDieuPhoi;

    @Column(name="bat_dau_luc", nullable=false)
    private Instant batDauLuc;

    @Column(name="ket_thuc_luc")
    private Instant ketThucLuc;

    @Column(name="ly_do_ket_thuc", length=500)
    private String lyDoKetThuc;

    public PhanCongDonHang() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { this.donHang = value; }

    public TaiXe getTaiXe() { return taiXe; }
    public void setTaiXe(TaiXe value) { this.taiXe = value; }

    public TaiKhoan getTaiKhoanDieuPhoi() { return taiKhoanDieuPhoi; }
    public void setTaiKhoanDieuPhoi(TaiKhoan value) { this.taiKhoanDieuPhoi = value; }

    public Instant getBatDauLuc() { return batDauLuc; }
    public void setBatDauLuc(Instant value) { this.batDauLuc = value; }

    public Instant getKetThucLuc() { return ketThucLuc; }
    public void setKetThucLuc(Instant value) { this.ketThucLuc = value; }

    public String getLyDoKetThuc() { return lyDoKetThuc; }
    public void setLyDoKetThuc(String value) { this.lyDoKetThuc = value; }
}
