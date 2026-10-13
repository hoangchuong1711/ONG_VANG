"use client";

import React from "react";
import Link from "next/link";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { toggleDemoDriverOnline, useDemoStore } from "@/lib/demo-store";

export default function DriverProfilePage() {
  const { showToast } = useToast();
  const { state: demo } = useDemoStore();
  const driver = demo.drivers.find((item) => item.id === "TX-DEMO-1");
  const isOnline = driver?.status !== "OFFLINE";
  const completedTrips = demo.orders.filter((order) => order.driver?.id === driver?.id &&
    ["HOAN_TAT", "CHUA_THANH_TOAN"].includes(order.status));
  const ratings = completedTrips.flatMap((order) => order.rating ? [order.rating] : []);
  const praiseCounts = ratings.flatMap((rating) => rating.tags).reduce<Record<string, number>>((counts, tag) => {
    counts[tag] = (counts[tag] ?? 0) + 1;
    return counts;
  }, {});

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`Đã sao chép ${label} (${text})!`, "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => toggleDemoDriverOnline("TX-DEMO-1")} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Hồ sơ tài xế & đánh giá
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Thông tin phương tiện và đánh giá đã ghi nhận trong dữ liệu demo.
          </p>
        </div>

        {/* THẺ TÀI XẾ CÔNG NGHỆ CHUYÊN NGHIỆP */}
        <section className="bg-stone-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden space-y-5">
          {/* Subtle honey-comb geometric decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-500">
              <polygon points="50,15 90,38 90,83 50,105 10,83 10,38" />
              <polygon points="90,38 130,60 130,105 90,127 50,105 50,60" />
            </svg>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 flex items-center justify-center font-black text-2xl shadow-sm">
              {driver?.name?.charAt(0) ?? "T"}
            </div>
            <div className="space-y-1 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              HỒ SƠ TÀI XẾ
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {driver?.name ?? "Tài xế demo"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                <span>MÃ TX: <strong>{driver?.id ?? "—"}</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopyText(driver?.id ?? "", "mã tài xế")}
                  className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                  title="Sao chép mã tài xế"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 3 CHỈ SỐ UY TÍN */}
          <div className="pt-4 border-t border-stone-800 grid grid-cols-3 gap-2 text-center relative z-10">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Đánh giá</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400">{ratings.length ? "★ " + (ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length).toFixed(1) : "—"}</div>
              <span className="text-[10px] text-stone-400">{ratings.length} lượt</span>
            </div>
            <div className="space-y-0.5 border-x border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Đơn hoàn tất</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{completedTrips.length}</div>
              <span className="text-[10px] text-stone-400">Trong dữ liệu demo</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Trạng thái</span>
              <div className="text-sm sm:text-base font-black text-white">{isOnline ? "Trực tuyến" : "Tạm nghỉ"}</div>
              <span className="text-[10px] text-stone-400">Theo bàn điều phối</span>
            </div>
          </div>
        </section>

        {/* THÔNG TIN PHƯƠNG TIỆN */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wide">
              Thông tin xe máy đăng ký
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Thông tin phương tiện
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-stone-400 block mb-0.5">BIỂN SỐ XE</span>
              <strong className="font-mono text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded inline-block">
                {driver?.vehiclePlate ?? "—"}
              </strong>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">LOẠI XE</span>
              <strong className="text-stone-900">{driver?.vehicleType ?? "—"}</strong>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">MÀU SẮC</span>
              <span className="text-stone-800">Chưa lưu trong dữ liệu demo</span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">ĐỘI XE PHỤ TRÁCH</span>
              <span className="text-stone-800">{driver?.currentDistrict ?? "—"}</span>
            </div>
          </div>
        </section>

        {/* LỜI KHEN NỔI BẬT TỪ KHÁCH HÀNG */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wide">
            Lời khen từ khách hàng
          </h3>

          <div className="flex flex-wrap gap-2 text-xs">
            {Object.keys(praiseCounts).length === 0 && <span className="text-stone-500">Chưa có lời khen từ khách hàng trong dữ liệu demo.</span>}
            {Object.entries(praiseCounts).map(([tag, count]) => <span key={tag} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">{tag} <strong>({count})</strong></span>)}
          </div>
        </section>

        {/* ĐỔI PHÂN HỆ & ĐĂNG XUẤT */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm pb-2 border-b border-stone-100">
            Hệ thống & Tài khoản
          </h3>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <Link href="/customer" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" fullWidth>
                ← Chuyển sang Cổng Khách hàng
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="danger" size="sm" fullWidth>
                Đăng xuất tài xế
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <DriverBottomNav />
    </div>
  );
}
