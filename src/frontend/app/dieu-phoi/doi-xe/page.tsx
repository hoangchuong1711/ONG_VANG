"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { SAMPLE_DRIVERS } from "@/lib/sample-data";
import { DriverItem, DriverStatus } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type FilterStatus = "ALL" | DriverStatus;

export default function DispatcherFleetPage() {
  const { showToast } = useToast();
  const [drivers] = useState<DriverItem[]>(SAMPLE_DRIVERS);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [searchDistrict, setSearchDistrict] = useState<string>("ALL");

  const filteredDrivers = drivers.filter((d) => {
    if (filter !== "ALL" && d.status !== filter) return false;
    if (searchDistrict !== "ALL" && d.currentDistrict !== searchDistrict) return false;
    return true;
  });

  const onlineIdleCount = drivers.filter((d) => d.status === "ONLINE_IDLE").length;
  const onlineBusyCount = drivers.filter((d) => d.status === "ONLINE_BUSY").length;
  const offlineCount = drivers.filter((d) => d.status === "OFFLINE").length;

  const handlePingDriver = (driver: DriverItem) => {
    showToast(`Đã gửi tín hiệu kiểm tra định vị GPS đến tài xế ${driver.name}!`, "info");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-200">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                FLEET ROSTER (DP-04)
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Giám Sát Đội Xe & Tài Xế Tác Chiến
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Theo dõi trạng thái trực tuyến, khu vực tác chiến và hạn mức tiền mặt COD tạm giữ của đội ngũ tài xế.
            </p>
          </div>

          <Link
            href="/dieu-phoi"
            className="text-xs font-mono font-medium text-zinc-400 hover:text-amber-400 transition-colors"
          >
            ← BÀN ĐIỀU PHỐI
          </Link>
        </div>

        {/* FLEET TELEMETRY STRIP (ANTI-SLOP: DENSE INTEGRATED METRICS, NO 4 EQUAL CARDBOARD BOXES) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 border border-zinc-800/80 bg-zinc-900/40 rounded-xl overflow-hidden font-mono">
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Tổng số tài xế
            </span>
            <div className="text-2xl font-bold text-zinc-100">{drivers.length}</div>
            <span className="text-[11px] text-zinc-400 font-sans block">Đã đăng ký vận hành</span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/90 block">
              Đang trực tuyến (Rảnh)
            </span>
            <div className="text-2xl font-bold text-emerald-400">{onlineIdleCount}</div>
            <span className="text-[11px] text-zinc-400 font-sans block">Sẵn sàng nhận cuốc ngay</span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 block">
              Đang chạy chuyến
            </span>
            <div className="text-2xl font-bold text-amber-400">{onlineBusyCount}</div>
            <span className="text-[11px] text-zinc-400 font-sans block">Đang lấy hoặc giao hàng</span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Tạm nghỉ (Offline)
            </span>
            <div className="text-2xl font-bold text-zinc-400">{offlineCount}</div>
            <span className="text-[11px] text-zinc-400 font-sans block">Ngoài khung giờ nhận đơn</span>
          </div>
        </section>

        {/* BỘ LỌC TÀI XẾ */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-zinc-400 font-mono text-[11px] font-bold mr-1 uppercase">Lọc:</span>
            {[
              { key: "ALL", label: "Tất cả" },
              { key: "ONLINE_IDLE", label: "Đang rảnh" },
              { key: "ONLINE_BUSY", label: "Đang bận" },
              { key: "OFFLINE", label: "Tạm nghỉ" },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setFilter(st.key as FilterStatus)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium transition-colors ${
                  filter === st.key
                    ? "bg-amber-500 text-zinc-950 font-bold"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono text-[11px] font-bold uppercase">Khu vực:</span>
            <select
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-xs font-mono outline-hidden focus:border-amber-400"
            >
              <option value="ALL">Tất cả quận</option>
              <option value="Quận 1">Quận 1</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Quận 5">Quận 5</option>
              <option value="Quận 7">Quận 7</option>
            </select>
          </div>
        </div>

        {/* BẢNG DANH SÁCH TÀI XẾ (HIGH DENSITY ROSTER) */}
        <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="p-3.5 pl-5">Tài xế & Mã</th>
                  <th className="p-3.5">Phương tiện</th>
                  <th className="p-3.5">Khu vực tác chiến</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Cuốc hoàn tất</th>
                  <th className="p-3.5">Đánh giá</th>
                  <th className="p-3.5">COD tạm giữ</th>
                  <th className="p-3.5 pr-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredDrivers.map((d) => {
                  const isIdle = d.status === "ONLINE_IDLE";
                  const isBusy = d.status === "ONLINE_BUSY";
                  const hasHighCod = d.codCashHolding > 500000;

                  return (
                    <tr key={d.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-sans font-bold text-zinc-100 text-sm">{d.name}</div>
                        <div className="text-[11px] text-zinc-500">{d.id} · {d.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-amber-400">{d.vehiclePlate}</div>
                        <div className="text-[11px] text-zinc-400 font-sans">{d.vehicleType}</div>
                      </td>
                      <td className="p-3.5 font-sans font-medium text-zinc-300">
                        {d.currentDistrict}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isIdle
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : isBusy
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}
                        >
                          {isIdle ? `RẢNH (${d.idleSinceMinutes}m)` : isBusy ? "ĐANG GIAO" : "OFFLINE"}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-200">
                        {d.completedOrdersToday} cuốc
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-amber-400">★ {d.rating}</span>
                        <div className="text-[10px] text-zinc-500">Nhận: {d.acceptanceRate}%</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold ${
                            hasHighCod ? "text-rose-400" : "text-zinc-300"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                        {hasHighCod && (
                          <span className="block text-[10px] text-rose-400/90 font-sans">
                            Cần nộp về quỹ
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right space-x-2">
                        <a
                          href={`tel:${d.phone}`}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium inline-block transition-colors"
                        >
                          GỌI
                        </a>
                        <button
                          type="button"
                          onClick={() => handlePingDriver(d)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-mono font-medium border border-amber-500/30 transition-colors"
                        >
                          PING GPS
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
