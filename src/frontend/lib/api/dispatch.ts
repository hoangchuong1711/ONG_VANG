/** Public DTOs from OpenAPI / Java dto records. Money stays decimal text. */
export type Role = "KHACH_HANG" | "TONG_DAI" | "TAI_XE" | "CHU_DOI_XE";
export interface User { maNguoiDung: string; hoTen: string; vaiTro: Role; maKh: string | null; maTx: string | null }
export type OrderStatus = "CHO_GAN" | "DA_GAN" | "DA_LAY_HANG" | "DANG_GIAO" | "HOAN_TAT" | "DA_HUY";
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface Driver {
  maTx: string; hoTen: string; soDienThoai: string; trangThaiHoatDong: "ONLINE" | "OFFLINE" | "NGHI";
  dangBanChuyen: boolean;
  phuongTien: { maPhuongTien: string; bienSoXe: string; loaiXe: string; mauXe: string } | null;
}
export interface Fare {
  cuocGoc: string; tienPhuThu: string; tienGiamGia: string; tongCuoc: string; donViTien: string;
  phuThu: { maPhuThu: string; tenPhuThu: string; soTienTinh: string }[];
}
export interface Order {
  maDon: string; thoiGianTao: string; diemLayHang: string; diemGiaoHang: string; sdtNguoiNhan: string;
  quangDuongKm: string; ghiChuGiaoHang: string | null; trangThai: OrderStatus;
  maKh: string; maTx: string | null; maTkTao: string; cuoc: Fare;
  kienHang: { loaiHangHoa: string; ghiChuBaoQuan?: string | null; khoiLuongKg: string }[];
  thanhToan: { trangThai: string; soTienConPhaiThu: string; canDoiSoat: boolean };
  hoanTatLuc: string | null; huyLuc: string | null;
}
export interface Assignment {
  maPhanCong: string; maTx: string; maTkDieuPhoi: string; batDauLuc: string;
  ketThucLuc: string | null; ketQuaKetThuc: string | null; lyDo: string | null;
}
export interface OrderEvent {
  maSuKien: string; maDon: string; thuTu: number; loaiSuKien: string;
  trangThaiTruoc: OrderStatus | null; trangThaiSau: OrderStatus; thoiGian: string;
  maTkThucHien: string; nguoiThucHien: string; ghiChu: string | null; loaiSuCo: string | null;
}
export interface OrderDetail extends Order { phanCong: Assignment[]; nhatKy: OrderEvent[] }
export interface OrderPage extends Page<Order> { summary: { tongSoDon: number; tongCuoc: string } }
export interface Membership { maHang: string; tenHang: string; phanTramGiamGia: string; ngayHetHan: string | null; conHieuLuc: boolean }
export interface Customer { maKh: string; hoTen: string; soDienThoai: string; email: string | null; diaChiMacDinh: string | null; hangThanhVien: Membership | null }
export interface QuoteInput { maKh: string; diemLayHang: string; diemGiaoHang: string; kienHang: { loaiHangHoa: string; ghiChuBaoQuan?: string; khoiLuongKg: string }[] }
export interface Quote { maBaoGia: string; hetHanLuc: string; loTrinh: { diemLayHang: string; diemGiaoHang: string; quangDuongKm: string; thoiGianDuKienGiay: number; trongPhamVi: boolean; nguon: string }; cuoc: Fare; hangThanhVien: Membership | null }
export interface CreateOrderInput extends QuoteInput { maBaoGia: string; sdtNguoiNhan: string; ghiChuGiaoHang?: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, public traceId?: string) { super(code); }
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: "Bạn cần đăng nhập để điều phối đơn.", SESSION_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  INVALID_CREDENTIALS: "Tên đăng nhập hoặc mật khẩu không đúng.", ACCOUNT_LOCKED: "Tài khoản đã bị khóa.",
  FORBIDDEN: "Tài khoản không có quyền thực hiện thao tác này.", CSRF_INVALID: "Phiên bảo vệ đã thay đổi. Hãy tải lại rồi thử lại.",
  DRIVER_UNAVAILABLE: "Tài xế vừa bận hoặc không còn đủ điều kiện. Hãy chọn lại từ danh sách mới.",
  ORDER_STATE_CONFLICT: "Trạng thái đơn đã thay đổi. Hãy kiểm tra dữ liệu mới trước khi thao tác.",
  CANCELLATION_WINDOW_EXPIRED: "Đơn đã hết thời hạn hủy (5 phút từ lúc tạo).",
  RESOURCE_NOT_FOUND: "Không tìm thấy đơn hoặc dữ liệu bạn yêu cầu.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Kiểm tra bộ lọc hoặc thông tin đã nhập.",
  DATE_RANGE_INVALID: "Khoảng ngày không hợp lệ. Ngày kết thúc phải sau ngày bắt đầu.",
  NETWORK_ERROR: "Không nhận được phản hồi. Hãy kiểm tra dữ liệu mới trước khi gửi lại thao tác.",
  INTERNAL_ERROR: "Hệ thống chưa xử lý được yêu cầu. Vui lòng thử tải lại.",
  QUOTE_EXPIRED: "Báo giá đã hết hạn. Hãy lấy báo giá mới trước khi tạo đơn.",
  QUOTE_CHANGED: "Tuyến hoặc cước đã thay đổi. Hãy lấy báo giá mới và kiểm tra lại.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu tạo đơn đã được dùng với thông tin khác. Hãy kiểm tra đơn trước khi tiếp tục.",
  ADDRESS_NOT_FOUND: "Không tìm thấy địa chỉ. Kiểm tra địa chỉ lấy và giao hàng.",
  OUT_OF_SERVICE_AREA: "Địa chỉ nằm ngoài phạm vi giao hàng.",
  DISTANCE_INVALID: "Tuyến giao hàng không hợp lệ hoặc vượt quãng đường cho phép.",
  ROUTE_PROVIDER_ERROR: "Dịch vụ xác định tuyến đang lỗi. Vui lòng thử lấy báo giá lại.",
  ROUTE_PROVIDER_TIMEOUT: "Dịch vụ xác định tuyến phản hồi quá lâu. Vui lòng thử lại.",
  FARE_CONFIG_MISSING: "Chưa có cấu hình cước phù hợp. Liên hệ người quản lý để kiểm tra.",
  BROWSER_STORAGE_UNAVAILABLE: "Trình duyệt không lưu được trạng thái chống tạo trùng. Cho phép bộ nhớ phiên rồi thử lại; yêu cầu chưa được gửi.",
};
export function errorMessage(error: unknown) {
  return error instanceof ApiError ? (messages[error.code] ?? "Yêu cầu chưa thực hiện được. Vui lòng tải lại dữ liệu.") : "Không tải được dữ liệu. Vui lòng thử lại.";
}
/** Same-origin proxy preserves HttpOnly session cookies. Never retry a write automatically. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`/api${path}`, {
      ...options, credentials: "same-origin", cache: "no-store",
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new ApiError(response.status, body.code ?? "INTERNAL_ERROR", body.traceId);
      if (body.code === "AUTH_REQUIRED" || body.code === "SESSION_EXPIRED" || body.code === "FORBIDDEN") {
        window.dispatchEvent(new CustomEvent("dispatch-auth-error", { detail: error }));
      }
      throw error;
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error;
    throw new ApiError(0, "NETWORK_ERROR");
  }
}
async function post<T>(path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
  const csrf = await request<{ csrfToken: string; headerName: string }>("/auth/csrf");
  return request<T>(path, { method: "POST", headers: { ...extraHeaders, "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken },
    body: body === undefined ? undefined : JSON.stringify(body) });
}
export function query(values: Record<string, string | number | undefined>) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") result.set(key, String(value));
  return `?${result}`;
}
const orderPath = (id: string) => `/orders/${encodeURIComponent(id)}`;
export const dispatchApi = {
  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),
  login: (username: string, password: string) => post<User>("/auth/login", { username, password }),
  logout: () => post<void>("/auth/logout"),
  customers: (q: string, signal?: AbortSignal) => request<Page<Customer>>(`/customers${query({ q, page: 0, size: 20 })}`, { signal }),
  quote: (input: QuoteInput) => post<Quote>("/quotes", input),
  createOrder: (input: CreateOrderInput, key: string) => post<Order>("/orders", input, { "Idempotency-Key": key }),
  orders: (filters: Record<string, string | number | undefined>, signal?: AbortSignal) => request<OrderPage>(`/orders${query(filters)}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => request<OrderDetail>(orderPath(id), { signal }),
  drivers: (filters: Record<string, string | number | undefined>, signal?: AbortSignal) => request<Page<Driver>>(`/drivers${query(filters)}`, { signal }),
  suggestions: (id: string, page: number, signal?: AbortSignal) => request<Page<Driver>>(`${orderPath(id)}/driver-suggestions${query({ page, size: 10 })}`, { signal }),
  assign: (id: string, driver: string) => post<Order>(`${orderPath(id)}/assignments`, { maTx: driver }),
  cancel: (id: string, reason: string) => post<Order>(`${orderPath(id)}/cancel`, { lyDo: reason.trim() }),
};
export const statusLabels: Record<OrderStatus, string> = {
  CHO_GAN: "Chờ gán", DA_GAN: "Đã gán", DA_LAY_HANG: "Đã lấy hàng", DANG_GIAO: "Đang giao", HOAN_TAT: "Hoàn tất", DA_HUY: "Đã hủy",
};
export function canCancel(order: Order, now = Date.now()) {
  const age = now - Date.parse(order.thoiGianTao);
  return ["CHO_GAN", "DA_GAN"].includes(order.trangThai) && age >= 0 && age < 300000;
}
export function money(value: string) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value)); }
export function dateTime(value: string) { return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }); }
