"use client";

import { useState } from "react";
import { AdminDialog, AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { AdminTableControls, useAdminTable } from "@/components/admin/AdminTableControls";
import { useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Vehicle = { ma_tx: string; bien_so: string; loai_xe: string; mau_xe: string | null; dang_hoat_dong: boolean; ho_ten: string };
type DriverOption = { ma_tx: string; ho_ten: string; trang_thai_tai_khoan: string; trang_thai: string; dang_ban_chuyen: boolean };
type Form = { maTx: string; bienSo: string; loaiXe: string; mauXe: string; hoatDong: boolean };
const fresh = (): Form => ({ maTx: "", bienSo: "", loaiXe: "", mauXe: "", hoatDong: true });

export default function AdminVehiclesPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Vehicle[] }>("/vehicles");
  const { data: drivers } = useAdminResource<{ items: DriverOption[] }>("/admin/drivers");
  const [form, setForm] = useState<Form>(fresh());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const table = useAdminTable(data?.items ?? [], (vehicle) => `${vehicle.bien_so} ${vehicle.loai_xe} ${vehicle.mau_xe ?? ""} ${vehicle.ho_ten}`);

  function edit(vehicle?: Vehicle) {
    setForm(vehicle ? { maTx: vehicle.ma_tx, bienSo: vehicle.bien_so, loaiXe: vehicle.loai_xe, mauXe: vehicle.mau_xe ?? "", hoatDong: vehicle.dang_hoat_dong } : fresh());
    setFormError(""); setOpen(true);
  }
  async function save() {
    setSaving(true); setFormError("");
    try {
      await request("/vehicles", "POST", { hanhDong: "LUU", maTx: form.maTx, bienSo: form.bienSo.trim(),
        loaiXe: form.loaiXe.trim(), mauXe: form.mauXe.trim() || null, hoatDong: form.hoatDong });
      setOpen(false); await refresh();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Không lưu được phương tiện"); }
    finally { setSaving(false); }
  }
  async function toggle(vehicle: Vehicle) {
    setActionError("");
    try {
      await request("/vehicles", "POST", { hanhDong: "LUU", maTx: vehicle.ma_tx, bienSo: vehicle.bien_so,
        loaiXe: vehicle.loai_xe, mauXe: vehicle.mau_xe, hoatDong: !vehicle.dang_hoat_dong }); await refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không cập nhật được phương tiện"); }
  }
  const activeDrivers = drivers?.items.filter((driver) => driver.trang_thai_tai_khoan === "HOAT_DONG") ?? [];
  return <>
    <AdminHeading eyebrow="Điều hành" title="Phương tiện" description="Quản lý xe theo dữ liệu designV2; mỗi tài xế gắn tối đa một phương tiện."
      actions={<button className="admin-button primary" onClick={() => edit()}>Thêm phương tiện</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải phương tiện...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} phương tiện</strong></div>
      <AdminTableControls label="phương tiện" query={table.query} onQuery={table.setQuery} page={table.page} onPage={table.setPage} total={table.total} />
      {table.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Biển số</th><th>Loại xe</th><th>Màu xe</th><th>Tài xế</th><th>Hoạt động</th><th>Thao tác</th></tr></thead><tbody>
        {table.rows.map((vehicle) => <tr key={vehicle.ma_tx}><td><strong>{vehicle.bien_so}</strong></td><td>{vehicle.loai_xe}</td><td>{vehicle.mau_xe ?? "—"}</td><td>{vehicle.ho_ten}</td><td>{vehicle.dang_hoat_dong ? "Có" : "Ngừng"}</td>
          <td><div className="admin-inline-actions"><button className="admin-button" onClick={() => edit(vehicle)}>Sửa</button><button className="admin-button" onClick={() => void toggle(vehicle)}>{vehicle.dang_hoat_dong ? "Ngừng hoạt động" : "Kích hoạt"}</button></div></td></tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có phương tiện" detail="Thêm phương tiện và liên kết với một tài xế đang hoạt động." />}
    </section>}
    {open && <AdminDialog title={form.maTx ? "Cập nhật phương tiện" : "Thêm phương tiện"}
      description="Biển số phải duy nhất; mỗi tài xế chỉ gắn một xe. Thao tác được máy chủ kiểm tra trạng thái phân công."
      onClose={() => setOpen(false)} onSubmit={() => void save()} submitLabel={saving ? "Đang lưu..." : "Lưu phương tiện"}
      submitDisabled={saving || !form.maTx || !form.bienSo.trim() || !form.loaiXe.trim()} error={formError}>
      <div className="admin-form-grid">
        <div className="admin-field admin-field-wide"><label htmlFor="vehicle-driver">Tài xế</label><select id="vehicle-driver" disabled={!!data?.items.some((item) => item.ma_tx === form.maTx)} value={form.maTx} onChange={(e) => setForm({ ...form, maTx: e.target.value })}><option value="">Chọn tài xế</option>
          {activeDrivers.filter((driver) => !driver.dang_ban_chuyen && (!data?.items.some((item) => item.ma_tx === driver.ma_tx) || driver.ma_tx === form.maTx)).map((driver) => <option key={driver.ma_tx} value={driver.ma_tx}>{driver.ho_ten} · {driver.trang_thai}</option>)}
        </select></div>
        <div className="admin-field"><label htmlFor="vehicle-plate">Biển số</label><input id="vehicle-plate" required maxLength={15} value={form.bienSo} onChange={(e) => setForm({ ...form, bienSo: e.target.value.toUpperCase() })} /></div>
        <div className="admin-field"><label htmlFor="vehicle-type">Loại xe</label><input id="vehicle-type" required maxLength={50} value={form.loaiXe} onChange={(e) => setForm({ ...form, loaiXe: e.target.value })} /></div>
        <div className="admin-field"><label htmlFor="vehicle-color">Màu xe</label><input id="vehicle-color" maxLength={30} value={form.mauXe} onChange={(e) => setForm({ ...form, mauXe: e.target.value })} /></div>
        <label className="admin-field"><span>Trạng thái</span><span><input type="checkbox" checked={form.hoatDong} onChange={(e) => setForm({ ...form, hoatDong: e.target.checked })} /> Đang hoạt động</span></label>
      </div>
    </AdminDialog>}
  </>;
}
