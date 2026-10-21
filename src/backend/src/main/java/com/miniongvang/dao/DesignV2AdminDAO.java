package com.miniongvang.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** JDBC persistence operations for DesignV2 administration and account profiles. */
public final class DesignV2AdminDAO {
    public record Page(List<Map<String, Object>> items, long total) {}

    public Map<String, Object> createDriver(Connection c, String username, String passwordHash, String name,
            String phone, String email, String identityNumber, String licenseNumber) throws SQLException {
        Map<String, Object> created = one(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,NULL,?,?,?,?,?,?,?,?",
                "TAO", username, passwordHash, name, phone, email, identityNumber, licenseNumber, null);
        return findDriver(c, String.valueOf(created.get("ma_tx")));
    }

    public Map<String, Object> updateDriver(Connection c, String id, String name, String phone, String email,
            String identityNumber, String licenseNumber) throws SQLException {
        call(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,?,?,?,?,?,?,?,?,?", "CAP_NHAT", id,
                null, null, name, phone, email, identityNumber, licenseNumber, null);
        return findDriver(c, id);
    }

    public Map<String, Object> resetDriverPassword(Connection c, String id, String passwordHash) throws SQLException {
        call(c, "EXEC dbo.usp_admin_dat_mat_khau_tai_xe ?,?", id, passwordHash);
        return findDriver(c, id);
    }

