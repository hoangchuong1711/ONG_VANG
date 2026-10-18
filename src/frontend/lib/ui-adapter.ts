import { request, ApiError } from "./api-client";
import type { Driver, Order, OrderDetail, Quote } from "./live-orders";

type Row = Record<string, unknown>;
type Page<T> = { items: T[]; totalElements: number; totalPages: number };
const str = (value: unknown) => value == null ? "" : String(value);
const num = (value: unknown) => Number(value ?? 0);

function driver(row: Row): Driver {
  const vehicle = row.bien_so ? { bienSoXe: str(row.bien_so), loaiXe: str(row.loai_xe) } : null;
  return {
    maTx: str(row.ma_tx), hoTen: str(row.ho_ten), soDienThoai: str(row.so_dien_thoai),
    trangThaiHoatDong: str(row.trang_thai), dangBanChuyen: Boolean(row.dang_ban_chuyen),
    phuongTien: vehicle, viTriDemoDiaChi: row.vi_tri_demo_dia_chi ? str(row.vi_tri_demo_dia_chi) : null,
    viTriDemoNguon: row.vi_tri_demo_nguon ? str(row.vi_tri_demo_nguon) : null,
    kmDenDiemLay: row.km_den_diem_lay == null ? null : str(row.km_den_diem_lay),
    giayDenDiemLay: row.giay_den_diem_lay == null ? null : num(row.giay_den_diem_lay),
    nguonDinhTuyen: row.nguon_dinh_tuyen == null ? null : str(row.nguon_dinh_tuyen),
  };
}

function order(row: Row): OrderDetail {
  const parcels = Array.isArray(row.kien_hang) ? row.kien_hang as Row[] : [];
  const events = Array.isArray(row.nhat_ky) ? row.nhat_ky as Row[] : [];
  const assignment = row.phan_cong as Row | null | undefined;
  const km = num(row.cuoc_km), kg = num(row.cuoc_kg), discount = num(row.tien_giam), total = num(row.tong_cuoc);
  const surcharge = total - km - kg + discount;
  return {
    maDon: str(row.ma_don), thoiGianTao: str(row.tao_luc),
    thoiGianHoanTat: row.hoan_tat_luc == null ? null : str(row.hoan_tat_luc), diemLayHang: str(row.diem_lay),
    diemGiaoHang: str(row.diem_giao), tenNguoiNhan: str(row.ten_nguoi_nhan),
    sdtNguoiNhan: str(row.sdt_nguoi_nhan), quangDuongKm: str(row.quang_duong_km),
    ghiChuGiaoHang: str(row.ghi_chu), trangThai: str(row.trang_thai), maKh: str(row.ma_kh),
    maTkTao: str(row.ma_tk_tao), maTx: assignment ? str(assignment.ma_tx) : null,
    nguonLoTrinh: row.nguon_lo_trinh === "DEMO" ? "FAKE" : "GOONG",
    // These compatibility fields are not shown in the current screens.
    benThanhToan: "NGUOI_DAT", phuongThucThanhToan: "TIEN_MAT",
    thanhToan: { trangThai: row.trang_thai === "HOAN_TAT" ? "DA_THU_BEN_NGOAI" : "CHUA_XAC_NHAN",
      soTienConPhaiThu: "0", canDoiSoat: false },
    cuoc: { cuocGoc: str(km), cuocKm: str(km), cuocKhoiLuong: str(kg),
      tongKhoiLuongKg: str(parcels.reduce((sum, item) => sum + num(item.khoi_luong_kg), 0)),
      tienPhuThu: str(surcharge), tienGiamGia: str(discount), tongCuoc: str(total),
      maBieuPhi: str(row.ma_bieu_phi), phienBanBieuPhi: 1, phuThu: [] },
    kienHang: parcels.map(item => ({ loaiHangHoa: str(item.loai_hang),
      khoiLuongKg: str(item.khoi_luong_kg), ghiChuBaoQuan: str(item.ghi_chu) })),
    nhatKy: events.map((item, index) => ({ thuTu: index + 1, loaiSuKien: str(item.loai),
      trangThaiSau: str(item.trang_thai_sau), thoiGian: str(item.thoi_gian),
      ghiChu: str(item.ghi_chu) })),
  };
}

function quote(row: Row, input: Row): Quote {
  const parcels = (input.kienHang as Row[]) ?? [];
  const total = str(row.tongCuoc);
  return {
    maBaoGia: total, hetHanLuc: new Date(Date.now() + 10 * 60_000).toISOString(),
    loTrinh: { diemLayHang: str(row.diemLay), diemGiaoHang: str(row.diemGiao),
      quangDuongKm: str(row.km), thoiGianDuKienGiay: num(row.giay),
      nguon: row.nguon === "DEMO" ? "FAKE" : "GOONG" },
    cuoc: { cuocGoc: str(row.cuocKm), cuocKm: str(row.cuocKm), cuocKhoiLuong: str(row.cuocKg),
      tongKhoiLuongKg: str(parcels.reduce((sum, item) => sum + num(item.khoiLuongKg), 0)),
      tienPhuThu: str(row.phuThu), tienGiamGia: str(row.giamGia), tongCuoc: total,
      maBieuPhi: "default", phienBanBieuPhi: 1, phuThu: [] }, hangThanhVien: null,
  };
}

