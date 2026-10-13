"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { useDemoStore, updateDemoState } from "@/lib/demo-store";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherReportsPage() {
  const { showToast } = useToast();
  const { state: demo } = useDemoStore();
  const { drivers } = demo;
  const [dateRange, setDateRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");
  const [asOf] = useState(() => Date.now());
  const shown = demo.orders.filter((order) => dateRange === "TODAY" ?
    new Date(order.createdTimestamp).toDateString() === new Date(asOf).toDateString() :
    dateRange === "WEEK" ? order.createdTimestamp >= asOf - 7 * 86400000 :
      new Date(order.createdTimestamp).getMonth() === new Date(asOf).getMonth() &&
      new Date(order.createdTimestamp).getFullYear() === new Date(asOf).getFullYear());
  const completed = shown.filter((order) => ["HOAN_TAT", "CHUA_THANH_TOAN"].includes(order.status));
  const exceptionCount = shown.filter((order) => order.status === "DA_HUY" || demo.incidents.some((incident) => incident.orderId === order.id)).length;

  // Tổng tiền COD các tài xế đang giữ
  const totalCodHolding = drivers.reduce((sum, d) => sum + d.codCashHolding, 0);

  // Xác nhận tài xế nộp COD về quỹ (UC-08)
  const handleSettleCod = (driverId: string, driverName: string, amount: number) => {
    updateDemoState((previous) => ({ ...previous, drivers: previous.drivers.map((driver) =>
      driver.id === driverId ? { ...driver, codCashHolding: 0, codSettlementRequested: false } : driver) }));
    showToast(
      `Đã đối soát & xác nhận thu ${formatVND(amount)} tiền COD từ tài xế ${driverName} vào quỹ!`,
      "success"
    );
  };

  const handleExportCsv = () => {
    const lines = [["Mã đơn", "Người gửi", "Trạng thái", "Cước (VND)", "Đã thu"],
      ...shown.map((order) => [order.id, order.sender.name, order.statusText, String(order.totalFee), order.paid ? "Có" : "Chưa"])];
    const csv = "\uFEFF" + lines.map((line) => line.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-cao-dieu-phoi.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải báo cáo CSV theo kỳ đang xem.", "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5 whitespace-nowrap">
              ĐỐI SOÁT VẬN HÀNH
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Báo Cáo Ca Trực & Bàn Đối Soát Quỹ COD
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Tổng hợp chỉ số hoàn tất đơn hàng, tỷ lệ sự cố và thu hồi tiền mặt COD từ tài xế theo ca trực
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs font-bold whitespace-nowrap"
            >
              Tải báo cáo CSV
            </Button>
            <Link
              href="/dispatcher"
              className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800 transition-colors whitespace-nowrap shrink-0"
            >
              ← Bàn điều phối
            </Link>
          </div>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500 font-bold">Kỳ báo cáo:</span>
          {[
            { key: "TODAY", label: "Ca hôm nay" },
            { key: "WEEK", label: "7 ngày qua" },
            { key: "MONTH", label: "Tháng này" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDateRange(item.key as "TODAY" | "WEEK" | "MONTH")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === item.key
                  ? "bg-amber-500 text-stone-900 shadow-sm"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SHIFT TELEMETRY STRIP */}
        <section className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 border border-stone-200 bg-white rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Tổng cước snapshot
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {formatVND(completed.reduce((sum, order) => sum + order.totalFee, 0))}
            </div>
            <span className="text-xs text-emerald-700 font-medium block">
              Theo đơn trong kỳ đang xem
            </span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
              Tỷ lệ hoàn tất đơn
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {shown.length ? (completed.length / shown.length * 100).toFixed(1) : "0.0"}%
            </div>
            <span className="text-xs text-stone-500 font-medium block">
              {completed.length}/{shown.length} đơn hoàn tất
            </span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
              Tỷ lệ sự cố / Hủy đơn
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {shown.length ? (exceptionCount / shown.length * 100).toFixed(1) : "0.0"}%
            </div>
            <span className="text-xs text-stone-500 font-medium block">
              {exceptionCount} đơn có sự cố hoặc bị hủy
            </span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Quỹ COD tài xế đang giữ
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {formatVND(totalCodHolding)}
            </div>
            <span className="text-xs text-amber-800 font-medium block">
              Cần đối soát nộp quỹ
            </span>
          </div>
        </section>

        {/* BẢNG ĐỐI SOÁT TIỀN MẶT COD THEO TÀI XẾ (UC-08) */}
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-5 sm:p-6 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-extrabold text-stone-900 block">
                Bàn đối soát thu hồi tiền mặt từ tài xế
              </span>
              <p className="text-xs text-stone-500 mt-1 font-medium">
                Hạn mức tiền mặt tối đa mỗi tài xế được tạm giữ trong ca là <strong className="text-stone-800">2.000.000đ</strong>
              </p>
            </div>
            <div className="text-xs font-bold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300">
              Tổng quỹ COD chưa nộp: {formatVND(totalCodHolding)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-xs tracking-wider border-b border-stone-200">
                <tr>
                  <th className="p-4 pl-6 whitespace-nowrap">Mã & Tài xế</th>
                  <th className="p-4 whitespace-nowrap">Biển số</th>
                  <th className="p-4 whitespace-nowrap">Khu vực</th>
                  <th className="p-4 whitespace-nowrap">COD tạm giữ</th>
                  <th className="p-4 whitespace-nowrap">Cảnh báo hạn mức</th>
                  <th className="p-4 pr-6 text-right whitespace-nowrap">Thao tác thu quỹ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {drivers.map((d) => {
                  const hasCod = d.codCashHolding > 0;
                  const isNearLimit = d.codCashHolding >= 800000;

                  return (
                    <tr key={d.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 pl-6">
                        <strong className="text-stone-900 text-sm sm:text-base block">{d.name}</strong>
                        <span className="text-stone-500 text-xs font-medium">{d.id}</span>
                      </td>
                      <td className="p-4 font-bold text-amber-700">
                        {d.vehiclePlate}
                      </td>
                      <td className="p-4 text-stone-800 font-semibold">
                        {d.currentDistrict}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold ${
                            hasCod ? "text-amber-800 text-sm" : "text-stone-400"
                          }`}
                        >
                          {formatVND(d.codCashHolding)}
                        </span>
                        {d.codSettlementRequested && <span className="mt-1 block text-[11px] font-bold text-amber-800">Tài xế yêu cầu đối soát</span>}
                      </td>
                      <td className="p-4">
                        {isNearLimit ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            Gần chạm hạn mức
                          </span>
                        ) : hasCod ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Trong hạn mức
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Đã nộp đủ quỹ
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {hasCod ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSettleCod(d.id, d.name, d.codCashHolding)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                          >
                            Xác nhận đã nhận tiền
                          </Button>
                        ) : (
                          <span className="text-stone-400 text-xs font-medium">Đã thanh toán</span>
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
