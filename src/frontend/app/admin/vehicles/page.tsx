"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminDialog, AdminEmpty, AdminHeading, AdminStat, adminActivity } from "@/components/admin/AdminUI";
import type { AdminVehicle } from "@/lib/admin-extras";

const newVehicle = (): AdminVehicle => ({ id: "", plate: "", type: "", capacityKg: 10, driverId: null, status: "HOAT_DONG" });
const statusText: Record<AdminVehicle["status"], string> = { HOAT_DONG: "Hoạt động", BAO_TRI: "Bảo trì", NGUNG: "Ngừng sử dụng" };

export default function AdminVehiclesPage() {
  const { vehicles, drivers, updateDemo } = useAdmin();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState<AdminVehicle | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = vehicles.filter((vehicle) => `${vehicle.plate} ${vehicle.type} ${drivers.find((driver) => driver.id === vehicle.driverId)?.name ?? ""}`.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")) && (filter === "ALL" || vehicle.status === filter));
  const save = () => {
    if (!form) return;
    if (form.plate.trim().length < 6 || form.type.trim().length < 3 || !Number.isFinite(form.capacityKg) || form.capacityKg <= 0) { setError("Nhập biển số, loại xe và tải trọng hợp lệ."); return; }
    if (vehicles.some((vehicle) => vehicle.plate.toLocaleLowerCase() === form.plate.trim().toLocaleLowerCase() && vehicle.id !== form.id)) { setError("Biển số đã tồn tại."); return; }
    if (form.driverId && vehicles.some((vehicle) => vehicle.driverId === form.driverId && vehicle.id !== form.id)) { setError("Tài xế này đã được gán cho xe khác."); return; }
    const isNew = !form.id;
    const saved = { ...form, id: form.id || `XE-${String(vehicles.length + 1).padStart(3, "0")}`, plate: form.plate.trim().toUpperCase(), type: form.type.trim() };
    const priorDriverId = vehicles.find((vehicle) => vehicle.id === saved.id)?.driverId;
    updateDemo((previous) => ({ ...previous,
      vehicles: isNew ? [...previous.vehicles, saved] : previous.vehicles.map((vehicle) => vehicle.id === saved.id ? saved : vehicle),
      drivers: previous.drivers.map((driver) => driver.id === saved.driverId ? { ...driver, vehiclePlate: saved.plate, vehicleType: saved.type } : driver.id === priorDriverId ? { ...driver, vehiclePlate: "Chưa gán", vehicleType: "Chưa gán" } : driver),
      orders: previous.orders.map((order) => order.driver?.id === saved.driverId ? { ...order, driver: { ...order.driver, vehiclePlate: saved.plate, vehicleType: saved.type } } : order),
      activity: [adminActivity(isNew ? "Thêm phương tiện" : "Cập nhật phương tiện", saved.plate), ...previous.activity],
    }));
    setForm(null); setNotice("Đã lưu phương tiện trong dữ liệu demo.");
  };
  const changeStatus = (vehicle: AdminVehicle, status: AdminVehicle["status"]) => {
    updateDemo((previous) => ({ ...previous, vehicles: previous.vehicles.map((item) => item.id === vehicle.id ? { ...item, status } : item), activity: [adminActivity("Đổi trạng thái xe", `${vehicle.plate}: ${statusText[status]}`), ...previous.activity] }));
    setNotice(`Đã chuyển ${vehicle.plate} sang ${statusText[status].toLocaleLowerCase("vi-VN")}.`);
  };

  return <>
    <AdminHeading eyebrow="Điều hành đội xe" title="Phương tiện" description="Quản lý xe, tải trọng và người đang sử dụng." actions={<button className="admin-button primary" onClick={() => { setError(""); setForm(newVehicle()); }}>+ Thêm phương tiện</button>} />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    <div className="admin-stat-grid"><AdminStat label="Tổng phương tiện" value={vehicles.length} note="Trong danh sách" /><AdminStat label="Hoạt động" value={vehicles.filter((vehicle) => vehicle.status === "HOAT_DONG").length} note="Có thể vận hành" tone="accent" /><AdminStat label="Bảo trì" value={vehicles.filter((vehicle) => vehicle.status === "BAO_TRI").length} note="Tạm dừng sử dụng" /><AdminStat label="Chưa gán tài xế" value={vehicles.filter((vehicle) => !vehicle.driverId).length} note="Có thể phân bổ" /></div>
    <section className="admin-panel admin-filter-panel"><div className="admin-filter-grid admin-filter-compact"><div className="admin-field"><label htmlFor="vehicle-search">Tìm phương tiện</label><input id="vehicle-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Biển số, loại xe hoặc tài xế" /></div><div className="admin-field"><label htmlFor="vehicle-filter">Trạng thái</label><select id="vehicle-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">Tất cả</option><option value="HOAT_DONG">Hoạt động</option><option value="BAO_TRI">Bảo trì</option><option value="NGUNG">Ngừng sử dụng</option></select></div></div></section>
    <section className="admin-panel"><div className="admin-result-bar"><strong>{visible.length} phương tiện</strong><span>Danh sách đội xe</span></div>{visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Biển số</th><th>Loại xe</th><th>Tải trọng</th><th>Tài xế sử dụng</th><th>Trạng thái</th><th className="action">Thao tác</th></tr></thead><tbody>{visible.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.plate}</strong><small>{vehicle.id}</small></td><td>{vehicle.type}</td><td>{vehicle.capacityKg} kg</td><td>{drivers.find((driver) => driver.id === vehicle.driverId)?.name ?? "Chưa gán"}</td><td><span className={`admin-status ${vehicle.status === "HOAT_DONG" ? "success" : vehicle.status === "BAO_TRI" ? "warning" : "muted"}`}>{statusText[vehicle.status]}</span></td><td className="action"><button className="admin-text-button" onClick={() => { setError(""); setForm({ ...vehicle }); }}>Sửa</button><select className="admin-inline-select" aria-label={`Đổi trạng thái ${vehicle.plate}`} value={vehicle.status} onChange={(event) => changeStatus(vehicle, event.target.value as AdminVehicle["status"])}><option value="HOAT_DONG">Hoạt động</option><option value="BAO_TRI">Bảo trì</option><option value="NGUNG">Ngừng sử dụng</option></select></td></tr>)}</tbody></table></div> : <AdminEmpty title="Không tìm thấy phương tiện" detail="Thử từ khóa hoặc trạng thái khác." />}</section>
    {form && <AdminDialog title={form.id ? "Sửa phương tiện" : "Thêm phương tiện"} description="Liên kết xe với một tài xế trong đội xe demo." onClose={() => setForm(null)} onSubmit={save} submitLabel="Lưu phương tiện" error={error}><div className="admin-form-grid"><div className="admin-field"><label htmlFor="vehicle-plate">Biển số</label><input id="vehicle-plate" value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value })} /></div><div className="admin-field"><label htmlFor="vehicle-type">Loại xe</label><input id="vehicle-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div><div className="admin-field"><label htmlFor="vehicle-capacity">Tải trọng (kg)</label><input id="vehicle-capacity" type="number" min="1" value={form.capacityKg} onChange={(event) => setForm({ ...form, capacityKg: Number(event.target.value) })} /></div><div className="admin-field"><label htmlFor="vehicle-driver">Tài xế sử dụng</label><select id="vehicle-driver" value={form.driverId ?? ""} onChange={(event) => setForm({ ...form, driverId: event.target.value || null })}><option value="">Chưa gán</option>{drivers.filter((driver) => !vehicles.some((vehicle) => vehicle.id !== form.id && vehicle.driverId === driver.id)).map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}</select></div><div className="admin-field"><label htmlFor="vehicle-state">Trạng thái</label><select id="vehicle-state" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminVehicle["status"] })}><option value="HOAT_DONG">Hoạt động</option><option value="BAO_TRI">Bảo trì</option><option value="NGUNG">Ngừng sử dụng</option></select></div></div></AdminDialog>}
  </>;
}
