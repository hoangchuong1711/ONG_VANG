"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminDialog, AdminEmpty, AdminHeading, AdminStat, adminActivity } from "@/components/admin/AdminUI";
import type { AdminIncident } from "@/lib/admin-extras";

const incidentStatus: Record<AdminIncident["status"], string> = { CHO_XU_LY: "Chờ xử lý", DANG_XU_LY: "Đang xử lý", DA_GIAI_QUYET: "Đã giải quyết" };

export default function AdminIncidentsPage() {
  const { incidents, staff, orders, updateDemo } = useAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState<AdminIncident | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = incidents.filter((incident) => `${incident.id} ${incident.orderId} ${incident.type} ${incident.driverName}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN")) && (filter === "ALL" || incident.status === filter));
  const save = () => {
    if (!form) return;
    if (form.status === "DA_GIAI_QUYET" && form.resolution.trim().length < 8) { setError("Cần ghi cách xử lý ít nhất 8 ký tự trước khi đóng sự cố."); return; }
    updateDemo((previous) => ({ ...previous,
      incidents: previous.incidents.map((incident) => incident.id === form.id ? { ...form, resolution: form.resolution.trim() } : incident),
      activity: [adminActivity("Cập nhật sự cố", `${form.id}: ${incidentStatus[form.status]}`), ...previous.activity],
    }));
    setForm(null); setNotice(`Đã cập nhật ${form.id}.`);
  };

  return <>
    <AdminHeading eyebrow="Điều hành đội xe" title="Sự cố giao hàng" description="Theo dõi vấn đề phát sinh và ghi lại cách xử lý." />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    <div className="admin-stat-grid"><AdminStat label="Tổng sự cố" value={incidents.length} note="Trong dữ liệu demo" /><AdminStat label="Chờ xử lý" value={incidents.filter((incident) => incident.status === "CHO_XU_LY").length} note="Cần điều phối can thiệp" tone="alert" /><AdminStat label="Đang xử lý" value={incidents.filter((incident) => incident.status === "DANG_XU_LY").length} note="Đã có người phụ trách" /><AdminStat label="Đã giải quyết" value={incidents.filter((incident) => incident.status === "DA_GIAI_QUYET").length} note="Có ghi chú kết quả" /></div>
    <section className="admin-panel admin-filter-panel"><div className="admin-filter-grid admin-filter-compact"><div className="admin-field"><label htmlFor="incident-search">Tìm sự cố</label><input id="incident-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã sự cố, mã đơn, nội dung" /></div><div className="admin-field"><label htmlFor="incident-filter">Trạng thái</label><select id="incident-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">Tất cả</option><option value="CHO_XU_LY">Chờ xử lý</option><option value="DANG_XU_LY">Đang xử lý</option><option value="DA_GIAI_QUYET">Đã giải quyết</option></select></div></div></section>
    <section className="admin-panel"><div className="admin-result-bar"><strong>{visible.length} sự cố</strong><span>Theo dõi tiến độ xử lý</span></div>{visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã sự cố</th><th>Đơn hàng</th><th>Nội dung</th><th>Tài xế</th><th>Phụ trách</th><th>Trạng thái</th><th className="action">Thao tác</th></tr></thead><tbody>{visible.map((incident) => <tr key={incident.id}><td><strong>{incident.id}</strong><small>{incident.reportedAt}</small></td><td><Link className="admin-link" href={`/admin/orders/${incident.orderId}`}>{incident.orderId}</Link></td><td className="admin-wrap-cell">{incident.type}</td><td>{incident.driverName}</td><td>{incident.assignee || "Chưa phân công"}</td><td><span className={`admin-status ${incident.status === "CHO_XU_LY" ? "danger" : incident.status === "DANG_XU_LY" ? "warning" : "success"}`}>{incidentStatus[incident.status]}</span></td><td className="action"><button className="admin-text-button" onClick={() => { setError(""); setForm({ ...incident }); }}>Xử lý →</button></td></tr>)}</tbody></table></div> : <AdminEmpty title="Không tìm thấy sự cố" detail="Thử bộ lọc hoặc từ khóa khác." />}</section>
    {form && <AdminDialog title={`Xử lý ${form.id}`} description={`Đơn ${form.orderId} · ${orders.find((order) => order.id === form.orderId)?.receiver.name ?? "Khách hàng"}`} onClose={() => setForm(null)} onSubmit={save} submitLabel="Lưu xử lý" error={error}><div className="admin-incident-note"><strong>{form.type}</strong><p>{form.note}</p></div><div className="admin-form-grid"><div className="admin-field"><label htmlFor="incident-assignee">Người phụ trách</label><select id="incident-assignee" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })}><option value="">Chưa phân công</option>{staff.filter((member) => member.active).map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}</select></div><div className="admin-field"><label htmlFor="incident-state">Trạng thái</label><select id="incident-state" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminIncident["status"] })}><option value="CHO_XU_LY">Chờ xử lý</option><option value="DANG_XU_LY">Đang xử lý</option><option value="DA_GIAI_QUYET">Đã giải quyết</option></select></div><div className="admin-field admin-field-wide"><label htmlFor="incident-resolution">Ghi chú xử lý</label><textarea id="incident-resolution" value={form.resolution} onChange={(event) => setForm({ ...form, resolution: event.target.value })} placeholder="Các bước đã thực hiện và kết quả" /></div></div></AdminDialog>}
  </>;
}
