package com.miniongvang.entity;

import com.miniongvang.entity.enums.AuditAction;
import com.miniongvang.entity.enums.AuditSource;
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
@Table(name = "nhat_ky_kiem_toan")
public class NhatKyKiemToan {
    @Id @Column(name = "ma_audit", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_tk_thuc_hien")
    private TaiKhoan taiKhoanThucHien;
    @Enumerated(EnumType.STRING) @Column(name = "nguon", nullable = false, length = 40)
    private AuditSource nguon;
    @Column(name = "loai_doi_tuong", nullable = false, length = 50)
    private String loaiDoiTuong;
    @Column(name = "ma_doi_tuong", nullable = false, length = 100)
    private String maDoiTuong;
    @Enumerated(EnumType.STRING) @Column(name = "hanh_dong", nullable = false, length = 40)
    private AuditAction hanhDong;
    @Column(name = "thoi_gian", nullable = false)
    private Instant thoiGian;
    @Column(name = "truoc_json", columnDefinition = "nvarchar(max)")
    private String truocJson;
    @Column(name = "sau_json", columnDefinition = "nvarchar(max)")
    private String sauJson;
    @Column(name = "ly_do", length = 500)
    private String lyDo;

    public NhatKyKiemToan() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public TaiKhoan getTaiKhoanThucHien() { return taiKhoanThucHien; }
    public void setTaiKhoanThucHien(TaiKhoan value) { taiKhoanThucHien = value; }
    public AuditSource getNguon() { return nguon; }
    public void setNguon(AuditSource value) { nguon = value; }
    public String getLoaiDoiTuong() { return loaiDoiTuong; }
    public void setLoaiDoiTuong(String value) { loaiDoiTuong = value; }
    public String getMaDoiTuong() { return maDoiTuong; }
    public void setMaDoiTuong(String value) { maDoiTuong = value; }
    public AuditAction getHanhDong() { return hanhDong; }
    public void setHanhDong(AuditAction value) { hanhDong = value; }
    public Instant getThoiGian() { return thoiGian; }
    public void setThoiGian(Instant value) { thoiGian = value; }
    public String getTruocJson() { return truocJson; }
    public void setTruocJson(String value) { truocJson = value; }
    public String getSauJson() { return sauJson; }
    public void setSauJson(String value) { sauJson = value; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String value) { lyDo = value; }
}
