"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { dateTime, orderStatus, useAdminResource } from "@/lib/admin-live";

type Incident = { ma_su_kien: number; ma_don: string; thoi_gian: string; ghi_chu: string | null; trang_thai: string };

export default function AdminIncidentsPage() {
  const [page, setPage] = useState(0);
  const { data, error, loading, refresh } = useAdminResource<{ items: Incident[]; total: number }>(`/admin/incidents?page=${page}&size=20`);
  return <>
    <AdminHeading eyebrow="Điều hành" title="Sự cố giao hàng"
      description="Sự kiện sự cố từ nhật ký đơn hàng; hiện chỉ có chức năng xem."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải sự cố...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{Number(data.total)} sự cố</strong><span>Trang {page + 1}</span></div>
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Đơn hàng</th><th>Nội dung</th><th>Trạng thái đơn</th></tr></thead><tbody>
        {data.items.map((incident) => <tr key={incident.ma_su_kien}>
          <td>{dateTime(incident.thoi_gian)}</td>
          <td><Link href={`/admin/orders/${incident.ma_don}`}>{incident.ma_don}</Link></td>
          <td>{incident.ghi_chu || "—"}</td>
          <td>{orderStatus[incident.trang_thai] ?? incident.trang_thai}</td>
        </tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có sự cố" detail="Sự cố được ghi nhận từ nhật ký đơn hàng." />}
      <div className="admin-inline-actions"><button className="admin-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
        <button className="admin-button" disabled={(page + 1) * 20 >= Number(data.total)} onClick={() => setPage(page + 1)}>Trang sau</button></div>
    </section>}
  </>;
}
