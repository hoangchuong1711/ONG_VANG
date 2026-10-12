"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function CustomerProfilePage() {
  const { showToast } = useToast();

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`Đã sao chép ${label} (${text})!`, "success");
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Hồ sơ tài khoản & Hạng thành viên
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Quản lý thông tin cá nhân và quyền lợi tích lũy của bạn tại Mini Ong Vàng
          </p>
        </div>

        {/* THẺ THÀNH VIÊN HẠNG VÀNG (GOLD VIP MEMBER CARD) */}
        <section className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-stone-950 shadow-lg relative overflow-hidden">
          {/* Subtle geometric pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-stone-950">
              <polygon points="50,15 90,38 90,83 50,105 10,83 10,38" />
              <polygon points="90,38 130,60 130,105 90,127 50,105 50,60" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-950/20 backdrop-blur-xs text-xs font-black tracking-wider uppercase">
                <span>👑</span>
                <span>THÀNH VIÊN HẠNG VÀNG VIP</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950">
                Nguyễn Thu Hà
              </h2>
              <div className="font-mono text-sm tracking-wider opacity-90 flex items-center gap-2">
                <span>MÃ KHÁCH HÀNG: <strong>KH-DEMO-2</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopyText("KH-DEMO-2", "mã khách hàng")}
                  className="p-1 rounded bg-stone-950/20 hover:bg-stone-950/30 transition-colors"
                  title="Sao chép mã khách hàng"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 sm:border-l sm:border-stone-950/20 sm:pl-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-900 block opacity-80">
                ĐIỂM TÍCH LŨY
              </span>
              <div className="text-3xl sm:text-4xl font-black">
                450 <span className="text-lg font-bold">điểm</span>
              </div>
              <p className="text-xs text-stone-900 font-semibold">
                Đã tiết kiệm được: <strong>120.000đ</strong> tháng này
              </p>
            </div>
          </div>

          {/* Quyền lợi thành viên Vàng */}
          <div className="mt-6 pt-5 border-t border-stone-950/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative z-10 font-bold">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center text-[10px]">✓</span>
              <span>Giảm 10.000đ/mọi đơn hàng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center text-[10px]">✓</span>
              <span>Ưu tiên gán tài xế &lt; 3 phút</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center text-[10px]">✓</span>
              <span>Bảo hiểm bưu kiện miễn phí</span>
            </div>
          </div>
        </section>

        {/* THÔNG TIN CÁ NHÂN */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Thông tin liên hệ & Giao nhận
            </h3>
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-bold">
              Đã xác thực SĐT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-bold text-stone-400 block mb-0.5">HỌ VÀ TÊN</span>
              <strong className="text-stone-900 text-base">Nguyễn Thu Hà</strong>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-400 block mb-0.5">SỐ ĐIỆN THOẠI</span>
              <div className="flex items-center gap-2">
                <strong className="font-mono text-stone-900 text-base">0900 000 001</strong>
                <button
                  type="button"
                  onClick={() => handleCopyText("0900000001", "số điện thoại")}
                  className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  title="Sao chép số điện thoại"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-400 block mb-0.5">EMAIL</span>
              <span className="text-stone-800">thuha.nguyen@example.com</span>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-400 block mb-0.5">ĐỊA CHỈ MẶC ĐỊNH</span>
              <span className="text-stone-800">123 Nguyễn Văn Linh, Phường Tân Phú, Quận 7, TP.HCM</span>
            </div>
          </div>
        </section>

        {/* CÀI ĐẶT & ĐĂNG XUẤT */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs">
          <h3 className="text-base sm:text-lg font-bold text-stone-900 pb-2 border-b border-stone-100">
            Bảo mật & Phiên làm việc
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600">
            <div>
              <span className="font-bold text-stone-900 block text-sm">Phiên đăng nhập hiện tại</span>
              <span>Xác thực an toàn qua Session Cookie (HttpOnly).</span>
            </div>

            <Link href="/dang-nhap">
              <Button variant="danger" size="sm">
                Đăng xuất tài khoản
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
