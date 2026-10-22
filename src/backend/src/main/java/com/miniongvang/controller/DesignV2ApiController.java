package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.RouteConfiguration;
import com.miniongvang.integration.RouteFailure;
import com.miniongvang.service.DesignV2FinanceExcelExporter;
import com.miniongvang.service.DesignV2FinanceReportService;
import com.miniongvang.service.DesignV2AccountService;
import com.miniongvang.service.DesignV2AdminService;
import com.miniongvang.service.DesignV2DispatchService;
import com.miniongvang.service.DesignV2OrderService;
import com.miniongvang.service.DesignV2PaymentService;
import com.miniongvang.service.DesignV2Problem;
import com.miniongvang.service.RouteService;
import com.miniongvang.security.AuthSession;
import com.miniongvang.web.JsonRequests;
import com.miniongvang.web.WebResponses;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Maps DesignV2 HTTP requests to domain services and API responses. */
public final class DesignV2ApiController {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ConcurrentHashMap<String, ArrayDeque<Long>> AUTH_ATTEMPTS = new ConcurrentHashMap<>();
    private static final DesignV2AdminService ADMIN = new DesignV2AdminService();
    private static final DesignV2AccountService ACCOUNTS = new DesignV2AccountService();
    private static final DesignV2DispatchService DISPATCH = new DesignV2DispatchService();
    private static final DesignV2PaymentService PAYMENTS = new DesignV2PaymentService();
    private final DesignV2OrderService orderService = new DesignV2OrderService();

    private record Actor(String id, String role, long version, String name) {}
    private static final class Rejected extends DesignV2Problem {
        Rejected(int status, String code, String message) { super(status, code, message); }
    }
    public void handle(PersistenceContext persistence, ServletContext servletContext,
                       HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        String path = req.getPathInfo() == null ? "/" : req.getPathInfo();
        try {
            if ("GET".equals(req.getMethod()) && path.equals("/auth/csrf")) {
                WebResponses.json(resp, 200, Map.of("token", AuthSession.csrfToken(req.getSession()), "header", AuthSession.CSRF_HEADER));
                return;
            }
            if (path.equals("/payments/vnpay/ipn") && "GET".equals(req.getMethod())) {
                WebResponses.json(resp, 200, PAYMENTS.handleIpn(persistence, req.getQueryString())); return;
            }
            if (path.equals("/payments/vnpay/return") && "GET".equals(req.getMethod())) {
                String wallet = System.getenv().getOrDefault("DRIVER_RETURN_URL", "http://localhost:3001/driver/wallet");
                resp.sendRedirect(wallet + (wallet.contains("?") ? "&" : "?") + "paymentReturn=1"); return;
            }
            try (Connection connection = persistence.dataSource().getConnection()) {
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
                    route(connection, req, resp, path, actor, servletContext);
                } finally { setActor(connection, null); }
            }
        } catch (DesignV2Problem failure) {
            WebResponses.error(resp, failure.status(), failure.code(), failure.getMessage());
        } catch (SQLException failure) {
            servletContext.log("designV2 SQL error", failure);
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
            servletContext.log("designV2 request failed", failure);
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
        Map<String, Object> row = ACCOUNTS.findActiveAccount(connection, id);
        if (row == null || AuthSession.version(session) == null
                || ((Number) row.get("auth_version")).longValue() != AuthSession.version(session)) {
            session.invalidate();
            throw new Rejected(401, "SESSION_EXPIRED", "Phiên đã hết hiệu lực");
        }
        return new Actor(id, row.get("vai_tro").toString(),
                ((Number) row.get("auth_version")).longValue(), row.get("ho_ten").toString());
    }

    private static void require(Actor actor, String... roles) {
        for (String role : roles) if (role.equals(actor.role)) return;
        throw new Rejected(403, "FORBIDDEN", "Không có quyền thực hiện");
    }

