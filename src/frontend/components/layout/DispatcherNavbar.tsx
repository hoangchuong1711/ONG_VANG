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
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/dieu-phoi", label: "Bàn Điều Phối" },
    { href: "/dieu-phoi/tao-don", label: "Hotline Tạo Đơn" },
    { href: "/dieu-phoi/doi-xe", label: "Đội Xe & Tài Xế" },
    { href: "/dieu-phoi/bao-cao", label: "Báo Cáo & COD" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#09090B] border-b border-zinc-800/80 text-zinc-200">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand identity & Mission Control Tag */}
        <div className="flex items-center gap-3">
          <Link href="/dieu-phoi" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm tracking-tighter">
              OV
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-100">
                Mini Ong Vàng
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-800">
                OPS CONTROL
              </span>
            </div>
          </Link>

          {/* Precision Real-time Clock */}
          {currentTime && (
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="text-zinc-200 font-bold">{currentTime}</span>
              <span className="text-[10px] text-zinc-500 font-sans">Ca Sáng 01</span>
            </div>
          )}
        </div>

        {/* Minimalist Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? "text-amber-400 bg-zinc-900 border border-zinc-800 shadow-2xs font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-amber-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Operational Telemetry & Portal Switchers */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Queue Counter */}
          <Link
            href="/dieu-phoi"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition-colors"
            title="Đơn hàng chờ gán tài xế"
          >
            <span className="text-zinc-400 text-[11px]">Hàng đợi:</span>
            <span className="font-bold text-amber-400">{pendingCount}</span>
          </Link>

          {/* Active Incident Counter */}
          {incidentCount > 0 && (
            <Link
              href="/dieu-phoi"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono font-bold hover:bg-rose-900/60 transition-colors"
              title="Sự cố đang chờ điều phối can thiệp"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Sự cố:</span>
              <span className="text-rose-200 font-black">{incidentCount}</span>
            </Link>
          )}

          {/* Role Switcher Shortcuts */}
          <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-zinc-800">
            <Link
              href="/tai-xe"
              className="px-2.5 py-1 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
            >
              Cổng Tài xế
            </Link>
            <Link
              href="/"
              className="px-2.5 py-1 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
            >
              Cổng Khách
            </Link>
          </div>

          {/* Operator Badge */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-black text-amber-400">
              ĐP
            </div>
            <div className="hidden 2xl:flex flex-col text-left text-xs leading-none">
              <span className="font-bold text-zinc-200">Trần Ngọc Huy</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Điều phối viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-[#09090B] border-t border-zinc-800/60 text-[11px]">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                isActive ? "text-amber-400 bg-zinc-900 font-bold" : "text-zinc-400"
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
