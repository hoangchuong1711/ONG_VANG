package com.miniongvang.service;

import com.miniongvang.DAO.OrderHistoryDAO;
import com.miniongvang.entity.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Reads persisted policy versions; never re-quotes an existing order. */
public final class OrderHistoryService {
    private OrderHistoryService() {}
    static Detail read(EntityManager em, OrderService.Order o) {
        var dao = new OrderHistoryDAO(em);
        var fare = dao.fare(o.maDon());
        var policy = fare.getBieuPhi();
        var discount = fare.getChinhSachGiam();
        var versions = new PolicyVersions(
                new FarePolicy(policy.getId(), policy.getTenBieuPhi(), money(policy.getCuocCoBan()),
                        money(policy.getDonGiaKm()), money(policy.getKmToiThieu()), money(policy.getKmToiDa()),
                        time(policy.getHieuLucTu()), time(policy.getHieuLucDen())),
                discount == null ? null : new DiscountPolicy(discount.getId(), discount.getHang().name(),
                        money(discount.getTyLeGiam()), time(discount.getHieuLucTu()), time(discount.getHieuLucDen())),
                dao.surcharges(o.maDon()).stream().map(p -> {
                    var s = p.getChinhSachPhuThu();
                    return new SurchargePolicy(s.getId(), s.getMaLoaiPhuThu(), s.getTenPhuThu(), money(s.getSoTien()),
                            time(s.getHieuLucTu()), time(s.getHieuLucDen()));
                }).toList());
        var assignments = dao.assignments(o.maDon()).stream().map(p -> new Assignment(
                p.getId(), p.getTaiXe().getId(), p.getTaiKhoanDieuPhoi().getId(), time(p.getBatDauLuc()),
                time(p.getKetThucLuc()), p.getKetQuaKetThuc() == null ? null : p.getKetQuaKetThuc().name(), p.getLyDo())).toList();
        var confirmed = dao.confirmation(o.maDon());
        var p = confirmed == null ? null : confirmed.getLanThanhToan();
        var confirmation = p == null ? null : new Confirmation(p.getId(), p.getPhuongThuc().name(),
                money(p.getSoTienThucNhan()), time(p.getThuLuc()),
                p.getTaiKhoanXacNhan() == null ? null : p.getTaiKhoanXacNhan().getId());
        var events = dao.events(o.maDon()).stream().map(e -> new DispatchService.Event(
                e.getId(), o.maDon(), e.getThuTu(), e.getLoaiSuKien(), e.getTrangThaiTruoc(), e.getTrangThaiSau(),
                time(e.getThoiGian()), e.getTaiKhoanThucHien().getId(), e.getTaiKhoanThucHien().getHoTen(),
                e.getGhiChu(), e.getLoaiSuCo())).toList();
        return new Detail(o.maDon(), o.thoiGianTao(), o.diemLayHang(), o.diemGiaoHang(), o.sdtNguoiNhan(), o.quangDuongKm(), o.ghiChuGiaoHang(), o.trangThai(), o.maKh(), o.maTx(), o.maTkTao(), o.cuoc(), o.kienHang(), o.thanhToan(), o.hoanTatLuc(), o.huyLuc(), versions, assignments, confirmation, events);
    }
    private static String money(BigDecimal value) { return value == null ? null : value.setScale(2).toPlainString(); }
    private static String time(Instant value) { return value == null ? null : value.toString(); }
    public record FarePolicy(String maBieuPhi, String tenBieuPhi, String cuocCoBan, String donGiaKm,
                             String kmToiThieu, String kmToiDa, String hieuLucTu, String hieuLucDen) {}
    public record DiscountPolicy(String maChinhSach, String hang, String tyLeGiam, String hieuLucTu, String hieuLucDen) {}
    public record SurchargePolicy(String maPhuThu, String maLoaiPhuThu, String tenPhuThu, String soTien,
                                  String hieuLucTu, String hieuLucDen) {}
    public record PolicyVersions(FarePolicy bieuPhi, DiscountPolicy giamGia, List<SurchargePolicy> phuThu) {}
    public record Assignment(String maPhanCong, String maTx, String maTkDieuPhoi, String batDauLuc,
                             String ketThucLuc, String ketQuaKetThuc, String lyDo) {}
    public record Confirmation(String maGiaoDich, String phuongThuc, String soTienThucNhan, String thuLuc, String maTkXacNhan) {}
    public record Detail(String maDon, String thoiGianTao, String diemLayHang, String diemGiaoHang, String sdtNguoiNhan,
                        String quangDuongKm, String ghiChuGiaoHang, String trangThai, String maKh, String maTx, String maTkTao,
                        FareCalculator.Fare cuoc, List<QuoteService.Parcel> kienHang, OrderService.PaymentSummary thanhToan,
                        String hoanTatLuc, String huyLuc, PolicyVersions phienBanChinhSach, List<Assignment> phanCong,
                         Confirmation xacNhanThanhToan, List<DispatchService.Event> nhatKy) {}
}
