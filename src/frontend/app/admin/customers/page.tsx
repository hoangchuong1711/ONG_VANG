"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminDialog, AdminEmpty, AdminHeading, AdminStat, adminActivity } from "@/components/admin/AdminUI";
import type { AdminCustomer } from "@/lib/admin-extras";
import { formatVND } from "@/lib/utils";

const tierName: Record<AdminCustomer["tier"], string> = { THUONG: "Thường", BAC: "Bạc", VANG: "Vàng" };

export default function AdminCustomersPage() {
  const { customers, orders, updateDemo } = useAdmin();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCustomer | null>(null);
  const [notice, setNotice] = useState("");
  const visible = customers.filter((customer) => `${customer.name} ${customer.phone}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN")) && (tier === "ALL" || customer.tier === tier));
  const current = customers.find((customer) => customer.id === selected);
  const customerOrders = current ? orders.filter((order) => order.sender.phone === current.phone) : [];
  const save = () => {
    if (!editing) return;
    updateDemo((previous) => ({ ...previous, customers: previous.customers.map((customer) => customer.id === editing.id ? editing : customer), activity: [adminActivity("Cập nhật khách hàng", `${editing.name}: hạng ${tierName[editing.tier]}`), ...previous.activity] }));
    setEditing(null); setNotice("Đã cập nhật hồ sơ khách hàng.");
  };
  const toggleLock = (customer: AdminCustomer) => {
    if (!window.confirm(`${customer.locked ? "Mở khóa" : "Khóa"} tài khoản ${customer.name}?`)) return;
    updateDemo((previous) => ({ ...previous, customers: previous.customers.map((item) => item.id === customer.id ? { ...item, locked: !item.locked } : item), activity: [adminActivity(customer.locked ? "Mở khóa khách hàng" : "Khóa khách hàng", customer.name), ...previous.activity] }));
    setNotice(`Đã ${customer.locked ? "mở khóa" : "khóa"} tài khoản ${customer.name}.`);
  };

  return <>
    <AdminHeading eyebrow="Quan hệ khách hàng" title="Khách hàng" description="Xem hồ sơ, lịch sử giao hàng và hạng thành viên." />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    <div className="admin-stat-grid"><AdminStat label="Tổng khách hàng" value={customers.length} note="Trong danh sách demo" /><AdminStat label="Thành viên Vàng" value={customers.filter((customer) => customer.tier === "VANG").length} note="Đang hưởng ưu đãi" tone="accent" /><AdminStat label="Khách có đơn" value={customers.filter((customer) => orders.some((order) => order.sender.phone === customer.phone)).length} note="Đã tạo ít nhất một đơn" /><AdminStat label="Tài khoản khóa" value={customers.filter((customer) => customer.locked).length} note="Không thể sử dụng" tone="alert" /></div>
    <section className="admin-panel admin-filter-panel"><div className="admin-filter-grid admin-filter-compact"><div className="admin-field"><label htmlFor="customer-search">Tìm khách hàng</label><input id="customer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc số điện thoại" /></div><div className="admin-field"><label htmlFor="customer-tier">Hạng thành viên</label><select id="customer-tier" value={tier} onChange={(event) => setTier(event.target.value)}><option value="ALL">Tất cả</option><option value="THUONG">Thường</option><option value="BAC">Bạc</option><option value="VANG">Vàng</option></select></div></div></section>
    <section className="admin-panel"><div className="admin-result-bar"><strong>{visible.length} khách hàng</strong><span>Hồ sơ và lịch sử đơn</span></div>{visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách hàng</th><th>Ngày tham gia</th><th>Hạng</th><th>Số đơn</th><th className="money">Tổng cước</th><th>Trạng thái</th><th className="action">Thao tác</th></tr></thead><tbody>{visible.map((customer) => { const related = orders.filter((order) => order.sender.phone === customer.phone); return <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.phone}</small></td><td>{customer.joinedAt}</td><td><span className={`admin-status ${customer.tier === "VANG" ? "warning" : customer.tier === "BAC" ? "info" : "muted"}`}>{tierName[customer.tier]}</span></td><td>{related.length}</td><td className="money">{formatVND(related.filter((order) => order.status !== "DA_HUY").reduce((sum, order) => sum + order.totalFee, 0))}</td><td><span className={`admin-status ${customer.locked ? "danger" : "success"}`}>{customer.locked ? "Đã khóa" : "Hoạt động"}</span></td><td className="action"><button className="admin-text-button" onClick={() => setSelected(customer.id)}>Chi tiết →</button></td></tr>; })}</tbody></table></div> : <AdminEmpty title="Không tìm thấy khách hàng" detail="Thử hạng hoặc từ khóa khác." />}</section>
    {current && <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><div><h2>{current.name}</h2><p>{current.id} · {current.phone}</p></div><button className="admin-text-button" onClick={() => setSelected(null)}>Đóng</button></div><div className="admin-detail-body"><div className="admin-summary-grid"><div><small>Hạng hiện tại</small><strong>{tierName[current.tier]}</strong></div><div><small>Đơn đã tạo</small><strong>{customerOrders.length}</strong></div><div><small>Tổng cước</small><strong>{formatVND(customerOrders.reduce((sum, order) => sum + order.totalFee, 0))}</strong></div></div><div className="admin-inline-actions"><button className="admin-button" onClick={() => setEditing({ ...current })}>Đổi hạng</button><button className="admin-button danger" onClick={() => toggleLock(current)}>{current.locked ? "Mở khóa" : "Khóa tài khoản"}</button></div><h3 className="admin-subheading">Lịch sử đơn hàng</h3>{customerOrders.length ? customerOrders.map((order) => <Link className="admin-list-link" href={`/admin/orders/${order.id}`} key={order.id}>{order.id} · {order.receiver.name}<span>{formatVND(order.totalFee)} →</span></Link>) : <p className="admin-muted">Khách hàng chưa tạo đơn nào.</p>}</div></section>}
    {editing && <AdminDialog title="Cập nhật hạng khách hàng" description={`${editing.name} · ${editing.phone}`} onClose={() => setEditing(null)} onSubmit={save} submitLabel="Lưu thay đổi"><div className="admin-field"><label htmlFor="customer-edit-tier">Hạng thành viên</label><select id="customer-edit-tier" value={editing.tier} onChange={(event) => setEditing({ ...editing, tier: event.target.value as AdminCustomer["tier"] })}><option value="THUONG">Thường</option><option value="BAC">Bạc</option><option value="VANG">Vàng</option></select></div><p className="admin-field-help">Ưu đãi áp dụng trong báo giá demo được cấu hình tại trang Biểu phí.</p></AdminDialog>}
  </>;
}
