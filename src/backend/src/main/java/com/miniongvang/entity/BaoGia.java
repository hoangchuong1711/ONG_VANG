package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Frozen quote input and output for T10 ownership, expiry and price recheck. */
@Entity
@Table(name = "bao_gia")
public class BaoGia {
    @Id @Column(name = "ma_bao_gia", length = 36) private String id;
    @Column(name = "ma_kh", nullable = false, length = 36) private String maKh;
    @Column(name = "ma_bieu_phi", nullable = false, length = 36) private String maBieuPhi;
    @Column(name = "tao_luc", nullable = false) private Instant taoLuc;
    @Column(name = "het_han_luc", nullable = false) private Instant hetHanLuc;
    @Column(name = "yeu_cau_json", nullable = false, columnDefinition = "text") private String yeuCauJson;
    @Column(name = "ket_qua_json", nullable = false, columnDefinition = "text") private String ketQuaJson;

    public BaoGia() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public String getMaKh() { return maKh; }
    public void setMaKh(String value) { maKh = value; }
    public String getMaBieuPhi() { return maBieuPhi; }
    public void setMaBieuPhi(String value) { maBieuPhi = value; }
    public Instant getTaoLuc() { return taoLuc; }
    public void setTaoLuc(Instant value) { taoLuc = value; }
    public Instant getHetHanLuc() { return hetHanLuc; }
    public void setHetHanLuc(Instant value) { hetHanLuc = value; }
    public String getYeuCauJson() { return yeuCauJson; }
    public void setYeuCauJson(String value) { yeuCauJson = value; }
    public String getKetQuaJson() { return ketQuaJson; }
    public void setKetQuaJson(String value) { ketQuaJson = value; }
}
