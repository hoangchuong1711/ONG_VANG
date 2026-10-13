"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartBar,
  CreditCard,
  GearSix,
  Motorcycle,
  Package,
  SquaresFour,
  Tag,
  Truck,
  UserCircle,
  Users,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { AdminProvider, useAdmin } from "./AdminProvider";

const groups = [
  { label: "Điều hành", items: [
    { label: "Tổng quan", href: "/admin", icon: SquaresFour },
    { label: "Đơn hàng", href: "/admin/orders", icon: Package },
    { label: "Tài xế", href: "/admin/drivers", icon: Motorcycle },
    { label: "Phương tiện", href: "/admin/vehicles", icon: Truck },
    { label: "Sự cố", href: "/admin/incidents", icon: WarningCircle },
  ] },
  { label: "Kinh doanh", items: [
    { label: "Khách hàng", href: "/admin/customers", icon: UsersThree },
    { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
    { label: "Báo cáo", href: "/admin/reports", icon: ChartBar },
    { label: "Biểu phí", href: "/admin/pricing", icon: Tag },
  ] },
  { label: "Hệ thống", items: [
    { label: "Nhân sự & quyền", href: "/admin/staff", icon: Users },
    { label: "Cài đặt", href: "/admin/settings", icon: GearSix },
    { label: "Tài khoản", href: "/admin/account", icon: UserCircle },
  ] },
];

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { orders, resetDemo } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pending = orders.filter((order) => order.status === "CHO_GAN").length;
  const current = groups.flatMap((group) => group.items).find((item) => item.href && (item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)))?.label ?? "Tổng quan";

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
                {item.label === "Đơn hàng" && pending > 0 && <span className="admin-nav-count">{pending}</span>}
              </Link> : null;
            })}
          </nav>
        </div>)}
      </div>
      <Link href="/admin/account" className="admin-sidebar-bottom" aria-label="Mở hồ sơ quản trị viên" aria-current={pathname === "/admin/account" ? "page" : undefined} onClick={() => setMobileOpen(false)}>
        <span className="admin-avatar">CĐ</span>
        <span><strong>Chủ đội xe</strong><small>Bản xem trước giao diện</small></span>
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

          <span className="admin-demo-pill">Dữ liệu demo</span>
          <button type="button" className="admin-reset" onClick={() => { if (window.confirm("Đặt lại mọi thay đổi trong cổng quản trị demo?")) resetDemo(); }}>Đặt lại demo</button>
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminProvider><ShellContent>{children}</ShellContent></AdminProvider>;
}
