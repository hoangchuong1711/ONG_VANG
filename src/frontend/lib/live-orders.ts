import { requestApi } from "./ui-adapter";

export type PaymentChoice = "NGUOI_DAT" | "NGUOI_NHAN";
export type PaymentMethod = "TIEN_MAT" | "VNPAY_QR";

export type Parcel = { loaiHangHoa: string; ghiChuBaoQuan?: string; khoiLuongKg: string };
export type Fare = {
  cuocGoc: string; cuocKm: string; cuocKhoiLuong: string; tongKhoiLuongKg: string;
  tienPhuThu: string; tienGiamGia: string; tongCuoc: string;
  maBieuPhi: string; phienBanBieuPhi: number;
  phuThu: { maPhuThu: string; tenPhuThu: string; soTienTinh: string }[];
};
export type Quote = {
  maBaoGia: string; hetHanLuc: string;
  loTrinh: { diemLayHang: string; diemGiaoHang: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  cuoc: Fare;
  hangThanhVien: { tenHang: string; phanTramGiamGia: string; conHieuLuc: boolean; ngayHetHan: string | null } | null;
};
export type Order = {
  maDon: string; thoiGianTao: string; diemLayHang: string; diemGiaoHang: string;
  tenNguoiNhan: string | null; sdtNguoiNhan: string; quangDuongKm: string; ghiChuGiaoHang?: string | null;
  trangThai: string; maKh: string; maTkTao: string; maTx?: string | null; benThanhToan: PaymentChoice;
  nguonLoTrinh: "FAKE" | "GOONG";
  phuongThucThanhToan: PaymentMethod; cuoc: Fare;
  thanhToan: { trangThai: string; soTienConPhaiThu: string; canDoiSoat: boolean };
  kienHang: Parcel[];
};
export type OrderDetail = Order & {
  nhatKy: { thuTu: number; loaiSuKien: string; trangThaiSau: string; thoiGian: string;
    nguoiThucHien?: string | null; tenNguoiThucHien?: string | null; ghiChu?: string | null }[];
};
export type Driver = { maTx: string; hoTen: string; soDienThoai: string; trangThaiHoatDong: string; dangBanChuyen: boolean;
  phuongTien: { bienSoXe: string; loaiXe?: string } | null; viTriDemoDiaChi: string | null; viTriDemoNguon: string | null;
  kmDenDiemLay: string | null; giayDenDiemLay: number | null; nguonDinhTuyen: string | null };
export type DriverRoute = {
  taiXe: { diaChi: string; lat: number; lng: number; nguon: string };
  diemLay: { diaChi: string; lat: number; lng: number; nguon: string };
  diemGiao: { diaChi: string; lat: number; lng: number; nguon: string };
  denDiemLay: { polyline: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  denDiemGiao: { polyline: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  nguon: string;
};

const messages: Record<string, string> = {
  PAYMENT_REQUIRED: "Cần thu đủ cước và xử lý đối soát trước khi đi tiếp.",
  PAYMENT_PENDING: "Đã có yêu cầu thu cước. Hãy kiểm tra hoặc đối soát yêu cầu hiện tại.",
  PAYMENT_MILESTONE_REQUIRED: "Chưa đến mốc thu cước đã chọn trên đơn.",
  PAYMENT_METHOD_CONFLICT: "Phương thức thu phải khớp với lựa chọn trên đơn.",
  PAYMENT_AMOUNT_MISMATCH: "Chỉ xác nhận tiền mặt khi đã nhận đúng tổng cước.",
  VNPAY_CONFIG_MISSING: "VNPay Sandbox chưa được cấu hình trên máy chủ.",
  ADDRESS_NOT_FOUND: "Không tìm thấy địa chỉ. Hãy nhập địa chỉ đầy đủ và thử lại.",
  OUT_OF_SERVICE_AREA: "Địa chỉ hoặc quãng đường nằm ngoài vùng phục vụ.",
  DISTANCE_INVALID: "Không tính được tuyến đường giữa hai địa chỉ này.",
  ROUTE_PROVIDER_ERROR: "Dịch vụ bản đồ đang lỗi. Vui lòng thử lại sau.",
  ROUTE_PROVIDER_TIMEOUT: "Dịch vụ bản đồ quá thời gian chờ. Vui lòng thử lại.",
  ROUTE_PROVIDER_QUOTA: "Goong đã hết quota tạm thời. Vui lòng thử lại sau hoặc kiểm tra tài khoản Goong.",
  WEIGHT_LIMIT_EXCEEDED: "Tổng khối lượng vượt giới hạn biểu phí.",
  QUOTE_EXPIRED: "Báo giá đã hết hạn. Vui lòng báo giá lại.",
  QUOTE_CHANGED: "Báo giá đã thay đổi. Vui lòng báo giá lại.",
  FARE_CONFIG_MISSING: "Chưa có biểu phí phù hợp. Vui lòng liên hệ tổng đài.",
  ORDER_STATE_CONFLICT: "Trạng thái đơn đã đổi. Vui lòng tải lại đơn.",
  ARRIVAL_REQUIRED: "Hãy xác nhận đã đến điểm nhận trước khi hoàn tất đơn.",
  DEMO_POSITION_MISSING: "Tài xế chưa có vị trí demo trong DB. Hãy nhờ tổng đài cấu hình.",
  DRIVER_UNAVAILABLE: "Tài xế không còn khả dụng. Hãy chọn tài xế khác.",
  CANCELLATION_WINDOW_EXPIRED: "Đã hết thời hạn hủy đơn.",
  CSRF_INVALID: "Phiên xác thực đã đổi. Vui lòng tải lại trang.",
  FORBIDDEN: "Tài khoản không có quyền thực hiện thao tác này.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Hãy kiểm tra địa chỉ, SĐT và khối lượng.",
};

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(messages[code] ?? `Yêu cầu không thành công (${code || status}).`);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestApi<T>(path, options);
}

export const vnd = (amount: string) => `${Number(amount).toLocaleString("vi-VN")} ₫`;
