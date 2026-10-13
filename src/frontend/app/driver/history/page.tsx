"use client";

import React, { useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { formatVND } from "@/lib/utils";

type HistoryFilter = "TODAY" | "YESTERDAY" | "7_DAYS" | "MONTH";

const DRIVER_TRIPS = [
  {
    id: "DH-2025-001236",
    time: "14:15 - Hôm nay",
    from: "56 Nguyễn Đình Chiểu, Q.3",
    to: "220 Nguyễn Tri Phương, Q.5",
    distanceKm: 3.8,
    grossFee: 42000,
    netIncome: 35700, // 85%
    paymentMethod: "TIEN_MAT",
    rating: 5,
  },
  {
    id: "DH-2025-001234",
    time: "11:30 - Hôm nay",
    from: "123 Lê Lợi, Q.1",
    to: "456 Nguyễn Thị Minh Khai, Q.3",
    distanceKm: 2.5,
    grossFee: 32000,
    netIncome: 27200,
    paymentMethod: "VNPAY",
    rating: 5,
  },
  {
    id: "DH-2025-001228",
    time: "09:40 - Hôm nay",
    from: "15 Lê Thánh Tôn, Q.1",
    to: "72 Trần Hưng Đạo, Q.5",
    distanceKm: 3.2,
    grossFee: 38000,
    netIncome: 32300,
    paymentMethod: "VNPAY",
    rating: 5,
  },
  {
    id: "DH-2025-001225",
    time: "08:15 - Hôm nay",
    from: "10 Nguyễn Huệ, Q.1",
    to: "300 Điện Biên Phủ, Bình Thạnh",
    distanceKm: 4.1,
    grossFee: 45000,
    netIncome: 38250,
    paymentMethod: "TIEN_MAT",
    rating: 4,
  },
  {
    id: "DH-2025-001220",
    time: "17:10 - Hôm qua",
    from: "88 Nam Kỳ Khởi Nghĩa, Q.3",
    to: "12 Võ Văn Kiệt, Q.1",
    distanceKm: 4.5,
    grossFee: 53000,
    netIncome: 45050,
    paymentMethod: "VNPAY",
    rating: 5,
  },
];

export default function DriverTripHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>("TODAY");
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const trips =
    filter === "TODAY"
      ? DRIVER_TRIPS.slice(0, 4)
      : filter === "YESTERDAY"
      ? DRIVER_TRIPS.slice(4)
      : DRIVER_TRIPS;

  const totalIncome = trips.reduce((sum, t) => sum + t.netIncome, 0);
  const totalKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Lịch sử chuyến xe & Thu nhập (TX-06)
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Xem lại các chuyến giao hàng đã hoàn thành và đối soát tiền cước
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
                Thu nhập thực nhận (85%)
              </span>
              <div className="text-3xl font-black mt-0.5">
                {formatVND(totalIncome)}
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
              <span>★ 4.98 / 5.0</span>
            </div>
          </div>
        </section>

        {/* LIST OF COMPLETED TRIPS */}
        <section className="space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
            Danh sách chuyến giao ({trips.length})
          </h3>

          <div className="space-y-3">
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
                      +{formatVND(trip.netIncome)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      (Cước gốc: {formatVND(trip.grossFee)})
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
                      {trip.paymentMethod === "TIEN_MAT" ? "💵 Đã thu COD" : "💳 VNPay"}
                    </span>
                    <span className="text-[11px] text-stone-400">{trip.distanceKm} km</span>
                  </div>
                  <div className="font-bold text-amber-600">
                    ★ {trip.rating}.0
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
