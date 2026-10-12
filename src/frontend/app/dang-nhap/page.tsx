"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isValidPhone } from "@/lib/utils";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Form states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-fill demo account
  const handleFillDemo = (demoPhone: string) => {
    setPhone(demoPhone);
    setPassword("Demo@123456");
    setErrorMessage("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

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

    // Determine target portal based on role/phone
    let targetPath = "/";
    if (phone.startsWith("08")) {
      targetPath = "/tai-xe";
    } else if (phone.startsWith("07") || phone.includes("dieuphoi")) {
      targetPath = "/dieu-phoi";
    } else if (phone.includes("admin") || phone.includes("chudoi") || phone === "0600000001") {
      targetPath = "/dieu-phoi/bao-cao";
    }

    // Simulate successful login
    setIsSuccess(true);
    setTimeout(() => {
      router.push(targetPath);
    }, 1200);
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
        <div className="max-w-md w-full space-y-6">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {tab === "LOGIN" ? "Đăng nhập tài khoản" : "Đăng ký thành viên mới"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              {tab === "LOGIN"
                ? "Chào mừng bạn trở lại với hệ thống giao hàng Mini Ong Vàng."
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
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Số điện thoại (10 chữ số) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="Ví dụ: 0900000001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 text-stone-900 font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-stone-700">
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

            <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSuccess}>
              {tab === "LOGIN" ? "Đăng nhập vào hệ thống" : "Tạo tài khoản mới"}
            </Button>
          </form>

          {/* Quick Demo Accounts Helper (4 Roles) */}
          <div className="pt-2 border-t border-stone-200 space-y-2.5">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block text-center">
              Chọn tài khoản mẫu theo vai trò (1 Click)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo("0900000001")}
                className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 hover:border-amber-400 text-left transition-colors"
              >
                <div className="font-extrabold text-amber-950">1. Khách Hàng VIP</div>
                <div className="font-mono text-[11px] text-amber-700">0900000001</div>
                <div className="text-[10px] text-stone-500">→ Vào Cổng Khách hàng</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("0800000001")}
                className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-400 text-left transition-colors"
              >
                <div className="font-extrabold text-stone-900">2. Tài Xế Công Nghệ</div>
                <div className="font-mono text-[11px] text-emerald-700 font-bold">0800000001</div>
                <div className="text-[10px] text-stone-500">→ Vào Buồng lái Tài xế</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("0700000001")}
                className="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 hover:border-amber-400 text-left transition-colors"
              >
                <div className="font-extrabold text-amber-400">3. Điều Phối Viên</div>
                <div className="font-mono text-[11px] text-slate-300">0700000001</div>
                <div className="text-[10px] text-slate-400">→ Vào Bàn Điều phối</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("0600000001")}
                className="p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 hover:border-amber-400 text-left transition-colors"
              >
                <div className="font-extrabold text-blue-400">4. Chủ Đội Xe</div>
                <div className="font-mono text-[11px] text-slate-300">0600000001</div>
                <div className="text-[10px] text-slate-400">→ Vào Quản trị & Báo cáo</div>
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
