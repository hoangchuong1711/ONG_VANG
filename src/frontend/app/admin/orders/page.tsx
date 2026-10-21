"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { amount, dateTime, orderStatus, type OrderRow, useAdminResource } from "@/lib/admin-live";

export default function AdminOrdersPage() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const status = filter === "ALL" ? "" : `&status=${encodeURIComponent(filter)}`;
  const { data, error, loading, refresh } = useAdminResource<{ items: OrderRow[]; total: number }>(`/admin/orders?page=${page}&size=20${status}&q=${encodeURIComponent(search)}`);
  return <>
    <AdminHeading eyebrow="Điều hành" title="Đơn hàng" description="Danh sách đơn lưu trong designV2."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    <section className="admin-panel admin-filter-panel"><div className="admin-field"><label htmlFor="order-state">Trạng thái</label>
      <select id="order-state" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}>
        <option value="ALL">Tất cả</option>{Object.entries(orderStatus).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select></div><div className="admin-field"><label htmlFor="order-search">Tìm đơn hàng</label><input id="order-search" type="search" value={search} placeholder="Mã đơn, người nhận, địa chỉ..." onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></div></section>
    {loading && <p role="status" className="admin-feedback">Đang tải đơn...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{Number(data.total)} đơn</strong><span>Trang {page + 1}</span></div>
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Lấy hàng</th><th>Giao hàng</th><th>Người nhận</th><th>Tài xế</th><th>Trạng thái</th><th className="money">Cước</th></tr></thead><tbody>
        {data.items.map((order) => <tr key={order.ma_don}><td><Link href={`/admin/orders/${order.ma_don}`}>{order.ma_don}</Link><small>{dateTime(order.tao_luc)}</small></td><td>{order.diem_lay}</td><td>{order.diem_giao}</td><td>{order.ten_nguoi_nhan}</td><td>{order.phan_cong?.ho_ten ?? "Chưa gán"}</td><td>{orderStatus[order.trang_thai] ?? order.trang_thai}</td><td className="money">{amount(order.tong_cuoc)}</td></tr>)}
      </tbody></table></div> : <AdminEmpty title="Không có đơn phù hợp" detail="Thử đổi trạng thái hoặc quay lại trang trước." />}
      <div className="admin-inline-actions"><button className="admin-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button><button className="admin-button" disabled={(page + 1) * 20 >= Number(data.total)} onClick={() => setPage(page + 1)}>Trang sau</button></div>
    </section>}
  </>;
}
