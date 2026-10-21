"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type PersonForm = { username: string; matKhau: string; hoTen: string; soDienThoai: string; email: string };

export function PersonnelTabs() {
  const path = usePathname();
  return <nav className="admin-personnel-tabs" aria-label="Quản lý nhân sự điều hành">
    <Link href="/admin/drivers" className={path === "/admin/drivers" ? "active" : ""}>Tài xế</Link>
    <Link href="/admin/drivers/dispatchers" className={path.includes("/dispatchers") ? "active" : ""}>Điều phối viên</Link>
  </nav>;
}

export function PersonnelFields({ form, onChange, creating, phoneRequired = true, extra }: {
  form: PersonForm; onChange: (key: keyof PersonForm, value: string) => void;
  creating: boolean; phoneRequired?: boolean; extra?: ReactNode;
}) {
  return <div className="admin-form-grid">
    {creating && <div className="admin-field"><label htmlFor="person-username">Tên đăng nhập</label><input id="person-username" required minLength={3} maxLength={50} pattern="[a-z0-9._-]+" value={form.username} onChange={(event) => onChange("username", event.target.value.toLowerCase())} /></div>}
    <div className="admin-field"><label htmlFor="person-name">Họ tên</label><input id="person-name" required maxLength={100} value={form.hoTen} onChange={(event) => onChange("hoTen", event.target.value)} /></div>
    <div className="admin-field"><label htmlFor="person-phone">Số điện thoại</label><input id="person-phone" required={phoneRequired} inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} value={form.soDienThoai} onChange={(event) => onChange("soDienThoai", event.target.value)} /></div>
    <div className="admin-field"><label htmlFor="person-email">Email</label><input id="person-email" type="email" maxLength={150} value={form.email} onChange={(event) => onChange("email", event.target.value)} /></div>
    {extra}
    <div className="admin-field"><label htmlFor="person-password">{creating ? "Mật khẩu khởi tạo" : "Mật khẩu mới (để trống nếu giữ nguyên)"}</label><input id="person-password" type="password" required={creating} minLength={8} maxLength={72} autoComplete="new-password" value={form.matKhau} onChange={(event) => onChange("matKhau", event.target.value)} /></div>
  </div>;
}
