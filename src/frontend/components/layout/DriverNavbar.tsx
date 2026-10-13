"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface DriverNavbarProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  showStatus?: boolean;
}

export function DriverNavbar({ isOnline, onToggleOnline, showStatus = true }: DriverNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-stone-900 text-white border-b border-stone-800 shadow-md">
      <div className="max-w-[1024px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <Link href="/driver" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-black shadow-sm group-hover:scale-105 transition-transform">
            🏍️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Mini Ong Vàng
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Tài xế
              </span>
            </div>
            <span className="text-[10px] text-stone-400 hidden sm:block">
              Buồng lái giao vận siêu tốc
            </span>
          </div>
        </Link>

        {/* Online / Offline Status Toggle Button */}
        <div className="flex items-center gap-3">
          {showStatus && <button
            type="button"
            onClick={onToggleOnline}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all shadow-xs ${
              isOnline
                ? "bg-emerald-500 text-stone-950 hover:bg-emerald-400 ring-2 ring-emerald-300/30"
                : "bg-stone-800 text-stone-400 hover:bg-stone-700 border border-stone-700"
            }`}
            title="Bật/tắt trạng thái sẵn sàng nhận chuyến"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-stone-950 animate-pulse" : "bg-stone-500"
              }`}
            />
            <span>{isOnline ? "ĐANG TRỰC TUYẾN" : "TẠM NGHỈ (OFFLINE)"}</span>
          </button>}

          <Link
            href="/driver/account"
            aria-current={pathname === "/driver/account" ? "page" : undefined}
            className={`hidden md:inline-flex min-h-10 items-center rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              pathname === "/driver/account"
                ? "border-amber-400 bg-amber-400 text-stone-950"
                : "border-stone-600 text-white hover:border-amber-400 hover:text-amber-400"
            }`}
          >
            Tài khoản
          </Link>

          <LogoutButton className="rounded-lg border border-stone-600 px-3 py-2 text-xs font-bold text-white hover:border-amber-400" />

        </div>
      </div>
    </header>
  );
}
