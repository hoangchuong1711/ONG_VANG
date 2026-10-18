package com.miniongvang.service;

import com.miniongvang.dao.DesignV2AccountDAO;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import org.mindrot.jbcrypt.BCrypt;

/** Account use cases backed by the DesignV2 account repository. */
public final class DesignV2AccountService {
    private final DesignV2AccountDAO accounts;

    public DesignV2AccountService() { this(new DesignV2AccountDAO()); }
    public DesignV2AccountService(DesignV2AccountDAO accounts) { this.accounts = accounts; }

    public Map<String, Object> findActiveAccount(Connection c, String id) throws SQLException {
        return accounts.findActiveAccount(c, id);
    }
    public Map<String, Object> authenticate(Connection c, String username, String password) throws SQLException {
        Map<String, Object> account = accounts.findLoginAccount(c, username);
        if (account == null || !BCrypt.checkpw(password, account.get("mat_khau_hash").toString()))
            throw new DesignV2Problem(401, "INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu");
        if (!"HOAT_DONG".equals(account.get("trang_thai")))
            throw new DesignV2Problem(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
        return account;
    }
    public String registerCustomer(Connection c, String username, String password, String name, String phone,
                                   String email) throws SQLException {
        if (!username.equals(phone) || !phone.matches("0[0-9]{9}") || name.length() > 100)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Thông tin đăng ký không hợp lệ");
        if (password.length() < 8)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Mật khẩu quá ngắn");
        return accounts.registerCustomer(c, username, BCrypt.hashpw(password, BCrypt.gensalt(12)), name, phone, email);
    }

    public void changePassword(Connection c, String accountId, String current, String replacement, long version)
            throws SQLException {
        if (replacement.length() < 8 || replacement.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new DesignV2Problem(400, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8");
        String passwordHash = accounts.findPasswordHash(c, accountId);
        if (passwordHash == null || !BCrypt.checkpw(current, passwordHash))
            throw new DesignV2Problem(403, "INVALID_CREDENTIALS", "Mật khẩu cũ không đúng");
        accounts.changePassword(c, BCrypt.hashpw(replacement, BCrypt.gensalt(12)), version);
    }
    public void setActorContext(Connection c, String id) throws SQLException { accounts.setActorContext(c, id); }
}
