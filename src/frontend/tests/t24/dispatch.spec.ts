import { test, expect, type Page, type Route } from "@playwright/test";
const user = { maNguoiDung: "TD01", hoTen: "Nguyễn Tổng Đài", vaiTro: "TONG_DAI", maKh: null, maTx: null };
const driver = { maTx: "TX01", hoTen: "Trần Tài Xế", soDienThoai: "0901234567", trangThaiHoatDong: "ONLINE", dangBanChuyen: false, phuongTien: { maPhuongTien: "XE01", bienSoXe: "59A-12345", loaiXe: "XE_MAY", mauXe: "Đen" } };
function order(status = "CHO_GAN") {
  return { maDon: "DH01", thoiGianTao: new Date().toISOString(), diemLayHang: "Điểm lấy kiểm thử", diemGiaoHang: "Điểm giao kiểm thử", sdtNguoiNhan: "0909876543", quangDuongKm: "5.00", ghiChuGiaoHang: "Gọi trước khi giao", trangThai: status, maKh: "KH01", maTx: status === "DA_GAN" ? "TX01" : null, maTkTao: "TD01",
    cuoc: { cuocGoc: "50000.00", tienPhuThu: "10000.00", tienGiamGia: "5000.00", tongCuoc: "55000.00", donViTien: "VND", phuThu: [{ maPhuThu: "PT01", tenPhuThu: "Hàng nặng", soTienTinh: "10000.00" }] }, kienHang: [{ loaiHangHoa: "Thực phẩm", khoiLuongKg: "2.00", ghiChuBaoQuan: "Giữ lạnh" }], thanhToan: { trangThai: "CHUA_THANH_TOAN", soTienConPhaiThu: "55000.00", canDoiSoat: false }, hoanTatLuc: null, huyLuc: null };
}
function pageOf<T>(items: T[], page = 0, totalPages = items.length ? 1 : 0) { return { items, page, size: 10, totalElements: items.length, totalPages }; }
function detail(value = order()) {
  return { ...value, phanCong: [], nhatKy: [], phienBanChinhSach: {}, xacNhanThanhToan: null };
}
const respond = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
type Handler = (route: Route, path: string) => Promise<boolean | void>;
async function mock(page: Page, handler?: Handler) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (await handler?.(route, path)) return;
    if (path === "/api/auth/me") return respond(route, user);
    if (path === "/api/auth/csrf") return respond(route, { csrfToken: "test-token", headerName: "X-CSRF-Token" });
    if (path === "/api/auth/login") return respond(route, user);
    if (path === "/api/auth/logout") return route.fulfill({ status: 204 });
    if (path === "/api/orders") return respond(route, { ...pageOf([order()]), summary: { tongSoDon: 1, tongCuoc: "55000.00" } });
    if (path === "/api/drivers" || path.endsWith("/driver-suggestions")) return respond(route, pageOf([driver]));
    if (path === "/api/orders/DH01") return respond(route, detail());
    return respond(route, { code: "RESOURCE_NOT_FOUND" }, 404);
  });
}
async function assignDialog(page: Page) {
  await page.goto("/dispatcher"); await page.getByRole("button", { name: "Gán tài xế", exact: true }).click();
  return page.getByRole("dialog");
}
test("không có session không gọi API nghiệp vụ", async ({ page }) => {
  let reads = 0;
  await mock(page, async (route, path) => { if (path === "/api/auth/me") { await respond(route, { code: "AUTH_REQUIRED" }, 401); return true; } if (path === "/api/orders") reads++; });
  await page.goto("/dispatcher"); await expect(page.getByRole("link", { name: "Đăng nhập tổng đài", exact: true })).toBeVisible(); expect(reads).toBe(0);
});
test("vai trò khách hàng không thấy hành động điều phối", async ({ page }) => {
  await mock(page, async (route, path) => { if (path === "/api/auth/me") { await respond(route, { ...user, vaiTro: "KHACH_HANG" }); return true; } });
  await page.goto("/dispatcher/fleet"); await expect(page.getByRole("heading", { name: "Không có quyền điều phối" })).toBeVisible(); await expect(page.getByRole("button", { name: "Gán tài xế" })).toHaveCount(0);
});
test("đăng nhập sai hiển thị lỗi và đăng nhập đúng có CSRF", async ({ page }) => {
  let authenticated = false, attempts = 0;
  await mock(page, async (route, path) => {
    if (path === "/api/auth/me" && !authenticated) { await respond(route, { code: "AUTH_REQUIRED" }, 401); return true; }
    if (path === "/api/auth/login") { attempts++; expect(route.request().headers()["x-csrf-token"]).toBe("test-token"); expect(route.request().postDataJSON()).toEqual({ username: "tongdai", password: "matkhau" });
      if (attempts === 1) await respond(route, { code: "INVALID_CREDENTIALS" }, 401); else { authenticated = true; await respond(route, user); } return true;
    }
  });
  await page.goto("/dispatcher/sign-in"); await page.getByLabel("Tên đăng nhập").fill("tongdai"); await page.getByLabel("Mật khẩu").fill("matkhau");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.locator("main").getByRole("alert")).toContainText("không đúng");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible();
});
test("ô Điều Phối Viên đăng nhập trên form chung rồi mở T24", async ({ page }) => {
  let authenticated = false;
  await mock(page, async (route, path) => {
    if (path === "/api/auth/me" && !authenticated) { await respond(route, { code: "AUTH_REQUIRED" }, 401); return true; }
    if (path === "/api/auth/login") {
      expect(route.request().postDataJSON()).toEqual({ username: "demo_dispatcher", password: "matkhau" });
      authenticated = true;
      await respond(route, user);
      return true;
    }
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Điều Phối Viên: vào bàn điều phối T24" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập điều phối viên" })).toBeVisible();
  await expect(page.getByLabel("Tên đăng nhập tổng đài")).toHaveValue("demo_dispatcher");
  await page.getByLabel("Mật khẩu").fill("matkhau");
  await page.getByRole("button", { name: "Đăng nhập vào hệ thống" }).click();
  await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible();
  await page.goto("/login");
  await page.getByRole("button", { name: "Điều Phối Viên: vào bàn điều phối T24" }).click();
  await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible();
});
test("lọc đơn và phân trang gửi đúng query; ngày sai không gửi", async ({ page }) => {
  const requests: URL[] = [];
  await mock(page, async (route, path) => { if (path === "/api/orders") { const url = new URL(route.request().url()); requests.push(url); await respond(route, { ...pageOf([order()], Number(url.searchParams.get("page")), 2), totalElements: 11, summary: { tongSoDon: 11, tongCuoc: "605000.00" } }); return true; } });
  await page.goto("/dispatcher"); await expect(page.getByRole("link", { name: "DH01", exact: true })).toBeVisible();
  expect(requests[0].searchParams.get("trangThai")).toBe("CHO_GAN");
  await page.getByRole("button", { name: "Trang sau" }).click(); await expect(page.getByText("Trang 2 / 2")).toBeVisible(); expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  await page.getByLabel("Trạng thái đơn").selectOption("DANG_GIAO"); await page.getByLabel("Từ ngày").fill("2026-10-12"); await page.getByLabel("Đến ngày (không gồm)").fill("2026-10-13"); await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get("trangThai")).toBe("DANG_GIAO"); expect(requests.at(-1)?.searchParams.get("page")).toBe("0"); expect(requests.at(-1)?.searchParams.get("tuNgay")).toBe("2026-10-12");
  const count = requests.length; await page.getByLabel("Đến ngày (không gồm)").fill("2026-10-11"); await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click(); await expect(page.locator("main").getByRole("alert")).toContainText("phải sau"); expect(requests.length).toBe(count);
  await expect(page.getByRole("link", { name: "Tạo đơn tổng đài", exact: true }).first()).toHaveAttribute("href", "/dispatcher/create-order");
  await page.getByRole("link", { name: "Tạo đơn tổng đài", exact: true }).first().click(); await expect(page.getByRole("heading", { name: "Tiếp Nhận Cuộc Gọi Tạo Đơn Nhanh" })).toBeVisible(); await expect(page.getByText(/Đây là bản xem trước form tạo đơn/)).toBeVisible();
});
test("tài xế rảnh và bộ lọc trạng thái dùng API", async ({ page }) => {
  const queries: URL[] = [];
  await mock(page, async (route, path) => { if (path === "/api/drivers") { const url = new URL(route.request().url()); queries.push(url); await respond(route, pageOf([driver], Number(url.searchParams.get("page")), 2)); return true; } });
  await page.goto("/dispatcher/fleet"); await expect(page.getByText(driver.hoTen, { exact: true })).toBeVisible(); expect(queries[0].searchParams.get("dangBanChuyen")).toBe("false");
  await page.getByLabel("Hoạt động", { exact: true }).selectOption("OFFLINE"); await page.getByLabel("Chuyến hiện tại").selectOption("true"); await expect.poll(() => queries.at(-1)?.searchParams.get("dangBanChuyen")).toBe("true"); expect(queries.at(-1)?.searchParams.get("trangThaiHoatDong")).toBe("OFFLINE");
  await page.getByRole("button", { name: "Trang sau" }).click(); await expect.poll(() => queries.at(-1)?.searchParams.get("page")).toBe("1");
});
test("chi tiết hiển thị phân công backend, kiện hàng và nhật ký theo thứ tự", async ({ page }) => {
  const current = { ...detail(order("DA_GAN")), phanCong: [{ maPhanCong: "PC-OLD", maTx: "TX99", maTkDieuPhoi: "TD01", batDauLuc: new Date().toISOString(), ketThucLuc: new Date().toISOString(), ketQuaKetThuc: "TU_CHOI", lyDo: "Xe hỏng" }, { maPhanCong: "PC-NOW", maTx: "TX01", maTkDieuPhoi: "TD01", batDauLuc: new Date().toISOString(), ketThucLuc: null, ketQuaKetThuc: null, lyDo: null }], nhatKy: [2, 1].map((thuTu) => ({ maSuKien: `EV${thuTu}`, thuTu, loaiSuKien: `TEST${thuTu}`, trangThaiTruoc: null, trangThaiSau: "DA_GAN", thoiGian: new Date().toISOString(), nguoiThucHien: user.hoTen, ghiChu: null })) };
  await mock(page, async (route, path) => { if (path === "/api/orders/DH01") { await respond(route, current); return true; } });
  await page.goto("/dispatcher/orders/DH01"); await expect(page.getByText("Tài xế hiện tại").locator("..")).toContainText("TX01"); await expect(page.getByText("Lý do: Xe hỏng")).toBeVisible(); await expect(page.getByText(/Thực phẩm · 2.00 kg/)).toBeVisible();
  const texts = await page.locator("p").allTextContents(); expect(texts.indexOf("#1 · TEST1")).toBeLessThan(texts.indexOf("#2 · TEST2"));
  await expect(page.getByRole("button", { name: "Gán tài xế", exact: true })).toHaveCount(0);
});
test("không có gợi ý không được gán", async ({ page }) => {
  let writes = 0;
  await mock(page, async (route, path) => { if (path.endsWith("/driver-suggestions")) { await respond(route, pageOf([])); return true; } if (path.endsWith("/assignments")) writes++; });
  const dialog = await assignDialog(page); await expect(dialog.getByText(/Không có tài xế phù hợp/)).toBeVisible(); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled(); expect(writes).toBe(0);
});
test("gán cần chọn rõ ràng, gửi một POST và cập nhật đơn", async ({ page }) => {
  let assigned = false, writes = 0;
  await mock(page, async (route, path) => {
    if (path.endsWith("/assignments")) { writes++; expect(route.request().method()).toBe("POST"); expect(route.request().headers()["x-csrf-token"]).toBe("test-token"); expect(route.request().postDataJSON()).toEqual({ maTx: "TX01" }); await new Promise((resolve) => setTimeout(resolve, 150)); assigned = true; await respond(route, order("DA_GAN")); return true; }
    if (path === "/api/orders" && assigned) { await respond(route, { ...pageOf([]), summary: { tongSoDon: 0, tongCuoc: "0.00" } }); return true; }
  });
  const dialog = await assignDialog(page); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled(); await dialog.getByRole("radio").check();
  await dialog.getByRole("button", { name: "Xác nhận gán" }).click(); await expect(dialog.getByRole("button", { name: "Đang gán…" })).toBeDisabled(); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(page.getByText("Không có đơn khớp bộ lọc.")).toBeVisible(); expect(writes).toBe(1);
});
test("tài xế vừa bận tải lại gợi ý và bỏ lựa chọn cũ", async ({ page }) => {
  let conflicted = false;
  await mock(page, async (route, path) => {
    if (path.endsWith("/assignments")) { conflicted = true; await respond(route, { code: "DRIVER_UNAVAILABLE" }, 409); return true; }
    if (path.endsWith("/driver-suggestions") && conflicted) { await respond(route, pageOf([{ ...driver, maTx: "TX02", hoTen: "Tài xế mới" }])); return true; }
  });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await dialog.getByRole("button", { name: "Xác nhận gán" }).click();
  await expect(dialog.getByRole("alert")).toContainText("vừa bận"); await expect(dialog.getByText("Tài xế mới", { exact: true })).toBeVisible(); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled();
});
test("đơn bị gán bởi người khác giữ thông báo conflict và tải lại", async ({ page }) => {
  let conflicted = false;
  await mock(page, async (route, path) => {
    if (path.endsWith("/assignments")) { conflicted = true; await respond(route, { code: "ORDER_STATE_CONFLICT" }, 409); return true; }
    if (path === "/api/orders" && conflicted) { await respond(route, { ...pageOf([]), summary: { tongSoDon: 0, tongCuoc: "0.00" } }); return true; }
  });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await dialog.getByRole("button", { name: "Xác nhận gán" }).click(); await expect(page.locator("main").getByRole("alert").first()).toContainText("Trạng thái đơn đã thay đổi"); await expect(page.getByText("Không có đơn khớp bộ lọc.")).toBeVisible();
});
test("hủy bắt buộc lý do, trim và chỉ cập nhật khi backend xác nhận", async ({ page }) => {
  let cancelled = false, writes = 0;
  await mock(page, async (route, path) => {
    if (path.endsWith("/cancel")) { writes++; expect(route.request().postDataJSON()).toEqual({ lyDo: "Khách yêu cầu" }); expect(route.request().headers()["x-csrf-token"]).toBe("test-token"); cancelled = true; await respond(route, order("DA_HUY")); return true; }
    if (path === "/api/orders/DH01") { await respond(route, detail(order(cancelled ? "DA_HUY" : "DA_GAN"))); return true; }
  });
  await page.goto("/dispatcher/orders/DH01"); await page.getByRole("button", { name: "Hủy đơn", exact: true }).click(); const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Xác nhận hủy" })).toBeDisabled(); await dialog.getByLabel("Lý do hủy (bắt buộc)").fill("   "); await expect(dialog.getByRole("button", { name: "Xác nhận hủy" })).toBeDisabled();
  await dialog.getByLabel("Lý do hủy (bắt buộc)").fill("  Khách yêu cầu  "); await dialog.getByRole("button", { name: "Xác nhận hủy" }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible(); expect(writes).toBe(1);
});
test("hủy hết 300 giây hoặc trạng thái đang giao bị vô hiệu", async ({ page }) => {
  await mock(page, async (route, path) => { if (path === "/api/orders/DH01") { await respond(route, detail({ ...order("DA_GAN"), thoiGianTao: new Date(Date.now() - 300000).toISOString() })); return true; } });
  await page.goto("/dispatcher/orders/DH01"); await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toBeDisabled();
  await page.unroute("**/api/**"); await mock(page, async (route, path) => { if (path === "/api/orders/DH01") { await respond(route, detail(order("DANG_GIAO"))); return true; } });
  await page.reload(); await expect(page.getByText("Đang giao", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toHaveCount(0);
});
test("backend từ chối hủy do hết hạn không tự đổi dữ liệu", async ({ page }) => {
  await mock(page, async (route, path) => { if (path.endsWith("/cancel")) { await respond(route, { code: "CANCELLATION_WINDOW_EXPIRED" }, 409); return true; } });
  await page.goto("/dispatcher/orders/DH01"); await page.getByRole("button", { name: "Hủy đơn", exact: true }).click(); const dialog = page.getByRole("dialog"); await dialog.getByLabel("Lý do hủy (bắt buộc)").fill("Thử hủy"); await dialog.getByRole("button", { name: "Xác nhận hủy" }).click(); await expect(dialog.getByRole("alert")).toContainText("hết thời hạn"); await expect(dialog.getByRole("button", { name: "Xác nhận hủy" })).toBeDisabled(); await expect(page.getByText("Chờ gán", { exact: true })).toBeVisible();
});
test("mất mạng khi gán không tự gửi lại POST", async ({ page }) => {
  let writes = 0;
  await mock(page, async (route, path) => { if (path.endsWith("/assignments")) { writes++; await route.abort(); return true; } });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await dialog.getByRole("button", { name: "Xác nhận gán" }).click(); await expect(dialog.getByRole("alert")).toContainText("Không nhận được phản hồi"); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled(); expect(writes).toBe(1);
});
test("session hết hạn khi gán khóa khu vực điều phối", async ({ page }) => {
  await mock(page, async (route, path) => { if (path.endsWith("/assignments")) { await respond(route, { code: "SESSION_EXPIRED" }, 401); return true; } });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await dialog.getByRole("button", { name: "Xác nhận gán" }).click(); await expect(page.locator("main").getByRole("alert")).toContainText("hết hạn"); await expect(page.getByRole("button", { name: "Gán tài xế", exact: true })).toHaveCount(0);
});
test("lỗi tải dữ liệu có thử lại và không có dữ liệu giả", async ({ page }) => {
  let failed = true;
  await mock(page, async (route, path) => { if (path === "/api/orders" && failed) { await respond(route, { code: "INTERNAL_ERROR" }, 500); return true; } });
  await page.goto("/dispatcher"); await expect(page.locator("main").getByRole("alert")).toBeVisible(); await expect(page.getByRole("link", { name: "DH01", exact: true })).toHaveCount(0); failed = false; await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByRole("link", { name: "DH01", exact: true })).toBeVisible();
});
test("modal hỗ trợ Escape và trả focus về nút mở", async ({ page }) => {
  await mock(page); const dialog = await assignDialog(page); await expect(dialog).toBeFocused(); await page.keyboard.press("Tab"); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(page.getByRole("button", { name: "Gán tài xế", exact: true })).toBeFocused();
});
test("proxy chuyển cookie HttpOnly, CSRF sau đổi session và logout thật", async ({ page, context }) => {
  // No route interception: goes through Next rewrites to a local HTTP protocol fixture.
  await page.goto("/dispatcher/sign-in"); await page.getByLabel("Tên đăng nhập").fill("fixture-dispatcher"); await page.getByLabel("Mật khẩu").fill("fixture-password"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible(); const session = (await context.cookies()).find((cookie) => cookie.name === "JSESSIONID"); expect(session?.httpOnly).toBe(true); expect(session?.value).toBe("fixture-auth");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click(); await expect(page.getByRole("heading", { name: "Đăng nhập điều phối viên" })).toBeVisible(); expect((await context.cookies()).find((cookie) => cookie.name === "JSESSIONID")).toBeUndefined();
});
test("phản hồi bộ lọc cũ không ghi đè bộ lọc mới", async ({ page }) => {
  await mock(page, async (route, path) => {
    if (path === "/api/orders") {
      const status = new URL(route.request().url()).searchParams.get("trangThai");
      if (status === "DA_GAN") await new Promise((resolve) => setTimeout(resolve, 600));
      await respond(route, { ...pageOf([{ ...order(status ?? "CHO_GAN"), maDon: status === "DA_GAN" ? "DH-OLD" : status === "HOAN_TAT" ? "DH-NEW" : "DH01" }]), summary: { tongSoDon: 1, tongCuoc: "55000.00" } }); return true;
    }
  });
  await page.goto("/dispatcher"); await expect(page.getByRole("link", { name: "DH01", exact: true })).toBeVisible();
  await page.getByLabel("Trạng thái đơn").selectOption("DA_GAN"); await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await page.getByLabel("Trạng thái đơn").selectOption("HOAN_TAT"); await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect(page.getByRole("link", { name: "DH-NEW", exact: true })).toBeVisible();
  // Wait beyond the intentionally delayed old response, then verify the final screen.
  await expect.poll(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); return page.getByRole("link", { name: "DH-NEW", exact: true }).count(); }).toBe(1);
  await expect(page.getByRole("link", { name: "DH-OLD", exact: true })).toHaveCount(0);
});
test("gợi ý có phân trang và đổi trang xóa lựa chọn", async ({ page }) => {
  await mock(page, async (route, path) => { if (path.endsWith("/driver-suggestions")) {
    const index = Number(new URL(route.request().url()).searchParams.get("page")); await respond(route, { ...pageOf([{ ...driver, maTx: index ? "TX02" : "TX01", hoTen: index ? "Tài xế trang hai" : driver.hoTen }], index, 2), totalElements: 11 }); return true;
  } });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Trang sau" }).click(); await expect(dialog.getByText("Tài xế trang hai", { exact: true })).toBeVisible(); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled();
});
test("đang mở xác nhận thì đủ 300 giây sẽ khóa hủy", async ({ page }) => {
  const fixed = new Date("2026-10-13T05:00:00Z"); await page.clock.install({ time: fixed });
  await mock(page, async (route, path) => { if (path === "/api/orders/DH01") { await respond(route, detail({ ...order(), thoiGianTao: new Date(fixed.getTime() - 298000).toISOString() })); return true; } });
  await page.goto("/dispatcher/orders/DH01"); await page.getByRole("button", { name: "Hủy đơn", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy (bắt buộc)").fill("Khách yêu cầu"); await expect(dialog.getByRole("button", { name: "Xác nhận hủy" })).toBeEnabled();
  await page.clock.fastForward(3000); await expect(dialog.getByRole("button", { name: "Xác nhận hủy" })).toBeDisabled(); await expect(dialog.getByRole("alert")).toContainText("không còn trong thời hạn");
});
test("CSRF bị từ chối không báo gán thành công hoặc tự gửi lại", async ({ page }) => {
  let writes = 0;
  await mock(page, async (route, path) => { if (path.endsWith("/assignments")) { writes++; await respond(route, { code: "CSRF_INVALID" }, 403); return true; } });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); await dialog.getByRole("button", { name: "Xác nhận gán" }).click(); await expect(dialog.getByRole("alert")).toContainText("Phiên bảo vệ"); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled(); expect(writes).toBe(1);
});
test("gợi ý lỗi khi đơn đã đổi trạng thái không thể xác nhận gán", async ({ page }) => {
  let stale = false, writes = 0;
  await mock(page, async (route, path) => {
    if (path.endsWith("/driver-suggestions")) {
      if (!stale) await respond(route, pageOf([driver])); else await respond(route, { code: "ORDER_STATE_CONFLICT" }, 409);
      return true;
    }
    if (path.endsWith("/assignments")) writes++;
  });
  const dialog = await assignDialog(page); await dialog.getByRole("radio").check(); stale = true; await dialog.getByRole("button", { name: "Làm mới tài xế" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Trạng thái đơn đã thay đổi"); await expect(dialog.getByRole("button", { name: "Xác nhận gán" })).toBeDisabled(); expect(writes).toBe(0);
});
