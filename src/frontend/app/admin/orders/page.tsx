"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Order } from "@/lib/live-orders";
import { formatVND } from "@/lib/utils";

type OrderPage = { items: Order[]; totalElements: number; totalPages: number };
const PAGE_SIZE = 8;
const labels: Record<string, string> = {
  CHO_GAN: "Chờ gán", DA_GAN: "Đã gán", DA_LAY_HANG: "Đã lấy hàng",
  DANG_GIAO: "Đang giao", HOAN_TAT: "Hoàn tất", DA_HUY: "Đã hủy",
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<OrderPage>({ items: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (status !== "ALL") params.set("trangThai", status);
      void api<OrderPage>(`/orders?${params}`).then(data => {
        if (active) { setResult(data); setError(""); setLoading(false); }
      }).catch(cause => {
        if (active) { setError((cause as Error).message); setLoading(false); }
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [page, status]);

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">Quản lý vận hành</span><h1>Đơn hàng</h1>
      <p>Danh sách đơn thực tế theo trạng thái và trang.</p></div></div>
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    <section className="admin-panel admin-filter-panel" aria-label="Bộ lọc đơn hàng">
      <div className="admin-filter-grid"><div className="admin-field"><label htmlFor="admin-status">Trạng thái</label>
        <select id="admin-status" value={status} onChange={event => { setStatus(event.target.value); setPage(0); setLoading(true); }}>
          <option value="ALL">Tất cả</option>
          {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></div></div>
    </section>
    <section className="admin-panel" aria-label="Danh sách đơn hàng">
      <div className="admin-result-bar"><span><strong>{result.totalElements}</strong> đơn phù hợp</span>
        <span>Trang {page + 1}/{Math.max(1, result.totalPages)}</span></div>
      {loading ? <p role="status" className="admin-feedback">Đang tải đơn hàng...</p> : result.items.length ?
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
          <th>Mã đơn</th><th>Tuyến</th><th>Tài xế</th><th>Trạng thái</th><th className="money">Cước</th><th className="action">Thao tác</th>
        </tr></thead><tbody>{result.items.map(order => <tr key={order.maDon}>
          <td><strong>{order.maDon}</strong><small>{new Date(order.thoiGianTao).toLocaleString("vi-VN")}</small></td>
          <td><strong>{order.diemLayHang} → {order.diemGiaoHang}</strong><small>{order.quangDuongKm} km</small></td>
          <td>{order.maTx ?? "Chưa phân công"}</td>
          <td><span className="admin-status">{labels[order.trangThai] ?? order.trangThai}</span></td>
          <td className="money">{formatVND(Number(order.cuoc.tongCuoc))}</td>
          <td className="action"><Link className="admin-link" href={`/admin/orders/${encodeURIComponent(order.maDon)}`}>Chi tiết →</Link></td>
        </tr>)}</tbody></table></div> :
        <div className="admin-empty"><strong>Không có đơn trong trạng thái này</strong></div>}
      <div className="admin-pagination"><span>{result.totalElements ? `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + result.items.length} / ${result.totalElements}` : "0 đơn"}</span>
        <button type="button" aria-label="Trang trước" disabled={page <= 0 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>‹</button>
        <strong>{page + 1}</strong>
        <button type="button" aria-label="Trang tiếp" disabled={page + 1 >= result.totalPages || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>›</button>
      </div>
    </section>
  </>;
}
