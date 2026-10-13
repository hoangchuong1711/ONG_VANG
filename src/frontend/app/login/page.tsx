"use client";

import React, { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isValidPhone } from "@/lib/utils";
import { dispatchApi, errorMessage as dispatchErrorMessage } from "@/lib/api/dispatch";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"LOGIN" | "REGISTER">(
    searchParams.get("tab") === "register" ? "REGISTER" : "LOGIN",
  );
  const [dispatcherMode, setDispatcherMode] = useState(searchParams.get("role") === "dispatcher");
  const loginLock = useRef(false);
  const usernameInput = useRef<HTMLInputElement>(null);

  // Form states
  const [phone, setPhone] = useState(searchParams.get("role") === "dispatcher" ? "demo_dispatcher" : "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // 1-Click Login for Demo Accounts
  const handle1ClickLogin = (demoPhone: string, targetPath: string, roleKey: string) => {
    setTab("LOGIN");
    setPhone(demoPhone);
    setPassword("Demo@123456");
    setErrorMessage("");
    setLoadingRole(roleKey);
    setIsSuccess(true);
    setTimeout(() => {
      router.push(targetPath);
    }, 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (dispatcherMode && tab === "LOGIN") {
      if (loginLock.current) return;
      loginLock.current = true;
      setLoadingRole("dispatcher");
      try {
        const user = await dispatchApi.login(phone.trim(), password);
        setPassword("");
        if (user.vaiTro !== "TONG_DAI") {
          setErrorMessage("Tài khoản này không có quyền điều phối.");
          return;
        }
        router.push("/dispatcher");
      } catch (error) {
        setErrorMessage(dispatchErrorMessage(error));
      } finally {
        loginLock.current = false;
        setLoadingRole(null);
      }
      return;
    }

    if (!isValidPhone(phone)) {
      setErrorMessage("Số điện thoại không hợp lệ (cần 10 chữ số, ví dụ 0901234567).");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    if (tab === "REGISTER" && !fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    if (tab === "LOGIN" && phone.startsWith("07")) {
      setDispatcherMode(true);
      setPhone("demo_dispatcher");
      setPassword("");
      setErrorMessage("Dùng tài khoản tổng đài để đăng nhập và vào bàn điều phối.");
      usernameInput.current?.focus();
      return;
    }

    // Determine target portal based on role/phone
    let targetPath = "/customer";
    if (phone.startsWith("08")) {
      targetPath = "/driver";
    } else if (phone.includes("admin") || phone.includes("chudoi") || phone.startsWith("06") || phone === "0600000001") {
      targetPath = "/admin";
    }

    // Simulate successful login
    setIsSuccess(true);
    setTimeout(() => {
      router.push(targetPath);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAF9] text-[#1C1917]">
      {/* CỘT TRÁI: BRANDING & MINH HỌA (Desktop View) */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 p-8 lg:p-12 flex-col justify-between relative overflow-hidden text-stone-900">
        {/* Background geometric honeycomb decoration */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 opacity-15 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-stone-900">
            <polygon points="50,15 90,38 90,83 50,105 10,83 10,38" />
            <polygon points="90,38 130,60 130,105 90,127 50,105 50,60" />
            <polygon points="10,83 50,105 50,150 10,127" />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="space-y-3 relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center text-amber-400 shadow-md">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="7" className="fill-amber-400 stroke-stone-900" />
                <path d="M12 5v14" className="stroke-stone-900 stroke-[2.5]" />
                <path d="M8 8.5h8" className="stroke-stone-900 stroke-[2]" />
                <path d="M8 15.5h8" className="stroke-stone-900 stroke-[2]" />
                <circle cx="10" cy="11" r="0.8" className="fill-stone-900" />
                <circle cx="14" cy="11" r="0.8" className="fill-stone-900" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-stone-950 block">
                Mini Ong Vàng
              </span>
              <span className="text-xs font-bold text-amber-950/80 tracking-wide uppercase">
                Giao Hàng Siêu Tốc
              </span>
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-6 relative z-10 my-auto py-12">
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-950 leading-snug">
            Giao hàng nội thành nhanh chóng, cước phí minh bạch từng mét đường.
          </h2>

          <div className="space-y-4 text-xs lg:text-sm font-semibold text-amber-950">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center text-xs font-black">
                ✓
              </span>
              <span>Theo dõi hành trình kiện hàng thời gian thực qua 5 chặng.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center text-xs font-black">
                ✓
              </span>
              <span>Được phép hủy đơn miễn phí trong vòng 5 phút (300 giây).</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center text-xs font-black">
                ✓
              </span>
              <span>Ưu đãi thành viên Vàng giảm cước trực tiếp trên mỗi đơn.</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] font-medium text-amber-950/80 relative z-10">
          © 2026 Mini Ong Vàng · Dành riêng cho khách hàng cá nhân & đối tác
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ (Mobile & Desktop) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className={`max-w-md w-full space-y-6 ${dispatcherMode && tab === "LOGIN" ? "rounded-3xl border border-amber-200 bg-white p-6 sm:p-8 shadow-[0_20px_60px_#92400e18]" : ""}`}>
          {/* Mobile Header (hiển thị logo khi trên điện thoại) */}
          <div className="md:hidden flex items-center gap-3 pb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-900">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="7" className="fill-amber-400 stroke-stone-900" />
                <path d="M12 5v14" className="stroke-stone-900 stroke-[2.5]" />
              </svg>
            </div>
            <span className="text-xl font-extrabold text-stone-900">Mini Ong Vàng</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            {dispatcherMode && tab === "LOGIN" && <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-900"><span className="h-2 w-2 rounded-full bg-amber-500" />Trung tâm điều phối</span>}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {tab === "LOGIN" ? (dispatcherMode ? "Đăng nhập điều phối viên" : "Đăng nhập tài khoản") : "Đăng ký thành viên mới"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              {tab === "LOGIN"
                ? (dispatcherMode ? "Đăng nhập để theo dõi hàng đợi và phân công tài xế trên dữ liệu thật." : "Chào mừng bạn trở lại với hệ thống giao hàng Mini Ong Vàng.")
                : "Tạo tài khoản ngay bằng số điện thoại để nhận ưu đãi thành viên."}
            </p>
          </div>

          {/* Tabs chuyển đổi Đăng nhập / Đăng ký */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => { setTab("LOGIN"); setErrorMessage(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "LOGIN"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setTab("REGISTER"); setErrorMessage(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "REGISTER"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          {/* Alert Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2 animate-fadeIn">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Toast */}
          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
              <span>✓</span>
              <span>{tab === "LOGIN" ? "Đăng nhập thành công! Đang chuyển hướng..." : "Đăng ký thành công! Đang đăng nhập..."}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {tab === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Họ và tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thu Hà"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
              </div>
            )}

            <div>
                <label htmlFor="login-username" className="block text-xs font-bold text-stone-700 mb-1">
                  {dispatcherMode && tab === "LOGIN" ? "Tên đăng nhập tổng đài" : "Số điện thoại (10 chữ số)"} <span className="text-red-500">*</span>
              </label>
              <input
                  id="login-username"
                  type={dispatcherMode && tab === "LOGIN" ? "text" : "tel"}
                required
                  placeholder={dispatcherMode && tab === "LOGIN" ? "Ví dụ: demo_dispatcher" : "Ví dụ: 0900000001"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                  ref={usernameInput}
                  autoComplete="username"
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 text-stone-900 font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="login-password" className="text-xs font-bold text-stone-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                {tab === "LOGIN" && (
                  <button
                    type="button"
                    onClick={() => alert("Chức năng đặt lại mật khẩu qua SMS OTP đang được hoàn thiện.")}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 rounded-xl border border-stone-200 text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                  aria-label="Toggle password"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSuccess || loadingRole === "dispatcher"}>
              {tab === "LOGIN" ? (loadingRole === "dispatcher" ? "Đang đăng nhập…" : "Đăng nhập vào hệ thống") : "Tạo tài khoản mới"}
            </Button>
          </form>

          {/* Quick Demo Accounts Helper (4 Roles) */}
          <div className="pt-2 border-t border-stone-200 space-y-2.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block text-center">
              Chọn vai trò để vào hệ thống
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handle1ClickLogin("0900000001", "/customer", "customer")}
                disabled={isSuccess}
                title="Đăng nhập ngay vào Cổng Khách hàng"
                className="group p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200 hover:border-amber-400 text-left transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-amber-950">1. Khách Hàng VIP</div>
                  {loadingRole === "customer" && <span className="text-xs animate-spin">⏳</span>}
                </div>
                <div className="font-mono text-[11px] text-amber-700">0900000001</div>
                <div className="text-[10px] text-amber-800 font-semibold group-hover:underline">
                  {loadingRole === "customer" ? "Đang vào..." : "→ Vào Cổng Khách hàng"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handle1ClickLogin("0800000001", "/driver", "driver")}
                disabled={isSuccess}
                title="Đăng nhập ngay vào Buồng lái Tài xế"
                className="group p-2.5 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-400 text-left transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-stone-900">2. Tài Xế Công Nghệ</div>
                  {loadingRole === "driver" && <span className="text-xs animate-spin">⏳</span>}
                </div>
                <div className="font-mono text-[11px] text-emerald-700 font-bold">0800000001</div>
                <div className="text-[10px] text-emerald-800 font-semibold group-hover:underline">
                  {loadingRole === "driver" ? "Đang vào..." : "→ Vào Buồng lái Tài xế"}
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (loginLock.current) return;
                  loginLock.current = true;
                  setLoadingRole("dispatcher");
                  try {
                    const user = await dispatchApi.me();
                    if (user.vaiTro === "TONG_DAI") { router.push("/dispatcher"); return; }
                  } catch { /* An unauthenticated visitor uses the shared login form below. */ }
                  finally { loginLock.current = false; setLoadingRole(null); }
                  setTab("LOGIN");
                  setDispatcherMode(true);
                  setPhone("demo_dispatcher");
                  setPassword("");
                  setErrorMessage("");
                  usernameInput.current?.focus();
                }}
                aria-label="Điều Phối Viên: vào bàn điều phối T24"
                title="Vào Bàn Điều phối"
                className="group p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-amber-400 text-left transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-amber-400">3. Điều Phối Viên</div>
                </div>
                <div className="font-mono text-[11px] text-slate-300">Tài khoản tổng đài</div>
                <div className="text-[10px] text-amber-300 font-semibold group-hover:underline">
                  → Vào Bàn Điều phối
                </div>
              </button>

              <button
                type="button"
                onClick={() => handle1ClickLogin("0600000001", "/admin", "admin")}
                disabled={isSuccess}
                title="Đăng nhập ngay vào Quản trị & Báo cáo"
                className="group p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-blue-400 text-left transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-blue-400">4. Chủ Đội Xe</div>
                  {loadingRole === "admin" && <span className="text-xs animate-spin">⏳</span>}
                </div>
                <div className="font-mono text-[11px] text-slate-300">0600000001</div>
                <div className="text-[10px] text-blue-300 font-semibold group-hover:underline">
                  {loadingRole === "admin" ? "Đang vào..." : "→ Vào Quản trị & Báo cáo"}
                </div>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-900 font-semibold">
              ← Trở về Trang chủ công khai
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#FAFAF9]" />}>
      <AuthContent />
    </Suspense>
  );
}
