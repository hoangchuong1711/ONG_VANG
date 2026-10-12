"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DispatcherNavbarProps {
  pendingCount?: number;
  incidentCount?: number;
}

export function DispatcherNavbar({ pendingCount = 2, incidentCount = 1 }: DispatcherNavbarProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(timeStr);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    {
      href: "/dieu-phoi",
      label: "Bàn Điều Phối",
      icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
    },
    {
      href: "/dieu-phoi/tao-don",
      label: "Hotline Tạo Đơn",
      icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    },
    {
      href: "/dieu-phoi/doi-xe",
      label: "Đội Xe & Tài Xế",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
    {
      href: "/dieu-phoi/bao-cao",
      label: "Báo Cáo & COD",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand identity & Mission Control Tag */}
        <div className="flex items-center gap-3">
          <Link href="/dieu-phoi" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-sm group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Mini Ong Vàng
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  ĐIỀU PHỐI VIÊN
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Trung tâm Giám sát & Điều hành Vận tải
              </span>
            </div>
          </Link>

          {/* Real-time Clock */}
          {currentTime && (
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentTime}</span>
              <span className="text-[10px] text-slate-500 font-sans">· Ca 01 (Sáng)</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                  isActive
                    ? "bg-slate-800 text-amber-400 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status Indicators & Switchers */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Orders Counter */}
          <Link
            href="/dieu-phoi"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
            title="Số đơn hàng đang chờ gán tài xế"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Chờ gán:</span>
            <span>{pendingCount}</span>
          </Link>

          {/* Incident Alert Counter */}
          {incidentCount > 0 && (
            <Link
              href="/dieu-phoi"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition-colors"
              title="Cảnh báo sự cố khẩn cấp từ tài xế"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Sự cố SOS:</span>
              <span className="text-white font-extrabold">{incidentCount}</span>
            </Link>
          )}

          {/* Quick links to other portals */}
          <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-800">
            <Link
              href="/tai-xe"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              title="Chuyển sang Cổng Tài xế"
            >
              🏍️ Tài xế
            </Link>
            <Link
              href="/"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              title="Chuyển sang Cổng Khách hàng"
            >
              🛒 Khách hàng
            </Link>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400">
              ĐP
            </div>
            <div className="hidden 2xl:flex flex-col text-left text-xs">
              <span className="font-bold text-white leading-tight">Trần Ngọc Huy</span>
              <span className="text-[10px] text-slate-400">Điều phối viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-slate-950/80 border-t border-slate-800/80 text-[11px]">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                isActive ? "text-amber-400 bg-slate-800" : "text-slate-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
