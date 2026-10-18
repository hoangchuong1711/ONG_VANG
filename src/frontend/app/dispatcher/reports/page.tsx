"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { request } from "@/lib/api-client";
import { formatVND } from "@/lib/utils";

type FinanceDriver = {
  ma_tx: string;
  ho_ten: string;
  thu_nhap_tai_xe: string;
  con_phai_nop: string;
  dang_thanh_toan: string;
  da_nop: string;
};

type FinanceReport = {
  cong_ty_duoc_huong: string;
  da_nop: string;
  con_phai_nop: string;
  thu_nhap_tai_xe: string;
  tai_xe: FinanceDriver[];
};

export default function DispatcherReportsPage() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setReport(await request<FinanceReport>("/reports/finance"));
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);

  const exportCsv = () => {
    if (!report) return;
    const lines = [
      ["Mã tài xế", "Tài xế", "Thu nhập tài xế", "Đã nộp công ty", "Đang thanh toán", "Còn phải nộp"],
      ...report.tai_xe.map((driver) => [
        driver.ma_tx,
        driver.ho_ten,
        driver.thu_nhap_tai_xe,
        driver.da_nop,
        driver.dang_thanh_toan,
        driver.con_phai_nop,
      ]),
    ];
    const csv = "\uFEFF" + lines
      .map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-cao-cong-no-tai-xe.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
      <DispatcherNavbar />
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5">
              BÁO CÁO TÀI CHÍNH
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Công nợ tài xế
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Theo dõi phần công ty đã nhận, đang thanh toán và còn phải nộp.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report}>
              Tải CSV
            </Button>
            <Link href="/dispatcher" className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800">
              ← Bàn điều phối
            </Link>
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Công ty được hưởng", report?.cong_ty_duoc_huong],
            ["Đã nộp công ty", report?.da_nop],
            ["Còn phải nộp", report?.con_phai_nop],
            ["Thu nhập tài xế", report?.thu_nhap_tai_xe],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4">
              <span className="text-xs text-stone-500">{label}</span>
              <strong className="mt-2 block text-lg">{formatVND(Number(value ?? 0))}</strong>
            </div>
          ))}
        </section>

        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-stone-200">
            <h2 className="font-extrabold text-stone-900">Tình trạng nộp tiền của tài xế</h2>
            <p className="text-xs text-stone-500 mt-1">Không bao gồm quỹ COD, tiền mặt đang giữ hoặc đợt thu hộ.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-xs tracking-wider border-b border-stone-200">
                <tr>
                  <th className="p-4 pl-6">Tài xế</th>
                  <th className="p-4">Thu nhập</th>
                  <th className="p-4">Đã nộp</th>
                  <th className="p-4">Đang thanh toán</th>
                  <th className="p-4 pr-6">Còn phải nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {(report?.tai_xe ?? []).map((driver) => (
                  <tr key={driver.ma_tx} className="hover:bg-stone-50/70">
                    <td className="p-4 pl-6">
                      <strong className="block text-stone-900">{driver.ho_ten}</strong>
                      <span className="text-xs text-stone-500">{driver.ma_tx}</span>
                    </td>
                    <td className="p-4">{formatVND(Number(driver.thu_nhap_tai_xe))}</td>
                    <td className="p-4 text-emerald-700">{formatVND(Number(driver.da_nop))}</td>
                    <td className="p-4 text-amber-700">{formatVND(Number(driver.dang_thanh_toan))}</td>
                    <td className="p-4 pr-6 font-bold text-rose-700">{formatVND(Number(driver.con_phai_nop))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report?.tai_xe.length && <p className="p-8 text-center text-sm text-stone-500">Chưa có dữ liệu công nợ tài xế.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
