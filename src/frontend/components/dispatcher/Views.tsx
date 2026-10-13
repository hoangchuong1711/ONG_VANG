"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { errorMessage, type Order, statusLabels } from "@/lib/api/dispatch";
import { useDispatchSession } from "./Session";
export function DispatchShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useDispatchSession();
  const pathname = usePathname();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return <div className="min-h-screen bg-[#faf9f6]">
    <header className="border-b border-stone-200 bg-white shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
        <Link href="/dispatcher" className="flex items-center gap-3 font-extrabold text-xl tracking-tight"><span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-500 text-stone-950 text-sm shadow-sm">OV</span><span>Mini Ong Vàng <small className="block text-[10px] uppercase tracking-[.18em] text-amber-700">Trung tâm điều phối</small></span></Link>
        <nav aria-label="Điều hướng điều phối" className="flex flex-wrap gap-4 text-sm font-semibold">
          {[["/dispatcher", "Bàn điều phối"], ["/dispatcher/fleet", "Tài xế"], ["/dispatcher/create-order", "Tạo đơn tổng đài"], ["/dispatcher/account", "Tài khoản"]].map(([href, text]) =>
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "text-amber-800 border-b-2 border-amber-500 pb-1" : "text-stone-600 hover:text-amber-800"}>{text}</Link>)}
        </nav>
        <div className="flex items-center gap-3 text-sm"><span>{user?.hoTen}</span>
          <button className="dispatch-button secondary" disabled={busy} onClick={async () => {
            setBusy(true); setError(undefined);
            try { await logout(); } catch (failure) { setError(failure); } finally { setBusy(false); }
          }}>Đăng xuất</button>
        </div>
      </div>
    </header>
    <main className="dispatch-page space-y-5">{error ? <ErrorNotice error={error} /> : null}{children}</main>
  </div>;
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="dispatch-error space-y-2" role="alert"><p>{errorMessage(error)}</p>{retry && <button className="dispatch-button secondary" onClick={retry}>Thử lại</button>}</div>;
}
export function Status({ order }: { order: Order }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${order.trangThai === "CHO_GAN" ? "bg-amber-100 text-amber-900" : order.trangThai === "DA_HUY" ? "bg-rose-100 text-rose-900" : "bg-stone-100 text-stone-800"}`}>{statusLabels[order.trangThai]}</span>;
}
export function Pagination({ page, totalPages, busy, change }: { page: number; totalPages: number; busy?: boolean; change: (page: number) => void }) {
  return <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-3 py-4">
    <button className="dispatch-button secondary" disabled={busy || page <= 0} onClick={() => change(page - 1)}>Trang trước</button>
    <span>Trang {totalPages ? page + 1 : 0} / {totalPages}</span>
    <button className="dispatch-button secondary" disabled={busy || page + 1 >= totalPages} onClick={() => change(page + 1)}>Trang sau</button>
  </nav>;
}
