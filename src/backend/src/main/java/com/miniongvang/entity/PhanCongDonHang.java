package com.miniongvang.entity;

import com.miniongvang.entity.enums.AssignmentOutcome;
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
@Table(name = "phan_cong_don_hang")
public class PhanCongDonHang {
    @Id @Column(name = "ma_phan_cong", nullable = false, length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_don", nullable = false)
    private DonHang donHang;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tx", nullable = false)
    private TaiXe taiXe;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ma_tk_dieu_phoi", nullable = false)
    private TaiKhoan taiKhoanDieuPhoi;
    @Column(name = "bat_dau_luc", nullable = false)
    private Instant batDauLuc;
    @Column(name = "ket_thuc_luc")
    private Instant ketThucLuc;
    @Enumerated(EnumType.STRING) @Column(name = "ket_qua_ket_thuc", length = 40)
    private AssignmentOutcome ketQuaKetThuc;
    @Column(name = "ly_do", length = 500)
    private String lyDo;

    public PhanCongDonHang() {}
    public String getId() { return id; }
    public void setId(String value) { id = value; }
    public DonHang getDonHang() { return donHang; }
    public void setDonHang(DonHang value) { donHang = value; }
    public TaiXe getTaiXe() { return taiXe; }
    public void setTaiXe(TaiXe value) { taiXe = value; }
    public TaiKhoan getTaiKhoanDieuPhoi() { return taiKhoanDieuPhoi; }
    public void setTaiKhoanDieuPhoi(TaiKhoan value) { taiKhoanDieuPhoi = value; }
    public Instant getBatDauLuc() { return batDauLuc; }
    public void setBatDauLuc(Instant value) { batDauLuc = value; }
    public Instant getKetThucLuc() { return ketThucLuc; }
    public void setKetThucLuc(Instant value) { ketThucLuc = value; }
    public AssignmentOutcome getKetQuaKetThuc() { return ketQuaKetThuc; }
    public void setKetQuaKetThuc(AssignmentOutcome value) { ketQuaKetThuc = value; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String value) { lyDo = value; }
    public boolean isActive() { return ketThucLuc == null; }

    @Deprecated public String getLyDoKetThuc() { return lyDo; }
    @Deprecated public void setLyDoKetThuc(String value) { lyDo = value; }
    @Deprecated public boolean isTuChoi() { return ketQuaKetThuc == AssignmentOutcome.TU_CHOI; }
    @Deprecated public void setTuChoi(boolean value) {
        if (value) ketQuaKetThuc = AssignmentOutcome.TU_CHOI;
        else if (ketQuaKetThuc == AssignmentOutcome.TU_CHOI) ketQuaKetThuc = null;
    }
}
