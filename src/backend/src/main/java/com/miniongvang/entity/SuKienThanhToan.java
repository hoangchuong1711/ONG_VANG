package com.miniongvang.entity;

import com.miniongvang.entity.enums.PaymentEventResult;
import com.miniongvang.entity.enums.PaymentEventSource;
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
@Table(name = "su_kien_thanh_toan")
public class SuKienThanhToan {
    @Id @Column(name = "ma_su_kien", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_giao_dich")
    private LanThanhToan lanThanhToan;
    @Enumerated(EnumType.STRING) @Column(name = "nguon", nullable = false, length = 40)
    private PaymentEventSource nguon;
    @Column(name = "khoa_su_kien", nullable = false, length = 64)
    private String khoaSuKien;
    @Column(name = "nhan_luc", nullable = false)
    private Instant nhanLuc;
    @Column(name = "chu_ky_hop_le", nullable = false)
    private boolean chuKyHopLe;
    @Enumerated(EnumType.STRING) @Column(name = "ket_qua_xu_ly", nullable = false, length = 40)
    private PaymentEventResult ketQuaXuLy;
    @Column(name = "noi_dung_json", nullable = false, columnDefinition = "nvarchar(max)")
    private String noiDungJson;

    public SuKienThanhToan() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public LanThanhToan getLanThanhToan() { return lanThanhToan; }
    public void setLanThanhToan(LanThanhToan value) { lanThanhToan = value; }
    public PaymentEventSource getNguon() { return nguon; }
    public void setNguon(PaymentEventSource value) { nguon = value; }
    public String getKhoaSuKien() { return khoaSuKien; }
    public void setKhoaSuKien(String value) { khoaSuKien = value; }
    public Instant getNhanLuc() { return nhanLuc; }
    public void setNhanLuc(Instant value) { nhanLuc = value; }
    public boolean isChuKyHopLe() { return chuKyHopLe; }
    public void setChuKyHopLe(boolean value) { chuKyHopLe = value; }
    public PaymentEventResult getKetQuaXuLy() { return ketQuaXuLy; }
    public void setKetQuaXuLy(PaymentEventResult value) { ketQuaXuLy = value; }
    public String getNoiDungJson() { return noiDungJson; }
    public void setNoiDungJson(String value) { noiDungJson = value; }
}
