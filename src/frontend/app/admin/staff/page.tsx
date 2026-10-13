"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminDialog, AdminEmpty, AdminHeading, AdminStat, adminActivity } from "@/components/admin/AdminUI";
import type { AdminStaff } from "@/lib/admin-extras";

const roleName: Record<AdminStaff["role"], string> = { TONG_DAI: "Tổng đài", DIEU_PHOI: "Điều phối", CHU_DOI_XE: "Chủ đội xe" };
const permissions = [
  ["Tiếp nhận & tạo đơn", true, true, true],
  ["Phân công tài xế", false, true, true],
  ["Theo dõi sự cố", false, true, true],
  ["Xem báo cáo tài chính", false, false, true],
  ["Quản lý nhân sự, biểu phí", false, false, true],
] as const;

export default function AdminStaffPage() {
  const { staff, updateDemo } = useAdmin();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [form, setForm] = useState<AdminStaff | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = staff.filter((member) => `${member.name} ${member.phone}`.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")) && (role === "ALL" || member.role === role));
  const save = () => {
    if (!form) return;
    if (form.name.trim().length < 3 || !/^0\d{9}$/.test(form.phone)) { setError("Nhập tên ít nhất 3 ký tự và số điện thoại 10 chữ số."); return; }
    if (staff.some((member) => member.phone === form.phone && member.id !== form.id)) { setError("Số điện thoại đã được dùng."); return; }
    const isNew = !form.id;
    const saved = { ...form, id: form.id || `NV-${String(staff.length + 1).padStart(3, "0")}`, name: form.name.trim(), joinedAt: form.joinedAt || new Date().toLocaleDateString("vi-VN") };
    updateDemo((previous) => ({ ...previous,
      staff: isNew ? [...previous.staff, saved] : previous.staff.map((member) => member.id === saved.id ? saved : member),
      activity: [adminActivity(isNew ? "Thêm nhân viên" : "Sửa nhân viên", `${saved.name} · ${roleName[saved.role]}`), ...previous.activity],
    }));
    setForm(null); setNotice("Đã lưu nhân sự trong dữ liệu demo.");
  };
  const toggle = (member: AdminStaff) => {
    if (member.role === "CHU_DOI_XE") return;
    if (!window.confirm(`${member.active ? "Khóa" : "Mở khóa"} tài khoản ${member.name}?`)) return;
    updateDemo((previous) => ({ ...previous, staff: previous.staff.map((item) => item.id === member.id ? { ...item, active: !item.active } : item), activity: [adminActivity(member.active ? "Khóa nhân viên" : "Mở khóa nhân viên", member.name), ...previous.activity] }));
    setNotice(`Đã ${member.active ? "khóa" : "mở khóa"} tài khoản ${member.name}.`);
  };

  return <>
    <AdminHeading eyebrow="Quản trị hệ thống" title="Nhân sự & phân quyền" description="Quản lý tài khoản vận hành và xem quyền của từng vai trò." actions={<button className="admin-button primary" onClick={() => { setError(""); setForm({ id: "", name: "", phone: "", role: "TONG_DAI", active: true, joinedAt: "" }); }}>+ Thêm nhân viên</button>} />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    <div className="admin-stat-grid"><AdminStat label="Tổng nhân sự" value={staff.length} note="Bao gồm chủ đội xe" /><AdminStat label="Điều phối" value={staff.filter((member) => member.role === "DIEU_PHOI").length} note="Phân công và xử lý đơn" tone="accent" /><AdminStat label="Tổng đài" value={staff.filter((member) => member.role === "TONG_DAI").length} note="Tiếp nhận yêu cầu" /><AdminStat label="Đã khóa" value={staff.filter((member) => !member.active).length} note="Không hoạt động" tone="alert" /></div>
    <section className="admin-panel admin-filter-panel"><div className="admin-filter-grid admin-filter-compact"><div className="admin-field"><label htmlFor="staff-search">Tìm nhân viên</label><input id="staff-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc số điện thoại" /></div><div className="admin-field"><label htmlFor="staff-role">Vai trò</label><select id="staff-role" value={role} onChange={(event) => setRole(event.target.value)}><option value="ALL">Tất cả</option><option value="TONG_DAI">Tổng đài</option><option value="DIEU_PHOI">Điều phối</option><option value="CHU_DOI_XE">Chủ đội xe</option></select></div></div></section>
    <section className="admin-panel"><div className="admin-result-bar"><strong>{visible.length} tài khoản</strong><span>Trạng thái nhân sự demo</span></div>{visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Tham gia</th><th>Trạng thái</th><th className="action">Thao tác</th></tr></thead><tbody>{visible.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.phone} · {member.id}</small></td><td>{roleName[member.role]}</td><td>{member.joinedAt}</td><td><span className={`admin-status ${member.active ? "success" : "danger"}`}>{member.active ? "Hoạt động" : "Đã khóa"}</span></td><td className="action"><button className="admin-text-button" onClick={() => { setError(""); setForm({ ...member }); }}>Sửa</button>{member.role !== "CHU_DOI_XE" && <button className="admin-text-button" onClick={() => toggle(member)}>{member.active ? "Khóa" : "Mở khóa"}</button>}</td></tr>)}</tbody></table></div> : <AdminEmpty title="Không tìm thấy nhân viên" detail="Thử từ khóa hoặc vai trò khác." />}</section>
    <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><div><h2>Ma trận quyền tham khảo</h2><p>Giao diện mô tả phạm vi từng vai trò; backend sẽ kiểm tra quyền khi tích hợp.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Chức năng</th><th>Tổng đài</th><th>Điều phối</th><th>Chủ đội xe</th></tr></thead><tbody>{permissions.map(([name, callCenter, dispatcher, owner]) => <tr key={name}><td><strong>{name}</strong></td><td>{callCenter ? "Có" : "—"}</td><td>{dispatcher ? "Có" : "—"}</td><td>{owner ? "Có" : "—"}</td></tr>)}</tbody></table></div></section>
    {form && <AdminDialog title={form.id ? "Sửa nhân viên" : "Thêm nhân viên"} description="Thông tin được lưu trong dữ liệu demo của cổng quản trị." onClose={() => setForm(null)} onSubmit={save} submitLabel="Lưu nhân viên" error={error}><div className="admin-form-grid"><div className="admin-field"><label htmlFor="staff-name">Họ tên</label><input id="staff-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="admin-field"><label htmlFor="staff-phone">Số điện thoại</label><input id="staff-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="admin-field"><label htmlFor="staff-edit-role">Vai trò</label><select id="staff-edit-role" value={form.role} disabled={form.role === "CHU_DOI_XE"} onChange={(event) => setForm({ ...form, role: event.target.value as AdminStaff["role"] })}><option value="TONG_DAI">Tổng đài</option><option value="DIEU_PHOI">Điều phối</option>{form.role === "CHU_DOI_XE" && <option value="CHU_DOI_XE">Chủ đội xe</option>}</select></div></div></AdminDialog>}
  </>;
}
