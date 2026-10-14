package com.miniongvang.dao;

import com.miniongvang.entity.TaiXe;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.List;

public final class DriverEarningsDAO {
    private final EntityManager em;
    public DriverEarningsDAO(EntityManager em) { this.em = em; }
    public List<TaiXe> drivers() {
        return em.createQuery("select d from TaiXe d order by d.taiKhoan.hoTen", TaiXe.class).getResultList();
    }
    public record Totals(BigDecimal completed, BigDecimal earned, BigDecimal eligible,
                         BigDecimal pendingCod, BigDecimal cashHolding, BigDecimal codPaid) {}

    public Totals totals(String driver, Timestamp begin, Timestamp end) {
        BigDecimal completed=sum("select sum(s.tong_cuoc) from dbo.phan_chia_cuoc s join dbo.phan_cong_don_hang a on a.ma_phan_cong=s.ma_phan_cong join dbo.don_hang o on o.ma_don=s.ma_don where a.ma_tx=:driver and o.thoi_gian_hoan_tat>=:begin and o.thoi_gian_hoan_tat<:end",driver,begin,end);
        BigDecimal earned=sum("select sum(s.tien_tai_xe) from dbo.phan_chia_cuoc s join dbo.phan_cong_don_hang a on a.ma_phan_cong=s.ma_phan_cong where a.ma_tx=:driver and s.ghi_nhan_luc>=:begin and s.ghi_nhan_luc<:end",driver,begin,end);
        String shareJoin=" from dbo.phan_chia_cuoc s join dbo.phan_cong_don_hang a on a.ma_phan_cong=s.ma_phan_cong left join dbo.thanh_toan p on p.ma_giao_dich=s.ma_giao_dich_cuoc where a.ma_tx=:driver and s.ghi_nhan_luc>=:begin and s.ghi_nhan_luc<:end";
        String settled=" exists (select 1 from dbo.khoan_cod_trong_dot i join dbo.dot_nop_cod b on b.ma_dot=i.ma_dot where i.ma_giao_dich_cuoc=p.ma_giao_dich and b.trang_thai=N'THANH_CONG')";
        BigDecimal eligible=sum("select sum(s.tien_tai_xe)"+shareJoin+" and (p.ma_giao_dich is null or p.phuong_thuc=N'VNPAY_QR' or (p.phuong_thuc=N'TIEN_MAT' and "+settled+"))",driver,begin,end);
        BigDecimal pending=sum("select sum(s.tien_tai_xe)"+shareJoin+" and p.phuong_thuc=N'TIEN_MAT' and not "+settled,driver,begin,end);
        BigDecimal holding=sum("select sum(p.so_tien_thuc_nhan) from dbo.thanh_toan p join dbo.xac_nhan_thanh_toan_don_hang x on x.ma_giao_dich=p.ma_giao_dich where p.ma_tk_xac_nhan=(select ma_tk from dbo.tai_xe where ma_tx=:driver) and p.phuong_thuc=N'TIEN_MAT' and p.trang_thai=N'THANH_CONG' and not exists (select 1 from dbo.khoan_cod_trong_dot i join dbo.dot_nop_cod b on b.ma_dot=i.ma_dot where i.ma_giao_dich_cuoc=p.ma_giao_dich and b.trang_thai=N'THANH_CONG')",driver,null,null);
        BigDecimal paid=sum("select sum(b.tong_tien) from dbo.dot_nop_cod b where b.ma_tx=:driver and b.trang_thai=N'THANH_CONG' and b.xac_nhan_luc>=:begin and b.xac_nhan_luc<:end",driver,begin,end);
        return new Totals(completed,earned,eligible,pending,holding,paid);
    }
    private BigDecimal sum(String sql,String driver,Timestamp from,Timestamp to) {
        var query=em.createNativeQuery(sql).setParameter("driver",driver);
        if(from!=null) query.setParameter("begin",from).setParameter("end",to);
        Object value=query.getSingleResult(); return value==null?BigDecimal.ZERO:(BigDecimal)value;
    }
}
