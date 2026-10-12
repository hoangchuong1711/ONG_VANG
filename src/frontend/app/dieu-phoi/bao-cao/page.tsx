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
      `Đã đối soát & xác nhận thu ${formatVND(amount)} tiền COD từ tài xế ${driverName} vào quỹ!`,
      "success"
    );
  };

  const handleExportExcel = () => {
    showToast("Đang kết xuất và tải xuống báo cáo vận hành Excel (UC-15)...", "info");
    setTimeout(() => {
      showToast("Tải xuống hoàn tất: Bao_Cao_Van_Hanh_Ca_Truc.xlsx", "success");
    }, 1200);
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
                FINANCIAL DESK (UC-15 / UC-08)
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Báo Cáo Ca Trực & Bàn Đối Soát Quỹ COD
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Tổng hợp chỉ số hoàn tất đơn hàng, tỷ lệ sự cố và thu hồi tiền mặt COD từ tài xế theo ca trực.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs font-mono font-medium"
            >
              XUẤT EXCEL (UC-15)
            </Button>
            <Link
              href="/dieu-phoi"
              className="text-xs font-mono font-medium text-zinc-400 hover:text-amber-400 transition-colors"
            >
              ← BÀN ĐIỀU PHỐI
            </Link>
          </div>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 font-mono text-[11px] font-bold uppercase">Kỳ báo cáo:</span>
          {[
            { key: "TODAY", label: "Ca hôm nay" },
            { key: "WEEK", label: "7 ngày qua" },
            { key: "MONTH", label: "Tháng này" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDateRange(item.key as "TODAY" | "WEEK" | "MONTH")}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium transition-colors ${
                dateRange === item.key
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SHIFT TELEMETRY STRIP (ANTI-SLOP: DENSE INTEGRATED METRICS, NO 4 EQUAL CARDBOARD BOXES) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 border border-zinc-800/80 bg-zinc-900/40 rounded-xl overflow-hidden font-mono">
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Tổng cước snapshot
            </span>
            <div className="text-2xl font-bold text-amber-400">
              {formatVND(1840000)}
            </div>
            <span className="text-[11px] text-emerald-400 font-sans block">
              +12% so với ca hôm qua
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/90 block">
              Tỷ lệ hoàn tất đơn
            </span>
            <div className="text-2xl font-bold text-emerald-400">
              96.8%
            </div>
            <span className="text-[11px] text-zinc-400 font-sans block">
              31/32 cuốc thành công
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400/90 block">
              Tỷ lệ sự cố / Hủy đơn
            </span>
            <div className="text-2xl font-bold text-rose-400">
              3.2%
            </div>
            <span className="text-[11px] text-zinc-400 font-sans block">
              01 sự cố được can thiệp
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Quỹ COD tài xế đang giữ
            </span>
            <div className="text-2xl font-bold text-zinc-100">
              {formatVND(totalCodHolding)}
            </div>
            <span className="text-[11px] text-amber-400/90 font-sans block">
              Cần đối soát nộp quỹ
            </span>
          </div>
        </section>

        {/* BẢNG ĐỐI SOÁT TIỀN MẶT COD THEO TÀI XẾ (UC-08) */}
        <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 block">
                Bàn đối soát thu hồi tiền mặt COD từ tài xế (UC-08)
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hạn mức tiền mặt tối đa mỗi tài xế được tạm giữ trong ca là <strong className="text-zinc-200">2.000.000đ</strong>.
              </p>
            </div>
            <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
              Tổng quỹ COD chưa nộp: {formatVND(totalCodHolding)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="p-3.5 pl-5">Mã & Tài xế</th>
                  <th className="p-3.5">Biển số</th>
                  <th className="p-3.5">Khu vực</th>
                  <th className="p-3.5">COD tạm giữ</th>
                  <th className="p-3.5">Cảnh báo hạn mức</th>
                  <th className="p-3.5 pr-5 text-right">Thao tác thu quỹ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {drivers.map((d) => {
                  const hasCod = d.codCashHolding > 0;
                  const isNearLimit = d.codCashHolding >= 800000;

                  return (
                    <tr key={d.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <strong className="text-zinc-100 font-sans text-sm block">{d.name}</strong>
                        <span className="text-zinc-500 text-[11px]">{d.id}</span>
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {d.vehiclePlate}
                      </td>
                      <td className="p-3.5 text-zinc-300 font-sans font-medium">
                        {d.currentDistrict}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold text-sm ${
                            hasCod ? "text-amber-400" : "text-zinc-500"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isNearLimit ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            GẦN CHẠM HẠN MỨC
                          </span>
                        ) : hasCod ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            TRONG HẠN MỨC
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ĐÃ NỘP ĐỦ QUỸ
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {hasCod ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSettleCod(d.id, d.name, d.codCashHolding)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs"
                          >
                            THU QUỸ COD ✓
                          </Button>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Đã thanh toán</span>
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
