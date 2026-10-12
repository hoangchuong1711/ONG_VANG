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
    { href: "/dieu-phoi", label: "Bàn điều phối" },
    { href: "/dieu-phoi/tao-don", label: "Hotline tạo đơn" },
    { href: "/dieu-phoi/doi-xe", label: "Đội xe & Tài xế" },
    { href: "/dieu-phoi/bao-cao", label: "Báo cáo & Đối soát" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs font-sans">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link href="/dieu-phoi" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-900 font-extrabold text-sm shadow-sm transition-transform duration-200 group-hover:scale-105">
              OV
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900">
                  Mini Ong Vàng
                </span>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Điều Phối Viên
                </span>
              </div>
              <span className="text-[11px] font-medium text-stone-500 hidden sm:block">
                Trung tâm tác chiến & Quản trị vận hành
              </span>
            </div>
          </Link>

          {/* Real-time Clock */}
          {currentTime && (
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-stone-200 text-xs font-semibold text-stone-600">
              <span className="text-stone-900 font-bold">{currentTime}</span>
              <span className="text-stone-400 font-normal">Ca Sáng 01</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? "text-stone-900 bg-amber-50 font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status Counters & Role Switchers */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Queue Counter */}
          <Link
            href="/dieu-phoi"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs transition-colors"
            title="Đơn hàng chờ gán tài xế"
          >
            <span className="text-amber-800 font-medium">Hàng đợi:</span>
            <span className="font-extrabold text-amber-900">{pendingCount}</span>
          </Link>

          {/* Active Incident Counter */}
          {incidentCount > 0 && (
            <Link
              href="/dieu-phoi"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors"
              title="Sự cố đang chờ điều phối can thiệp"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Sự cố:</span>
              <span className="text-rose-900 font-extrabold">{incidentCount}</span>
            </Link>
          )}

          {/* Role Switchers */}
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-stone-200">
            <Link
              href="/tai-xe"
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors"
            >
              Cổng Tài xế
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors"
            >
              Cổng Khách
            </Link>
          </div>

          {/* Operator Profile */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300 flex items-center justify-center text-xs font-extrabold text-amber-900">
              ĐP
            </div>
            <div className="hidden 2xl:flex flex-col text-left text-xs leading-none">
              <span className="font-bold text-stone-900">Trần Ngọc Huy</span>
              <span className="text-[11px] text-stone-500 mt-0.5">Tổng đài viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 bg-stone-50 border-t border-stone-200 text-xs">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                isActive ? "text-amber-900 bg-amber-100 font-bold" : "text-stone-600"
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