    private static void setActor(Connection connection, String actor) throws SQLException {
        ACCOUNTS.setActorContext(connection, actor);
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
    private static int integerParameter(HttpServletRequest req, String name, int fallback) {
        String value = req.getParameter(name);
        if (value == null) return fallback;
        try { return Integer.parseInt(value); }
        catch (NumberFormatException invalid) {
            throw new Rejected(400, "VALIDATION_ERROR", "Phân trang không hợp lệ");
        }
    }

    private static String adminSearch(HttpServletRequest req) {
        String value = req.getParameter("q");
        if (value == null || value.isBlank()) return null;
        value = value.trim();
        if (value.length() > 100) throw new Rejected(400, "VALIDATION_ERROR", "Từ khóa tìm kiếm quá dài");
        return value;
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
        Map<String, Object> row;
        try { row = ACCOUNTS.authenticate(connection, username, password); }
        catch (DesignV2Problem failure) {
            if (failure.status() == 401) failed(rateKey);
            throw failure;
        }
        String id = row.get("ma_tk").toString();
        long version = ((Number) row.get("auth_version")).longValue();
        AuthSession.start(req, id, version);
        AUTH_ATTEMPTS.remove(rateKey);
        WebResponses.json(resp, 200, Map.of("maNguoiDung", id, "hoTen", row.get("ho_ten"), "vaiTro", row.get("vai_tro")));
    }

    private static void register(Connection connection, HttpServletRequest req, HttpServletResponse resp) throws Exception {
        JsonNode data = body(req);
        String username = required(data, "username"), password = required(data, "password"), name = required(data, "hoTen");
        String phone = required(data, "soDienThoai");
        String rateKey = "register:" + username + ":" + req.getRemoteAddr();
        limit(rateKey, 5); failed(rateKey);
        String accountId = ACCOUNTS.registerCustomer(connection, username,
                password, name, phone, field(data, "email"));
        if (accountId == null) throw new SQLException("Registration returned no account");
        WebResponses.json(resp, 201, Map.of("maNguoiDung", accountId));
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
        ACCOUNTS.changePassword(connection, actor.id, current, replacement, actor.version);
        AuthSession.end(req, resp, req.getSession(false));
        resp.setStatus(204);
    }

    private void route(Connection c, HttpServletRequest req, HttpServletResponse resp, String path, Actor actor,
                       ServletContext servletContext) throws Exception {
        String method = req.getMethod();
        if (path.equals("/admin/drivers") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", DISPATCH.findCompanyDrivers(c))); return;
        }
        if (path.equals("/admin/drivers") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            String username = required(data, "username").toLowerCase(java.util.Locale.ROOT);
            String password = required(data, "matKhau");
            String name = required(data, "hoTen"), phone = required(data, "soDienThoai");
            String email = optionalEmail(field(data, "email"));
            String cccd = required(data, "cccd"), license = required(data, "soGiayPhep");
            WebResponses.json(resp, 201, ADMIN.createDriver(c, username, password, name, phone, email, cccd, license)); return;
        }
        if (path.matches("/admin/drivers/[0-9a-fA-F-]{36}") && method.equals("PATCH")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.substring("/admin/drivers/".length())).toString();
            JsonNode data = body(req);
            String name = required(data, "hoTen"), phone = required(data, "soDienThoai");
            String email = optionalEmail(field(data, "email")), cccd = required(data, "cccd");
            String license = required(data, "soGiayPhep");
            WebResponses.json(resp, 200, ADMIN.updateDriver(c, id, name, phone, email, cccd, license)); return;
        }
        if (path.matches("/admin/drivers/[0-9a-fA-F-]{36}/password") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            WebResponses.json(resp, 200, ADMIN.resetDriverPassword(c, id, required(body(req), "matKhau"))); return;
        }
        if (path.matches("/admin/drivers/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            WebResponses.json(resp, 200, ADMIN.changeDriverStatus(c, id, action)); return;
        }
        if (path.equals("/admin/customers") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", ADMIN.findCustomers(c))); return;
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
            Map<String,Object> customer = ADMIN.findCustomerDetail(c, id, adminSearch(req), page, size);
            if (customer == null) throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy khách hàng");
            WebResponses.json(resp, 200, customer); return;
        }
        if (path.matches("/admin/customers/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            WebResponses.json(resp, 200, ADMIN.changeCustomerStatus(c, id, action)); return;
        }
        if (path.matches("/admin/customers/[0-9a-fA-F-]{36}/membership") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            WebResponses.json(resp, 200, ADMIN.changeCustomerMembership(c, id, required(body(req), "maHang"))); return;
        }
        if (path.equals("/customers") && method.equals("GET")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", ADMIN.findCustomerDirectory(c))); return;
        }
        if (path.equals("/profile") && method.equals("GET")) {
            WebResponses.json(resp, 200, ADMIN.findProfile(c, actor.id)); return;
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
            WebResponses.json(resp, 200, ADMIN.updateProfile(c, actor.id, name, phone, email)); return;
        }
        if (path.equals("/surcharges") && method.equals("GET")) {
            WebResponses.json(resp, 200, Map.of("items", ADMIN.findActiveSurcharges(c))); return;
        }
        if (path.equals("/drivers") && method.equals("GET")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", DISPATCH.findDispatcherDrivers(c))); return;
        }
        if (path.equals("/drivers/me") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, DISPATCH.findDriverForAccount(c, actor.id)); return;
        }
        if (path.equals("/drivers/me/availability") && method.equals("POST")) {
            require(actor, "TAI_XE");
            boolean online = body(req).path("online").asBoolean(false);
            WebResponses.json(resp, 200, DISPATCH.changeAvailability(c, actor.id, online)); return;
        }
        if (path.equals("/fare/quote") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            RouteService routes = (RouteService) servletContext.getAttribute(RouteConfiguration.ATTRIBUTE);
            WebResponses.json(resp, 200, orderService.quote(c, body(req), actor.id, actor.role, routes)); return;
        }
        if (path.equals("/orders") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            RouteService routes = (RouteService) servletContext.getAttribute(RouteConfiguration.ATTRIBUTE);
            WebResponses.json(resp, 201, orderService.create(c, body(req), actor.id, actor.role,
                    requiredHeader(req, "Idempotency-Key"), routes)); return;
        }
        if (path.equals("/orders") && method.equals("GET")) {
            WebResponses.json(resp, 200, orderService.findOrders(c, req.getParameter("trangThai"),
                    integerParameter(req, "page", 0), integerParameter(req, "size", 20))); return;
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
            WebResponses.json(resp, 200, orderService.findAdminOrders(c, status, adminSearch(req), page, size));
            return;
        }
        if (path.equals("/admin/overview") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, ADMIN.findOverview(c)); return;
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
            DesignV2AdminService.Page result = ADMIN.findIncidents(c, adminSearch(req), page, size);
            WebResponses.json(resp, 200, Map.of("items", result.items(), "total", result.total(), "page", page, "size", size)); return;
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
            Map<String,Object> result = PAYMENTS.report(c);
            DesignV2PaymentService.PaymentPage payments = PAYMENTS.findAdminPayments(c, status, adminSearch(req), page, size);
            result.put("giao_dich_total", payments.total());
            result.put("giao_dich_page", page);
            result.put("giao_dich_size", size);
            result.put("giao_dich", payments.items());
            WebResponses.json(resp, 200, result); return;
        }
        if (path.matches("/admin/payments/[0-9a-fA-F-]{36}/events") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            String paymentId = path.split("/")[3];
            if (!PAYMENTS.paymentExists(c, paymentId))
                throw new Rejected(404, "RESOURCE_NOT_FOUND", "Không tìm thấy giao dịch");
            WebResponses.json(resp, 200, Map.of("items", PAYMENTS.findPaymentEvents(c, paymentId)));
            return;
        }
        if (path.equals("/admin/staff") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, Map.of("items", ADMIN.findStaff(c))); return;
        }
        if (path.equals("/admin/staff") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            String username = required(data, "username").toLowerCase(java.util.Locale.ROOT);
            String password = required(data, "matKhau");
            String name = required(data, "hoTen"), phone = field(data, "soDienThoai");
            if (phone != null && phone.isBlank()) phone = null;
            String email = optionalEmail(field(data, "email"));
            WebResponses.json(resp, 201, ADMIN.createStaff(c, username, password, name, phone, email)); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}") && method.equals("PATCH")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.substring("/admin/staff/".length())).toString();
            JsonNode data = body(req);
            String name = required(data, "hoTen"), phone = field(data, "soDienThoai");
            if (phone != null && phone.isBlank()) phone = null;
            String email = optionalEmail(field(data, "email"));
            WebResponses.json(resp, 200, ADMIN.updateStaff(c, id, name, phone, email)); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}/status") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String action = required(body(req), "hanhDong");
            WebResponses.json(resp, 200, ADMIN.changeStaffStatus(c, id, action)); return;
        }
        if (path.matches("/admin/staff/[0-9a-fA-F-]{36}/password") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            String id = UUID.fromString(path.split("/")[3]).toString();
            String password = required(body(req), "matKhau");
            WebResponses.json(resp, 200, ADMIN.resetStaffPassword(c, id, password)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/suggestions") && method.equals("GET")) {
            require(actor, "TONG_DAI");
            String order = path.split("/")[2];
            WebResponses.json(resp, 200, Map.of("items", DISPATCH.suggestDrivers(c, order))); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/driver-route") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, DISPATCH.driverRoute(c, actor.id, path.split("/")[2])); return;
        }
        if (path.matches("/drivers/[0-9a-fA-F-]{36}/position") && method.equals("POST")) {
            require(actor, "TONG_DAI", "CHU_DOI_XE");
            WebResponses.json(resp, 200, DISPATCH.configurePosition(c, path.split("/")[2],
                    required(body(req), "diaChi"))); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}") && method.equals("GET")) {
            WebResponses.json(resp, 200, orderService.findOrder(c, path.substring(8))); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/assign") && method.equals("POST")) {
            require(actor, "TONG_DAI");
            String order = path.split("/")[2];
            orderService.assign(c, order, required(body(req), "maTx"));
            WebResponses.json(resp, 200, orderService.findOrder(c, order)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/progress") && method.equals("POST")) {
            require(actor, "TAI_XE");
            String order = path.split("/")[2]; JsonNode data = body(req);
            orderService.progress(c, order, required(data, "hanhDong"), field(data, "ghiChu"));
            WebResponses.json(resp, 200, orderService.findOrder(c, order)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/complete") && method.equals("POST")) {
            require(actor, "TAI_XE");
            JsonNode data = body(req);
            String order = path.split("/")[2];
            orderService.complete(c, order, data.path("xacNhanThuDu").asBoolean(false));
            WebResponses.json(resp, 200, orderService.findOrder(c, order)); return;
        }
        if (path.matches("/orders/[0-9a-fA-F-]{36}/cancel") && method.equals("POST")) {
            require(actor, "KHACH_HANG", "TONG_DAI", "CHU_DOI_XE");
            String order = path.split("/")[2];
            orderService.cancel(c, order, required(body(req), "lyDo"));
            WebResponses.json(resp, 200, orderService.findOrder(c, order)); return;
        }
        if (path.equals("/drivers/me/finance") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, PAYMENTS.finance(c, actor.id)); return;
        }
        if (path.equals("/drivers/me/earnings") && method.equals("GET")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, PAYMENTS.earnings(c, actor.id,
                    LocalDate.parse(req.getParameter("tu")), LocalDate.parse(req.getParameter("den")))); return;
        }
        if (path.equals("/drivers/me/settlements") && method.equals("POST")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, PAYMENTS.beginSettlement(c,
                    requiredHeader(req, "Idempotency-Key"), req.getRemoteAddr())); return;
        }
        if (path.equals("/drivers/me/settlements/reconcile") && method.equals("POST")) {
            require(actor, "TAI_XE");
            WebResponses.json(resp, 200, PAYMENTS.reconcile(c, actor.id)); return;
        }
        if (path.equals("/reports/finance") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE");
            WebResponses.json(resp, 200, PAYMENTS.report(c)); return;
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
        if (path.equals("/vehicles") && method.equals("GET")) {
            require(actor, "CHU_DOI_XE", "TONG_DAI");
            WebResponses.json(resp, 200, Map.of("items", DISPATCH.findVehicles(c))); return;
        }
        if (path.equals("/vehicles") && method.equals("POST")) {
            require(actor, "CHU_DOI_XE");
            JsonNode data = body(req);
            DISPATCH.manageVehicle(c, required(data, "hanhDong"), required(data, "maTx"),
                    field(data, "bienSo"), field(data, "loaiXe"), field(data, "mauXe"), data.path("hoatDong").asBoolean(true));
            WebResponses.json(resp, 200, Map.of("items", DISPATCH.findVehicleRows(c))); return;
        }
        throw new Rejected(404, "RESOURCE_NOT_FOUND", "Chức năng không tồn tại");
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

    private static String optionalEmail(String value) {
        if (value == null || value.isBlank()) return null;
        String email = value.strip();
        if (email.length() > 150 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            throw new Rejected(400, "VALIDATION_ERROR", "Email không hợp lệ");
        return email;
    }

}
