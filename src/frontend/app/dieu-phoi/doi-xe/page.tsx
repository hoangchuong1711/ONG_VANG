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
    showToast(`Đã gửi tín hiệu kiểm tra định vị đến tài xế ${driver.name}!`, "info");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quản Lý Đội Xe & Tài Xế (DP-04)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi trạng thái trực tuyến, khu vực hoạt động và tiền mặt COD tạm giữ của tài xế
            </p>
          </div>
          <Link
            href="/dieu-phoi"
            className="text-xs text-slate-400 hover:text-amber-400 font-bold"
          >
            ← Bàn Điều Phối
          </Link>
        </div>

        {/* 4 THẺ KPI ĐỘI XE */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tổng số tài xế
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">{drivers.length}</div>
            <span className="text-[11px] text-slate-500">Đã đăng ký hệ thống</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Đang trực tuyến (Rảnh)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {onlineIdleCount}
            </div>
            <span className="text-[11px] text-emerald-300/80">Sẵn sàng nhận cuốc ngay</span>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Đang chạy chuyến
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {onlineBusyCount}
            </div>
            <span className="text-[11px] text-amber-300/80">Đang đi lấy / giao hàng</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tạm nghỉ (Offline)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-400 mt-1">
              {offlineCount}
            </div>
            <span className="text-[11px] text-slate-500">Ngoài ca trực</span>
          </div>
        </section>

        {/* BỘ LỌC TÀI XẾ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 font-bold mr-1">Trạng thái:</span>
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filter === st.key
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Khu vực:</span>
            <select
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold outline-none"
            >
              <option value="ALL">Tất cả quận</option>
              <option value="Quận 1">Quận 1</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Quận 5">Quận 5</option>
              <option value="Quận 7">Quận 7</option>
            </select>
          </div>
        </div>

        {/* BẢNG DANH SÁCH TÀI XẾ */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Tài xế & Mã TX</th>
                  <th className="p-3.5">Phương tiện</th>
                  <th className="p-3.5">Khu vực</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Cuốc hôm nay</th>
                  <th className="p-3.5">Đánh giá</th>
                  <th className="p-3.5">COD tạm giữ</th>
                  <th className="p-3.5 pr-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDrivers.map((d) => {
                  const isIdle = d.status === "ONLINE_IDLE";
                  const isBusy = d.status === "ONLINE_BUSY";
                  const hasHighCod = d.codCashHolding > 500000;

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-white text-sm">{d.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{d.id} · {d.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-amber-400">{d.vehiclePlate}</div>
                        <div className="text-[11px] text-slate-400">{d.vehicleType}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-300">
                        {d.currentDistrict}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isIdle
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : isBusy
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isIdle ? "bg-emerald-400 animate-pulse" : isBusy ? "bg-amber-400" : "bg-slate-500"
                            }`}
                          />
                          <span>{isIdle ? `Rảnh (${d.idleSinceMinutes}m)` : isBusy ? "Đang giao" : "Tạm nghỉ"}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-200">
                        {d.completedOrdersToday} cuốc
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-amber-400">★ {d.rating}</span>
                        <div className="text-[10px] text-slate-400">Nhận: {d.acceptanceRate}%</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-mono font-bold ${
                            hasHighCod ? "text-rose-400" : "text-slate-300"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                        {hasHighCod && (
                          <span className="block text-[10px] text-rose-400">Cần nộp về quỹ</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right space-x-2">
                        <a
                          href={`tel:${d.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-block"
                        >
                          📞 Gọi
                        </a>
                        <button
                          type="button"
                          onClick={() => handlePingDriver(d)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30"
                        >
                          Ping
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
