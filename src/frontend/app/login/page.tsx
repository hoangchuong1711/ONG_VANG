"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthError, homeForRole, login, register } from "@/lib/auth";

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Số điện thoại hoặc mật khẩu không đúng.",
  ACCOUNT_LOCKED: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
  ACCOUNT_ALREADY_EXISTS: "Số điện thoại này đã có tài khoản.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Kiểm tra số điện thoại và mật khẩu.",
  CSRF_INVALID: "Phiên biểu mẫu đã hết hạn. Vui lòng thử lại.",
};

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(params.get("tab") === "register" ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(params.get("reason") === "session" ? "Phiên đăng nhập đã hết hoặc bạn cần đăng nhập để tiếp tục." : "");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (tab === "register" && !/^0\d{9}$/.test(username.trim())) {
      setError("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."); return;
    }
    if (password.length < 8) { setError("Mật khẩu cần ít nhất 8 ký tự."); return; }
    setBusy(true);
    try {
      if (tab === "register") await register(name.trim(), username.trim(), email.trim(), password);
      const user = await login(username.trim(), password);
      router.replace(homeForRole[user.vaiTro]);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof AuthError ? (messages[failure.code] ?? "Không thể xác thực. Vui lòng thử lại.") : "Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-dvh items-center justify-center bg-amber-50 px-4 py-10 text-stone-900">
    <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-7 shadow-xl sm:p-9">
      <Link href="/" className="text-sm font-bold text-amber-800">← Mini Ong Vàng</Link>
      <h1 className="mt-6 text-3xl font-extrabold">{tab === "login" ? "Đăng nhập" : "Đăng ký khách hàng"}</h1>
      <p className="mt-2 text-sm text-stone-600">{tab === "login" ? "Dùng tài khoản đã lưu trong hệ thống." : "Tài khoản mới được tạo với vai trò khách hàng."}</p>
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-bold">
        <button type="button" className={`rounded-lg px-3 py-2 ${tab === "login" ? "bg-white shadow-sm" : "text-stone-500"}`} onClick={() => { setTab("login"); setError(""); }}>Đăng nhập</button>
        <button type="button" className={`rounded-lg px-3 py-2 ${tab === "register" ? "bg-white shadow-sm" : "text-stone-500"}`} onClick={() => { setTab("register"); setError(""); }}>Đăng ký</button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {tab === "register" && <label className="block text-sm font-semibold">Họ và tên
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" value={name} onChange={e => setName(e.target.value)} maxLength={100} autoComplete="name" required />
        </label>}
        {tab === "register" && <label className="block text-sm font-semibold">Email
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={150} autoComplete="email" required />
        </label>}
        <label className="block text-sm font-semibold">{tab === "login" ? "Số điện thoại hoặc tên đăng nhập" : "Số điện thoại"}
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="block text-sm font-semibold">Mật khẩu
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={tab === "login" ? "current-password" : "new-password"} required />
        </label>
        {tab === "login" && <Link href="/forgot-password" className="block text-right text-sm font-semibold text-amber-800 hover:underline">Quên mật khẩu?</Link>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-extrabold hover:bg-amber-300 disabled:opacity-60">{busy ? "Đang xử lý..." : tab === "login" ? "Đăng nhập" : "Đăng ký và đăng nhập"}</button>
      </form>
      <p className="mt-5 text-xs text-stone-500">Tài khoản nhân viên và tài xế do hệ thống cấp. Nhập tên đăng nhập được cung cấp để truy cập.</p>
    </div>
  </main>;
}

export default function AuthPage() {
  return <Suspense fallback={<div className="min-h-dvh bg-amber-50" />}><AuthForm /></Suspense>;
}
