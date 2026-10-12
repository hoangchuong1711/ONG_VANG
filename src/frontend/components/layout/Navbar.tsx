"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Tổng quan", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/tao-don", label: "Tạo đơn", icon: "M12 4v16m8-8H4" },
    { href: "/don-hang", label: "Đơn của tôi", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-900 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="7" className="fill-amber-400/80 stroke-stone-900" />
              <path d="M12 5v14" className="stroke-stone-900 stroke-[2.5]" />
              <path d="M8 8.5h8" className="stroke-stone-900 stroke-[2]" />
              <path d="M8 15.5h8" className="stroke-stone-900 stroke-[2]" />
              <path d="M7 6.5C5 4.5 4 6 5 8" className="stroke-stone-800" />
              <path d="M17 6.5C19 4.5 20 6 19 8" className="stroke-stone-800" />
              <circle cx="10" cy="11" r="0.8" className="fill-stone-900" />
              <circle cx="14" cy="11" r="0.8" className="fill-stone-900" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900">
                Mini Ong Vàng
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Khách hàng
              </span>
            </div>
            <span className="text-[11px] font-medium text-stone-500 tracking-normal hidden sm:block">
              Hệ thống giao hàng siêu tốc
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? "text-stone-900 bg-amber-50 font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${isActive ? "text-amber-600" : "text-stone-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/tao-don"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-900 font-bold text-sm shadow-xs transition-transform hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tạo đơn mới</span>
          </Link>

          {/* User Profile Pill */}
          <Link
            href="/tai-khoan"
            className="flex items-center gap-2.5 pl-2 sm:border-l border-stone-200 hover:opacity-80 transition-opacity"
            title="Xem hồ sơ và hạng thành viên"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 border-2 border-white shadow-2xs flex items-center justify-center font-bold text-xs text-amber-950">
              TH
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-stone-900 leading-tight">Thu Hà</span>
              <span className="text-[10px] text-amber-700 font-semibold tracking-wide">THÀNH VIÊN VÀNG</span>
            </div>
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-amber-100 text-stone-900 font-bold"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
          {/* Additional mobile links */}
          <Link
            href="/tai-khoan"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
              pathname === "/tai-khoan"
                ? "bg-amber-100 text-stone-900 font-bold"
                : "text-stone-700 hover:bg-stone-50"
            }`}
          >
            <span>👑 Hồ sơ & Hạng thành viên Vàng</span>
          </Link>

          <Link
            href="/dang-nhap"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            <span>🚪 Đổi tài khoản / Đăng nhập</span>
          </Link>

          <div className="pt-2">
            <Link
              href="/tao-don"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-stone-900 font-bold text-sm shadow-xs"
            >
              + Tạo đơn mới
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
