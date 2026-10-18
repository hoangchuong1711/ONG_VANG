export type ApiOrder = {
  ma_don: string;
  trang_thai: string;
  diem_lay: string;
  diem_giao: string;
  tao_luc: string;
  tong_cuoc: string;
  ten_nguoi_nhan?: string;
  sdt_nguoi_nhan?: string;
};

export type Finance = {
  ma_tx: string;
  thu_nhap_tai_xe: string;
  cong_ty_duoc_huong: string;
  da_nop: string;
  con_phai_nop: string;
  dang_thanh_toan: string;
  chua_dua_vao_thanh_toan: string;
  giao_dich_dang_cho: null | { ma_giao_dich: string; trang_thai: string; so_tien_yeu_cau: string; payment_url: string | null };
};

export type Quote = {
  maKh: string;
  diemLay: string;
  diemGiao: string;
  km: string;
  cuocKm: string;
  cuocKg: string;
  phuThu: string;
  giamGia: string;
  tongCuoc: string;
};

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export async function request<T>(path: string, method = "GET", data?: unknown, key?: string): Promise<T> {
  const headers = new Headers();
  if (data !== undefined) headers.set("Content-Type", "application/json");
  if (key) headers.set("Idempotency-Key", key);
  if (method !== "GET") {
    const csrf = await fetch("/api/v2/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    if (!csrf.ok) throw new ApiError("CSRF_INVALID", "Không lấy được phiên bảo vệ");
    headers.set("X-CSRF-Token", (await csrf.json()).token);
  }
  const response = await fetch(`/api/v2${path}`, {
    method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "same-origin", cache: "no-store",
  });
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.code ?? "REQUEST_FAILED", result?.message ?? "Không thể thực hiện yêu cầu");
  return result as T;
}

export const money = (value: string | number) => `${Number(value).toLocaleString("vi-VN")}đ`;
