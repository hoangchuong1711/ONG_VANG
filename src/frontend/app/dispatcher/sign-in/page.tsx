"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dispatchApi } from "@/lib/api/dispatch";
import { useDispatchSession } from "@/components/dispatcher/Session";
import { ErrorNotice } from "@/components/dispatcher/Views";
export default function DispatcherSignIn() {
  const { user, setUser, logout } = useDispatchSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return <main className="min-h-screen bg-[#faf9f6] grid lg:grid-cols-2">
    <aside className="hidden lg:flex flex-col justify-between p-10 xl:p-16 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-stone-950 relative overflow-hidden">
      <div className="absolute w-[480px] h-[480px] rounded-full border border-white/40 -right-40 -top-44 pointer-events-none shadow-[0_0_0_60px_#ffffff12,0_0_0_120px_#ffffff0b]" />
      <Link href="/" className="relative z-10 inline-flex items-center gap-3 font-black text-2xl"><span className="grid place-items-center w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 text-base">OV</span>Mini Ong Vàng</Link>
      <div className="relative z-10 max-w-lg space-y-5"><p className="uppercase tracking-[.2em] text-xs font-extrabold">Trung tâm điều phối</p><h2 className="text-5xl font-black leading-tight tracking-tight">Mỗi đơn hàng,<br />đúng tài xế.</h2><p className="text-lg text-stone-900/80 font-medium">Hàng đợi, đội xe và lịch sử phân công trong cùng một bàn điều phối.</p></div>
      <p className="relative z-10 text-sm font-semibold text-stone-900/70">Tài khoản tổng đài · Dữ liệu từ hệ thống Mini Ong Vàng</p>
    </aside>
    <div className="flex items-center justify-center p-5 sm:p-10">
    <div className="w-full max-w-lg space-y-5">
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-amber-800">← Quay lại Mini Ong Vàng</Link>
    <section className="dispatch-panel !p-6 sm:!p-9 space-y-6">
      <div className="space-y-2"><span className="dispatch-eyebrow">Khu vực nhân viên</span><h1 className="text-3xl font-black tracking-tight">Đăng nhập tổng đài</h1>
      <p className="text-stone-600">Dùng tài khoản tổng đài để xem và điều phối đơn hàng.</p></div>
      {error ? <ErrorNotice error={error} /> : null}
      {user ? <div className="space-y-4">
        <p>Đang đăng nhập: {user.hoTen} ({user.vaiTro}).</p>
        {user.vaiTro === "TONG_DAI" ? <Link className="dispatch-button inline-block" href="/dispatcher">Mở bàn điều phối</Link> : <p role="alert">Tài khoản này không có quyền điều phối.</p>}
        <button className="dispatch-button secondary block" disabled={busy} onClick={async () => {
          setBusy(true); try { await logout(); } catch (failure) { setError(failure); } finally { setBusy(false); }
        }}>Đăng xuất để đổi tài khoản</button>
      </div> : <form className="space-y-5" onSubmit={async (event) => {
        event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(undefined);
        try {
          const current = await dispatchApi.login(username.trim(), password);
          setUser(current); setPassword("");
          if (current.vaiTro === "TONG_DAI") router.replace("/dispatcher");
        } catch (failure) { setError(failure); } finally { lock.current = false; setBusy(false); }
      }}>
        <label className="block space-y-2 text-sm font-bold"><span>Tên đăng nhập</span><input className="dispatch-input" required maxLength={50} autoComplete="username" placeholder="Tên đăng nhập tổng đài" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="block space-y-2 text-sm font-bold"><span>Mật khẩu</span><input className="dispatch-input" type="password" required autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="dispatch-button w-full !py-3" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>}
    </section>
    <p className="text-center text-sm text-stone-500">Chỉ tài khoản tổng đài mới có quyền gán và hủy đơn trên hệ thống thật.</p>
    </div>
    </div>
  </main>;
}
