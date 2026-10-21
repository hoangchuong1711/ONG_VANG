"use client";

import { useRef, useState } from "react";
import { AdminDialog, AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { AdminTableControls, useAdminTable } from "@/components/admin/AdminTableControls";
import { PersonnelFields, PersonnelTabs, type PersonForm } from "@/components/admin/AdminPersonnel";
import { dateTime, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Dispatcher = { ma_tk: string; username: string; ho_ten: string; so_dien_thoai: string | null;
  email: string | null; vai_tro: "TONG_DAI" | "CHU_DOI_XE"; trang_thai: "HOAT_DONG" | "KHOA"; ngay_tao: string };
const fresh = (): PersonForm => ({ username: "", matKhau: "", hoTen: "", soDienThoai: "", email: "" });

export default function AdminDispatchersPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Dispatcher[] }>("/admin/staff");
  const dispatchers = data?.items.filter((item) => item.vai_tro === "TONG_DAI") ?? [];
  const table = useAdminTable(dispatchers, (item) => `${item.ho_ten} ${item.username} ${item.so_dien_thoai ?? ""} ${item.email ?? ""}`);
  const [form, setForm] = useState<PersonForm>(fresh);
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<Dispatcher | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const change = (key: keyof PersonForm, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const close = () => { setEditing(null); setCreating(false); };
  const startCreate = () => { setForm(fresh()); setFormError(""); setEditing(null); setCreating(true); };
  const startEdit = (item: Dispatcher) => {
    setForm({ username: item.username, matKhau: "", hoTen: item.ho_ten, soDienThoai: item.so_dien_thoai ?? "", email: item.email ?? "" });
    setFormError(""); setCreating(false); setEditing(item);
  };
  async function submit() {
    if (!formRef.current?.reportValidity()) return;
    setBusy(true); setFormError("");
    try {
      const payload = { hoTen: form.hoTen.trim(), soDienThoai: form.soDienThoai.trim() || null, email: form.email.trim() || null };
      if (creating) await request("/admin/staff", "POST", { ...payload, username: form.username.trim().toLowerCase(), matKhau: form.matKhau });
      else if (editing) {
        await request(`/admin/staff/${editing.ma_tk}`, "PATCH", payload);
        if (form.matKhau) await request(`/admin/staff/${editing.ma_tk}/password`, "POST", { matKhau: form.matKhau });
      }
      setNotice(form.matKhau && editing ? "Đã cập nhật hồ sơ và cấp mật khẩu mới. Phiên đăng nhập cũ đã bị thu hồi." : "Đã lưu hồ sơ điều phối viên.");
      close(); await refresh();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Không lưu được hồ sơ"); }
    finally { setBusy(false); }
  }
  async function toggleLock(item: Dispatcher) {
    setBusy(true); setActionError("");
    try {
      await request(`/admin/staff/${item.ma_tk}/status`, "POST", { hanhDong: item.trang_thai === "KHOA" ? "MO_KHOA" : "KHOA" });
      await refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không đổi được trạng thái"); }
    finally { setBusy(false); }
  }
  return <>
    <AdminHeading eyebrow="Điều hành" title="Quản lý điều phối viên" description="Hồ sơ và trạng thái tài khoản điều phối viên."
      actions={<button className="admin-button primary" onClick={startCreate}>Thêm điều phối viên</button>} />
    <PersonnelTabs />
    {loading && <p role="status" className="admin-feedback">Đang tải điều phối viên...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{dispatchers.length} điều phối viên</strong></div>
      <AdminTableControls label="điều phối viên" query={table.query} onQuery={table.setQuery} page={table.page} onPage={table.setPage} total={table.total} />
      {table.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Điều phối viên</th><th>Liên hệ</th><th>Trạng thái</th><th>Thành viên từ</th><th>Thao tác</th></tr></thead><tbody>
        {table.rows.map((item) => <tr key={item.ma_tk}><td><strong>{item.ho_ten}</strong><small>{item.username}</small></td>
          <td>{item.so_dien_thoai ?? "—"}<small>{item.email ?? ""}</small></td>
          <td>{item.trang_thai === "HOAT_DONG" ? "Hoạt động" : "Đã khóa"}</td><td>{dateTime(item.ngay_tao)}</td>
          <td><div className="admin-inline-actions"><button className="admin-button" onClick={() => startEdit(item)}>Sửa hồ sơ</button>
            <button className="admin-button" disabled={busy} onClick={() => void toggleLock(item)}>{item.trang_thai === "KHOA" ? "Mở khóa" : "Khóa"}</button></div></td></tr>)}
      </tbody></table></div> : <AdminEmpty title={table.query ? "Không tìm thấy điều phối viên" : "Chưa có điều phối viên"} detail={table.query ? "Thử từ khóa khác." : "Tạo hồ sơ để thêm điều phối viên."} />}
    </section>}
    {(creating || editing) && <AdminDialog title={creating ? "Thêm điều phối viên" : "Cập nhật hồ sơ điều phối viên"}
      description={creating ? "Tạo tài khoản điều phối viên mới." : `Cập nhật ${editing?.ho_ten}. Có thể cấp mật khẩu mới trong cùng biểu mẫu.`}
      onClose={close} onSubmit={() => void submit()} submitLabel={busy ? "Đang lưu..." : "Lưu hồ sơ"} submitDisabled={busy} error={formError}>
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void submit(); }}><PersonnelFields form={form} onChange={change} creating={creating} phoneRequired={false} /></form>
    </AdminDialog>}
  </>;
}
