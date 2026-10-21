"use client";

import { useRef, useState } from "react";
import { AdminDialog, AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { AdminTableControls, useAdminTable } from "@/components/admin/AdminTableControls";
import { PersonnelFields, PersonnelTabs, type PersonForm } from "@/components/admin/AdminPersonnel";
import { useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Driver = { ma_tx: string; username: string; ho_ten: string; so_dien_thoai: string; email: string | null;
  trang_thai_tai_khoan: string; cccd: string; so_giay_phep: string; trang_thai: string;
  dang_ban_chuyen: boolean; bien_so: string | null; loai_xe: string | null };
type DriverForm = PersonForm & { cccd: string; soGiayPhep: string };
const fresh = (): DriverForm => ({ username: "", matKhau: "", hoTen: "", soDienThoai: "", email: "", cccd: "", soGiayPhep: "" });

export default function AdminDriversPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Driver[] }>("/admin/drivers");
  const table = useAdminTable(data?.items ?? [], (item) => `${item.ho_ten} ${item.username} ${item.so_dien_thoai} ${item.cccd} ${item.so_giay_phep} ${item.bien_so ?? ""}`);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DriverForm>(fresh);
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const change = (key: keyof PersonForm, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const close = () => { setCreating(false); setEditing(null); };
  const startCreate = () => { setForm(fresh()); setFormError(""); setCreating(true); setEditing(null); };
  const startEdit = (driver: Driver) => {
    setForm({ username: driver.username, matKhau: "", hoTen: driver.ho_ten, soDienThoai: driver.so_dien_thoai,
      email: driver.email ?? "", cccd: driver.cccd, soGiayPhep: driver.so_giay_phep });
    setFormError(""); setCreating(false); setEditing(driver);
  };
  async function submit() {
    if (!formRef.current?.reportValidity()) return;
    setSaving(true); setFormError("");
    try {
      const payload = { hoTen: form.hoTen.trim(), soDienThoai: form.soDienThoai.trim(), email: form.email.trim() || null,
        cccd: form.cccd.trim(), soGiayPhep: form.soGiayPhep.trim() };
      if (creating) await request("/admin/drivers", "POST", { ...payload, username: form.username.trim().toLowerCase(), matKhau: form.matKhau });
      else if (editing) {
        await request(`/admin/drivers/${editing.ma_tx}`, "PATCH", payload);
        if (form.matKhau) await request(`/admin/drivers/${editing.ma_tx}/password`, "POST", { matKhau: form.matKhau });
      }
      setNotice(form.matKhau && editing ? "Đã cập nhật hồ sơ và cấp mật khẩu mới. Phiên đăng nhập cũ đã bị thu hồi." : "Đã lưu hồ sơ tài xế.");
      close(); await refresh();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Không lưu được hồ sơ"); }
    finally { setSaving(false); }
  }
  async function toggleLock(driver: Driver) {
    setActionError("");
    try { await request(`/admin/drivers/${driver.ma_tx}/status`, "POST", { hanhDong: driver.trang_thai_tai_khoan === "KHOA" ? "MO_KHOA" : "KHOA" }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không đổi được trạng thái"); }
  }
  return <>
    <AdminHeading eyebrow="Điều hành" title="Quản lý tài xế" description="Hồ sơ, giấy phép, phương tiện và trạng thái tài khoản."
      actions={<button className="admin-button primary" onClick={startCreate}>Thêm tài xế</button>} />
    <PersonnelTabs />
    {loading && <p role="status" className="admin-feedback">Đang tải tài xế...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} tài xế</strong></div>
      <AdminTableControls label="tài xế" query={table.query} onQuery={table.setQuery} page={table.page} onPage={table.setPage} total={table.total} />
      {table.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tài xế</th><th>CCCD</th><th>Giấy phép</th><th>Trạng thái</th><th>Phương tiện</th><th>Thao tác</th></tr></thead><tbody>
        {table.rows.map((driver) => <tr key={driver.ma_tx}><td><strong>{driver.ho_ten}</strong><small>{driver.username} · {driver.so_dien_thoai}</small></td>
          <td>{driver.cccd}</td><td>{driver.so_giay_phep}</td><td>{driver.trang_thai_tai_khoan === "KHOA" ? "Tài khoản khóa" : driver.trang_thai}</td>
          <td>{driver.bien_so ? `${driver.bien_so} · ${driver.loai_xe ?? ""}` : "Chưa gắn xe"}</td>
          <td><div className="admin-inline-actions"><button className="admin-button" onClick={() => startEdit(driver)}>Sửa hồ sơ</button>
            <button className="admin-button" disabled={driver.dang_ban_chuyen} onClick={() => void toggleLock(driver)}>{driver.trang_thai_tai_khoan === "KHOA" ? "Mở khóa" : "Khóa"}</button></div></td></tr>)}
      </tbody></table></div> : <AdminEmpty title={table.query ? "Không tìm thấy tài xế" : "Chưa có tài xế"} detail={table.query ? "Thử từ khóa khác." : "Tạo hồ sơ tài xế để thêm nhân sự vào hệ thống."} />}
    </section>}
    {(creating || editing) && <AdminDialog title={creating ? "Thêm tài xế" : "Cập nhật hồ sơ tài xế"}
      description={creating ? "Tạo tài khoản đăng nhập và hồ sơ tài xế mới." : `Cập nhật ${editing?.ho_ten}. Có thể cấp mật khẩu mới trong cùng biểu mẫu.`}
      onClose={close} onSubmit={() => void submit()} submitLabel={saving ? "Đang lưu..." : "Lưu hồ sơ"} submitDisabled={saving} error={formError}>
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void submit(); }}><PersonnelFields form={form} onChange={change} creating={creating} extra={<>
        <div className="admin-field"><label htmlFor="driver-cccd">CCCD (12 số)</label><input id="driver-cccd" required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} value={form.cccd} onChange={(event) => setForm({ ...form, cccd: event.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-license">Số giấy phép lái xe</label><input id="driver-license" required maxLength={50} value={form.soGiayPhep} onChange={(event) => setForm({ ...form, soGiayPhep: event.target.value })} /></div>
      </>} /></form>
    </AdminDialog>}
  </>;
}
