"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminProvider, useAdmin } from "./AdminProvider";

const groups = [
  { label: "Điều hành", items: [
    { label: "Tổng quan", href: "/admin", mark: "01" },
    { label: "Đơn hàng", href: "/admin/orders", mark: "02" },
    { label: "Tài xế", href: "/admin/drivers", mark: "03" },
    { label: "Phương tiện", href: "/admin/vehicles", mark: "04" },
    { label: "Sự cố", href: "/admin/incidents", mark: "05" },
  ] },
  { label: "Kinh doanh", items: [
    { label: "Khách hàng", href: "/admin/customers", mark: "06" },
    { label: "Thanh toán", href: "/admin/payments", mark: "07" },
    { label: "Báo cáo", href: "/admin/reports", mark: "08" },
    { label: "Biểu phí", href: "/admin/pricing", mark: "09" },
  ] },
  { label: "Hệ thống", items: [
    { label: "Nhân sự & quyền", href: "/admin/staff", mark: "10" },
    { label: "Cài đặt", href: "/admin/settings", mark: "11" },
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
              ><span className="admin-nav-mark">{item.mark}</span><span>{item.label}</span>
                {item.label === "Đơn hàng" && pending > 0 && <span className="admin-nav-count">{pending}</span>}
              </Link> : null;
            })}
          </nav>
        </div>)}
      </div>
      <div className="admin-sidebar-bottom">
        <span className="admin-avatar">CĐ</span>
        <span><strong>Chủ đội xe</strong><small>Bản xem trước giao diện</small></span>
      </div>
    </aside>
    {mobileOpen && <button className="admin-scrim" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <button type="button" className="admin-menu-button" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>☰</button>
          <span className="admin-breadcrumb">Quản trị <span>/</span> <strong>{current}</strong></span>
        </div>
        <div className="admin-topbar-right">
          <div style={{ display: "flex", gap: "6px" }}>
            <Link
              href="/"
              className="admin-button"
              style={{ padding: "5px 9px", fontSize: "11px", minHeight: "30px", border: "1px solid var(--adm-line)", color: "var(--adm-muted)" }}
              title="Chuyển sang Cổng Khách hàng"
            >
              Cổng Khách
            </Link>
            <Link
              href="/dispatcher"
              className="admin-button"
              style={{ padding: "5px 9px", fontSize: "11px", minHeight: "30px", border: "1px solid var(--adm-line)", color: "var(--adm-muted)" }}
              title="Chuyển sang Cổng Điều phối viên"
            >
              ⚡ Điều phối
            </Link>
            <Link
              href="/driver"
              className="admin-button"
              style={{ padding: "5px 9px", fontSize: "11px", minHeight: "30px", border: "1px solid var(--adm-line)", color: "var(--adm-muted)" }}
              title="Chuyển sang Cổng Tài xế"
            >
              🏍️ Tài xế
            </Link>
          </div>
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
