"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api-client";

export type OrderRow = {
  ma_don: string; tao_luc: string; trang_thai: string; diem_lay: string; diem_giao: string;
  ten_nguoi_nhan: string; tong_cuoc: string; ma_kh: string; phan_cong?: {
    ma_tx: string; ho_ten: string; bien_so: string | null;
  } | null;
  kien_hang?: { thu_tu: number; loai_hang: string; khoi_luong_kg: string; ghi_chu: string | null }[];
  sdt_nguoi_nhan?: string;
  ghi_chu?: string | null;
  quang_duong_km?: string;
  ly_do_huy?: string | null;
  lich_su_phan_cong?: { ma_phan_cong: string; bat_dau_luc: string; ket_thuc_luc: string | null;
    ket_qua: string | null; ly_do: string | null; tai_xe: string; bien_so: string | null }[];
  nhat_ky?: { ma_su_kien: number; loai: string; trang_thai_sau: string; thoi_gian: string; ghi_chu: string | null }[];
};

export type DriverRow = {
  ma_tx: string; ho_ten: string; so_dien_thoai: string; trang_thai: string;
  dang_ban_chuyen: boolean; bien_so: string | null; loai_xe: string | null;
};

export type FinanceRow = {
  cong_ty_duoc_huong: string; da_nop: string; con_phai_nop: string; thu_nhap_tai_xe: string;
  dang_thanh_toan: string; chua_dua_vao_thanh_toan: string;
  tai_xe: { ma_tx: string; ho_ten: string; cong_ty_duoc_huong: string;
    thu_nhap_tai_xe: string; con_phai_nop: string; dang_thanh_toan: string;
    chua_dua_vao_thanh_toan: string; da_nop: string }[];
};

export const amount = (value: unknown) => `${Number(value ?? 0).toLocaleString("vi-VN")}đ`;
export const dateTime = (value: string | null | undefined) => value
  ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

export const orderStatus: Record<string, string> = {
  CHO_GAN: "Chờ gán", DA_GAN: "Đã gán", DA_LAY_HANG: "Đã lấy hàng",
  DANG_GIAO: "Đang giao", HOAN_TAT: "Hoàn tất", DA_HUY: "Đã hủy",
};

export function useAdminResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request<T>(path);
      setData(result); setError("");
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu");
    } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, error, loading, refresh };
}
