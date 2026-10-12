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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#1C1917] font-sans">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5">
              QUẢN TRỊ ĐỘI XE (DP-04)
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Giám Sát Đội Xe & Tài Xế Tác Chiến
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Theo dõi trạng thái trực tuyến, khu vực tác chiến và hạn mức tiền mặt COD tạm giữ của đội ngũ tài xế
            </p>
          </div>

          <Link
            href="/dieu-phoi"
            className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800 transition-colors"
          >
            ← Bàn điều phối
          </Link>
        </div>

        {/* FLEET TELEMETRY STRIP */}
        <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 border border-stone-200 bg-white rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Tổng số tài xế
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{drivers.length}</div>
            <span className="text-xs text-stone-500 font-medium block">Đã đăng ký vận hành</span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
              Đang trực tuyến (Rảnh)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{onlineIdleCount}</div>
            <span className="text-xs text-stone-500 font-medium block">Sẵn sàng nhận cuốc ngay</span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
              Đang chạy chuyến
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{onlineBusyCount}</div>
            <span className="text-xs text-stone-500 font-medium block">Đang lấy hoặc giao hàng</span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Tạm nghỉ (Offline)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-500">{offlineCount}</div>
            <span className="text-xs text-stone-500 font-medium block">Ngoài ca trực tiếp nhận</span>
          </div>
        </section>

        {/* BỘ LỌC TÀI XẾ */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-stone-500 font-bold mr-1">Trạng thái:</span>
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === st.key
                    ? "bg-amber-500 text-stone-900 shadow-sm"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-bold">Khu vực:</span>
            <select
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-semibold outline-none focus:border-amber-500"
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
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-xs tracking-wider border-b border-stone-200">
                <tr>
                  <th className="p-4 pl-6 whitespace-nowrap">Tài xế & Mã</th>
                  <th className="p-4 whitespace-nowrap">Phương tiện</th>
                  <th className="p-4 whitespace-nowrap">Khu vực tác chiến</th>
                  <th className="p-4 whitespace-nowrap">Trạng thái</th>
                  <th className="p-4 whitespace-nowrap">Cuốc hoàn tất</th>
                  <th className="p-4 whitespace-nowrap">Đánh giá</th>
                  <th className="p-4 whitespace-nowrap">COD tạm giữ</th>
                  <th className="p-4 pr-6 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredDrivers.map((d) => {
                  const isIdle = d.status === "ONLINE_IDLE";
                  const isBusy = d.status === "ONLINE_BUSY";
                  const hasHighCod = d.codCashHolding > 500000;

                  return (
                    <tr key={d.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-stone-900 text-sm sm:text-base">{d.name}</div>
                        <div className="text-xs text-stone-500 font-medium">{d.id} · {d.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-amber-700">{d.vehiclePlate}</div>
                        <div className="text-xs text-stone-500 font-medium">{d.vehicleType}</div>
                      </td>
                      <td className="p-4 font-semibold text-stone-800">
                        {d.currentDistrict}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isIdle
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isBusy
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {isIdle ? `Rảnh (${d.idleSinceMinutes}m)` : isBusy ? "Đang giao" : "Tạm nghỉ"}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-stone-800">
                        {d.completedOrdersToday} cuốc
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-amber-700">★ {d.rating}</span>
                        <div className="text-xs text-stone-500 font-medium">Nhận: {d.acceptanceRate}%</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold ${
                            hasHighCod ? "text-rose-700" : "text-stone-800"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                        {hasHighCod && (
                          <span className="block text-[11px] text-rose-600 font-medium">
                            Cần nộp về quỹ
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        <a
                          href={`tel:${d.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold inline-block transition-colors"
                        >
                          Gọi
                        </a>
                        <button
                          type="button"
                          onClick={() => handlePingDriver(d)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
                        >
                          Ping GPS
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
