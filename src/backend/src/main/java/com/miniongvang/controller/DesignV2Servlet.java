package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.dto.route.RouteDtos.Route;
import com.miniongvang.integration.VnpayGateway;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.integration.GoongRouteProvider;
import com.miniongvang.security.AuthSession;
import com.miniongvang.service.RouteService;
import com.miniongvang.service.DesignV2FinanceReportService;
import com.miniongvang.service.DesignV2FinanceExcelExporter;
import com.miniongvang.web.JsonRequests;
import com.miniongvang.web.WebResponses;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.mindrot.jbcrypt.BCrypt;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.Comparator;
import java.util.concurrent.ConcurrentHashMap;
import java.math.RoundingMode;

/** DesignV2 HTTP boundary. Each business write calls the corresponding SQL procedure. */
@WebServlet("/api/v2/*")
public final class DesignV2Servlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ConcurrentHashMap<String, ArrayDeque<Long>> AUTH_ATTEMPTS = new ConcurrentHashMap<>();

    private record Actor(String id, String role, long version, String name) {}
    private record HttpError(int status, String code, String message) {}
    private static final class Rejected extends RuntimeException {
        final HttpError error;
        Rejected(int status, String code, String message) { super(message); error = new HttpError(status, code, message); }
    }
    private PersistenceContext db() {
        return (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
    }

    @Override protected void service(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        String path = req.getPathInfo() == null ? "/" : req.getPathInfo();
        try {
            if ("GET".equals(req.getMethod()) && path.equals("/auth/csrf")) {
                WebResponses.json(resp, 200, Map.of("token", AuthSession.csrfToken(req.getSession()), "header", AuthSession.CSRF_HEADER));
                return;
            }
            if (path.equals("/payments/vnpay/ipn") && "GET".equals(req.getMethod())) {
                vnpayIpn(req, resp); return;
            }
            if (path.equals("/payments/vnpay/return") && "GET".equals(req.getMethod())) {
                resp.sendRedirect(System.getenv().getOrDefault("DRIVER_RETURN_URL", "http://localhost:3001/driver/wallet")); return;
            }
            try (Connection connection = db().dataSource().getConnection()) {
                if (path.equals("/auth/login") && "POST".equals(req.getMethod())) {
                    csrf(req); login(connection, req, resp); return;
                }
                if (path.equals("/auth/register") && "POST".equals(req.getMethod())) {
                    csrf(req); register(connection, req, resp); return;
                }
                Actor actor = actor(connection, req);
                if (path.equals("/auth/me") && "GET".equals(req.getMethod())) {
                    WebResponses.json(resp, 200, Map.of("maNguoiDung", actor.id, "vaiTro", actor.role,
                            "hoTen", actor.name)); return;
                }
                if (path.equals("/auth/logout") && "POST".equals(req.getMethod())) {
                    csrf(req); AuthSession.end(req, resp, req.getSession(false)); resp.setStatus(204); return;
                }
                if (path.equals("/auth/change-password") && "POST".equals(req.getMethod())) {
                    csrf(req); setActor(connection, actor.id);
                    try { changePassword(connection, req, resp, actor); }
                    finally { setActor(connection, null); }
                    return;
                }
                if (!"GET".equals(req.getMethod())) csrf(req);
                setActor(connection, actor.id);
                try {
                    route(connection, req, resp, path, actor);
                } finally { setActor(connection, null); }
            }
        } catch (Rejected failure) {
            WebResponses.error(resp, failure.error.status, failure.error.code, failure.error.message);
        } catch (SQLException failure) {
            getServletContext().log("designV2 SQL error", failure);
            if (failure.getErrorCode() == 51112) {
                WebResponses.error(resp, 409, "QUOTE_CHANGED", "Giá đã thay đổi; vui lòng xem cước và xác nhận lại");
                return;
            }
            if (failure.getErrorCode() == 52303) {
                WebResponses.error(resp, 404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn được phép xem");
                return;
            }
            if (failure.getErrorCode() == 2601 || failure.getErrorCode() == 2627) {
                WebResponses.error(resp, 409, "ALREADY_EXISTS", "Dữ liệu đã tồn tại");
                return;
            }
            String code = failure.getErrorCode() >= 51000 && failure.getErrorCode() < 53000
                    ? "BUSINESS_RULE" : "DATABASE_ERROR";
            WebResponses.error(resp, code.equals("BUSINESS_RULE") ? 409 : 500, code,
                    code.equals("BUSINESS_RULE") ? failure.getMessage() : "Lỗi truy cập dữ liệu");
        } catch (IllegalArgumentException failure) {
            WebResponses.error(resp, 400, "VALIDATION_ERROR", failure.getMessage());
        } catch (RouteFailure failure) {
            WebResponses.error(resp, 503, failure.kind().name(), "Không thể tính tuyến đường lúc này");
        } catch (Exception failure) {
            getServletContext().log("designV2 request failed", failure);
            WebResponses.error(resp, 500, "INTERNAL_ERROR");
        }
    }

    private static void csrf(HttpServletRequest req) {
        if (!AuthSession.hasValidCsrf(req, req.getSession(false)))
            throw new Rejected(403, "CSRF_INVALID", "Phiên bảo vệ không hợp lệ");
    }

    private static Actor actor(Connection connection, HttpServletRequest req) throws SQLException {
        HttpSession session = req.getSession(false);
        String id = AuthSession.userId(session);
        if (id == null) throw new Rejected(401, AuthSession.missingSessionCode(req), "Cần đăng nhập");
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ho_ten,vai_tro,auth_version FROM dbo.tai_khoan WHERE ma_tk=? AND trang_thai='HOAT_DONG'")) {
            statement.setString(1, id);
            try (ResultSet row = statement.executeQuery()) {
                if (!row.next() || AuthSession.version(session) == null || row.getLong(3) != AuthSession.version(session)) {
                    session.invalidate(); throw new Rejected(401, "SESSION_EXPIRED", "Phiên đã hết hiệu lực");
                }
                return new Actor(id, row.getString(2), row.getLong(3), row.getString(1));
            }
        }
    }

    private static void require(Actor actor, String... roles) {
        for (String role : roles) if (role.equals(actor.role)) return;
        throw new Rejected(403, "FORBIDDEN", "Không có quyền thực hiện");
    }

    private static void setActor(Connection connection, String actor) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "EXEC sys.sp_set_session_context @key=N'ma_tk', @value=?")) {
            statement.setString(1, actor);
            statement.execute();
        }
    }

    private static JsonNode body(HttpServletRequest req) throws IOException {
        try { return JsonRequests.object(req); }
        catch (JsonRequests.InvalidJson invalid) {
            throw new Rejected(400, "JSON_INVALID", "Dữ liệu JSON không hợp lệ");
        }
    }
    private static String field(JsonNode node, String key) {
        JsonNode value = node.path(key);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }
    private static String required(JsonNode node, String key) {
        String value = field(node, key);
        if (value == null || value.isBlank()) throw new Rejected(400, "VALIDATION_ERROR", "Thiếu " + key);
        return value.strip();
    }
    private static String requiredHeader(HttpServletRequest req, String key) {
        String value = req.getHeader(key);
        if (value == null || value.isBlank() || value.length() > 100)
            throw new Rejected(400, "VALIDATION_ERROR", "Thiếu " + key);
        return value;
    }

    private static void login(Connection connection, HttpServletRequest req, HttpServletResponse resp) throws Exception {
        JsonNode data = body(req);
        String username = required(data, "username");
        String password = required(data, "password");
        String rateKey = "login:" + username + ":" + req.getRemoteAddr();
        limit(rateKey, 10);
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ma_tk,mat_khau_hash,ho_ten,vai_tro,auth_version,trang_thai FROM dbo.tai_khoan WHERE username=?")) {
            statement.setString(1, username);
            try (ResultSet row = statement.executeQuery()) {
                if (!row.next() || !BCrypt.checkpw(password, row.getString(2))) {
                    failed(rateKey);
                    throw new Rejected(401, "INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu");
                }
                if (!"HOAT_DONG".equals(row.getString(6)))
                    throw new Rejected(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
                String id = row.getString(1);
                AuthSession.start(req, id, row.getLong(5));
                AUTH_ATTEMPTS.remove(rateKey);
                WebResponses.json(resp, 200, Map.of("maNguoiDung", id, "hoTen", row.getString(3), "vaiTro", row.getString(4)));
            }
        }
    }

    private static void register(Connection connection, HttpServletRequest req, HttpServletResponse resp) throws Exception {
        JsonNode data = body(req);
        String username = required(data, "username"), password = required(data, "password"), name = required(data, "hoTen");
        String phone = required(data, "soDienThoai");
        String rateKey = "register:" + username + ":" + req.getRemoteAddr();
        limit(rateKey, 5); failed(rateKey);
        if (!username.equals(phone) || !phone.matches("0[0-9]{9}") || name.length() > 100)
            throw new Rejected(400, "VALIDATION_ERROR", "Thông tin đăng ký không hợp lệ");
        if (password.length() < 8) throw new Rejected(400, "VALIDATION_ERROR", "Mật khẩu quá ngắn");
        try (PreparedStatement statement = connection.prepareStatement("EXEC dbo.usp_dang_ky_khach ?,?,?,?,?")) {
            statement.setString(1, username); statement.setString(2, BCrypt.hashpw(password, BCrypt.gensalt(12)));
            statement.setString(3, name); statement.setString(4, phone);
            statement.setString(5, field(data, "email"));
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) throw new SQLException("Registration returned no account");
                WebResponses.json(resp, 201, Map.of("maNguoiDung", rows.getString(1)));
            }
        }
    }

    private static void limit(String key, int max) {
        ArrayDeque<Long> attempts = AUTH_ATTEMPTS.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            long threshold = System.currentTimeMillis() - 5 * 60_000L;
            while (!attempts.isEmpty() && attempts.peekFirst() < threshold) attempts.removeFirst();
            if (attempts.size() >= max) throw new Rejected(429, "TOO_MANY_REQUESTS", "Thử lại sau vài phút");
        }
    }

    private static void failed(String key) {
        ArrayDeque<Long> attempts = AUTH_ATTEMPTS.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) { attempts.addLast(System.currentTimeMillis()); }
    }

    private static void changePassword(Connection connection, HttpServletRequest req, HttpServletResponse resp, Actor actor) throws Exception {
        JsonNode data = body(req);
        String current = required(data, "matKhauCu"), replacement = required(data, "matKhauMoi");
        validatePassword(replacement);
        Map<String,Object> account = one(connection, "SELECT mat_khau_hash FROM dbo.tai_khoan WHERE ma_tk=?", actor.id);
        if (account == null || !BCrypt.checkpw(current, account.get("mat_khau_hash").toString()))
            throw new Rejected(403, "INVALID_CREDENTIALS", "Mật khẩu cũ không đúng");
        call(connection, "EXEC dbo.usp_doi_mat_khau_tai_khoan ?,?",
                BCrypt.hashpw(replacement, BCrypt.gensalt(12)), actor.version);
        AuthSession.end(req, resp, req.getSession(false));
        resp.setStatus(204);
    }

    private static void validatePassword(String password) {
        if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new Rejected(400, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8");
    }

    private static void validateStaffProfile(String username, String name, String phone) {
        if (username == null || !username.matches("[a-z0-9._-]{3,50}") || name == null
                || name.isBlank() || name.length() > 100
                || (phone != null && !phone.isBlank() && !phone.matches("0[0-9]{9}")))
            throw new Rejected(400, "VALIDATION_ERROR", "Tên đăng nhập, họ tên hoặc số điện thoại không hợp lệ");
    }

    private static Map<String,Object> staffAccount(Connection c, Object id) throws SQLException {
        Map<String,Object> account = one(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro,trang_thai,ngay_tao,auth_version "
                + "FROM dbo.tai_khoan WHERE ma_tk=? AND vai_tro='TONG_DAI'", id);
        if (account == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài khoản tổng đài");
        return account;
    }

    private static List<Map<String,Object>> policyRows(Connection c) throws SQLException {
        return rows(c, "SELECT 'CUOC' loai,ma_bieu_phi ma,'CUOC' nhom,ten,hieu_luc_tu,hieu_luc_den,trang_thai,"
                + "cuoc_co_ban,don_gia_km,km_toi_thieu,km_toi_da,kg_bao_gom,kg_toi_da,don_gia_kg,"
                + "CAST(NULL AS DECIMAL(5,2)) ty_le_giam,CAST(NULL AS VARCHAR(30)) ma_loai,"
                + "CAST(NULL AS DECIMAL(15,0)) so_tien,CAST(NULL AS BIT) bat_buoc FROM dbo.cau_hinh_cuoc "
                + "UNION ALL SELECT 'THANH_VIEN',ma_chinh_sach,ma_hang,NULL,hieu_luc_tu,hieu_luc_den,trang_thai,"
                + "NULL,NULL,NULL,NULL,NULL,NULL,NULL,ty_le_giam,NULL,NULL,NULL FROM dbo.chinh_sach_thanh_vien "
                + "UNION ALL SELECT 'PHU_THU',ma_phu_thu,ma_loai,ten,hieu_luc_tu,hieu_luc_den,trang_thai,"
                + "NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,ma_loai,so_tien,bat_buoc FROM dbo.cau_hinh_phu_thu "
                + "ORDER BY loai,hieu_luc_tu DESC");
    }

    private void route(Connection c, HttpServletRequest req, HttpServletResponse resp, String path, Actor actor) throws Exception {
        String method = req.getMethod();
        if (path.equals("/admin/drivers") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT x.ma_tx,x.ma_tk,k.username,k.ho_ten,k.so_dien_thoai,k.email,"
                    + "k.trang_thai AS trang_thai_tai_khoan,k.auth_version,x.cccd,x.so_giay_phep,x.ngay_het_han_gplx,"
                    + "x.trang_thai,x.ranh_tu,p.bien_so,p.loai_xe,p.mau_xe,p.dang_hoat_dong AS xe_hoat_dong,"
                    + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang a WHERE a.ma_tx=x.ma_tx AND a.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                    + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=x.ma_tx ORDER BY k.ho_ten"))); return;
        }
        if (path.equals("/admin/drivers") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            String username = required(data, "username").toLowerCase(java.util.Locale.ROOT);
            String password = required(data, "matKhau");
            String name = required(data, "hoTen"), phone = required(data, "soDienThoai");
            String email = optionalEmail(field(data, "email"));
            String cccd = required(data, "cccd"), license = required(data, "soGiayPhep");
            LocalDate expiry = LocalDate.parse(required(data, "ngayHetHanGPLX"));
            validateDriverProfile(username, name, phone, cccd, license, expiry);
            if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72)
                throw new Rejected(400, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8");
            String hash = BCrypt.hashpw(password, BCrypt.gensalt(12));
            Map<String,Object> created = one(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,NULL,?,?,?,?,?,?,?,?",
                    "TAO", username, hash, name, phone, email, cccd, license, java.sql.Date.valueOf(expiry));
            WebResponses.json(resp, 201, one(c, "SELECT x.ma_tx,x.ma_tk,k.username,k.ho_ten,k.so_dien_thoai,k.email,"
                    + "k.trang_thai AS trang_thai_tai_khoan,x.cccd,x.so_giay_phep,x.ngay_het_han_gplx,x.trang_thai "
                    + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk WHERE x.ma_tx=?", created.get("ma_tx"))); return;
        }
        if (path.matches("/admin/drivers/[0-9a-fA-F-]{36}") && method.equals("PATCH")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.substring("/admin/drivers/".length())).toString();
            JsonNode data = body(req);
            String name = required(data, "hoTen"), phone = required(data, "soDienThoai");
            String email = optionalEmail(field(data, "email")), cccd = required(data, "cccd");
            String license = required(data, "soGiayPhep");
            LocalDate expiry = LocalDate.parse(required(data, "ngayHetHanGPLX"));
            validateDriverProfile("valid", name, phone, cccd, license, expiry);
            one(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,?,?,?,?,?,?,?,?,?", "CAP_NHAT", id,
                    null, null, name, phone, email, cccd, license, java.sql.Date.valueOf(expiry));
            WebResponses.json(resp, 200, one(c, "SELECT x.ma_tx,x.ma_tk,k.username,k.ho_ten,k.so_dien_thoai,k.email,"
                    + "k.trang_thai AS trang_thai_tai_khoan,x.cccd,x.so_giay_phep,x.ngay_het_han_gplx,x.trang_thai "
                    + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk WHERE x.ma_tx=?", id)); return;
        }
        if (path.matches("/admin/drivers/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            if (!Set.of("KHOA", "MO_KHOA").contains(action))
                throw new Rejected(400, "VALIDATION_ERROR", "Hành động trạng thái không hợp lệ");
            one(c, "EXEC dbo.usp_admin_quan_ly_tai_xe ?,?,?,?,?,?,?,?,?,?", action, id,
                    null, null, null, null, null, null, null, null);
            WebResponses.json(resp, 200, one(c, "SELECT x.ma_tx,k.trang_thai AS trang_thai_tai_khoan,x.trang_thai "
                    + "FROM dbo.tai_xe x JOIN dbo.tai_khoan k ON k.ma_tk=x.ma_tk WHERE x.ma_tx=?", id)); return;
        }
        if (path.equals("/admin/customers") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT k.ma_kh,k.ma_tk,k.dia_chi_mac_dinh,k.ma_hang,k.thanh_vien_tu,k.thanh_vien_den,"
                    + "t.username,t.ho_ten,t.so_dien_thoai,t.email,t.trang_thai AS trang_thai_tai_khoan "
                    + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk ORDER BY t.ho_ten"))); return;
        }
        if (path.matches("/admin/customers/[0-9a-fA-F-]{36}") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.substring("/admin/customers/".length())).toString();
            int page, size;
            try {
                page = req.getParameter("page") == null ? 0 : Integer.parseInt(req.getParameter("page"));
                size = req.getParameter("size") == null ? 20 : Integer.parseInt(req.getParameter("size"));
            } catch (NumberFormatException invalid) {
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang đơn khách hàng");
            }
            if (page < 0 || page > 1_000_000 || size < 1 || size > 100)
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang đơn khách hàng");
            Map<String,Object> customer = one(c, "SELECT k.ma_kh,k.ma_tk,k.dia_chi_mac_dinh,k.ma_hang,k.thanh_vien_tu,k.thanh_vien_den,"
                    + "t.username,t.ho_ten,t.so_dien_thoai,t.email,t.trang_thai AS trang_thai_tai_khoan,t.auth_version "
                    + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk WHERE k.ma_kh=?", id);
            if (customer == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy khách hàng");
            customer.put("tong_don", one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang WHERE ma_kh=?", id).get("total"));
            customer.put("don_hang", rows(c, "SELECT d.ma_don,d.tao_luc,d.trang_thai,v.tong_cuoc FROM dbo.don_hang d "
                    + "JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don WHERE d.ma_kh=? ORDER BY d.tao_luc DESC,d.ma_don "
                    + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", id, (long) page * size, size));
            customer.put("don_hang_page", page); customer.put("don_hang_size", size);
            WebResponses.json(resp, 200, customer); return;
        }
        if (path.matches("/admin/customers/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            if (!Set.of("KHOA", "MO_KHOA").contains(action))
                throw new Rejected(400, "VALIDATION_ERROR", "Hành động trạng thái không hợp lệ");
            call(c, "EXEC dbo.usp_admin_trang_thai_khach ?,?", id, action);
            WebResponses.json(resp, 200, one(c, "SELECT k.ma_kh,t.trang_thai AS trang_thai_tai_khoan,t.auth_version "
                    + "FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk WHERE k.ma_kh=?", id)); return;
        }
        if (path.equals("/customers") && method.equals("GET")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT k.ma_kh,t.ho_ten,t.so_dien_thoai,k.ma_hang FROM dbo.khach_hang k JOIN dbo.tai_khoan t ON t.ma_tk=k.ma_tk ORDER BY t.ho_ten"))); return;
        }
        if (path.equals("/profile") && method.equals("GET")) {
            WebResponses.json(resp, 200, one(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro "
                    + "FROM dbo.tai_khoan WHERE ma_tk=?", actor.id)); return;
        }
        if (path.equals("/profile") && method.equals("POST")) {
            JsonNode data = body(req);
            String name = required(data, "hoTen");
            if (name.length() > 100) throw new Rejected(400, "VALIDATION_ERROR", "Tên quá dài");
            String phone = field(data, "soDienThoai"), email = field(data, "email");
            if (phone != null && phone.isBlank()) phone = null;
            if (email != null && email.isBlank()) email = null;
            if (phone != null && !phone.matches("0[0-9]{9}"))
                throw new Rejected(400, "VALIDATION_ERROR", "Số điện thoại không hợp lệ");
            if (email != null && (email.length() > 150 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")))
                throw new Rejected(400, "VALIDATION_ERROR", "Email không hợp lệ");
            call(c, "EXEC dbo.usp_cap_nhat_ho_so_tai_khoan ?,?,?", name, phone, email);
            WebResponses.json(resp, 200, one(c, "SELECT ma_tk,username,ho_ten,so_dien_thoai,email,vai_tro "
                    + "FROM dbo.tai_khoan WHERE ma_tk=?", actor.id)); return;
        }
        if (path.equals("/surcharges") && method.equals("GET")) {
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT ma_phu_thu,ma_loai,ten,so_tien,bat_buoc "
                    + "FROM dbo.cau_hinh_phu_thu WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                    + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME()) ORDER BY bat_buoc DESC,ten"))); return;
        }
        if (path.equals("/drivers") && method.equals("GET")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT t.ma_tx,k.ho_ten,k.so_dien_thoai,t.trang_thai,t.ranh_tu,t.vi_tri_demo_dia_chi,t.vi_tri_demo_nguon,p.bien_so,p.loai_xe, "
                    + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang pc WHERE pc.ma_tx=t.ma_tx AND pc.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                    + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx ORDER BY k.ho_ten"))); return;
        }
        if (path.equals("/drivers/me") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, one(c, "SELECT t.ma_tx,k.ho_ten,k.so_dien_thoai,t.trang_thai,t.ranh_tu,t.vi_tri_demo_dia_chi,t.vi_tri_demo_nguon,p.bien_so,p.loai_xe, "
                    + "CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang pc WHERE pc.ma_tx=t.ma_tx AND pc.ket_thuc_luc IS NULL) THEN 1 ELSE 0 END AS bit) dang_ban_chuyen "
                    + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN dbo.phuong_tien p ON p.ma_tx=t.ma_tx WHERE t.ma_tk=?", actor.id)); return;
        }
        if (path.equals("/drivers/me/availability") && method.equals("POST")) {
            require(actor, "TAI_XE");
            boolean online = body(req).path("online").asBoolean(false);
            changeAvailability(c, actor, online);
            WebResponses.json(resp, 200, one(c, "SELECT t.ma_tx,k.ho_ten,t.trang_thai,t.ranh_tu "
                    + "FROM dbo.tai_xe t JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk WHERE t.ma_tk=?", actor.id)); return;
        }
        if (path.equals("/fare/quote") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, quote(c, body(req), actor)); return;
        }
        if (path.equals("/orders") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 201, createOrder(c, body(req), actor, req)); return;
        }
        if (path.equals("/orders") && method.equals("GET")) {
            int page, size;
            try {
                page = req.getParameter("page") == null ? 0 : Integer.parseInt(req.getParameter("page"));
                size = req.getParameter("size") == null ? 100 : Integer.parseInt(req.getParameter("size"));
            } catch (NumberFormatException invalid) {
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang");
            }
            if (page < 0 || size < 1 || size > 100)
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang");
            List<Map<String,Object>> items = orderRows(c, actor, page, size);
            List<Map<String,Object>> first = items.isEmpty() && page > 0 ? orderRows(c, actor, 0, 1) : items;
            WebResponses.json(resp, 200, Map.of("items", items, "total", first.isEmpty() ? 0 : first.get(0).get("total")));
            return;
        }
        if (path.equals("/admin/orders") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            int page, size;
            try {
                page = req.getParameter("page") == null ? 0 : Integer.parseInt(req.getParameter("page"));
                size = req.getParameter("size") == null ? 20 : Integer.parseInt(req.getParameter("size"));
            } catch (NumberFormatException invalid) {
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang");
            }
            if (page < 0 || page > 1_000_000 || size < 1 || size > 100)
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang");
            String status = req.getParameter("status");
            if (status != null && !Set.of("CHO_GAN", "DA_GAN", "DA_LAY_HANG", "DANG_GIAO", "HOAN_TAT", "DA_HUY").contains(status))
                throw new Rejected(400, "VALIDATION_ERROR", "Trạng thái đơn không hợp lệ");
            String where = status == null ? "" : " WHERE d.trang_thai=?";
            Map<String,Object> count = one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.don_hang d" + where,
                    status == null ? new Object[]{} : new Object[]{status});
            List<Map<String,Object>> items = status == null
                    ? rows(c, "SELECT d.*,v.tong_cuoc FROM dbo.don_hang d JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don "
                            + "ORDER BY d.tao_luc DESC,d.ma_don OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", (long) page * size, size)
                    : rows(c, "SELECT d.*,v.tong_cuoc FROM dbo.don_hang d JOIN dbo.v_cuoc_don v ON v.ma_don=d.ma_don "
                            + where + " ORDER BY d.tao_luc DESC,d.ma_don OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                            status, (long) page * size, size);
            for (Map<String,Object> item : items) addAssignment(c, item);
            WebResponses.json(resp, 200, Map.of("items", items, "total", count.get("total"), "page", page, "size", size));
            return;
        }
        if (path.equals("/admin/overview") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            Map<String,Object> result = one(c, "SELECT COUNT_BIG(*) tong_don, "
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
            WebResponses.json(resp, 200, result); return;
        }
        if (path.equals("/admin/incidents") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            int page, size;
            try {
                page = req.getParameter("page") == null ? 0 : Integer.parseInt(req.getParameter("page"));
                size = req.getParameter("size") == null ? 20 : Integer.parseInt(req.getParameter("size"));
            } catch (NumberFormatException invalid) {
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang sự cố");
            }
            if (page < 0 || page > 1_000_000 || size < 1 || size > 100)
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang sự cố");
            Map<String,Object> count = one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.nhat_ky_don_hang WHERE loai='SU_CO'");
            List<Map<String,Object>> items = rows(c, "SELECT n.ma_su_kien,n.ma_don,n.thoi_gian,n.ghi_chu,"
                    + "d.trang_thai FROM dbo.nhat_ky_don_hang n JOIN dbo.don_hang d ON d.ma_don=n.ma_don "
                    + "WHERE n.loai='SU_CO' ORDER BY n.thoi_gian DESC,n.ma_su_kien DESC "
                    + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", (long) page * size, size);
            WebResponses.json(resp, 200, Map.of("items", items, "total", count.get("total"), "page", page, "size", size)); return;
        }
        if (path.equals("/admin/payments") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            int page, size;
            try {
                page = req.getParameter("page") == null ? 0 : Integer.parseInt(req.getParameter("page"));
                size = req.getParameter("size") == null ? 20 : Integer.parseInt(req.getParameter("size"));
            } catch (NumberFormatException invalid) {
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang giao dịch");
            }
            if (page < 0 || page > 1_000_000 || size < 1 || size > 100)
                throw new Rejected(400, "VALIDATION_ERROR", "Sai phân trang giao dịch");
            String status = req.getParameter("status");
            if (status != null && !Set.of("CHO_XU_LY", "CHUA_RO_KET_QUA", "THANH_CONG", "KHONG_THU", "CAN_DOI_SOAT").contains(status))
                throw new Rejected(400, "VALIDATION_ERROR", "Trạng thái giao dịch không hợp lệ");
            String reconciliation = "EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan x WHERE x.ma_giao_dich=g.ma_giao_dich "
                    + "AND x.ket_qua IN ('CAN_DOI_SOAT','KHONG_KHOP'))";
            String filter = status == null ? "" : status.equals("CAN_DOI_SOAT")
                    ? " WHERE " + reconciliation : " WHERE g.trang_thai=?";
            Map<String,Object> result = report(c);
            Map<String,Object> count = status == null || status.equals("CAN_DOI_SOAT")
                    ? one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.giao_dich_nop_tien g" + filter)
                    : one(c, "SELECT COUNT_BIG(*) AS total FROM dbo.giao_dich_nop_tien g" + filter, status);
            result.put("giao_dich_total", count.get("total"));
            result.put("giao_dich_page", page);
            result.put("giao_dich_size", size);
            String sql = "SELECT g.ma_giao_dich,g.ma_tx,k.ho_ten,g.ma_tham_chieu,"
                    + "g.trang_thai,g.so_tien_yeu_cau,g.so_tien_thuc_nhan,g.tao_luc,g.giai_quyet_luc,"
                    + "g.so_don_dang_lien_ket,g.tong_khoan_lien_ket,e.nguon AS nguon_xac_minh,"
                    + "e.ket_qua AS ket_qua_xac_minh,e.nhan_luc AS xac_minh_luc,"
                    + "CAST(CASE WHEN " + reconciliation + " THEN 1 ELSE 0 END AS bit) can_doi_soat "
                    + "FROM dbo.v_giao_dich_nop g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                    + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk OUTER APPLY "
                    + "(SELECT TOP (1) nguon,ket_qua,nhan_luc FROM dbo.su_kien_thanh_toan x "
                    + "WHERE x.ma_giao_dich=g.ma_giao_dich ORDER BY x.nhan_luc DESC,x.ma_su_kien DESC) e "
                    + filter + " ORDER BY g.tao_luc DESC,g.ma_giao_dich DESC "
                    + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
            result.put("giao_dich", status == null || status.equals("CAN_DOI_SOAT")
                    ? rows(c, sql, (long) page * size, size)
                    : rows(c, sql, status, (long) page * size, size));
            WebResponses.json(resp, 200, result); return;
        }
        if (path.matches("/admin/payments/[0-9a-fA-F-]{36}/events") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            String paymentId = path.split("/")[3];
            if (one(c, "SELECT ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=?", paymentId) == null)
                throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy giao dịch");
            WebResponses.json(resp, 200, Map.of("items", rows(c,
                    "SELECT ma_su_kien,nguon,chu_ky_hop_le,ket_qua,nhan_luc "
                            + "FROM dbo.su_kien_thanh_toan WHERE ma_giao_dich=? "
                            + "ORDER BY nhan_luc DESC,ma_su_kien DESC", paymentId)));
            return;
        }
        if (path.equals("/admin/staff") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT ma_tk,username,ho_ten,"
                    + "so_dien_thoai,vai_tro,trang_thai,ngay_tao FROM dbo.tai_khoan "
                    + "WHERE vai_tro IN ('TONG_DAI','CHU_DOI_XE') ORDER BY vai_tro,ngay_tao"))); return;
        }
        if (path.equals("/admin/staff") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            String username = required(data, "username").toLowerCase(java.util.Locale.ROOT);
            String password = required(data, "matKhau");
            String name = required(data, "hoTen"), phone = field(data, "soDienThoai");
            if (phone != null && phone.isBlank()) phone = null;
            String email = optionalEmail(field(data, "email"));
            validateStaffProfile(username, name, phone);
            validatePassword(password);
            Map<String,Object> created = one(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,NULL,?,?,?,?,?",
                    "TAO", username, BCrypt.hashpw(password, BCrypt.gensalt(12)), name, phone, email);
            WebResponses.json(resp, 201, staffAccount(c, created.get("ma_tk"))); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}") && method.equals("PATCH")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.substring("/admin/staff/".length())).toString();
            JsonNode data = body(req);
            String name = required(data, "hoTen"), phone = field(data, "soDienThoai");
            if (phone != null && phone.isBlank()) phone = null;
            String email = optionalEmail(field(data, "email"));
            validateStaffProfile("valid", name, phone);
            call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", "CAP_NHAT", id, null, null, name, phone, email);
            WebResponses.json(resp, 200, staffAccount(c, id)); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            if (!Set.of("KHOA", "MO_KHOA").contains(action))
                throw new Rejected(400, "VALIDATION_ERROR", "Hành động trạng thái không hợp lệ");
            call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", action, id, null, null, null, null, null);
            WebResponses.json(resp, 200, staffAccount(c, id)); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}/password") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String password = required(body(req), "matKhau");
            validatePassword(password);
            call(c, "EXEC dbo.usp_admin_quan_ly_tong_dai ?,?,?,?,?,?,?", "DAT_MAT_KHAU", id, null,
                    BCrypt.hashpw(password, BCrypt.gensalt(12)), null, null, null);
            WebResponses.json(resp, 200, staffAccount(c, id)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/suggestions") && method.equals("GET")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            String order = path.split("/")[2];
            WebResponses.json(resp, 200, Map.of("items", driverSuggestions(c, order))); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/driver-route") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, driverRoute(c, actor, path.split("/")[2])); return;
        }
        if (path.matches("/drivers/[0-9a-fA-F-]{36}/position") && method.equals("POST")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200,
                    configurePosition(c, path.split("/")[2], required(body(req), "diaChi"))); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}") && method.equals("GET")) {
            WebResponses.json(resp, 200, order(c, path.substring(8), actor)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/assign") && method.equals("POST")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            String order = path.split("/")[2];
            call(c, "EXEC dbo.usp_phan_cong ?,?", order, required(body(req), "maTx"));
            WebResponses.json(resp, 200, order(c, order, actor)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/progress") && method.equals("POST")) {
            require(actor, "TAI_XE");
            String order = path.split("/")[2]; JsonNode data = body(req);
            call(c, "EXEC dbo.usp_tien_trinh ?,?,?", order, required(data, "hanhDong"), field(data, "ghiChu"));
            WebResponses.json(resp, 200, order(c, order, actor)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/complete") && method.equals("POST")) {
            require(actor, "TAI_XE");
            JsonNode data = body(req);
            if (!data.path("xacNhanThuDu").asBoolean(false))
                throw new Rejected(400, "COLLECTION_CONFIRMATION_REQUIRED", "Cần xác nhận đã giao và thu đủ cước");
            String order = path.split("/")[2];
            call(c, "EXEC dbo.usp_hoan_tat ?,1", order);
            WebResponses.json(resp, 200, order(c, order, actor)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/cancel") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            String order = path.split("/")[2];
            call(c, "EXEC dbo.usp_huy_don ?,?", order, required(body(req), "lyDo"));
            WebResponses.json(resp, 200, order(c, order, actor)); return;
        }
        if (path.equals("/drivers/me/finance") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, finance(c, actor)); return;
        }
        if (path.equals("/drivers/me/earnings") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, earnings(c, actor, req)); return;
        }
        if (path.equals("/drivers/me/settlements") && method.equals("POST")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, beginSettlement(c, actor, requiredHeader(req, "Idempotency-Key"), req.getRemoteAddr())); return;
        }
        if (path.equals("/drivers/me/settlements/reconcile") && method.equals("POST")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, reconcile(c, actor)); return;
        }
        if (path.equals("/reports/finance") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, report(c)); return;
        }
        if ((path.equals("/admin/reports/finance") || path.equals("/admin/reports/finance.xlsx"))
                && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            LocalDate from = reportDate(req, "tu"), until = reportDate(req, "den");
            if (!until.isAfter(from))
                throw new Rejected(400, "DATE_RANGE_INVALID", "Ngày kết thúc phải sau ngày bắt đầu");
            DesignV2FinanceReportService.Report report = new DesignV2FinanceReportService().load(c, from, until);
            if (path.endsWith(".xlsx")) {
                byte[] bytes = new DesignV2FinanceExcelExporter().export(report);
                resp.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                resp.setHeader("Content-Disposition", "attachment; filename=\"finance-v2-" + from + "-" + until + ".xlsx\"");
                resp.setContentLength(bytes.length);
                resp.getOutputStream().write(bytes);
            } else WebResponses.json(resp, 200, report);
            return;
        }
        if (path.equals("/policies") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", policyRows(c))); return;
        }
        if (path.equals("/policies") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            call(c, "EXEC dbo.usp_quan_ly_chinh_sach ?,?,?,?,?", required(data, "hanhDong"), required(data, "loai"),
                    field(data, "ma"), data.path("duLieu").isMissingNode() ? null : JSON.writeValueAsString(data.path("duLieu")), field(data, "den"));
            WebResponses.json(resp, 200, Map.of("items", policyRows(c))); return;
        }
        if (path.equals("/vehicles") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE", "TONG_DAI");
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT p.ma_tx,p.bien_so,p.loai_xe,p.mau_xe,p.dang_hoat_dong,t.ho_ten "
                    + "FROM dbo.phuong_tien p JOIN dbo.tai_xe x ON x.ma_tx=p.ma_tx "
                    + "JOIN dbo.tai_khoan t ON t.ma_tk=x.ma_tk ORDER BY t.ho_ten"))); return;
        }
        if (path.equals("/vehicles") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            call(c, "EXEC dbo.usp_quan_ly_phuong_tien ?,?,?,?,?,?", required(data, "hanhDong"), required(data, "maTx"),
                    field(data, "bienSo"), field(data, "loaiXe"), field(data, "mauXe"), data.path("hoatDong").asBoolean(true));
            WebResponses.json(resp, 200, Map.of("items", rows(c, "SELECT ma_tx,bien_so,loai_xe,dang_hoat_dong FROM dbo.phuong_tien"))); return;
        }
        throw new Rejected(404, "RESOURCE_NOT_FOUND", "Chức năng không tồn tại");
    }

    private static List<Map<String, Object>> driverSuggestions(Connection c, String orderId) throws Exception {
        Map<String, Object> order = one(c, "SELECT diem_lay FROM dbo.don_hang WHERE ma_don=?", orderId);
        if (order == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn hàng");

        List<Map<String, Object>> candidates = rows(c,
                "SELECT s.ma_tx,s.ho_ten,s.ranh_tu,s.bien_so,t.vi_tri_demo_dia_chi,t.vi_tri_demo_lat,"
                        + "t.vi_tri_demo_lng,t.vi_tri_demo_nguon "
                        + "FROM dbo.v_tai_xe_san_sang s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx "
                        + "WHERE NOT EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p "
                        + "WHERE p.ma_don=? AND p.ma_tx=s.ma_tx AND p.ket_qua='TU_CHOI')", orderId);
        String pickup = String.valueOf(order.get("diem_lay"));
        RouteService routes = RouteConfiguration.fromEnvironment();
        Double pickupLat = null, pickupLng = null;
        for (Map<String, Object> candidate : candidates) {
            if (pickup.equalsIgnoreCase(String.valueOf(candidate.get("vi_tri_demo_dia_chi")))
                    && number(candidate.get("vi_tri_demo_lat")) != null
                    && number(candidate.get("vi_tri_demo_lng")) != null) {
                pickupLat = number(candidate.get("vi_tri_demo_lat"));
                pickupLng = number(candidate.get("vi_tri_demo_lng"));
                break;
            }
        }
        boolean routed = false;
        for (Map<String, Object> candidate : candidates) {
            String address = candidate.get("vi_tri_demo_dia_chi") == null
                    ? null : String.valueOf(candidate.get("vi_tri_demo_dia_chi"));
            if (address == null || address.isBlank()) {
                candidate.put("km_den_diem_lay", null);
                candidate.put("giay_den_diem_lay", null);
                candidate.put("nguon_dinh_tuyen", "DU_PHONG_RANH_TU");
                continue;
            }
            try {
                if (address.strip().equalsIgnoreCase(pickup.strip())) {
                    candidate.put("km_den_diem_lay", "0.00");
                    candidate.put("giay_den_diem_lay", 0);
                    candidate.put("nguon_dinh_tuyen", "GOONG");
                } else {
                    Route route = routes.estimate(address, pickup);
                    candidate.put("km_den_diem_lay", route.quangDuongKm());
                    candidate.put("giay_den_diem_lay", route.thoiGianDuKienGiay());
                    candidate.put("nguon_dinh_tuyen", route.nguon());
                }
                routed = true;
            } catch (RouteFailure | IllegalArgumentException failure) {
                Double lat = number(candidate.get("vi_tri_demo_lat"));
                Double lng = number(candidate.get("vi_tri_demo_lng"));
                if (pickupLat != null && lat != null && lng != null) {
                    candidate.put("km_den_diem_lay", straightLineKm(lat, lng, pickupLat, pickupLng));
                    candidate.put("giay_den_diem_lay", null);
                    candidate.put("nguon_dinh_tuyen", "DEMO_KHOANG_CACH");
                    routed = true;
                } else {
                    candidate.put("km_den_diem_lay", null);
                    candidate.put("giay_den_diem_lay", null);
                    candidate.put("nguon_dinh_tuyen", "DU_PHONG_RANH_TU");
                }
            }
        }
        if (routed) {
            candidates.sort(Comparator.comparing(
                    item -> item.get("km_den_diem_lay") == null
                            ? new BigDecimal("999999") : new BigDecimal(String.valueOf(item.get("km_den_diem_lay")))));
        } else {
            candidates.sort(Comparator.comparing(item -> String.valueOf(item.get("ranh_tu"))));
        }
        return candidates;
    }

    private static String straightLineKm(double lat1, double lng1, double lat2, double lng2) {
        double earthRadiusKm = 6371.0088;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(dLng / 2), 2);
        return BigDecimal.valueOf(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
                .setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static Double number(Object value) {
        if (value == null) return null;
        try { return Double.valueOf(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private static Map<String, Object> configurePosition(Connection c, String driverId, String address) throws Exception {
        if (address == null || address.isBlank() || address.length() > 255)
            throw new Rejected(400, "VALIDATION_ERROR", "Địa chỉ vị trí không hợp lệ");
        String key = System.getenv("GOONG_API_KEY");
        if (key == null || key.isBlank())
            throw new Rejected(503, "ROUTE_PROVIDER_ERROR", "Chưa cấu hình dịch vụ bản đồ");
        GoongRouteProvider goong = new GoongRouteProvider(key, java.time.Duration.ofMillis(
                Long.parseLong(System.getenv().getOrDefault("GOONG_TIMEOUT_MS", "5000"))),
                System.getenv().getOrDefault("GOONG_VEHICLE", "car"));
        GoongRouteProvider.GeocodedAddress location = goong.geocodeAddress(address.strip());
        try (PreparedStatement statement = c.prepareStatement(
                "UPDATE dbo.tai_xe SET vi_tri_demo_dia_chi=?,vi_tri_demo_lat=?,vi_tri_demo_lng=?,"
                        + "vi_tri_demo_luc=SYSUTCDATETIME(),vi_tri_demo_nguon='DEMO_CO_DINH' WHERE ma_tx=?")) {
            statement.setString(1, location.address());
            statement.setBigDecimal(2, location.latitude());
            statement.setBigDecimal(3, location.longitude());
            statement.setString(4, driverId);
            if (statement.executeUpdate() != 1)
                throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài xế");
        }
        return Map.of("maTx", driverId, "diaChi", location.address(), "lat", location.latitude(),
                "lng", location.longitude(), "nguon", "DEMO_CO_DINH");
    }

    private static Map<String, Object> driverRoute(Connection c, Actor actor, String orderId) throws Exception {
        Map<String, Object> route = one(c, "SELECT t.ma_tx,t.vi_tri_demo_dia_chi,t.vi_tri_demo_lat,t.vi_tri_demo_lng,"
                + "d.diem_lay,d.diem_giao FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.don_hang d ON d.ma_don=p.ma_don "
                + "WHERE p.ma_don=? AND p.ma_tx=(SELECT ma_tx FROM dbo.tai_xe WHERE ma_tk=?) "
                + "AND (p.ket_thuc_luc IS NULL OR d.trang_thai='HOAN_TAT')", orderId, actor.id);
        if (route == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn được phân công");
        if (route.get("vi_tri_demo_lat") == null || route.get("vi_tri_demo_lng") == null)
            throw new Rejected(409, "DEMO_POSITION_MISSING", "Tài xế chưa có địa chỉ cố định");
        String key = System.getenv("GOONG_API_KEY");
        if (key == null || key.isBlank())
            throw new Rejected(503, "ROUTE_PROVIDER_ERROR", "Chưa cấu hình dịch vụ bản đồ");
        GoongRouteProvider goong = new GoongRouteProvider(key, java.time.Duration.ofMillis(
                Long.parseLong(System.getenv().getOrDefault("GOONG_TIMEOUT_MS", "5000"))),
                System.getenv().getOrDefault("GOONG_VEHICLE", "car"));
        GoongRouteProvider.GeocodedAddress pickup = goong.geocodeAddress(route.get("diem_lay").toString());
        GoongRouteProvider.GeocodedAddress dropoff = goong.geocodeAddress(route.get("diem_giao").toString());
        GoongRouteProvider.Geometry toPickup = goong.routeGeometry(
                Double.parseDouble(route.get("vi_tri_demo_lat").toString()),
                Double.parseDouble(route.get("vi_tri_demo_lng").toString()),
                pickup.latitude().doubleValue(), pickup.longitude().doubleValue());
        GoongRouteProvider.Geometry toDropoff = goong.routeGeometry(
                pickup.latitude().doubleValue(), pickup.longitude().doubleValue(),
                dropoff.latitude().doubleValue(), dropoff.longitude().doubleValue());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taiXe", Map.of("diaChi", route.get("vi_tri_demo_dia_chi"), "lat", route.get("vi_tri_demo_lat"),
                "lng", route.get("vi_tri_demo_lng"), "nguon", "DEMO_CO_DINH"));
        result.put("diemLay", Map.of("diaChi", pickup.address(), "lat", pickup.latitude(), "lng", pickup.longitude(), "nguon", "GOONG"));
        result.put("diemGiao", Map.of("diaChi", dropoff.address(), "lat", dropoff.latitude(), "lng", dropoff.longitude(), "nguon", "GOONG"));
        result.put("denDiemLay", mapLeg(toPickup));
        result.put("denDiemGiao", mapLeg(toDropoff));
        result.put("nguon", "GOONG");
        return result;
    }

    private static Map<String, Object> mapLeg(GoongRouteProvider.Geometry leg) {
        return Map.of("polyline", leg.polyline(), "quangDuongKm",
                BigDecimal.valueOf(leg.meters()).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP).toPlainString(),
                "thoiGianDuKienGiay", leg.seconds(), "nguon", "GOONG");
    }

    private Map<String, Object> quote(Connection c, JsonNode data, Actor actor) throws Exception {
        RouteService routes = (RouteService) getServletContext().getAttribute(RouteConfiguration.ATTRIBUTE);
        Route route = routes.estimate(required(data, "diemLay"), required(data, "diemGiao"));
        String customer = customerId(c, data, actor);
        JsonNode parcels = data.path("kienHang");
        if (!parcels.isArray() || parcels.isEmpty())
            throw new Rejected(400, "VALIDATION_ERROR", "Cần ít nhất một kiện hàng");
        BigDecimal weight = BigDecimal.ZERO;
        for (JsonNode parcel : parcels) {
            String type = required(parcel, "loaiHang");
            if (type.length() > 100) throw new Rejected(400, "VALIDATION_ERROR", "Loại hàng quá dài");
            BigDecimal kg = new BigDecimal(required(parcel, "kg"));
            if (kg.signum() <= 0) throw new Rejected(400, "VALIDATION_ERROR", "Khối lượng không hợp lệ");
            weight = weight.add(kg);
        }
        BigDecimal km = new BigDecimal(route.quangDuongKm());
        List<Map<String,Object>> fares = rows(c, "SELECT ma_bieu_phi,cuoc_co_ban,don_gia_km,kg_bao_gom,don_gia_kg,kg_toi_da,km_toi_thieu,km_toi_da "
                + "FROM dbo.cau_hinh_cuoc WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())");
        if (fares.size() != 1) throw new Rejected(503, "FARE_CONFIG_MISSING", "Cần đúng một biểu phí hiệu lực");
        Map<String,Object> fare = fares.getFirst();
        if (km.compareTo(new BigDecimal(fare.get("km_toi_thieu").toString())) < 0
                || km.compareTo(new BigDecimal(fare.get("km_toi_da").toString())) > 0
                || weight.compareTo(new BigDecimal(fare.get("kg_toi_da").toString())) > 0)
            throw new Rejected(422, "OUT_OF_SERVICE_AREA", "Đơn ngoài phạm vi km/kg");
        Map<String,Object> values = one(c, "SELECT dbo.fn_cuoc_km(?,?,?) cuoc_km,dbo.fn_cuoc_kg(?,?,?) cuoc_kg",
                new BigDecimal(fare.get("cuoc_co_ban").toString()), km,
                new BigDecimal(fare.get("don_gia_km").toString()), weight,
                new BigDecimal(fare.get("kg_bao_gom").toString()),
                new BigDecimal(fare.get("don_gia_kg").toString()));
        BigDecimal kmFare = new BigDecimal(values.get("cuoc_km").toString());
        BigDecimal kgFare = new BigDecimal(values.get("cuoc_kg").toString());
        List<String> optional = optionalSurcharges(data);
        if (new HashSet<>(optional).size() != optional.size())
            throw new Rejected(400, "VALIDATION_ERROR", "Phụ thu được chọn trùng");
        BigDecimal surcharge = BigDecimal.ZERO;
        Set<String> matchedOptional = new HashSet<>();
        Set<String> selectedTypes = new HashSet<>();
        for (Map<String,Object> item : rows(c, "SELECT ma_phu_thu,ma_loai,so_tien,bat_buoc FROM dbo.cau_hinh_phu_thu "
                + "WHERE trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())")) {
            boolean mandatory = Boolean.TRUE.equals(item.get("bat_buoc"));
            String id = item.get("ma_phu_thu").toString();
            if (optional.contains(id) && mandatory)
                throw new Rejected(400, "VALIDATION_ERROR", "Không chọn phụ thu bắt buộc như tùy chọn");
            if (mandatory || optional.contains(id)) {
                if (!selectedTypes.add(item.get("ma_loai").toString()))
                    throw new Rejected(409, "SURCHARGE_CONFLICT", "Phụ thu trùng loại");
                surcharge = surcharge.add(new BigDecimal(item.get("so_tien").toString()));
                if (!mandatory) matchedOptional.add(id);
            }
        }
        if (matchedOptional.size() != optional.size())
            throw new Rejected(400, "VALIDATION_ERROR", "Phụ thu tùy chọn không hiệu lực");
        BigDecimal discount = BigDecimal.ZERO;
        Map<String,Object> tier = one(c, "SELECT ma_hang FROM dbo.khach_hang WHERE ma_kh=? AND thanh_vien_tu<=SYSUTCDATETIME() "
                + "AND (thanh_vien_den IS NULL OR thanh_vien_den>SYSUTCDATETIME())", customer);
        if (tier != null && !"THUONG".equals(tier.get("ma_hang"))) {
            List<Map<String,Object>> policies = rows(c, "SELECT ty_le_giam FROM dbo.chinh_sach_thanh_vien WHERE ma_hang=? "
                    + "AND trang_thai='CONG_BO' AND hieu_luc_tu<=SYSUTCDATETIME() "
                    + "AND (hieu_luc_den IS NULL OR hieu_luc_den>SYSUTCDATETIME())", tier.get("ma_hang"));
            if (policies.size() != 1) throw new Rejected(503, "MEMBERSHIP_POLICY_MISSING", "Cần đúng một chính sách thành viên");
            Map<String,Object> policy = policies.getFirst();
            discount = kmFare.add(kgFare).add(surcharge)
                    .multiply(new BigDecimal(policy.get("ty_le_giam").toString()))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }
        Map<String,Object> response = new LinkedHashMap<>();
        response.put("maKh", customer); response.put("diemLay", route.diemLayHang());
        response.put("diemGiao", route.diemGiaoHang()); response.put("km", route.quangDuongKm());
        response.put("giay", route.thoiGianDuKienGiay()); response.put("nguon", "FAKE".equals(route.nguon()) ? "DEMO" : "GOONG");
        response.put("cuocKm", kmFare.toPlainString()); response.put("cuocKg", kgFare.toPlainString());
        response.put("phuThu", surcharge.toPlainString()); response.put("giamGia", discount.toPlainString());
        response.put("tongCuoc", kmFare.add(kgFare).add(surcharge).subtract(discount).toPlainString());
        return response;
    }

    private Map<String, Object> createOrder(Connection c, JsonNode data, Actor actor, HttpServletRequest req) throws Exception {
        String agreed = required(data, "giaDaDongY");
        String key = requiredHeader(req, "Idempotency-Key");
        String customer = customerId(c, data, actor);
        List<Map<String,Object>> parcels = new ArrayList<>();
        int index = 1;
        for (JsonNode item : data.path("kienHang")) {
            parcels.add(Map.of("thu_tu", index++, "loai_hang", required(item, "loaiHang"),
                    "kg", required(item, "kg")));
        }
        String parcelsJson = JSON.writeValueAsString(parcels);
        String surchargeJson = JSON.writeValueAsString(optionalSurcharges(data));
        String requestContent = JSON.writeValueAsString(List.of(customer, required(data, "diemLay"),
                required(data, "diemGiao"), required(data, "tenNguoiNhan"), required(data, "sdtNguoiNhan"),
                parcels, optionalSurcharges(data)));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(requestContent.getBytes(StandardCharsets.UTF_8));
        Map<String,Object> existing = one(c, "SELECT ma_don,hash_yeu_cau FROM dbo.don_hang WHERE ma_tk_tao=? AND khoa_yeu_cau=?", actor.id, key);
        if (existing != null) {
            if (!Arrays.equals(hash, (byte[]) existing.get("hash_yeu_cau")))
                throw new Rejected(409, "IDEMPOTENCY_CONFLICT", "Khóa tạo đơn đã dùng cho nội dung khác");
            return order(c, existing.get("ma_don").toString(), actor);
        }
        Map<String,Object> preview = quote(c, data, actor);
        try (PreparedStatement statement = c.prepareStatement("EXEC dbo.usp_tao_don ?,?,?,?,?,?,?,?,?,?,?,?,?")) {
            statement.setString(1, preview.get("maKh").toString()); statement.setString(2, key); statement.setBytes(3, hash);
            statement.setString(4, preview.get("diemLay").toString()); statement.setString(5, preview.get("diemGiao").toString());
            statement.setString(6, required(data, "tenNguoiNhan")); statement.setString(7, required(data, "sdtNguoiNhan"));
            statement.setBigDecimal(8, new BigDecimal(preview.get("km").toString()));
            statement.setInt(9, Integer.parseInt(preview.get("giay").toString()));
            statement.setString(10, preview.get("nguon").toString()); statement.setString(11, parcelsJson);
            statement.setString(12, surchargeJson); statement.setBigDecimal(13, new BigDecimal(agreed));
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Order procedure returned no ID");
                return order(c, result.getString(1), actor);
            }
        }
    }

    private static String customerId(Connection c, JsonNode data, Actor actor) throws SQLException {
        if (actor.role.equals("KHACH_HANG")) {
            Map<String,Object> own = one(c, "SELECT ma_kh FROM dbo.khach_hang WHERE ma_tk=?", actor.id);
            if (own == null) throw new Rejected(403, "FORBIDDEN", "Thiếu hồ sơ khách hàng");
            return own.get("ma_kh").toString();
        }
        return required(data, "maKh");
    }

    private static List<String> optionalSurcharges(JsonNode data) {
        JsonNode input = data.path("phuThuIds");
        List<String> ids = new ArrayList<>();
        if (input.isMissingNode()) return ids;
        if (!input.isArray()) throw new Rejected(400, "VALIDATION_ERROR", "phuThuIds phải là mảng");
        for (JsonNode item : input) ids.add(UUID.fromString(item.asText()).toString());
        ids.sort(String::compareTo);
        return ids;
    }

    private static List<Map<String,Object>> orderRows(Connection c, Actor actor, int page, int size) throws SQLException {
        List<Map<String,Object>> orders = rows(c, "EXEC dbo.usp_doc_don NULL,?,?", page, size);
        for (Map<String,Object> item : orders) addAssignment(c, item);
        return orders;
    }

    private static Map<String,Object> order(Connection c, String id, Actor actor) throws SQLException {
        Map<String,Object> found = one(c, "EXEC dbo.usp_doc_don ?,0,1", id);
        if (found == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn");
        addAssignment(c, found);
        found.put("kien_hang", rows(c, "SELECT thu_tu,loai_hang,khoi_luong_kg,ghi_chu FROM dbo.chi_tiet_kien_hang WHERE ma_don=? ORDER BY thu_tu", id));
        found.put("nhat_ky", rows(c, "SELECT ma_su_kien,loai,trang_thai_sau,thoi_gian,ghi_chu FROM dbo.nhat_ky_don_hang WHERE ma_don=? ORDER BY thoi_gian,ma_su_kien", id));
        found.put("lich_su_phan_cong", rows(c, "SELECT p.ma_phan_cong,p.bat_dau_luc,p.ket_thuc_luc,p.ket_qua,p.ly_do,"
                + "k.ho_ten AS tai_xe,pt.bien_so FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "LEFT JOIN dbo.phuong_tien pt ON pt.ma_tx=t.ma_tx WHERE p.ma_don=? "
                + "ORDER BY p.bat_dau_luc,p.ma_phan_cong", id));
        return found;
    }

    private static void addAssignment(Connection c, Map<String,Object> item) throws SQLException {
        Map<String,Object> assigned = one(c, "SELECT TOP (1) p.ma_tx,k.ho_ten,pt.bien_so FROM dbo.phan_cong_don_hang p "
                + "JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                + "LEFT JOIN dbo.phuong_tien pt ON pt.ma_tx=t.ma_tx WHERE p.ma_don=? "
                + "ORDER BY CASE WHEN p.ket_thuc_luc IS NULL THEN 0 ELSE 1 END,p.bat_dau_luc DESC", item.get("ma_don"));
        item.put("phan_cong", assigned);
    }

    private static Map<String,Object> finance(Connection c, Actor actor) throws SQLException {
        Map<String,Object> result = one(c, "SELECT s.* FROM dbo.v_so_du_tai_xe s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx WHERE t.ma_tk=?", actor.id);
        if (result == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Thiếu hồ sơ tài xế");
        result.put("giao_dich_dang_cho", one(c, "SELECT g.ma_giao_dich,g.trang_thai,g.so_tien_yeu_cau,g.payment_url,g.tao_luc "
                + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx WHERE t.ma_tk=? AND g.giai_quyet_luc IS NULL", actor.id));
        return result;
    }

    private static void changeAvailability(Connection c, Actor actor, boolean online) throws SQLException {
        String sql = "BEGIN TRY BEGIN TRAN; DECLARE @rc INT; "
                + "EXEC @rc=sys.sp_getapplock @Resource=N'dieu-phoi',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; "
                + "IF @rc<0 THROW 51100,N'Không lấy được khóa điều phối',1; "
                + "IF EXISTS(SELECT 1 FROM dbo.phan_cong_don_hang p JOIN dbo.tai_xe t ON t.ma_tx=p.ma_tx "
                + "WHERE t.ma_tk=? AND p.ket_thuc_luc IS NULL) THROW 52203,N'Không đổi ca khi đang có phân công',1; "
                + "UPDATE dbo.tai_xe SET trang_thai=?,ranh_tu=CASE WHEN ?=1 THEN SYSUTCDATETIME() ELSE NULL END WHERE ma_tk=?; "
                + "IF @@ROWCOUNT<>1 THROW 51402,N'Thiếu hồ sơ tài xế',1; COMMIT; "
                + "END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH";
        call(c, sql, actor.id, online ? "ONLINE" : "OFFLINE", online, actor.id);
    }

    private static Map<String,Object> earnings(Connection c, Actor actor, HttpServletRequest req) throws SQLException {
        LocalDate start = LocalDate.parse(req.getParameter("tu"));
        LocalDate end = LocalDate.parse(req.getParameter("den"));
        if (!end.isAfter(start)) throw new Rejected(400, "VALIDATION_ERROR", "Khoảng ngày không hợp lệ");
        ZoneId vietnam = ZoneId.of("Asia/Ho_Chi_Minh");
        Timestamp from = Timestamp.from(start.atStartOfDay(vietnam).toInstant());
        Timestamp until = Timestamp.from(end.plusDays(1).atStartOfDay(vietnam).toInstant());
        Map<String,Object> income;
        try (PreparedStatement statement = c.prepareStatement("EXEC dbo.usp_thu_nhap_cua_toi ?,?")) {
            statement.setTimestamp(1, from); statement.setTimestamp(2, until);
            try (ResultSet result = statement.executeQuery()) {
                income = result.next() ? map(result) : Map.of();
            }
        }
        Map<String,Object> response = new LinkedHashMap<>();
        response.put("tu", start.toString()); response.put("den", end.toString());
        response.put("thu_nhap_trong_ky", income);
        response.put("con_phai_nop_toan_lich_su", finance(c, actor).get("con_phai_nop"));
        return response;
    }

    private static Map<String,Object> beginSettlement(Connection c, Actor actor, String key, String ip) throws Exception {
        Map<String,Object> settlement;
        try (PreparedStatement statement = c.prepareStatement("EXEC dbo.usp_bat_dau_thanh_toan ?")) {
            statement.setString(1, key);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Settlement procedure returned no row");
                settlement = map(result);
            }
        }
        if (!"CHO_XU_LY".equals(settlement.get("trang_thai")) && !"CHUA_RO_KET_QUA".equals(settlement.get("trang_thai")))
            return settlement;
        Instant created = Instant.parse((String) settlement.get("tao_luc"));
        if (created.plusSeconds(15 * 60).isBefore(Instant.now())) {
            settlement.put("payment_url", null);
            settlement.put("can_tra_cuu", true);
            return settlement;
        }
        String url = (String) settlement.get("payment_url");
        if (url == null) {
            VnpayGateway gateway = VnpayGateway.fromEnvironment();
            url = gateway.settlementPaymentUrl((String) settlement.get("ma_tham_chieu"),
                    new BigDecimal(settlement.get("so_tien_yeu_cau").toString()),
                    created, ip);
            try (PreparedStatement statement = c.prepareStatement("UPDATE dbo.giao_dich_nop_tien SET payment_url=? WHERE ma_giao_dich=? AND payment_url IS NULL AND giai_quyet_luc IS NULL")) {
                statement.setString(1, url); statement.setString(2, (String) settlement.get("ma_giao_dich")); statement.executeUpdate();
            }
            Map<String,Object> persisted = one(c, "SELECT payment_url FROM dbo.giao_dich_nop_tien WHERE ma_giao_dich=?", settlement.get("ma_giao_dich"));
            if (persisted != null && persisted.get("payment_url") != null) url = persisted.get("payment_url").toString();
        }
        settlement.put("payment_url", url);
        return settlement;
    }

    private void vnpayIpn(HttpServletRequest req, HttpServletResponse resp) throws Exception {
        VnpayGateway gateway = VnpayGateway.fromEnvironment();
        Map<String,String> fields;
        try { fields = gateway.parseQuery(req.getQueryString()); }
        catch (IllegalArgumentException invalid) {
            WebResponses.json(resp, 200, Map.of("RspCode", "97", "Message", "Invalid message")); return;
        }
        if (!gateway.verifyCallback(fields)) {
            recordPaymentObservation(fields, "IPN", "KHONG_HOP_LE", false);
            WebResponses.json(resp, 200, Map.of("RspCode", "97", "Message", "Invalid signature")); return;
        }
        String reference = fields.get("vnp_TxnRef");
        try (Connection c = db().dataSource().getConnection()) {
            Map<String,Object> payment = one(c, "SELECT ma_giao_dich,so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=?", reference);
            if (payment == null) {
                recordPaymentObservation(fields, "IPN", "KHONG_KHOP", true);
                WebResponses.json(resp, 200, Map.of("RspCode", "01", "Message", "Unknown payment")); return;
            }
            BigDecimal expected = new BigDecimal(payment.get("so_tien_yeu_cau").toString()).movePointRight(2);
            if (!"VND".equals(fields.get("vnp_CurrCode")) || !expected.toPlainString().equals(fields.get("vnp_Amount"))
                    || !("Nop tien cong ty " + reference).equals(fields.get("vnp_OrderInfo"))) {
                recordPaymentObservation(fields, "IPN", "KHONG_KHOP", true);
                WebResponses.json(resp, 200, Map.of("RspCode", "04", "Message", "Payment mismatch")); return;
            }
            if ("00".equals(fields.get("vnp_ResponseCode")) && "00".equals(fields.get("vnp_TransactionStatus"))) {
                String partner = fields.get("vnp_TransactionNo");
                if (partner == null || partner.isBlank()) {
                    WebResponses.json(resp, 200, Map.of("RspCode", "04", "Message", "Missing transaction")); return;
                }
                applyPayment(c, fields, "IPN", true, partner);
                WebResponses.json(resp, 200, Map.of("RspCode", "00", "Message", "Confirm Success")); return;
            }
            recordPaymentObservation(fields, "IPN", "KHONG_THAY_DOI", true);
            WebResponses.json(resp, 200, Map.of("RspCode", "00", "Message", "Pending reconciliation"));
        }
    }

    private static Map<String,Object> reconcile(Connection c, Actor actor) throws Exception {
        Map<String,Object> payment = one(c, "SELECT TOP (1) g.ma_tham_chieu,g.tao_luc,g.so_tien_yeu_cau "
                + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                + "WHERE t.ma_tk=? AND g.giai_quyet_luc IS NULL ORDER BY g.tao_luc DESC", actor.id);
        if (payment == null) return finance(c, actor);
        VnpayGateway gateway = VnpayGateway.fromEnvironment();
        Map<String,String> reply = gateway.query(payment.get("ma_tham_chieu").toString(),
                Instant.parse(payment.get("tao_luc").toString()),
                System.getenv().getOrDefault("VNPAY_QUERY_IP", "127.0.0.1"));
        if (!gateway.verifyQuery(reply) || !payment.get("ma_tham_chieu").equals(reply.get("vnp_TxnRef")))
            throw new Rejected(502, "VNPAY_QUERY_INVALID", "Kết quả tra cứu VNPay không hợp lệ");
        String code = reply.get("vnp_ResponseCode"), status = reply.get("vnp_TransactionStatus");
        if ("00".equals(code) && "00".equals(status)) {
            if (!payment.get("so_tien_yeu_cau").toString().equals(new BigDecimal(reply.get("vnp_Amount")).movePointLeft(2).toPlainString()))
                throw new Rejected(409, "PAYMENT_AMOUNT_MISMATCH", "Số tiền VNPay không khớp");
            applyPayment(c, reply, "QUERY", true, reply.get("vnp_TransactionNo"));
        } else if ("91".equals(code) || ("00".equals(code) && "02".equals(status))) {
            applyPayment(c, reply, "QUERY", false, null);
        }
        return finance(c, actor);
    }

    /** Reconcile unresolved settlements after their payment URL expires. A signed, definitive
     * provider result is still required before releasing or settling any linked amount. */
    public static int reconcilePending(PersistenceContext persistence) throws Exception {
        int processed = 0;
        try (Connection c = persistence.dataSource().getConnection()) {
            List<Map<String,Object>> pending = rows(c, "SELECT DISTINCT t.ma_tk,k.ho_ten "
                    + "FROM dbo.giao_dich_nop_tien g JOIN dbo.tai_xe t ON t.ma_tx=g.ma_tx "
                    + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk "
                    + "WHERE g.giai_quyet_luc IS NULL AND g.tao_luc<DATEADD(MINUTE,-15,SYSUTCDATETIME())");
            for (Map<String,Object> driver : pending) {
                try {
                    String id = driver.get("ma_tk").toString();
                    setActor(c, id);
                    reconcile(c, new Actor(id, "TAI_XE", 0, driver.get("ho_ten").toString()));
                    processed++;
                } catch (Exception failure) {
                    java.util.logging.Logger.getLogger(DesignV2Servlet.class.getName())
                            .warning("VNPay reconciliation deferred: " + failure.getClass().getSimpleName());
                } finally {
                    setActor(c, null);
                }
            }
        }
        return processed;
    }

    private static void applyPayment(Connection c, Map<String,String> fields, String source, boolean success, String partner) throws Exception {
        String reference = fields.get("vnp_TxnRef");
        Map<String,Object> payment = one(c, "SELECT so_tien_yeu_cau FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=?", reference);
        if (payment == null) throw new Rejected(404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
        String json = JSON.writeValueAsString(new TreeMap<>(fields));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest((source + json).getBytes(StandardCharsets.UTF_8));
        try (PreparedStatement statement = c.prepareStatement("EXEC dbo.usp_ap_dung_ket_qua_nop ?,?,?,?,?,?,?")) {
            statement.setString(1, reference); statement.setString(2, source); statement.setBytes(3, hash);
            statement.setString(4, json); statement.setBoolean(5, success);
            statement.setBigDecimal(6, new BigDecimal(payment.get("so_tien_yeu_cau").toString()));
            statement.setString(7, partner); statement.execute();
        }
    }

    private void recordPaymentObservation(Map<String,String> fields, String source, String result, boolean signatureValid) throws Exception {
        String json = JSON.writeValueAsString(new TreeMap<>(fields));
        byte[] hash = MessageDigest.getInstance("SHA-256").digest((source + json).getBytes(StandardCharsets.UTF_8));
        try (Connection c = db().dataSource().getConnection(); PreparedStatement statement = c.prepareStatement(
                "IF NOT EXISTS(SELECT 1 FROM dbo.su_kien_thanh_toan WHERE nguon=? AND khoa_su_kien=?) "
                        + "INSERT dbo.su_kien_thanh_toan(ma_giao_dich,nguon,khoa_su_kien,chu_ky_hop_le,ket_qua,noi_dung_json) "
                        + "VALUES((SELECT ma_giao_dich FROM dbo.giao_dich_nop_tien WHERE ma_tham_chieu=?),?,?,?,?,?)")) {
            statement.setString(1, source); statement.setBytes(2, hash); statement.setString(3, fields.get("vnp_TxnRef"));
            statement.setString(4, source); statement.setBytes(5, hash); statement.setBoolean(6, signatureValid);
            statement.setString(7, result); statement.setString(8, json); statement.execute();
        }
    }

    private static Map<String,Object> report(Connection c) throws SQLException {
        Map<String,Object> totals = one(c, "SELECT COALESCE(SUM(cong_ty_duoc_huong),0) cong_ty_duoc_huong, COALESCE(SUM(da_nop),0) da_nop, "
                + "COALESCE(SUM(con_phai_nop),0) con_phai_nop,COALESCE(SUM(thu_nhap_tai_xe),0) thu_nhap_tai_xe,"
                + "COALESCE(SUM(dang_thanh_toan),0) dang_thanh_toan,"
                + "COALESCE(SUM(chua_dua_vao_thanh_toan),0) chua_dua_vao_thanh_toan FROM dbo.v_so_du_tai_xe");
        Map<String,Object> received = one(c, "SELECT COALESCE(SUM(so_tien_thuc_nhan),0) da_nop "
                + "FROM dbo.giao_dich_nop_tien WHERE trang_thai='THANH_CONG'");
        totals.put("da_nop", received.get("da_nop"));
        totals.put("tai_xe", rows(c, "SELECT t.ma_tx,k.ho_ten,s.thu_nhap_tai_xe,s.cong_ty_duoc_huong,"
                + "s.con_phai_nop,s.dang_thanh_toan,s.chua_dua_vao_thanh_toan,COALESCE(g.da_nop,0) da_nop "
                + "FROM dbo.v_so_du_tai_xe s JOIN dbo.tai_xe t ON t.ma_tx=s.ma_tx "
                + "JOIN dbo.tai_khoan k ON k.ma_tk=t.ma_tk LEFT JOIN "
                + "(SELECT ma_tx,SUM(so_tien_thuc_nhan) da_nop FROM dbo.giao_dich_nop_tien "
                + "WHERE trang_thai='THANH_CONG' GROUP BY ma_tx) g ON g.ma_tx=t.ma_tx ORDER BY k.ho_ten,t.ma_tx"));
        return totals;
    }

    private static LocalDate reportDate(HttpServletRequest req, String parameter) {
        String raw = req.getParameter(parameter);
        if (raw == null || !raw.matches("\\d{4}-\\d{2}-\\d{2}"))
            throw new Rejected(400, "DATE_RANGE_INVALID", "Ngày báo cáo không hợp lệ");
        try { return LocalDate.parse(raw); }
        catch (DateTimeParseException invalid) {
            throw new Rejected(400, "DATE_RANGE_INVALID", "Ngày báo cáo không hợp lệ");
        }
    }

    private static void call(Connection c, String sql, Object... args) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            bind(statement, args); statement.execute();
        }
    }
    private static String optionalEmail(String value) {
        if (value == null || value.isBlank()) return null;
        String email = value.strip();
        if (email.length() > 150 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            throw new Rejected(400, "VALIDATION_ERROR", "Email không hợp lệ");
        return email;
    }

    private static void validateDriverProfile(String username, String name, String phone,
                                              String cccd, String license, LocalDate expiry) {
        if (username == null || !username.matches("[a-z0-9._-]{3,50}"))
            throw new Rejected(400, "VALIDATION_ERROR", "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang (3–50 ký tự)");
        if (name == null || name.isBlank() || name.length() > 100)
            throw new Rejected(400, "VALIDATION_ERROR", "Họ tên tài xế không hợp lệ");
        if (phone == null || !phone.matches("0[0-9]{9}"))
            throw new Rejected(400, "VALIDATION_ERROR", "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0");
        if (cccd == null || !cccd.matches("[0-9]{12}"))
            throw new Rejected(400, "VALIDATION_ERROR", "CCCD phải có đúng 12 chữ số");
        if (license == null || license.isBlank() || license.length() > 50)
            throw new Rejected(400, "VALIDATION_ERROR", "Số giấy phép lái xe không hợp lệ");
        if (expiry == null) throw new Rejected(400, "VALIDATION_ERROR", "Thiếu ngày hết hạn giấy phép lái xe");
    }

    private static Map<String,Object> one(Connection c, String sql, Object... args) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            bind(statement, args);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? map(result) : null; }
        }
    }
    private static List<Map<String,Object>> rows(Connection c, String sql, Object... args) throws SQLException {
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            bind(statement, args);
            try (ResultSet result = statement.executeQuery()) {
                List<Map<String,Object>> items = new ArrayList<>();
                while (result.next()) items.add(map(result));
                return items;
            }
        }
    }
    private static void bind(PreparedStatement statement, Object... args) throws SQLException {
        for (int i = 0; i < args.length; i++) statement.setObject(i + 1, args[i]);
    }
    private static Map<String,Object> map(ResultSet result) throws SQLException {
        Map<String,Object> row = new LinkedHashMap<>();
        for (int i = 1; i <= result.getMetaData().getColumnCount(); i++) {
            Object value = result.getObject(i);
            if (value instanceof Timestamp time) value = time.toInstant().toString();
            else if (value instanceof UUID id) value = id.toString();
            else if (value instanceof BigDecimal decimal) value = decimal.toPlainString();
            row.put(result.getMetaData().getColumnLabel(i), value);
        }
        return row;
    }
}
