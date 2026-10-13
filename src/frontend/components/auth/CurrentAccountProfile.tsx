"use client";

import { useEffect, useState } from "react";
import { currentUser, type AuthUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

const roleNames = {
  KHACH_HANG: "Khách hàng",
  TAI_XE: "Tài xế",
  TONG_DAI: "Điều phối viên",
  CHU_DOI_XE: "Chủ đội xe",
};

export function CurrentAccountProfile() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { currentUser().then(setUser).catch(() => setUser(null)); }, []);
  if (!user) return <p className="text-sm text-stone-600">Đang tải hồ sơ tài khoản...</p>;
  return <section className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-extrabold">Hồ sơ tài khoản</h1>
    <dl className="mt-6 grid gap-4 text-sm">
      <div><dt className="font-semibold text-stone-500">Họ và tên</dt><dd className="mt-1 font-bold">{user.hoTen}</dd></div>
      <div><dt className="font-semibold text-stone-500">Vai trò</dt><dd className="mt-1">{roleNames[user.vaiTro]}</dd></div>
      <div><dt className="font-semibold text-stone-500">Mã tài khoản</dt><dd className="mt-1 break-all font-mono">{user.maNguoiDung}</dd></div>
      {user.maKh && <div><dt className="font-semibold text-stone-500">Mã khách hàng</dt><dd className="mt-1 font-mono">{user.maKh}</dd></div>}
      {user.maTx && <div><dt className="font-semibold text-stone-500">Mã tài xế</dt><dd className="mt-1 font-mono">{user.maTx}</dd></div>}
    </dl>
    <LogoutButton className="mt-7 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800" />
  </section>;
}
