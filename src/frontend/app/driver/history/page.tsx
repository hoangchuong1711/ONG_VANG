"use client";

import React, { useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { formatVND } from "@/lib/utils";
import { toggleDemoDriverOnline, useDemoStore } from "@/lib/demo-store";

type HistoryFilter = "TODAY" | "YESTERDAY" | "7_DAYS" | "MONTH";

export default function DriverTripHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>("7_DAYS");
  const [asOf] = useState(() => Date.now());
  const { state: demo } = useDemoStore();
  const isOnline = demo.drivers.find((item) => item.id === "TX-DEMO-1")?.status !== "OFFLINE";

  const trips = demo.orders
    .filter((order) => order.driver?.id === "TX-DEMO-1" && ["HOAN_TAT", "CHUA_THANH_TOAN"].includes(order.status))
    .filter((order) => {
      const day = new Date(order.createdTimestamp).toDateString();
      if (filter === "TODAY") return day === new Date(asOf).toDateString();
      if (filter === "YESTERDAY") return day === new Date(asOf - 86400000).toDateString();
      if (filter === "7_DAYS") return order.createdTimestamp >= asOf - 7 * 86400000;
      return new Date(order.createdTimestamp).getMonth() === new Date(asOf).getMonth() &&
        new Date(order.createdTimestamp).getFullYear() === new Date(asOf).getFullYear();
    })
    .map((order) => ({
      id: order.id, time: order.createdAt,
      from: order.sender.street + ", " + order.sender.district,
      to: order.receiver.street + ", " + order.receiver.district,
      distanceKm: order.distanceKm, fee: order.totalFee,
      paymentMethod: order.paymentMethod, paid: order.paid, rating: order.rating?.stars,
    }));

  const totalFare = trips.reduce((sum, t) => sum + t.fee, 0);
  const totalKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => toggleDemoDriverOnline("TX-DEMO-1")} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Lịch sử chuyến giao
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Xem các đơn đã hoàn tất được tạo trong kỳ và cước vận chuyển tương ứng.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { key: "TODAY", label: "Hôm nay" },
              { key: "YESTERDAY", label: "Hôm qua" },
              { key: "7_DAYS", label: "7 ngày qua" },
              { key: "MONTH", label: "Tháng này" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === item.key
                  ? "bg-stone-950 text-white shadow-xs"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SUMMARY STATS CARD */}
        <section className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 rounded-2xl p-5 text-stone-950 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-stone-950/15">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-950 block">
                Tổng cước chuyến hoàn tất
              </span>
              <div className="text-3xl font-black mt-0.5">
                {formatVND(totalFare)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-950 block">
                Số chuyến
              </span>
              <div className="text-2xl font-black">
                {trips.length} chuyến
              </div>
            </div>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2 text-xs font-bold text-stone-900">
            <div>
              <span className="opacity-80 block text-[10px]">Quãng đường chạy:</span>
              <span>{totalKm.toFixed(1)} km</span>
            </div>
            <div className="text-right">
              <span className="opacity-80 block text-[10px]">Đánh giá trung bình:</span>
              <span>{trips.some((trip) => trip.rating) ?
                "★ " + (trips.reduce((sum, trip) => sum + (trip.rating ?? 0), 0) / trips.filter((trip) => trip.rating).length).toFixed(1) + " / 5.0" :
                "Chưa có đánh giá"}</span>
            </div>
          </div>
        </section>

        {/* LIST OF COMPLETED TRIPS */}
        <section className="space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
            Danh sách chuyến giao ({trips.length})
          </h3>

          <div className="space-y-3">
            {trips.length === 0 && <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Chưa có chuyến giao hoàn tất trong kỳ đã chọn.</div>}
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="bg-white border border-stone-200 hover:border-amber-300 rounded-xl p-4 shadow-2xs transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-stone-900">
                      {trip.id}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-400">{trip.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-600">
                      {formatVND(trip.fee)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Cước vận chuyển
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-stone-700">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-stone-400 mt-1 shrink-0" />
                    <span className="truncate">Lấy: {trip.from}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <span className="truncate">Giao: {trip.to}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-700">
                      {trip.paid ? (trip.paymentMethod === "TIEN_MAT" ? "Đã thu tiền mặt" : "Đã thanh toán trực tuyến") : "Chưa thanh toán"}
                    </span>
                    <span className="text-[11px] text-stone-400">{trip.distanceKm} km</span>
                  </div>
                  <div className="font-bold text-amber-600">
                    {trip.rating ? "★ " + trip.rating + ".0" : "Chưa có đánh giá"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <DriverBottomNav />
    </div>
  );
}
