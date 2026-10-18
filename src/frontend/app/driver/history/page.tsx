"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { api, type Driver } from "@/lib/live-orders";
import { request } from "@/lib/api-client";
import { formatVND } from "@/lib/utils";

type HistoryFilter = "TODAY" | "YESTERDAY" | "7_DAYS" | "MONTH";
type HistoryOrder = {
  ma_don: string;
  tao_luc: string;
  trang_thai: string;
  diem_lay: string;
  diem_giao: string;
  quang_duong_km: string | number;
  tong_cuoc: string | number;
};

const PAGE_SIZE = 100;
const filters: { key: HistoryFilter; label: string }[] = [
  { key: "TODAY", label: "Hôm nay" },
  { key: "YESTERDAY", label: "Hôm qua" },
  { key: "7_DAYS", label: "7 ngày qua" },
  { key: "MONTH", label: "Tháng này" },
];

function belongsToFilter(timestamp: number, filter: HistoryFilter, asOf: number) {
  const date = new Date(timestamp);
  const current = new Date(asOf);
  if (filter === "TODAY") return date.toDateString() === current.toDateString();
  if (filter === "YESTERDAY") return date.toDateString() === new Date(asOf - 86_400_000).toDateString();
  if (filter === "7_DAYS") return timestamp >= asOf - 7 * 86_400_000;
  return date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
}

export default function DriverTripHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>("7_DAYS");
  const [asOf, setAsOf] = useState<number | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [self, firstPage] = await Promise.all([
        api<Driver>("/drivers/me"),
        request<{ items: HistoryOrder[]; total: number }>(`/orders?page=0&size=${PAGE_SIZE}`),
      ]);
      const totalPages = Math.ceil(Number(firstPage.total) / PAGE_SIZE);
      const remainingPages = await Promise.all(Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        request<{ items: HistoryOrder[]; total: number }>(`/orders?page=${index + 1}&size=${PAGE_SIZE}`)));
      setDriver(self);
      setOrders([...firstPage.items, ...remainingPages.flatMap(page => page.items)]
        .filter(order => order.trang_thai === "HOAN_TAT"));
      setAsOf(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được lịch sử chuyến giao.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function toggleAvailability() {
    if (!driver || savingStatus) return;
    setSavingStatus(true);
    setError("");
    try {
      await request("/drivers/me/availability", "POST", { online: driver.trangThaiHoatDong !== "ONLINE" });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được trạng thái tài xế.");
    } finally {
      setSavingStatus(false);
    }
  }

  const trips = useMemo(() => orders.filter(order => {
    const timestamp = Date.parse(order.tao_luc);
    return Number.isFinite(timestamp) && (asOf === null || belongsToFilter(timestamp, filter, asOf));
  }), [asOf, filter, orders]);
  const totalFare = trips.reduce((sum, trip) => sum + Number(trip.tong_cuoc), 0);
  const totalKm = trips.reduce((sum, trip) => sum + Number(trip.quang_duong_km), 0);
  const isOnline = driver?.trangThaiHoatDong === "ONLINE";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={Boolean(isOnline)} onToggleOnline={() => void toggleAvailability()} showStatus={Boolean(driver) && !savingStatus} />
      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Lịch sử chuyến giao</h1>
            <p className="text-xs text-stone-500 mt-1">Đơn hoàn tất và cước được đọc từ hồ sơ designV2 của tài xế.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {loading && <p role="status" className="text-sm text-stone-500">Đang tải chuyến giao từ máy chủ...</p>}

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filters.map(item => <button key={item.key} type="button" onClick={() => setFilter(item.key)} aria-pressed={filter === item.key}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === item.key ? "bg-stone-950 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
            {item.label}
          </button>)}
        </div>

        <section className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 rounded-2xl p-5 text-stone-950 shadow-sm">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-950/15">
            <div><span className="text-[10px] uppercase font-black tracking-wider text-amber-950 block">Tổng cước đơn hoàn tất trong kỳ</span>
              <div className="text-3xl font-black mt-0.5">{formatVND(totalFare)}</div></div>
            <div className="text-right"><span className="text-[10px] uppercase font-bold text-amber-950 block">Số chuyến</span>
              <div className="text-2xl font-black">{trips.length}</div></div>
          </div>
          <div className="pt-3 text-xs font-bold text-stone-900"><span className="opacity-80 block text-[10px]">Tổng quãng đường</span>{totalKm.toFixed(1)} km</div>
        </section>

        <section className="space-y-3">
          <h2 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">Chuyến giao ({trips.length})</h2>
          {!loading && !error && trips.length === 0 && <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Chưa có đơn hoàn tất trong kỳ này.</div>}
          {trips.map(trip => <article key={trip.ma_don} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
              <div><Link href={`/orders/${encodeURIComponent(trip.ma_don)}`} className="font-mono font-black text-sm text-stone-900 hover:text-amber-800">{trip.ma_don}</Link>
                <time className="block text-xs text-stone-400">{new Date(trip.tao_luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></div>
              <strong className="text-sm font-black text-amber-700">{formatVND(Number(trip.tong_cuoc))}</strong>
            </div>
            <div className="text-xs space-y-1 text-stone-700"><p><span className="font-bold">Lấy:</span> {trip.diem_lay}</p><p><span className="font-bold">Giao:</span> {trip.diem_giao}</p></div>
            <div className="pt-2 border-t border-stone-100 flex justify-between text-xs text-stone-500"><span>Đã hoàn tất · khách trả cước trực tiếp cho tài xế</span><span>{Number(trip.quang_duong_km).toFixed(1)} km</span></div>
          </article>)}
        </section>
      </main>
      <DriverBottomNav />
    </div>
  );
}
