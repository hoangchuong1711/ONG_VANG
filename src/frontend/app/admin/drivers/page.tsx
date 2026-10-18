"use client";

import { useState, type FormEvent } from "react";
import { AdminDialog, AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { dateTime, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Driver = {
  ma_tx: string; username: string; ho_ten: string; so_dien_thoai: string; email: string | null;
  trang_thai_tai_khoan: string; cccd: string; so_giay_phep: string; ngay_het_han_gplx: string;
  trang_thai: string; dang_ban_chuyen: boolean; bien_so: string | null; loai_xe: string | null;
  mau_xe: string | null; xe_hoat_dong: boolean | null;
};
type DriverForm = { username: string; matKhau: string; hoTen: string; soDienThoai: string; email: string;
  cccd: string; soGiayPhep: string; ngayHetHanGPLX: string };
const emptyForm: DriverForm = { username: "", matKhau: "", hoTen: "", soDienThoai: "", email: "", cccd: "", soGiayPhep: "", ngayHetHanGPLX: "" };

export default function AdminDriversPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Driver[] }>("/admin/drivers");
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  function startCreate() { setEditing(null); setForm(emptyForm); setFormError(""); setCreating(true); }
  function startEdit(driver: Driver) {
    setEditing(driver); setForm({ username: driver.username, matKhau: "", hoTen: driver.ho_ten,
      soDienThoai: driver.so_dien_thoai, email: driver.email ?? "", cccd: driver.cccd,
      soGiayPhep: driver.so_giay_phep, ngayHetHanGPLX: driver.ngay_het_han_gplx.slice(0, 10) });
    setFormError(""); setCreating(false);
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault(); setSaving(true); setFormError("");
    try {
      const payload = { hoTen: form.hoTen.trim(), soDienThoai: form.soDienThoai.trim(), email: form.email.trim() || null,
        cccd: form.cccd.trim(), soGiayPhep: form.soGiayPhep.trim(), ngayHetHanGPLX: form.ngayHetHanGPLX };
      if (creating) await request("/admin/drivers", "POST", { ...payload, username: form.username.trim().toLowerCase(), matKhau: form.matKhau });
      else if (editing) await request(`/admin/drivers/${editing.ma_tx}`, "PATCH", payload);
      setCreating(false); setEditing(null); await refresh();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Không lưu được hồ sơ"); }
    finally { setSaving(false); }
  }
  async function toggleLock(driver: Driver) {
    setActionError("");
    try { await request(`/admin/drivers/${driver.ma_tx}/status`, "POST", { hanhDong: driver.trang_thai_tai_khoan === "KHOA" ? "MO_KHOA" : "KHOA" }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không đổi được trạng thái"); }
  }
  const dialogOpen = creating || !!editing;
  return <>
    <AdminHeading eyebrow="Điều hành" title="Tài xế" description="Hồ sơ, giấy phép, phương tiện và trạng thái tài khoản từ designV2."
      actions={<button className="admin-button primary" onClick={startCreate}>Thêm tài xế</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải tài xế...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} tài xế</strong></div>
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tài xế</th><th>CCCD</th><th>Giấy phép</th><th>Hết hạn</th><th>Trạng thái</th><th>Phương tiện</th><th>Thao tác</th></tr></thead><tbody>
        {data.items.map((driver) => <tr key={driver.ma_tx}>
          <td><strong>{driver.ho_ten}</strong><small>{driver.username} · {driver.so_dien_thoai}</small></td>
          <td>{driver.cccd}</td><td>{driver.so_giay_phep}</td><td>{dateTime(driver.ngay_het_han_gplx)}</td>
          <td>{driver.trang_thai_tai_khoan === "KHOA" ? "Tài khoản khóa" : driver.trang_thai}</td>
          <td>{driver.bien_so ? `${driver.bien_so} · ${driver.loai_xe ?? ""}` : "Chưa gắn xe"}</td>
          <td><div className="admin-inline-actions"><button className="admin-button" onClick={() => startEdit(driver)}>Sửa hồ sơ</button>
            <button className="admin-button" disabled={driver.dang_ban_chuyen} onClick={() => void toggleLock(driver)}>{driver.trang_thai_tai_khoan === "KHOA" ? "Mở khóa" : "Khóa"}</button></div></td>
        </tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có tài xế" detail="Tạo hồ sơ tài xế để thêm nhân sự vào hệ thống." />}
    </section>}
    {dialogOpen && <AdminDialog title={creating ? "Thêm tài xế" : "Cập nhật hồ sơ tài xế"}
      description={creating ? "Tạo tài khoản đăng nhập và hồ sơ tài xế mới." : `Cập nhật ${editing?.ho_ten}; tên đăng nhập được giữ nguyên.`}
      onClose={() => { setCreating(false); setEditing(null); }} onSubmit={() => void submit()} submitLabel={saving ? "Đang lưu..." : "Lưu hồ sơ"}
      submitDisabled={saving} error={formError}>
      <form className="admin-form-grid" onSubmit={submit}>
        {creating && <><div className="admin-field"><label htmlFor="driver-username">Tên đăng nhập</label><input id="driver-username" required minLength={3} maxLength={50} autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="admin-field"><label htmlFor="driver-password">Mật khẩu khởi tạo</label><input id="driver-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.matKhau} onChange={(e) => setForm({ ...form, matKhau: e.target.value })} /></div></>}
        <div className="admin-field"><label htmlFor="driver-name">Họ tên</label><input id="driver-name" required maxLength={100} value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-phone">Số điện thoại</label><input id="driver-phone" required inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-email">Email</label><input id="driver-email" type="email" maxLength={150} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-cccd">CCCD (12 số)</label><input id="driver-cccd" required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} value={form.cccd} onChange={(e) => setForm({ ...form, cccd: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-license">Số giấy phép lái xe</label><input id="driver-license" required maxLength={50} value={form.soGiayPhep} onChange={(e) => setForm({ ...form, soGiayPhep: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="driver-expiry">Ngày hết hạn giấy phép</label><input id="driver-expiry" type="date" required value={form.ngayHetHanGPLX} onChange={(e) => setForm({ ...form, ngayHetHanGPLX: e.target.value })} /></div>
      </form>
    </AdminDialog>}
  </>;
}
