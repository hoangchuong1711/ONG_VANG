"use client";

import { useCallback, useEffect, useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { formatVND } from "@/lib/utils";
import { allOrders, api, type Driver, type Order } from "@/lib/live-orders";
import { request, type Finance } from "@/lib/api-client";

export default function DriverWalletPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [completed, setCompleted] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [self, money, orders] = await Promise.all([
        api<Driver>("/drivers/me"), request<Finance>("/drivers/me/finance"),
        allOrders("HOAN_TAT"),
      ]);
      setDriver(self); setFinance(money); setCompleted(orders.filter(order => order.maTx === self.maTx)); setError("");
    } catch (cause) { setError((cause as Error).message); }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(initial);
  }, [refresh]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("paymentReturn") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await request("/drivers/me/settlements/reconcile", "POST", {});
          await refresh();
        } catch (cause) { setError((cause as Error).message); }
      })();
    }, 1000);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function pay() {
    if (!driver || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const storageKey = `settlement-key:${driver.maTx}`;
      const key = localStorage.getItem(storageKey) ?? crypto.randomUUID();
      localStorage.setItem(storageKey, key);
      const payment = await request<{ payment_url?: string; trang_thai: string }>("/drivers/me/settlements", "POST", {}, key);
      if (["THANH_CONG", "KHONG_THU"].includes(payment.trang_thai)) localStorage.removeItem(storageKey);
      if (payment.payment_url) window.location.assign(payment.payment_url);
      else { setNotice(`Giao dịch hiện tại: ${payment.trang_thai}. Hãy tra cứu trạng thái trước khi thanh toán lại.`); await refresh(); }
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function reconcile() {
    setBusy(true); setError(""); setNotice("");
    try {
      await request("/drivers/me/settlements/reconcile", "POST", {});
      await refresh(); setNotice("Đã đối chiếu kết quả với VNPay.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const isOnline = driver?.trangThaiHoatDong === "ONLINE";
  const income = Number(finance?.thu_nhap_tai_xe ?? 0);
  const due = Number(finance?.con_phai_nop ?? 0);

  return <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
    <DriverNavbar isOnline={isOnline} onToggleOnline={() => {}} showStatus={false} />
    <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
      <div><h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Thu nhập & nộp tiền công ty</h1>
        <p className="text-xs text-stone-500 mt-0.5">Cước khách trả trực tiếp; hệ thống ghi thu nhập tài xế 80% và phần công ty 20%.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Thu nhập tài xế phát sinh</span>
          <div className="text-3xl font-black">{formatVND(income)}</div>
          <p className="text-[11px] text-stone-400">80% cước các đơn đã hoàn tất; chưa phải số dư ví hoặc khoản đã chuyển về ngân hàng.</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Cần nộp công ty</span>
          <div className="text-3xl font-black text-rose-600">{formatVND(due)}</div>
          <p className="text-[11px] text-stone-500">Đang thanh toán: {formatVND(Number(finance?.dang_thanh_toan ?? 0))} · Đã nộp: {formatVND(Number(finance?.da_nop ?? 0))}</p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || due <= 0} onClick={() => void pay()}
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-stone-950 disabled:opacity-50">Thanh toán qua VNPay</button>
            {finance?.giao_dich_dang_cho && <button type="button" disabled={busy} onClick={() => void reconcile()}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50">Tra cứu giao dịch</button>}</div>
        </div>
      </div>
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <h2 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">Đơn đã hoàn tất</h2>
        <div className="divide-y divide-stone-100">
          {completed.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Chưa có đơn hoàn tất.</p>}
          {completed.map(order => <div key={order.maDon} className="py-3 flex items-center justify-between gap-3">
            <div><div className="font-bold text-xs sm:text-sm text-stone-900">Đơn {order.maDon}</div>
              <div className="text-[11px] text-stone-400">{new Date(order.thoiGianTao).toLocaleString("vi-VN")}</div></div>
            <span className="font-black text-sm sm:text-base text-emerald-600">{formatVND(Number(order.cuoc.tongCuoc))}</span>
          </div>)}</div>
      </section>
    </main><DriverBottomNav />
  </div>;
}
