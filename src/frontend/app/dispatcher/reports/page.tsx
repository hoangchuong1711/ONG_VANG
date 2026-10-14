"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/live-orders";
import { revenue, type CodBatch, type CodDriver, type RevenueReport } from "@/lib/finance";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherReportsPage() {
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState<CodDriver[]>([]);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [batch, setBatch] = useState<CodBatch | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");
  const refresh = useCallback(async () => {
    try {
      const [list, current] = await Promise.all([api<CodDriver[]>("/cod/drivers"), revenue(dateRange)]);
      setDrivers(list); setReport(current); setError("");
    } catch (cause) { setError((cause as Error).message); }
  }, [dateRange]);
  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("codBatch");
    if (!id) return;
    void api<CodBatch>(`/cod/settlements/${encodeURIComponent(id)}`)
      .then(setBatch).catch((cause) => setError((cause as Error).message));
  }, []);
  const metrics = report?.tong;
  const completedCount = metrics?.soDonHoanTat ?? 0;
  const exceptionCount = metrics?.soDonHuy ?? 0;
  const observed = completedCount + exceptionCount;

  // Tổng tiền COD các tài xế đang giữ
  const totalCodHolding = drivers.reduce((sum, d) => sum + Number(d.soTienDangGiu), 0);

  // Xác nhận tài xế nộp COD về quỹ (UC-08)
  const handleSettleCod = async (driverId: string) => {
    setBusy(driverId);
    try {
      const result = await api<CodBatch>(`/cod/drivers/${encodeURIComponent(driverId)}/settlements`, {
        method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: "{}",
      });
      if (!result.paymentUrl) throw new Error("Chưa tạo được đường dẫn VNPay.");
      window.location.assign(result.paymentUrl);
    } catch (cause) { showToast((cause as Error).message, "error"); setBusy(null); }
  };

  const handleExportCsv = () => {
    const lines = [["Bắt đầu", "Kết thúc", "Cước hoàn tất", "Đã thu", "Còn phải thu", "Công ty 20%", "Tài xế 80%", "COD đang giữ"],
      ...(report?.items ?? []).map((row) => [row.batDau, row.ketThuc, row.chiTieu.giaTriDonHoanTat,
        row.chiTieu.tienThucThu, row.chiTieu.cuocConPhaiThuCuoiKy,
        row.chiTieu.phanCongTy, row.chiTieu.phanTaiXe, row.chiTieu.tienMatTaiXeDangGiu])];
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

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {batch && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-stone-800">
          Đợt COD {batch.maDot}: <strong>{batch.trangThai === "THANH_CONG" ? "Đã thanh toán COD trong Sandbox" : "Đang chờ xác minh VNPay"}</strong>
          {batch.trangThai !== "THANH_CONG" && <button type="button" className="ml-3 underline" onClick={() => {
            void api<CodBatch>(`/cod/settlements/${batch.maDot}/reconcile`, { method: "POST", body: "{}" })
              .then((value) => { setBatch(value); void refresh(); }).catch((cause) => setError((cause as Error).message));
          }}>Kiểm tra kết quả</button>}
        </div>}

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
              {formatVND(Number(metrics?.giaTriDonHoanTat ?? 0))}
            </div>
            <span className="text-xs text-emerald-700 font-medium block">
              Theo thời điểm hoàn tất trong kỳ
            </span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
              Tỷ lệ hoàn tất đơn
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {observed ? (completedCount / observed * 100).toFixed(1) : "0.0"}%
            </div>
            <span className="text-xs text-stone-500 font-medium block">
              {completedCount} đơn hoàn tất
            </span>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
              Tỷ lệ sự cố / Hủy đơn
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {observed ? (exceptionCount / observed * 100).toFixed(1) : "0.0"}%
            </div>
            <span className="text-xs text-stone-500 font-medium block">
              {exceptionCount} đơn hủy trong kỳ
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

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["Cước đã thu", metrics?.tienThucThu], ["Còn phải thu", metrics?.cuocConPhaiThuCuoiKy],
            ["Công ty 20%", metrics?.phanCongTy], ["Tài xế 80% phát sinh", metrics?.phanTaiXe]].map(([label, value]) =>
            <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4"><span className="text-xs text-stone-500">{label}</span><strong className="mt-2 block text-lg">{formatVND(Number(value ?? 0))}</strong></div>)}
        </section>

        {/* BẢNG ĐỐI SOÁT TIỀN MẶT COD THEO TÀI XẾ (UC-08) */}
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-5 sm:p-6 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-extrabold text-stone-900 block">
                Bàn đối soát thu hồi tiền mặt từ tài xế
              </span>
              <p className="text-xs text-stone-500 mt-1 font-medium">
                Chọn tài xế để xem các đơn tiền mặt cấu thành và thanh toán qua VNPay Sandbox.
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
                  const hasCod = Number(d.soTienDangGiu) > 0;
                  const eligible = Number(d.soTienDuDieuKienNop) > 0;
                  const isNearLimit = Number(d.soTienDangGiu) >= 800000;

                  return (
                    <React.Fragment key={d.maTx}><tr className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 pl-6">
                        <strong className="text-stone-900 text-sm sm:text-base block">{d.hoTen}</strong>
                        <span className="text-stone-500 text-xs font-medium">{d.maTx}</span>
                      </td>
                      <td className="p-4 font-bold text-amber-700">
                        {d.bienSoXe}
                      </td>
                      <td className="p-4 text-stone-800 font-semibold">
                        {d.khuVuc ?? "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold ${
                            hasCod ? "text-amber-800 text-sm" : "text-stone-400"
                          }`}
                        >
                          {formatVND(Number(d.soTienDangGiu))}
                        </span>
                        <span className="mt-1 block text-[11px] text-stone-500">Đủ điều kiện nộp: {formatVND(Number(d.soTienDuDieuKienNop))}</span>
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
                        {eligible || d.maDotDangCho ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleSettleCod(d.maTx)}
                            disabled={busy === d.maTx}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                          >
                            {busy === d.maTx ? "Đang mở VNPay…" : "Thanh toán COD qua VNPay Sandbox"}
                          </Button>
                        ) : (
                          <span className="text-stone-400 text-xs font-medium">Chưa có khoản đủ điều kiện</span>
                        )}
                        <button type="button" className="block ml-auto mt-2 text-amber-800 underline text-xs" onClick={() => setExpanded(expanded === d.maTx ? null : d.maTx)}>Xem {d.soDon} đơn</button>
                      </td>
                    </tr>{expanded === d.maTx && <tr><td colSpan={6} className="bg-stone-50 px-6 py-3 text-xs">
                      {d.items.length ? d.items.map((item) => <div key={item.maGiaoDich} className="flex justify-between py-1"><span>{item.maDon} · {item.trangThaiDon}</span><strong>{formatVND(Number(item.soTien))}</strong></div>) : "Không có đơn tiền mặt đang giữ."}
                    </td></tr>}</React.Fragment>
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
