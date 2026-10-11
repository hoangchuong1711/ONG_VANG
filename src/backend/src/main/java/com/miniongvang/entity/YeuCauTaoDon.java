package com.miniongvang.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "yeu_cau_tao_don")
public class YeuCauTaoDon {
    @Id @Column(name = "request_id", nullable = false, length = 64)
    private String requestId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tk", nullable = false)
    private TaiKhoan taiKhoan;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false, unique = true)
    private DonHang donHang;
    @Column(name = "request_json", nullable = false, columnDefinition = "nvarchar(max)")
    private String requestJson;
    @Column(name = "response_json", nullable = false, columnDefinition = "nvarchar(max)")
    private String responseJson;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public YeuCauTaoDon() {}
    public String getRequestId() { return requestId; }
    public void setRequestId(String value) { requestId = value; }
    public TaiKhoan getTaiKhoan() { return taiKhoan; }
    public void setTaiKhoan(TaiKhoan value) { taiKhoan = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public String getRequestJson() { return requestJson; }
    public void setRequestJson(String value) { requestJson = value; }
    public String getResponseJson() { return responseJson; }
    public void setResponseJson(String value) { responseJson = value; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant value) { expiresAt = value; }
}
