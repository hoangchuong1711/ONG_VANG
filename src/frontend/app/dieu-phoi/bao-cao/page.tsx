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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-800">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-amber-800 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                FINANCIAL DESK (UC-15 / UC-08)
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Báo Cáo Ca Trực & Bàn Đối Soát Quỹ COD
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Tổng hợp chỉ số hoàn tất đơn hàng, tỷ lệ sự cố và thu hồi tiền mặt COD từ tài xế theo ca trực.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-mono font-medium"
            >
              XUẤT EXCEL (UC-15)
            </Button>
            <Link
              href="/dieu-phoi"
              className="text-xs font-mono font-medium text-zinc-500 hover:text-amber-700 transition-colors"
            >
              ← BÀN ĐIỀU PHỐI
            </Link>
          </div>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 font-mono text-[11px] font-bold uppercase">Kỳ báo cáo:</span>
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
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-2xs"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SHIFT TELEMETRY STRIP (LIGHT THEME ANTI-SLOP) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 border border-zinc-200 bg-white rounded-xl overflow-hidden font-mono shadow-2xs">
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Tổng cước snapshot
            </span>
            <div className="text-2xl font-bold text-amber-700">
              {formatVND(1840000)}
            </div>
            <span className="text-[11px] text-emerald-700 font-sans block">
              +12% so với ca hôm qua
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
              Tỷ lệ hoàn tất đơn
            </span>
            <div className="text-2xl font-bold text-emerald-700">
              96.8%
            </div>
            <span className="text-[11px] text-zinc-500 font-sans block">
              31/32 cuốc thành công
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
              Tỷ lệ sự cố / Hủy đơn
            </span>
            <div className="text-2xl font-bold text-rose-700">
              3.2%
            </div>
            <span className="text-[11px] text-zinc-500 font-sans block">
              01 sự cố được can thiệp
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Quỹ COD tài xế đang giữ
            </span>
            <div className="text-2xl font-bold text-zinc-900">
              {formatVND(totalCodHolding)}
            </div>
            <span className="text-[11px] text-amber-800 font-sans block">
              Cần đối soát nộp quỹ
            </span>
          </div>
        </section>

        {/* BẢNG ĐỐI SOÁT TIỀN MẶT COD THEO TÀI XẾ (UC-08) */}
        <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 block">
                Bàn đối soát thu hồi tiền mặt COD từ tài xế (UC-08)
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hạn mức tiền mặt tối đa mỗi tài xế được tạm giữ trong ca là <strong className="text-zinc-800">2.000.000đ</strong>.
              </p>
            </div>
            <div className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
              Tổng quỹ COD chưa nộp: {formatVND(totalCodHolding)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="p-3.5 pl-5">Mã & Tài xế</th>
                  <th className="p-3.5">Biển số</th>
                  <th className="p-3.5">Khu vực</th>
                  <th className="p-3.5">COD tạm giữ</th>
                  <th className="p-3.5">Cảnh báo hạn mức</th>
                  <th className="p-3.5 pr-5 text-right">Thao tác thu quỹ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {drivers.map((d) => {
                  const hasCod = d.codCashHolding > 0;
                  const isNearLimit = d.codCashHolding >= 800000;

                  return (
                    <tr key={d.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <strong className="text-zinc-900 font-sans text-sm block">{d.name}</strong>
                        <span className="text-zinc-500 text-[11px]">{d.id}</span>
                      </td>
                      <td className="p-3.5 font-bold text-amber-700">
                        {d.vehiclePlate}
                      </td>
                      <td className="p-3.5 text-zinc-800 font-sans font-medium">
                        {d.currentDistrict}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold text-sm ${
                            hasCod ? "text-amber-800" : "text-zinc-400"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isNearLimit ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            GẦN CHẠM HẠN MỨC
                          </span>
                        ) : hasCod ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            TRONG HẠN MỨC
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-2xs"
                          >
                            THU QUỸ COD ✓
                          </Button>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Đã thanh toán</span>
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
