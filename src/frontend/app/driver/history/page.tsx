"use client";

import { useCallback, useEffect, useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { allOrders, api, type Driver, type Order } from "@/lib/live-orders";
import { request } from "@/lib/api-client";
import { formatVND } from "@/lib/utils";

type HistoryFilter = "TODAY" | "YESTERDAY" | "7_DAYS" | "MONTH";

function completedAt(order: Order): Date {
  return new Date(order.thoiGianHoanTat ?? order.thoiGianTao);
}

function inPeriod(date: Date, filter: HistoryFilter, now: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "TODAY") return date >= today && date <= now;
  if (filter === "YESTERDAY") return date >= new Date(today.getTime() - 86400000) && date < today;
  if (filter === "7_DAYS") return date >= new Date(today.getTime() - 6 * 86400000) && date <= now;
  return date >= new Date(now.getFullYear(), now.getMonth(), 1) && date <= now;
}

export default function DriverTripHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>("7_DAYS");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [self, result] = await Promise.all([
        api<Driver>("/drivers/me"),
        allOrders("HOAN_TAT"),
      ]);
      setDriver(self);
      setOrders(result.filter(order => order.trangThai === "HOAN_TAT" && order.maTx === self.maTx));
      setError("");
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(timer); }, [refresh]);

  async function toggleOnline() {
    if (!driver) return;
    try {
      await request("/drivers/me/availability", "POST", { online: driver.trangThaiHoatDong !== "ONLINE" });
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
  }

  const now = new Date();
  const trips = orders.filter(order => inPeriod(completedAt(order), filter, now))
    .sort((a, b) => completedAt(b).getTime() - completedAt(a).getTime());
  const totalFare = trips.reduce((sum, trip) => sum + Number(trip.cuoc.tongCuoc), 0);
  const totalKm = trips.reduce((sum, trip) => sum + Number(trip.quangDuongKm), 0);

  return <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
    <DriverNavbar isOnline={driver?.trangThaiHoatDong === "ONLINE"} onToggleOnline={() => void toggleOnline()} />
    <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Lịch sử chuyến giao</h1>
        <p className="text-xs text-stone-500 mt-0.5">Các chuyến thực tế đã hoàn tất, tính theo ngày hoàn thành.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {([
          { key: "TODAY", label: "Hôm nay" },
          { key: "YESTERDAY", label: "Hôm qua" },
          { key: "7_DAYS", label: "7 ngày qua" },
          { key: "MONTH", label: "Tháng này" },
        ] as const).map(item => <button key={item.key} type="button" onClick={() => setFilter(item.key)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === item.key
            ? "bg-stone-950 text-white shadow-xs" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
          {item.label}
        </button>)}
      </div>
      <section className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 rounded-2xl p-5 text-stone-950 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-stone-950/15">
          <div><span className="text-[10px] uppercase font-black tracking-wider text-amber-950 block">Tổng cước chuyến hoàn tất</span>
            <div className="text-3xl font-black mt-0.5">{formatVND(totalFare)}</div></div>
          <div className="text-right"><span className="text-[10px] uppercase font-bold text-amber-950 block">Số chuyến</span>
            <div className="text-2xl font-black">{trips.length} chuyến</div></div>
        </div>
        <div className="pt-3 text-xs font-bold text-stone-900">Quãng đường chạy: {totalKm.toFixed(1)} km</div>
      </section>
      <section className="space-y-3">
        <h2 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">Danh sách chuyến giao ({trips.length})</h2>
        {loading && <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Đang tải chuyến giao...</p>}
        {!loading && !error && trips.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Chưa có chuyến giao hoàn tất trong kỳ đã chọn.</p>}
        {trips.map(trip => <article key={trip.maDon} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 flex-wrap gap-2">
            <div><span className="font-mono font-black text-sm text-stone-900">{trip.maDon}</span>
              <span className="text-xs text-stone-400 block">{completedAt(trip).toLocaleString("vi-VN")}</span></div>
            <span className="text-sm font-black text-amber-600">{formatVND(Number(trip.cuoc.tongCuoc))}</span>
          </div>
          <div className="text-xs space-y-1 text-stone-700">
            <div>Lấy: {trip.diemLayHang}</div><div>Giao: {trip.diemGiaoHang}</div>
          </div>
          <div className="pt-2 border-t border-stone-100 text-xs text-stone-500">{Number(trip.quangDuongKm).toFixed(1)} km · Đã hoàn tất</div>
        </article>)}
      </section>
    </main>
    <DriverBottomNav />
  </div>;
}
