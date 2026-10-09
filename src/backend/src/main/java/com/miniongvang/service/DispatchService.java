package com.miniongvang.service;

import com.miniongvang.DAO.*;
import com.miniongvang.entity.*;
import com.miniongvang.entity.enums.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class DispatchService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final TransactionRunner transactions;
    private final Clock clock;
    public DispatchService(EntityManagerFactory factory) { this(factory,Clock.systemUTC()); }
    public DispatchService(EntityManagerFactory factory, Clock clock) {
        transactions = new TransactionRunner(factory); this.clock=clock;
    }

    public OrderPage orders(AuthService.User actor, int page, int size, LocalDate from, LocalDate to, OrderStatus status) {
        page(page,size);
        if (from != null && to != null && !from.isBefore(to)) throw new DateRangeInvalid();
        return transactions.run(em -> {
            actor(em,actor,AccountRole.KHACH_HANG,AccountRole.TONG_DAI,AccountRole.TAI_XE);
            String profile = actor.vaiTro()==AccountRole.TAI_XE ? actor.maTx() : actor.maKh();
            var result = new DispatchDAO(em).orders(actor.vaiTro(),profile,status,
                    from==null?null:from.atStartOfDay(VIETNAM).toInstant(),
                    to==null?null:to.atStartOfDay(VIETNAM).toInstant(),page,size);
            return new OrderPage(result.items().stream().map(d->view(em,d.getId())).toList(),page,size,
                    result.total(),pages(result.total(),size),new Summary(result.total(),money(result.fare())));
        });
    }
    public OrderService.Order order(AuthService.User actor,String id) {
        id(id);
        return transactions.run(em -> {
            actor(em,actor,AccountRole.KHACH_HANG,AccountRole.TONG_DAI,AccountRole.TAI_XE);
            DonHang order=new DonHangDAO(em).find(id);
            if (order==null || !visible(em,actor,order)) throw new NoSuchElementException("Order not found");
            return view(em,id);
        });
    }
    public DriverPage drivers(AuthService.User actor,int page,int size,DriverStatus status,Boolean busy) {
        page(page,size);
        return transactions.run(em -> {
            actor(em,actor,AccountRole.TONG_DAI);
            return driverPage(em,new DispatchDAO(em).drivers(status,busy,null,page,size),page,size);
        });
    }
    public DriverPage suggestions(AuthService.User actor,String id,int page,int size) {
        id(id); page(page,size);
        return transactions.run(em -> {
            actor(em,actor,AccountRole.TONG_DAI);
            DonHang order=new DonHangDAO(em).find(id);
            if (order==null) throw new NoSuchElementException("Order not found");
            if (order.getTrangThai()!=OrderStatus.CHO_GAN) throw new Conflict("ORDER_STATE_CONFLICT");
            return driverPage(em,new DispatchDAO(em).drivers(DriverStatus.ONLINE,false,id,page,size),page,size);
        });
    }
    public OrderService.Order assign(AuthService.User actor,String orderId,String driverId) {
        id(orderId); id(driverId);
        return transactions.run(em -> {
            TaiKhoan dispatcher=actor(em,actor,AccountRole.TONG_DAI);
            // Global lock order for all dispatch writes: order, driver, driver's account.
            DonHang order=new DonHangDAO(em).findForUpdate(orderId);
            if (order==null) throw new NoSuchElementException("Order not found");
            var dao=new DispatchDAO(em);
            if (order.getTrangThai()!=OrderStatus.CHO_GAN || order.getTaiXe()!=null || dao.activeOrder(orderId)!=null)
                throw new Conflict("ORDER_STATE_CONFLICT");
            TaiXe driver=new TaiXeDAO(em).findForUpdate(driverId);
            if (driver==null) throw new NoSuchElementException("Driver not found");
            TaiKhoan account=em.find(TaiKhoan.class,driver.getTaiKhoan().getId(),LockModeType.PESSIMISTIC_WRITE);
            if (driver.getTrangThai()!=DriverStatus.ONLINE || account.getTrangThai()!=AccountStatus.HOAT_DONG
                    || dao.busy(driverId) || dao.rejected(orderId,driverId)) throw new Conflict("DRIVER_UNAVAILABLE");
            Instant now=clock.instant();
            PhanCongDonHang assignment=new PhanCongDonHang(); assignment.setId(UUID.randomUUID().toString());
            assignment.setDonHang(order); assignment.setTaiXe(driver); assignment.setTaiKhoanDieuPhoi(dispatcher);
            assignment.setBatDauLuc(now); em.persist(assignment);
            order.setTaiXe(driver); order.setTrangThai(OrderStatus.DA_GAN);
            driver.setRanhTu(null);
            event(em,order,dispatcher,now,null);
            // Flush while still holding locks; DB partial unique indexes are a second guard.
            em.flush(); return view(em,orderId);
        });
    }
    public OrderService.Order reject(AuthService.User actor,String orderId,String reason) {
        id(orderId);
        if (reason==null || reason.isBlank() || reason.strip().length()>500)
            throw new IllegalArgumentException("Reason must contain 1-500 characters");
        String normalized=reason.strip();
        return transactions.run(em -> {
            TaiKhoan account=actor(em,actor,AccountRole.TAI_XE);
            DonHang order=new DonHangDAO(em).findForUpdate(orderId);
            if (order==null) throw new NoSuchElementException("Order not found");
            if (order.getTaiXe()==null || !order.getTaiXe().getId().equals(actor.maTx()))
                throw new NoSuchElementException("Order not found");
            if (order.getTrangThai()!=OrderStatus.DA_GAN) throw new Conflict("ORDER_STATE_CONFLICT");
            TaiXe driver=new TaiXeDAO(em).findForUpdate(actor.maTx());
            // actor validation loaded this driver before waiting for the order lock.
            // Refresh under lock to avoid overwriting a concurrent working-status change.
            em.refresh(driver,LockModeType.PESSIMISTIC_WRITE);
            em.refresh(account,LockModeType.PESSIMISTIC_WRITE);
            if (account.getTrangThai()!=AccountStatus.HOAT_DONG || account.getVaiTro()!=AccountRole.TAI_XE)
                throw new SecurityException("Account unavailable");
            PhanCongDonHang assignment=new DispatchDAO(em).activeOrder(orderId);
            if (assignment==null || !assignment.getTaiXe().getId().equals(driver.getId()))
                throw new Conflict("ORDER_STATE_CONFLICT");
            Instant now=clock.instant();
            assignment.setKetThucLuc(now); assignment.setLyDoKetThuc(normalized); assignment.setTuChoi(true);
            order.setTaiXe(null); order.setTrangThai(OrderStatus.CHO_GAN); driver.setRanhTu(now);
            event(em,order,account,now,normalized);
            em.flush(); return view(em,orderId);
        });
    }
    private static boolean visible(EntityManager em,AuthService.User actor,DonHang order) {
        return switch(actor.vaiTro()) {
            case TONG_DAI -> true;
            case KHACH_HANG -> order.getKhachHang().getId().equals(actor.maKh());
            case TAI_XE -> order.getTaiXe()!=null && order.getTaiXe().getId().equals(actor.maTx())
                    || new DispatchDAO(em).relatedDriver(order.getId(),actor.maTx());
            default -> false;
        };
    }
    private static TaiKhoan actor(EntityManager em,AuthService.User actor,AccountRole... roles) {
        if (actor==null || actor.maNguoiDung()==null || !Arrays.asList(roles).contains(actor.vaiTro()))
            throw new SecurityException("Role not allowed");
        TaiKhoan account=em.find(TaiKhoan.class,actor.maNguoiDung());
        if (account==null || account.getTrangThai()!=AccountStatus.HOAT_DONG || account.getVaiTro()!=actor.vaiTro())
            throw new SecurityException("Account unavailable");
        String bound=switch(actor.vaiTro()) {
            case TONG_DAI -> { var p=actor.maNv()==null?null:em.find(DieuPhoiVien.class,actor.maNv()); yield p==null?null:p.getTaiKhoan().getId(); }
            case TAI_XE -> { var p=actor.maTx()==null?null:em.find(TaiXe.class,actor.maTx()); yield p==null?null:p.getTaiKhoan().getId(); }
            case KHACH_HANG -> { var p=actor.maKh()==null?null:em.find(KhachHang.class,actor.maKh()); yield p==null?null:p.getTaiKhoan().getId(); }
            default -> null;
        };
        if (!account.getId().equals(bound)) throw new SecurityException("Profile mismatch");
        return account;
    }
    private static void event(EntityManager em,DonHang order,TaiKhoan actor,Instant now,String reason) {
        NhatKyTrangThai event=new NhatKyTrangThai(); event.setId(UUID.randomUUID().toString());
        event.setDonHang(order); event.setTrangThai(order.getTrangThai()); event.setThoiGianGhiNhan(now);
        event.setTaiKhoanThucHien(actor); event.setNguoiThucHien(actor.getHoTen());
        event.setVaiTroThucHien(actor.getVaiTro().name()); event.setGhiChuSuCo(reason); em.persist(event);
    }
    private static OrderService.Order view(EntityManager em,String id) {
        var details=new DonHangDAO(em).findDetails(id); var order=details.order(); var snapshot=details.fare();
        if (snapshot==null) throw new IllegalStateException("Order fare snapshot missing");
        var extras=details.surcharges().stream().map(p->new FareCalculator.Surcharge(p.getPhuThu().getId(),
                p.getTenPhuThuSnapshot(),money(p.getSoTienTinh()))).toList();
        var fare=new FareCalculator.Fare(money(snapshot.getCuocGoc()),money(snapshot.getTienPhuThu()),
                money(snapshot.getTienGiamGia()),money(snapshot.getTongCuoc()),snapshot.getDonViTien(),extras);
        var parcels=details.parcels().stream().map(p->new QuoteService.Parcel(p.getLoaiHangHoa(),p.getGhiChuBaoQuan(),money(p.getKhoiLuongKg()))).toList();
        var attempts=new ThanhToanDAO(em).findAttempts(id);
        boolean paid=attempts.stream().anyMatch(p->p.getTrangThai()==PaymentStatus.THANH_CONG);
        boolean pending=attempts.stream().anyMatch(p->p.getTrangThai()==PaymentStatus.CHO_XU_LY);
        String state=snapshot.getTongCuoc().signum()==0?"MIEN_CUOC":paid?"DA_THANH_TOAN":pending?"DANG_XU_LY":"CHUA_THANH_TOAN";
        return new OrderService.Order(order.getId(),order.getThoiGianTao().toString(),order.getDiemLayHang(),
                order.getDiemGiaoHang(),order.getSdtNguoiNhan(),money(order.getQuangDuongKm()),order.getGhiChuGiaoHang(),
                order.getTrangThai().name(),order.getKhachHang().getId(),order.getTaiXe()==null?null:order.getTaiXe().getId(),
                order.getDieuPhoiVien()==null?null:order.getDieuPhoiVien().getId(),fare,parcels,
                new OrderService.PaymentSummary(state,paid?"0.00":fare.tongCuoc()),
                order.getThoiGianHoanTat()==null?null:order.getThoiGianHoanTat().toString(),order.getThoiGianHuy()==null?null:order.getThoiGianHuy().toString());
    }
    private static DriverPage driverPage(EntityManager em,DispatchDAO.Drivers result,int page,int size) {
        var dao=new DispatchDAO(em);
        var items=result.items().stream().map(t->{
            var v=dao.vehicle(t.getId());
            Vehicle vehicle=v==null?null:new Vehicle(v.getId(),v.getBienSoXe(),v.getLoaiXe(),v.getMauXe());
            return new Driver(t.getId(),t.getHoTen(),t.getSoDienThoai(),t.getTrangThai().name(),dao.busy(t.getId()),vehicle);
        }).toList();
        return new DriverPage(items,page,size,result.total(),pages(result.total(),size));
    }
    private static String money(BigDecimal value) { return value.setScale(2).toPlainString(); }
    private static long pages(long total,int size) { return (total+size-1)/size; }
    private static void page(int page,int size) {
        if (page<0 || size<1 || size>100 || (long)page*size>Integer.MAX_VALUE) throw new IllegalArgumentException("Invalid pagination");
    }
    private static void id(String id) {
        if (id==null || id.isBlank() || id.length()>36 || !id.equals(id.strip())) throw new IllegalArgumentException("Invalid id");
    }
    public record Vehicle(String maPhuongTien,String bienSoXe,String loaiXe,String mauXe) {}
    public record Driver(String maTx,String hoTen,String soDienThoai,String trangThaiHoatDong,boolean dangBanChuyen,Vehicle phuongTien) {}
    public record DriverPage(List<Driver> items,int page,int size,long totalElements,long totalPages) {}
    public record Summary(long tongSoDon,String tongCuoc) {}
    public record OrderPage(List<OrderService.Order> items,int page,int size,long totalElements,long totalPages,Summary summary) {}
    public static final class Conflict extends RuntimeException { public Conflict(String code) { super(code); } }
    public static final class DateRangeInvalid extends IllegalArgumentException {}
}
