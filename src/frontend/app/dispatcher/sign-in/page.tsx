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
  return <main className="dispatch-page max-w-lg space-y-5">
    <Link href="/">← Mini Ong Vàng</Link>
    <section className="dispatch-panel space-y-5">
      <h1 className="text-2xl font-extrabold">Đăng nhập tổng đài</h1>
      <p className="text-stone-600">Dùng tài khoản tổng đài để xem và điều phối đơn hàng.</p>
      {error ? <ErrorNotice error={error} /> : null}
      {user ? <div className="space-y-4">
        <p>Đang đăng nhập: {user.hoTen} ({user.vaiTro}).</p>
        {user.vaiTro === "TONG_DAI" ? <Link className="dispatch-button inline-block" href="/dispatcher">Mở bàn điều phối</Link> : <p role="alert">Tài khoản này không có quyền điều phối.</p>}
        <button className="dispatch-button secondary block" disabled={busy} onClick={async () => {
          setBusy(true); try { await logout(); } catch (failure) { setError(failure); } finally { setBusy(false); }
        }}>Đăng xuất để đổi tài khoản</button>
      </div> : <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(undefined);
        try {
          const current = await dispatchApi.login(username.trim(), password);
          setUser(current); setPassword("");
          if (current.vaiTro === "TONG_DAI") router.replace("/dispatcher");
        } catch (failure) { setError(failure); } finally { lock.current = false; setBusy(false); }
      }}>
        <label className="block space-y-1"><span>Tên đăng nhập</span><input className="dispatch-input" required maxLength={50} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="block space-y-1"><span>Mật khẩu</span><input className="dispatch-input" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="dispatch-button w-full" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>}
    </section>
  </main>;
}
