"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { SAMPLE_DRIVERS } from "@/lib/sample-data";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherReportsPage() {
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState(SAMPLE_DRIVERS);
  const [dateRange, setDateRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");

  // Tổng tiền COD các tài xế đang giữ
  const totalCodHolding = drivers.reduce((sum, d) => sum + d.codCashHolding, 0);

  // Xác nhận tài xế nộp COD về quỹ (UC-08)
  const handleSettleCod = (driverId: string, driverName: string, amount: number) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, codCashHolding: 0 } : d))
    );
    showToast(
      `Đã đối soát & xác nhận thu ${formatVND(amount)} tiền COD từ tài xế ${driverName} vào quỹ công ty!`,
      "success"
    );
  };

  const handleExportExcel = () => {
    showToast("Đang kết xuất và tải xuống file Excel báo cáo vận hành (UC-15)...", "info");
    setTimeout(() => {
      showToast("Tải xuống thành công file: Bao_Cao_Van_Hanh_Ca_Truc.xlsx", "success");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Báo Cáo Vận Hành Ca Trực & Đối Soát COD (UC-15 / UC-08)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tổng hợp chỉ số hoàn tất đơn hàng, tỷ lệ sự cố và quản lý quỹ tiền mặt COD của toàn đội xe
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold"
            >
              📊 Xuất báo cáo Excel (UC-15)
            </Button>
            <Link
              href="/dieu-phoi"
              className="text-xs text-slate-400 hover:text-amber-400 font-bold ml-2"
            >
              ← Bàn Điều Phối
            </Link>
          </div>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold">Kỳ báo cáo:</span>
          {[
            { key: "TODAY", label: "Ca hôm nay" },
            { key: "WEEK", label: "7 ngày qua" },
            { key: "MONTH", label: "Tháng này" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDateRange(item.key as "TODAY" | "WEEK" | "MONTH")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                dateRange === item.key
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 4 THẺ CHỈ SỐ KPI VẬN HÀNH */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Tổng giá trị cước snapshot
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              {formatVND(1840000)}
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              ↑ 12% so với ca hôm qua
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Tỷ lệ giao thành công
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              96.8%
            </div>
            <span className="text-[11px] text-slate-400 block">31/32 cuốc hoàn tất</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Tỷ lệ sự cố / Hủy đơn
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-400">
              3.2%
            </div>
            <span className="text-[11px] text-slate-400 block">01 sự cố được can thiệp</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Tiền COD tài xế đang giữ
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {formatVND(totalCodHolding)}
            </div>
            <span className="text-[11px] text-amber-400 block">Cần đối soát nộp quỹ</span>
          </div>
        </section>

        {/* BẢNG ĐỐI SOÁT TIỀN MẶT COD THEO TÀI XẾ (UC-08) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-white">
                Bàn Đối Soát Thu Hồi Tiền Mặt COD Từ Tài Xế (UC-08)
              </h2>
              <p className="text-xs text-slate-400">
                Hạn mức tiền mặt tối đa mỗi tài xế được tạm giữ là <strong>2.000.000đ</strong>
              </p>
            </div>
            <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
              Tổng quỹ COD chưa nộp: {formatVND(totalCodHolding)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-4">Mã & Tài xế</th>
                  <th className="p-3.5">Biển số xe</th>
                  <th className="p-3.5">Khu vực</th>
                  <th className="p-3.5">Tiền COD tạm giữ</th>
                  <th className="p-3.5">Cảnh báo hạn mức</th>
                  <th className="p-3.5 pr-4 text-right">Hành động đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {drivers.map((d) => {
                  const hasCod = d.codCashHolding > 0;
                  const isNearLimit = d.codCashHolding >= 800000;

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 pl-4">
                        <strong className="text-white text-sm block">{d.name}</strong>
                        <span className="font-mono text-slate-400 text-[11px]">{d.id}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        {d.vehiclePlate}
                      </td>
                      <td className="p-3.5 text-slate-300 font-semibold">{d.currentDistrict}</td>
                      <td className="p-3.5">
                        <span
                          className={`font-mono font-black text-sm ${
                            hasCod ? "text-amber-400" : "text-slate-500"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isNearLimit ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            ⚠️ Gần chạm hạn mức
                          </span>
                        ) : hasCod ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            Trong hạn mức
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            ✓ Đã nộp đủ quỹ
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        {hasCod ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSettleCod(d.id, d.name, d.codCashHolding)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                          >
                            Xác nhận đã nộp quỹ ✓
                          </Button>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Đã thanh toán</span>
                        )}
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
