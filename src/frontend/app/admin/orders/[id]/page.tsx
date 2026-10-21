"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminDialog, AdminHeading } from "@/components/admin/AdminUI";
import { AdminTableControls, useAdminTable } from "@/components/admin/AdminTableControls";
import { amount, dateTime, orderStatus, type DriverRow, type OrderRow, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: order, error, loading, refresh } = useAdminResource<OrderRow>(`/orders/${id}`);
  const { data: drivers } = useAdminResource<{ items: DriverRow[] }>("/drivers");
  const [action, setAction] = useState<"assign" | "cancel" | null>(null);
  const [driverId, setDriverId] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const parcels = useAdminTable(order?.kien_hang ?? [], (item) => `${item.loai_hang} ${item.ghi_chu ?? ""}`);
  const assignments = useAdminTable(order?.lich_su_phan_cong ?? [], (item) => `${item.tai_xe} ${item.bien_so ?? ""} ${item.ket_qua ?? ""}`);
  const events = useAdminTable(order?.nhat_ky ?? [], (item) => `${item.loai} ${item.trang_thai_sau} ${item.ghi_chu ?? ""}`);

  async function submit() {
    if (!action) return;
    setSaving(true); setActionError("");
    try {
      if (action === "assign") await request(`/orders/${id}/assign`, "POST", { maTx: driverId });
      else await request(`/orders/${id}/cancel`, "POST", { lyDo: reason.trim() });
      setAction(null); setDriverId(""); setReason(""); await refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không lưu được thay đổi"); }
    finally { setSaving(false); }
  }

  return <>
    <AdminHeading eyebrow="Đơn hàng" title={id} description="Chi tiết, phân công và nhật ký lấy trực tiếp từ designV2."
      actions={<><Link className="admin-button" href="/admin/orders">← Danh sách</Link><button className="admin-button" onClick={() => void refresh()}>Làm mới</button></>} />
    {loading && <p role="status" className="admin-feedback">Đang tải đơn...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {order && <>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Thông tin đơn</h2><span>{orderStatus[order.trang_thai] ?? order.trang_thai}</span></div>
        <div className="admin-detail-body"><div className="admin-summary-grid">
          <div><small>Cước</small><strong>{amount(order.tong_cuoc)}</strong></div>
          <div><small>Tạo lúc</small><strong>{dateTime(order.tao_luc)}</strong></div>
          <div><small>Tài xế</small><strong>{order.phan_cong?.ho_ten ?? "Chưa gán"}</strong></div>
          <div><small>Quãng đường</small><strong>{order.quang_duong_km ? `${Number(order.quang_duong_km).toLocaleString("vi-VN")} km` : "—"}</strong></div>
        </div><p><strong>Lấy:</strong> {order.diem_lay}</p><p><strong>Giao:</strong> {order.diem_giao}</p>
        <p><strong>Người nhận:</strong> {order.ten_nguoi_nhan} · {order.sdt_nguoi_nhan ?? "Chưa có số điện thoại"}</p>
        {order.ghi_chu && <p><strong>Ghi chú giao hàng:</strong> {order.ghi_chu}</p>}
        {order.ly_do_huy && <p><strong>Lý do hủy:</strong> {order.ly_do_huy}</p>}
        <div className="admin-inline-actions">
          {order.trang_thai === "CHO_GAN" && <button className="admin-button primary" onClick={() => setAction("assign")}>Phân công tài xế</button>}
          {!["HOAN_TAT", "DA_HUY"].includes(order.trang_thai) && <button className="admin-button danger" onClick={() => setAction("cancel")}>Hủy đơn</button>}
        </div></div>
      </section>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Kiện hàng</h2><span>{order.kien_hang?.length ?? 0} kiện</span></div>
        <AdminTableControls label="kiện hàng" query={parcels.query} onQuery={parcels.setQuery} page={parcels.page} onPage={parcels.setPage} total={parcels.total} />
        {order.kien_hang?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>#</th><th>Loại hàng</th><th>Khối lượng</th><th>Ghi chú</th></tr></thead><tbody>
          {parcels.rows.map((parcel) => <tr key={parcel.thu_tu}><td>{parcel.thu_tu}</td><td>{parcel.loai_hang}</td><td>{Number(parcel.khoi_luong_kg).toLocaleString("vi-VN")} kg</td><td>{parcel.ghi_chu ?? "—"}</td></tr>)}
        </tbody></table></div> : <p className="admin-muted">Đơn không có thông tin kiện hàng.</p>}
      </section>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Lịch sử phân công</h2></div>
        <AdminTableControls label="phân công" query={assignments.query} onQuery={assignments.setQuery} page={assignments.page} onPage={assignments.setPage} total={assignments.total} />
        {order.lich_su_phan_cong?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tài xế</th><th>Biển số</th><th>Bắt đầu</th><th>Kết thúc</th><th>Kết quả</th><th>Lý do</th></tr></thead><tbody>
          {assignments.rows.map((assignment) => <tr key={assignment.ma_phan_cong}><td>{assignment.tai_xe}</td><td>{assignment.bien_so ?? "—"}</td><td>{dateTime(assignment.bat_dau_luc)}</td><td>{dateTime(assignment.ket_thuc_luc)}</td><td>{assignment.ket_qua ?? "Đang thực hiện"}</td><td>{assignment.ly_do ?? "—"}</td></tr>)}
        </tbody></table></div> : <p className="admin-muted">Chưa có lịch sử phân công.</p>}
      </section>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Nhật ký đơn</h2></div>
        <AdminTableControls label="sự kiện" query={events.query} onQuery={events.setQuery} page={events.page} onPage={events.setPage} total={events.total} />
        {order.nhat_ky?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Trạng thái sau</th><th>Ghi chú</th></tr></thead><tbody>
          {events.rows.map((event) => <tr key={event.ma_su_kien}><td>{dateTime(event.thoi_gian)}</td><td>{event.loai}</td><td>{orderStatus[event.trang_thai_sau] ?? event.trang_thai_sau}</td><td>{event.ghi_chu ?? "—"}</td></tr>)}
        </tbody></table></div> : <p className="admin-muted">Chưa có sự kiện.</p>}
      </section>
    </>}
    {action && <AdminDialog title={action === "assign" ? "Phân công tài xế" : "Hủy đơn"}
      description={`Đơn ${id}. Kết quả sẽ được lưu trong DB và nhật ký đơn.`}
      onClose={() => setAction(null)} onSubmit={() => void submit()} submitLabel={saving ? "Đang lưu..." : "Xác nhận"}
      submitDisabled={saving || (action === "assign" ? !driverId : reason.trim().length < 8)} error={actionError} danger={action === "cancel"}>
      {action === "assign" ? <div className="admin-field"><label htmlFor="assign-driver">Tài xế</label><select id="assign-driver" value={driverId} onChange={(event) => setDriverId(event.target.value)}><option value="">Chọn tài xế</option>
        {drivers?.items.filter((driver) => driver.trang_thai === "ONLINE" && !driver.dang_ban_chuyen && driver.bien_so).map((driver) => <option key={driver.ma_tx} value={driver.ma_tx}>{driver.ho_ten} · {driver.bien_so}</option>)}
      </select></div> : <div className="admin-field"><label htmlFor="cancel-reason">Lý do hủy</label><textarea id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div>}
    </AdminDialog>}
  </>;
}