function orderInput(input: Row) {
  return { maKh: input.maKh || undefined, diemLay: input.diemLayHang, diemGiao: input.diemGiaoHang,
    tenNguoiNhan: input.tenNguoiNhan, sdtNguoiNhan: input.sdtNguoiNhan,
    kienHang: ((input.kienHang as Row[]) ?? []).map(item => ({ loaiHang: item.loaiHangHoa, kg: item.khoiLuongKg })),
    phuThuIds: [] as string[] };
}

export async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const input = options.body ? JSON.parse(String(options.body)) as Row : {};
  const key = new Headers(options.headers).get("Idempotency-Key") ?? undefined;
  try {
    if (path === "/auth/me") return await request<T>("/auth/me");
    if (path === "/quotes" && method === "POST") {
      const raw = await request<Row>("/fare/quote", "POST", orderInput(input));
      return quote(raw, input) as T;
    }
    if (path === "/orders" && method === "POST") {
      const raw = await request<Row>("/orders", "POST", { ...orderInput(input), giaDaDongY: input.maBaoGia }, key);
      return order(raw) as T;
    }
    if (path.startsWith("/orders?") || path === "/orders") {
      const query = new URLSearchParams(path.split("?")[1] ?? "");
      const raw = await request<{ items: Row[]; totalElements: number; totalPages: number }>(
        `/orders?${query.toString()}`);
      return { items: raw.items.map(order), totalElements: raw.totalElements,
        totalPages: raw.totalPages } as Page<Order> as T;
    }
    const parts = path.split("?")[0].split("/").filter(Boolean);
    if (parts[0] === "drivers" && parts[1] && parts[2] === "demo-position" && method === "POST") {
      return await request<T>(`/drivers/${parts[1]}/position`, "POST", input);
    }
    if (parts[0] === "orders" && parts[1]) {
      const id = parts[1];
      if (parts.length === 2) return order(await request<Row>(`/orders/${id}`)) as T;
      if (parts[2] === "driver-suggestions") {
        const raw = await request<{ items: Row[] }>(`/orders/${id}/suggestions`);
        return { items: raw.items.map(driver) } as T;
      }
      if (parts[2] === "driver-route") return await request<Row>(`/orders/${id}/driver-route`) as T;
      if (parts[2] === "assignments") return order(await request<Row>(`/orders/${id}/assign`, "POST", input)) as T;
      if (parts[2] === "cancel") return order(await request<Row>(`/orders/${id}/cancel`, "POST", input)) as T;
      if (parts[2] === "reject") return order(await request<Row>(`/orders/${id}/progress`, "POST", { hanhDong: "TU_CHOI", ghiChu: input.lyDo })) as T;
      if (parts[2] === "arrival") return order(await request<Row>(`/orders/${id}/progress`, "POST", { hanhDong: "DEN_DIEM_NHAN" })) as T;
      if (parts[2] === "incidents") return order(await request<Row>(`/orders/${id}/progress`, "POST", { hanhDong: "SU_CO", ghiChu: input.lyDo })) as T;
      if (parts[2] === "transitions") {
        const state = str(input.trangThai);
        const action = state === "DA_LAY_HANG" ? "LAY_HANG" : state === "DANG_GIAO" ? "BAT_DAU_GIAO" : "";
        return order(await request<Row>(`/orders/${id}/${action ? "progress" : "complete"}`, "POST",
          action ? { hanhDong: action } : { xacNhanThuDu: true })) as T;
      }
    }
    if (path.startsWith("/customers")) {
      const query = new URLSearchParams(path.split("?")[1] ?? "").get("q")?.toLowerCase() ?? "";
      const raw = await request<{ items: Row[] }>("/customers");
      return { items: raw.items.filter(item => !query || str(item.ho_ten).toLowerCase().includes(query)
        || str(item.so_dien_thoai).includes(query)).map(item => ({ maKh: str(item.ma_kh),
        hoTen: str(item.ho_ten), soDienThoai: str(item.so_dien_thoai), diaChiMacDinh: item.dia_chi_mac_dinh ?? null })) } as T;
    }
    if (path.startsWith("/drivers/me/earnings?")) {
      const params = new URLSearchParams(path.split("?")[1]);
      const raw = await request<{ thu_nhap_trong_ky: Row; con_phai_nop_toan_lich_su: string }>(
        `/drivers/me/earnings?tu=${params.get("tuNgay")}&den=${params.get("denNgay")}`);
      const income = raw.thu_nhap_trong_ky;
      return { tongCuocDaHoanTat: str(income.tong_cuoc ?? 0), phanTaiXePhatSinh: str(income.thu_nhap ?? 0),
        phanTaiXeDuDieuKienChiTra: str(income.thu_nhap ?? 0), thuNhapDangChoCod: "0",
        tienMatDangGiu: raw.con_phai_nop_toan_lich_su, tienCodDaNop: "0" } as T;
    }
    if (path === "/drivers/me") return driver(await request<Row>("/drivers/me")) as T;
    if (path.startsWith("/drivers?")) {
      const raw = await request<{ items: Row[] }>("/drivers");
      return { items: raw.items.map(driver), totalElements: raw.items.length } as T;
    }
    throw new Error(`Chức năng ${path} chưa được hỗ trợ.`);
  } catch (cause) {
    if (cause instanceof ApiError) throw new Error(cause.message);
    throw cause;
  }
}