    public Map<String, Object> changeDriverStatus(Connection c, String id, String action) throws SQLException {
        call(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,?,?,?,?,?,?,?,?,?", action, id,
                null, null, null, null, null, null, null, null);
        return one(c, "SELECT x.ma_tx,k.trang_thai AS trang_thai_tai_khoan,x.trang_thai "
                + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk WHERE x.ma_tx=?", id);
    }

    public List<Map<String, Object>> findCustomers(Connection c) throws SQLException {
        return rows(c, "SELECT k.ma_kh,k.ma_tk,k.dia_chi_mac_dinh,k.ma_hang,k.thanh_vien_tu,k.thanh_vien_den,"
                + "t.username,t.ho_ten,t.so_dien_thoai,t.email,t.ngay_tao AS tham_gia_tu,t.trang_thai AS trang_thai_tai_khoan "
                + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk ORDER BY t.ho_ten");
    }

    public Map<String, Object> findCustomerDetail(Connection c, String id, String search, int page, int size) throws SQLException {
        Map<String, Object> customer = one(c, "SELECT k.ma_kh,k.ma_tk,k.dia_chi_mac_dinh,k.ma_hang,k.thanh_vien_tu,k.thanh_vien_den,"
                + "t.username,t.ho_ten,t.so_dien_thoai,t.email,t.ngay_tao AS tham_gia_tu,t.trang_thai AS trang_thai_tai_khoan,t.auth_version "
                + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk WHERE k.ma_kh=?", id);
        if (customer == null) return null;
        Map<String, Object> count = one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang WHERE ma_kh=?", id);
        customer.put("tong_don", count.get("total"));
        String pattern = "%" + (search == null ? "" : search) + "%";
        String filter = " AND (?='' OR CONVERT(NVARCHAR(36),d.ma_don) LIKE ? OR d.trang_thai LIKE ?)";
        Map<String, Object> filteredCount = one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang d WHERE d.ma_kh=?" + filter,
                id, search == null ? "" : search, pattern, pattern);
        customer.put("don_hang_total", filteredCount.get("total"));
        customer.put("don_hang", rows(c, "SELECT d.ma_don,d.tao_luc,d.trang_thai,v.tong_cuoc FROM dbo.don_hang d "
                + "JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don WHERE d.ma_kh=?" + filter + " ORDER BY d.tao_luc DESC,d.ma_don "
                + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", id, search == null ? "" : search,
                pattern, pattern, (long) page * size, size));
        customer.put("don_hang_page", page);
        customer.put("don_hang_size", size);
        return customer;
    }

    public Map<String, Object> changeCustomerStatus(Connection c, String id, String action) throws SQLException {
        call(c, "EXEC dbo.usp_admin_trang_thai_khach ?,?", id, action);
        return one(c, "SELECT k.ma_kh,t.trang_thai AS trang_thai_tai_khoan,t.auth_version "
                + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk WHERE k.ma_kh=?", id);
    }

    public Map<String, Object> changeCustomerMembership(Connection c, String id, String tier) throws SQLException {
        call(c, "EXEC dbo.usp_admin_gan_hang_khach ?,?", id, tier);
        return one(c, "SELECT ma_kh,ma_hang,thanh_vien_tu,thanh_vien_den FROM dbo.khach_hang WHERE ma_kh=?", id);
    }

    public List<Map<String, Object>> findCustomerDirectory(Connection c) throws SQLException {
        return rows(c, "SELECT k.ma_kh,t.ho_ten,t.so_dien_thoai,k.ma_hang FROM dbo.khach_hang k "
                + "JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk ORDER BY t.ho_ten");
    }

    public Map<String, Object> findProfile(Connection c, String accountId) throws SQLException {
        return one(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro FROM dbo.tai_khoan WHERE ma_tk=?", accountId);
    }

    public Map<String, Object> updateProfile(Connection c, String accountId, String name, String phone, String email)
            throws SQLException {
        call(c, "EXEC dbo.usp_cap_nhat_ho_so_tai_khoan ?,?,?", name, phone, email);
        return findProfile(c, accountId);
    }

    public List<Map<String, Object>> findActiveSurcharges(Connection c) throws SQLException {
        return rows(c, "SELECT ma_phu_thu,ma_loai,ten,so_tien,bat_buoc FROM dbo.cau_hinh_phu_thu "
                + "WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME()) ORDER BY bat_buoc DESC,ten");
    }

    public List<Map<String, Object>> findStaff(Connection c) throws SQLException {
        return rows(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro,trang_thai,ngay_tao "
                + "FROM dbo.tai_khoan WHERE vai_tro IN ('TONG_DAI','CHU_DOI_XE') ORDER BY vai_tro,ngay_tao");
    }

    public Map<String, Object> findStaffAccount(Connection c, String id) throws SQLException {
        Map<String, Object> account = one(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro,trang_thai,ngay_tao,auth_version "
                + "FROM dbo.tai_khoan WHERE ma_tk=? AND vai_tro='TONG_DAI'", id);
        return account;
    }

    public Map<String, Object> createStaff(Connection c, String username, String passwordHash, String name,
            String phone, String email) throws SQLException {
        Map<String, Object> created = one(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,NULL,?,?,?,?,?",
                "TAO", username, passwordHash, name, phone, email);
        return findStaffAccount(c, String.valueOf(created.get("ma_tk")));
    }

    public Map<String, Object> updateStaff(Connection c, String id, String name, String phone, String email)
            throws SQLException {
        call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", "CAP_NHAT", id, null, null, name, phone, email);
        return findStaffAccount(c, id);
    }

    public Map<String, Object> changeStaffStatus(Connection c, String id, String action) throws SQLException {
        call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", action, id, null, null, null, null, null);
        return findStaffAccount(c, id);
    }

    public Map<String, Object> resetStaffPassword(Connection c, String id, String passwordHash) throws SQLException {
        call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", "DAT_MAT_KHAU", id,
                null, passwordHash, null, null, null);
        return findStaffAccount(c, id);
    }

    public Map<String, Object> findOverview(Connection c) throws SQLException {
        Map<String, Object> result = one(c, "SELECT COUNT_BIG(*) tong_don, "
                + "SUM(CASE WHEN trang_thai='CHO_GAN' THEN 1 ELSE 0 END) cho_gan, "
                + "SUM(CASE WHEN trang_thai IN ('DA_GAN','DA_LAY_HANG','DANG_GIAO') THEN 1 ELSE 0 END) dang_xu_ly, "
                + "SUM(CASE WHEN trang_thai='HOAN_TAT' THEN 1 ELSE 0 END) hoan_tat, "
                + "SUM(CASE WHEN trang_thai='DA_HUY' THEN 1 ELSE 0 END) da_huy FROM dbo.don_hang");
        result.put("don_gan_day", rows(c, "SELECT TOP (5) d.ma_don,d.tao_luc,d.trang_thai,d.ten_nguoi_nhan,"
                + "v.tong_cuoc,p.ma_tx,k.ho_ten AS tai_xe FROM dbo.don_hang d "
                + "JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don "
                + "LEFT JOIN dbo.phan_cong_don_hang p ON p.ma_don=d.ma_don AND p.ket_thuc_luc IS NULL "
                + "LEFT JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx LEFT JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "ORDER BY d.tao_luc DESC,d.ma_don"));
        result.put("tai_chinh", one(c, "SELECT COALESCE(SUM(cong_ty_duoc_huong),0) cong_ty_duoc_huong,"
                + "COALESCE(SUM(da_nop),0) da_nop,COALESCE(SUM(con_phai_nop),0) con_phai_nop "
                + "FROM dbo.v_so_du_tai_xe"));
        return result;
    }

    public Page findIncidents(Connection c, String search, int page, int size) throws SQLException {
        String filter = "n.loai='SU_CO' AND (?='' OR CONVERT(NVARCHAR(36),n.ma_don) LIKE ? OR n.ghi_chu LIKE ?)";
        String pattern = "%" + (search == null ? "" : search) + "%";
        Map<String, Object> count = one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.nhat_ky_don_hang n WHERE " + filter,
                search == null ? "" : search, pattern, pattern);
        List<Map<String, Object>> items = rows(c, "SELECT n.ma_su_kien,n.ma_don,n.thoi_gian,n.ghi_chu,d.trang_thai "
                + "FROM dbo.nhat_ky_don_hang n JOIN dbo.don_hang d ON d.ma_don=n.ma_don "
                + "WHERE " + filter + " ORDER BY n.thoi_gian DESC,n.ma_su_kien DESC "
                + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", search == null ? "" : search,
                pattern, pattern, (long) page * size, size);
        return new Page(List.copyOf(items), ((Number) count.get("total")).longValue());
    }

    private Map<String, Object> findDriver(Connection c, String id) throws SQLException {
        return one(c, "SELECT x.ma_tx,x.ma_tk,k.username,k.ho_ten,k.so_dien_thoai,k.email,"
                + "k.trang_thai AS trang_thai_tai_khoan,x.cccd,x.so_giay_phep,x.ngay_het_han_gplx,x.trang_thai "
                + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk WHERE x.ma_tx=?", id);
    }

    private static Map<String, Object> one(Connection c, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? map(result) : null; }
        }
    }

    private static List<Map<String, Object>> rows(Connection c, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            bind(statement, values);
            try (ResultSet result = statement.executeQuery()) {
                List<Map<String, Object>> rows = new ArrayList<>();
                while (result.next()) rows.add(map(result));
                return rows;
            }
        }
    }

    private static void call(Connection c, String sql, Object... values) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) { bind(statement, values); statement.execute(); }
    }

    private static void bind(PreparedStatement statement, Object... values) throws SQLException {
        for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
    }

    private static Map<String, Object> map(ResultSet result) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int column = 1; column <= result.getMetaData().getColumnCount(); column++) {
            Object value = result.getObject(column);
            if (value instanceof Timestamp timestamp) value = timestamp.toInstant().toString();
            else if (value instanceof UUID id) value = id.toString();
            else if (value instanceof java.math.BigDecimal decimal) value = decimal.toPlainString();
            row.put(result.getMetaData().getColumnLabel(column), value);
        }
        return row;
    }
}
