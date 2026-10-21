package com.miniongvang.service;

import com.miniongvang.dao.DesignV2AdminDAO;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.mindrot.jbcrypt.BCrypt;

/** Administrative read and write use cases for DesignV2. */
public final class DesignV2AdminService {
    public record Page(List<Map<String, Object>> items, long total) {}
    private final DesignV2AdminDAO admin;

    public DesignV2AdminService() { this(new DesignV2AdminDAO()); }
    public DesignV2AdminService(DesignV2AdminDAO admin) { this.admin = admin; }

    public Map<String, Object> createDriver(Connection c, String username, String password, String name, String phone,
            String email, String identity, String license) throws SQLException {
        validateDriverProfile(username, name, phone, identity, license);
        validatePassword(password);
        return admin.createDriver(c, username, BCrypt.hashpw(password, BCrypt.gensalt(12)), name, phone, email,
                identity, license);
    }
    public Map<String, Object> updateDriver(Connection c, String id, String name, String phone, String email,
            String identity, String license) throws SQLException {
        validateDriverProfile("valid", name, phone, identity, license);
        return admin.updateDriver(c, id, name, phone, email, identity, license);
    }
    public Map<String, Object> resetDriverPassword(Connection c, String id, String password) throws SQLException {
        validatePassword(password);
        return admin.resetDriverPassword(c, id, BCrypt.hashpw(password, BCrypt.gensalt(12)));
    }
    public Map<String, Object> changeDriverStatus(Connection c, String id, String action) throws SQLException {
        validateStatusAction(action);
        return admin.changeDriverStatus(c, id, action);
    }
    public List<Map<String, Object>> findCustomers(Connection c) throws SQLException { return admin.findCustomers(c); }
    public Map<String, Object> findCustomerDetail(Connection c, String id, String search, int page, int size) throws SQLException {
        return admin.findCustomerDetail(c, id, search, page, size);
    }
    public Map<String, Object> changeCustomerStatus(Connection c, String id, String action) throws SQLException {
        validateStatusAction(action);
        return admin.changeCustomerStatus(c, id, action);
    }
    public Map<String, Object> changeCustomerMembership(Connection c, String id, String tier) throws SQLException {
        if (!Set.of("THUONG", "BAC", "VANG", "KIM_CUONG").contains(tier))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Hạng thành viên không hợp lệ");
        return admin.changeCustomerMembership(c, id, tier);
    }
    public List<Map<String, Object>> findCustomerDirectory(Connection c) throws SQLException {
        return admin.findCustomerDirectory(c);
    }
    public Map<String, Object> findProfile(Connection c, String id) throws SQLException { return admin.findProfile(c, id); }
    public Map<String, Object> updateProfile(Connection c, String id, String name, String phone, String email)
            throws SQLException { return admin.updateProfile(c, id, name, phone, email); }
    public List<Map<String, Object>> findActiveSurcharges(Connection c) throws SQLException {
        return admin.findActiveSurcharges(c);
    }
    public List<Map<String, Object>> findStaff(Connection c) throws SQLException { return admin.findStaff(c); }
    public Map<String, Object> createStaff(Connection c, String username, String password, String name, String phone,
            String email) throws SQLException {
        validateStaffProfile(username, name, phone);
        validatePassword(password);
        return admin.createStaff(c, username, BCrypt.hashpw(password, BCrypt.gensalt(12)), name, phone, email);
    }
    public Map<String, Object> updateStaff(Connection c, String id, String name, String phone, String email)
            throws SQLException {
        validateStaffProfile("valid", name, phone);
        return admin.updateStaff(c, id, name, phone, email);
    }
    public Map<String, Object> changeStaffStatus(Connection c, String id, String action) throws SQLException {
        validateStatusAction(action);
        return admin.changeStaffStatus(c, id, action);
    }
    public Map<String, Object> resetStaffPassword(Connection c, String id, String password) throws SQLException {
        validatePassword(password);
        return admin.resetStaffPassword(c, id, BCrypt.hashpw(password, BCrypt.gensalt(12)));
    }
    public Map<String, Object> findOverview(Connection c) throws SQLException { return admin.findOverview(c); }
    public Page findIncidents(Connection c, String search, int page, int size) throws SQLException {
        DesignV2AdminDAO.Page result = admin.findIncidents(c, search, page, size);
        return new Page(result.items(), result.total());
    }

    private static void validatePassword(String password) {
        if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new DesignV2Problem(400, "VALIDATION_ERROR",
                    "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8");
    }

    private static void validateStaffProfile(String username, String name, String phone) {
        if (username == null || !username.matches("[a-z0-9._-]{3,50}") || name == null
                || name.isBlank() || name.length() > 100
                || (phone != null && !phone.isBlank() && !phone.matches("0[0-9]{9}")))
            throw new DesignV2Problem(400, "VALIDATION_ERROR",
                    "Tên đăng nhập, họ tên hoặc số điện thoại không hợp lệ");
    }

    private static void validateDriverProfile(String username, String name, String phone, String identity,
            String license) {
        if (username == null || !username.matches("[a-z0-9._-]{3,50}"))
            throw new DesignV2Problem(400, "VALIDATION_ERROR",
                    "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang (3–50 ký tự)");
        if (name == null || name.isBlank() || name.length() > 100)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Họ tên tài xế không hợp lệ");
        if (phone == null || !phone.matches("0[0-9]{9}"))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0");
        if (identity == null || !identity.matches("[0-9]{12}"))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "CCCD phải có đúng 12 chữ số");
        if (license == null || license.isBlank() || license.length() > 50)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Số giấy phép lái xe không hợp lệ");
    }

    private static void validateStatusAction(String action) {
        if (!"KHOA".equals(action) && !"MO_KHOA".equals(action))
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Hành động trạng thái không hợp lệ");
    }
}
