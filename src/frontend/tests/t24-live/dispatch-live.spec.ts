import { test, expect, request, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { Order, OrderDetail, Page as ApiPage, Driver } from "../../lib/api/dispatch";
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:18081";
let dispatcher: APIRequestContext;
let customer: APIRequestContext;
const created: string[] = [];
async function csrfPost(client: APIRequestContext, path: string, data: unknown, expected = 200, extraHeaders = {}) {
  const csrf = await client.get("/api/auth/csrf"); expect(csrf.status()).toBe(200);
  const token = (await csrf.json()).csrfToken;
  const response = await client.post(path, { data, headers: { "X-CSRF-Token": token, ...extraHeaders } });
  expect(response.status(), `${path} unexpected HTTP status`).toBe(expected); return response.json();
}
async function createOrder(): Promise<Order> {
  const input = { diemLayHang: "Điểm mẫu A", diemGiaoHang: "Điểm mẫu B", kienHang: [{ loaiHangHoa: "Hoa", khoiLuongKg: "1.00" }] };
  const quote = await csrfPost(customer, "/api/quotes", input);
  const order = await csrfPost(customer, "/api/orders", { ...input, maBaoGia: quote.maBaoGia, sdtNguoiNhan: "0901234567" }, 201, { "Idempotency-Key": randomUUID() });
  created.push(order.maDon); return order;
}
async function signIn(page: Page) {
  await page.goto("/dispatcher/sign-in");
  await page.getByLabel("Tên đăng nhập").fill("demo_dispatcher");
  await page.getByLabel("Mật khẩu").fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible();
}
async function openAssignment(page: Page, id: string, driverId: string) {
  await page.goto(`/dispatcher/orders/${encodeURIComponent(id)}`);
  await page.getByRole("button", { name: "Gán tài xế", exact: true }).click();
  // Seed driver's id is fixed; selection is checked against each backend suggestion response.
  await page.getByRole("dialog").locator(`input[type="radio"][value="${driverId}"]`).check();
}
async function candidate(id: string): Promise<string> {
  const response = await dispatcher.get(`/api/orders/${encodeURIComponent(id)}/driver-suggestions?size=100`);
  expect(response.status()).toBe(200); const result: ApiPage<Driver> = await response.json();
  expect(result.items.length, "Reset/seed the isolated test stack: an eligible driver is required").toBeGreaterThan(0);
  return result.items[0].maTx;
}
async function current(id: string): Promise<OrderDetail> {
  const response = await dispatcher.get(`/api/orders/${encodeURIComponent(id)}`);
  expect(response.status()).toBe(200); return response.json();
}
test.beforeAll(async () => {
  // Fail rather than skip or touch development data when configuration is wrong.
  expect(process.env.DEMO_PASSWORD, "Set DEMO_PASSWORD to the value used to seed the isolated test DB").toBeTruthy();
  dispatcher = await request.newContext({ baseURL: base });
  const health = await dispatcher.get("/api/health"); expect(health.status()).toBe(200);
  expect((await health.json()).databaseName, "Live tests write orders: dedicated mini_ong_vang_test required").toBe("mini_ong_vang_test");
  await csrfPost(dispatcher, "/api/auth/login", { username: "demo_dispatcher", password: process.env.DEMO_PASSWORD });
  customer = await request.newContext({ baseURL: base });
  await csrfPost(customer, "/api/auth/login", { username: "0900000001", password: process.env.DEMO_PASSWORD });
});
test.afterEach(async () => {
  for (const id of created.splice(0)) {
    const value = await current(id);
    if (["CHO_GAN", "DA_GAN"].includes(value.trangThai)) await csrfPost(dispatcher, `/api/orders/${encodeURIComponent(id)}/cancel`, { lyDo: "Dọn đơn kiểm thử T24" });
  }
});
test.afterAll(async () => { await customer?.dispose(); await dispatcher?.dispose(); });
test("hotline FE báo giá và tạo đơn xuất hiện trong hàng đợi SQL Server", async ({ page }) => {
  await signIn(page);
  await page.goto("/dispatcher/create-order");
  await page.getByRole("button", { name: "Tìm khách hàng", exact: true }).click();
  await page.getByLabel("Chọn khách Khách thường", { exact: true }).check();
  await page.getByLabel("Địa chỉ lấy hàng", { exact: true }).fill("Quận 1");
  await page.getByLabel("Địa chỉ giao hàng", { exact: true }).fill("Quận 3");
  await page.getByLabel("Số điện thoại người nhận", { exact: true }).fill("0901234567");
  await page.getByRole("button", { name: "Lấy báo giá", exact: true }).click();
  await expect(page.getByRole("region", { name: "Báo giá từ backend" })).toBeVisible();
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/orders" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Tạo đơn & Đưa vào hàng đợi điều phối", exact: true }).click();
  const response = await responsePromise; expect(response.status()).toBe(201);
  const value: Order = await response.json(); created.push(value.maDon);
  await expect(page.getByRole("heading", { name: "Bàn điều phối" })).toBeVisible();
  await expect(page.getByRole("link", { name: value.maDon, exact: true })).toBeVisible();
  const stored = await current(value.maDon);
  expect(stored.maKh).toBe("KH-DEMO-1"); expect(stored.maTkTao).toBe("TK-DEMO-NV"); expect(stored.trangThai).toBe("CHO_GAN");
  expect(stored.nhatKy.some((event) => event.loaiSuKien === "TAO_DON")).toBe(true);
});
test("FE thật gán, đọc phân công, hủy có lý do và giải phóng tài xế", async ({ page }) => {
  const value = await createOrder(); const driverId = await candidate(value.maDon);
  await signIn(page); await openAssignment(page, value.maDon, driverId);
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận gán" }).click();
  await expect(page.getByText("Đã gán", { exact: true })).toBeVisible();
  const assigned = await current(value.maDon); expect(assigned.phanCong.filter((assignment) => assignment.ketThucLuc === null)).toHaveLength(1); expect(assigned.maTx).toBe(driverId);
  await page.getByRole("button", { name: "Hủy đơn", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy (bắt buộc)").fill("Khách đổi kế hoạch T24"); await dialog.getByRole("button", { name: "Xác nhận hủy" }).click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible(); const cancelled = await current(value.maDon);
  expect(cancelled.phanCong.filter((assignment) => assignment.ketThucLuc === null)).toHaveLength(0);
  expect(cancelled.phanCong[0].ketQuaKetThuc).toBe("HUY_DON"); expect(cancelled.phanCong[0].lyDo).toBe("Khách đổi kế hoạch T24");
  const drivers: ApiPage<Driver> = await (await dispatcher.get("/api/drivers?size=100")).json(); expect(drivers.items.find((driver) => driver.maTx === driverId)?.dangBanChuyen).toBe(false);
});
test("hai phiên FE gán cùng đơn chỉ một thành công", async ({ page, browser }) => {
  const value = await createOrder(); const driverId = await candidate(value.maDon);
  const other = await browser.newContext(); const second = await other.newPage();
  try {
    await signIn(page); await signIn(second); await openAssignment(page, value.maDon, driverId); await openAssignment(second, value.maDon, driverId);
    const responses = [page.waitForResponse((response) => response.url().endsWith("/assignments") && response.request().method() === "POST"), second.waitForResponse((response) => response.url().endsWith("/assignments") && response.request().method() === "POST")];
    await Promise.all([page.getByRole("dialog").getByRole("button", { name: "Xác nhận gán" }).click(), second.getByRole("dialog").getByRole("button", { name: "Xác nhận gán" }).click()]);
    const result = await Promise.all(responses); expect(result.map((response) => response.status()).sort()).toEqual([200, 409]);
    const loser = result[0].status() === 409 ? page : second;
    await expect(loser.locator("main").getByRole("alert").first()).toContainText("Trạng thái đơn đã thay đổi");
    const assigned = await current(value.maDon); expect(assigned.phanCong.filter((assignment) => assignment.ketThucLuc === null)).toHaveLength(1);
  } finally { await other.close(); }
});
test("hai đơn tranh cùng tài xế chỉ một phân công đang mở", async ({ page, browser }) => {
  const firstOrder = await createOrder(), secondOrder = await createOrder(); const driverId = await candidate(firstOrder.maDon);
  const other = await browser.newContext(); const second = await other.newPage();
  try {
    await signIn(page); await signIn(second); await openAssignment(page, firstOrder.maDon, driverId); await openAssignment(second, secondOrder.maDon, driverId);
    const responses = [page.waitForResponse((response) => response.url().endsWith("/assignments") && response.request().method() === "POST"), second.waitForResponse((response) => response.url().endsWith("/assignments") && response.request().method() === "POST")];
    await Promise.all([page.getByRole("dialog").getByRole("button", { name: "Xác nhận gán" }).click(), second.getByRole("dialog").getByRole("button", { name: "Xác nhận gán" }).click()]);
    const result = await Promise.all(responses); expect(result.map((response) => response.status()).sort()).toEqual([200, 409]);
    const loser = result[0].status() === 409 ? page : second;
    await expect(loser.getByRole("dialog").getByRole("alert")).toContainText("vừa bận");
    const all = await Promise.all([current(firstOrder.maDon), current(secondOrder.maDon)]);
    expect(all.flatMap((value) => value.phanCong).filter((assignment) => assignment.maTx === driverId && assignment.ketThucLuc === null)).toHaveLength(1);
    expect(all.map((value) => value.trangThai).sort()).toEqual(["CHO_GAN", "DA_GAN"]);
  } finally { await other.close(); }
});
