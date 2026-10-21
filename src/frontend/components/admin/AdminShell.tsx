"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChartBar,
  CreditCard,
  Motorcycle,
  Package,
  SquaresFour,
  Truck,
  UserCircle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { currentUser, type AuthUser } from "@/lib/auth";

const groups = [
  { label: "Điều hành", items: [
    { label: "Tổng quan", href: "/admin", icon: SquaresFour },
    { label: "Đơn hàng", href: "/admin/orders", icon: Package },
    { label: "Tài xế & điều phối viên", href: "/admin/drivers", icon: Motorcycle },
    { label: "Phương tiện", href: "/admin/vehicles", icon: Truck },
    { label: "Sự cố", href: "/admin/incidents", icon: WarningCircle },
  ] },
  { label: "Kinh doanh", items: [
    { label: "Khách hàng", href: "/admin/customers", icon: UsersThree },
    { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
    { label: "Báo cáo", href: "/admin/reports", icon: ChartBar },
  ] },
  { label: "Hệ thống", items: [
    { label: "Tài khoản", href: "/admin/account", icon: UserCircle },
  ] },
];

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { currentUser().then(setUser).catch(() => setUser(null)).finally(() => setAuthReady(true)); }, []);
  const current = groups.flatMap((group) => group.items).find((item) => item.href && (item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)))?.label ?? "Tổng quan";

  if (!authReady) return <p role="status" className="admin-feedback">Đang kiểm tra phiên đăng nhập...</p>;
  if (!user) return <p className="admin-feedback">Bạn cần <Link href="/login">đăng nhập</Link> để xem trang quản trị.</p>;
  if (user.vaiTro !== "CHU_DOI_XE") return <p role="alert" className="admin-feedback error">Tài khoản không có quyền quản trị.</p>;

  return <div className="admin-shell">
    <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Điều hướng quản trị">
      <div className="admin-brand">
        <span className="admin-brand-mark" aria-hidden="true">OV</span>
        <span><strong>Mini Ong Vàng</strong><small>Cổng chủ đội xe</small></span>
      </div>
      <div className="admin-nav-scroll">
        {groups.map((group) => <div className="admin-nav-group" key={group.label}>
          <div className="admin-nav-label">{group.label}</div>
          <nav aria-label={group.label}>
            {group.items.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : item.href && pathname.startsWith(item.href);
              return item.href ? <Link
                key={item.label} href={item.href} aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={`admin-nav-item ${active ? "is-active" : ""}`}
              ><item.icon className="admin-nav-icon" size={20} weight={active ? "bold" : "regular"} aria-hidden="true" /><span>{item.label}</span>
              </Link> : null;
            })}
          </nav>
        </div>)}
      </div>
      <Link href="/admin/account" className="admin-sidebar-bottom" aria-label="Mở hồ sơ quản trị viên" aria-current={pathname === "/admin/account" ? "page" : undefined} onClick={() => setMobileOpen(false)}>
        <span className="admin-avatar">CĐ</span>
        <span><strong>{user.hoTen}</strong><small>Chủ đội xe</small></span>
      </Link>
    </aside>
    {mobileOpen && <button className="admin-scrim" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <button type="button" className="admin-menu-button" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>☰</button>
          <span className="admin-breadcrumb">Quản trị <span>/</span> <strong>{current}</strong></span>
        </div>
        <div className="admin-topbar-right">

          <LogoutButton className="admin-reset" />
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <ShellContent>{children}</ShellContent>;
}
