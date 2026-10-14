package com.miniongvang.dao;

import com.miniongvang.entity.TaiXe;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** SQL Server queries for immutable cash items, COD batches and provider events. */
public final class CodSettlementDAO {
    private final EntityManager em;
    public CodSettlementDAO(EntityManager em) { this.em = em; }
    public record CashItem(String orderId,String paymentId,BigDecimal amount,String orderStatus) {}
    public record BatchData(String driverId,BigDecimal total,String status,Instant created,
                            Instant confirmed,String paymentUrl,String reference) {}

    public List<TaiXe> drivers() {
        return em.createQuery("select d from TaiXe d order by d.taiKhoan.hoTen",TaiXe.class).getResultList();
    }
    public String idempotentBatch(String actor,String key) {
        List<?> rows=em.createNativeQuery("select ma_dot from dbo.dot_nop_cod where ma_tk_dieu_phoi=:actor and khoa_idempotency=:key")
                .setParameter("actor",actor).setParameter("key",key).getResultList();
        return rows.isEmpty()?null:rows.get(0).toString();
    }
    public String pendingBatch(String driver) {
        List<?> rows=em.createNativeQuery("select top 1 ma_dot from dbo.dot_nop_cod where ma_tx=:driver and trang_thai in (N'CHO_XU_LY',N'CHUA_RO_KET_QUA') order by tao_luc desc")
                .setParameter("driver",driver).getResultList();
        return rows.isEmpty()?null:rows.get(0).toString();
    }
    public String failedBatch(String driver) {
        List<?> rows=em.createNativeQuery("select top 1 ma_dot from dbo.dot_nop_cod where ma_tx=:driver and trang_thai=N'THAT_BAI' order by tao_luc desc")
                .setParameter("driver",driver).getResultList();
        return rows.isEmpty()?null:rows.get(0).toString();
    }
    public void reopen(String id) {
        em.createNativeQuery("update dbo.dot_nop_cod set trang_thai=N'CHO_XU_LY' where ma_dot=:id")
                .setParameter("id",id).executeUpdate();
    }
    public void insertBatch(String id,String driver,String actor,String key,Instant at,BigDecimal total) {
        em.createNativeQuery("insert into dbo.dot_nop_cod (ma_dot,ma_tx,ma_tk_dieu_phoi,khoa_idempotency,tao_luc,tong_tien,trang_thai) values (:id,:driver,:actor,:key,:at,:total,N'CHO_XU_LY')")
                .setParameter("id",id).setParameter("driver",driver).setParameter("actor",actor)
                .setParameter("key",key).setParameter("at",Timestamp.from(at)).setParameter("total",total).executeUpdate();
    }
    public void insertItem(String batch,String payment,BigDecimal amount) {
        em.createNativeQuery("insert into dbo.khoan_cod_trong_dot (ma_dot,ma_giao_dich_cuoc,so_tien) values (:batch,:payment,:amount)")
                .setParameter("batch",batch).setParameter("payment",payment).setParameter("amount",amount).executeUpdate();
    }
    public void insertAttempt(String batch,String reference,String url,Instant at) {
        em.createNativeQuery("insert into dbo.lan_nop_cod (ma_lan_nop,ma_dot,ma_tham_chieu,trang_thai,payment_url,tao_luc) values (:id,:batch,:ref,N'CHO_XU_LY',:url,:at)")
                .setParameter("id",UUID.randomUUID().toString()).setParameter("batch",batch)
                .setParameter("ref",reference).setParameter("url",url).setParameter("at",Timestamp.from(at)).executeUpdate();
    }
    public String batchByReference(String reference) {
        if(reference==null) return null;
        List<?> rows=em.createNativeQuery("select ma_dot from dbo.lan_nop_cod where ma_tham_chieu=:ref")
                .setParameter("ref",reference).getResultList();
        return rows.isEmpty()?null:rows.get(0).toString();
    }
    public boolean hasEvent(String source,String hash) {
        return !em.createNativeQuery("select ma_su_kien from dbo.su_kien_nop_cod where nguon=:source and khoa_su_kien=:hash")
                .setParameter("source",source).setParameter("hash",hash).getResultList().isEmpty();
    }
    public void markOtherAttemptsForReview(String batch,String reference) {
        em.createNativeQuery("update dbo.lan_nop_cod set trang_thai=N'CAN_DOI_SOAT' where ma_dot=:batch and ma_tham_chieu<>:ref and trang_thai in (N'CHO_XU_LY',N'CHUA_RO_KET_QUA')")
                .setParameter("batch",batch).setParameter("ref",reference).executeUpdate();
    }
    public void settle(String batch,String reference,BigDecimal amount,String partner,Instant at) {
        Timestamp time=Timestamp.from(at);
        em.createNativeQuery("update dbo.lan_nop_cod set trang_thai=N'THANH_CONG',thu_luc=:at,so_tien_thuc_nhan=:amount,ma_giao_dich_doi_tac=:partner where ma_tham_chieu=:ref")
                .setParameter("at",time).setParameter("amount",amount).setParameter("partner",partner)
                .setParameter("ref",reference).executeUpdate();
        em.createNativeQuery("update dbo.dot_nop_cod set trang_thai=N'THANH_CONG',xac_nhan_luc=:at where ma_dot=:id")
                .setParameter("at",time).setParameter("id",batch).executeUpdate();
    }
    public void fail(String batch,String reference) {
        em.createNativeQuery("update dbo.lan_nop_cod set trang_thai=N'THAT_BAI' where ma_tham_chieu=:ref")
                .setParameter("ref",reference).executeUpdate();
        em.createNativeQuery("update dbo.dot_nop_cod set trang_thai=N'THAT_BAI' where ma_dot=:id")
                .setParameter("id",batch).executeUpdate();
    }
    public void event(String reference,String source,String hash,boolean signed,String result,String json,Instant at) {
        em.createNativeQuery("insert into dbo.su_kien_nop_cod (ma_su_kien,ma_lan_nop,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,nhan_luc,noi_dung_json) values (:id,(select ma_lan_nop from dbo.lan_nop_cod where ma_tham_chieu=:ref),:source,:hash,:signed,:result,:at,:json)")
                .setParameter("id",UUID.randomUUID().toString()).setParameter("ref",reference)
                .setParameter("source",source).setParameter("hash",hash).setParameter("signed",signed)
                .setParameter("result",result).setParameter("at",Timestamp.from(at)).setParameter("json",json).executeUpdate();
    }
    public BatchData batch(String id) {
        List<?> rows=em.createNativeQuery("select b.ma_tx,b.tong_tien,b.trang_thai,b.tao_luc,b.xac_nhan_luc,a.payment_url,a.ma_tham_chieu from dbo.dot_nop_cod b left join dbo.lan_nop_cod a on a.ma_dot=b.ma_dot and a.tao_luc=(select max(x.tao_luc) from dbo.lan_nop_cod x where x.ma_dot=b.ma_dot) where b.ma_dot=:id")
                .setParameter("id",id).getResultList();
        if(rows.isEmpty()) return null;
        Object[] r=(Object[])rows.get(0);
        return new BatchData(r[0].toString(),(BigDecimal)r[1],r[2].toString(),((Timestamp)r[3]).toInstant(),
                r[4]==null?null:((Timestamp)r[4]).toInstant(),r[5]==null?null:r[5].toString(),r[6]==null?null:r[6].toString());
    }
    public List<CashItem> batchItems(String id) {
        List<CashItem> items=new ArrayList<>();
        for(Object row:em.createNativeQuery("select p.ma_don,i.ma_giao_dich_cuoc,i.so_tien,d.trang_thai from dbo.khoan_cod_trong_dot i join dbo.thanh_toan p on p.ma_giao_dich=i.ma_giao_dich_cuoc join dbo.don_hang d on d.ma_don=p.ma_don where i.ma_dot=:id")
                .setParameter("id",id).getResultList()) {
            Object[] v=(Object[])row; items.add(new CashItem(v[0].toString(),v[1].toString(),(BigDecimal)v[2],v[3].toString()));
        }
        return items;
    }
    public List<CashItem> cashItems(String driver,boolean completedOnly) {
        String sql="select p.ma_don,p.ma_giao_dich,p.so_tien_thuc_nhan,d.trang_thai from dbo.thanh_toan p join dbo.xac_nhan_thanh_toan_don_hang x on x.ma_giao_dich=p.ma_giao_dich join dbo.don_hang d on d.ma_don=p.ma_don join dbo.phan_cong_don_hang a on a.ma_don=p.ma_don and a.ma_tx=:driver and (a.ket_qua_ket_thuc=N'HOAN_TAT' or a.ket_thuc_luc is null) where p.phuong_thuc=N'TIEN_MAT' and p.trang_thai=N'THANH_CONG' and p.ma_tk_xac_nhan=(select ma_tk from dbo.tai_xe where ma_tx=:driver) and not exists (select 1 from dbo.khoan_cod_trong_dot i join dbo.dot_nop_cod b on b.ma_dot=i.ma_dot where i.ma_giao_dich_cuoc=p.ma_giao_dich and b.trang_thai=N'THANH_CONG')";
        if(completedOnly) sql+=" and d.trang_thai=N'HOAN_TAT' and a.ket_qua_ket_thuc=N'HOAN_TAT'";
        List<CashItem> items=new ArrayList<>();
        for(Object row:em.createNativeQuery(sql).setParameter("driver",driver).getResultList()) {
            Object[] v=(Object[])row; items.add(new CashItem(v[0].toString(),v[1].toString(),(BigDecimal)v[2],v[3].toString()));
        }
        return items;
    }
    public boolean batched(String payment) {
        return !em.createNativeQuery("select ma_dot from dbo.khoan_cod_trong_dot where ma_giao_dich_cuoc=:payment")
                .setParameter("payment",payment).getResultList().isEmpty();
    }
    public String batchDriver(String id) {
        return em.createNativeQuery("select ma_tx from dbo.dot_nop_cod where ma_dot=:id")
                .setParameter("id",id).getSingleResult().toString();
    }
    public String plate(String driver) {
        List<?> rows=em.createNativeQuery("select top 1 bien_so_xe from dbo.phuong_tien where ma_tx=:driver")
                .setParameter("driver",driver).getResultList();
        return rows.isEmpty()?"":rows.get(0).toString();
    }
}
