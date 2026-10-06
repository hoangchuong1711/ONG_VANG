package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;


@Entity
@Table(name="dieu_phoi_vien")
public class DieuPhoiVien {
    @Id @Column(name="ma_nv", length=36)
    private String id;

    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="ma_tk", nullable=false, unique=true)
    private TaiKhoan taiKhoan;

    @Column(name="ho_ten", nullable=false, length=100)
    private String hoTen;

    @Column(name="ca_truc", length=50)
    private String caTruc;

    public DieuPhoiVien() {}

    public String getId() { return id; }
    public void setId(String value) { this.id = value; }

    public TaiKhoan getTaiKhoan() { return taiKhoan; }
    public void setTaiKhoan(TaiKhoan value) { this.taiKhoan = value; }

    public String getHoTen() { return hoTen; }
    public void setHoTen(String value) { this.hoTen = value; }

    public String getCaTruc() { return caTruc; }
    public void setCaTruc(String value) { this.caTruc = value; }
}
