"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { statusLabel, statusTone } from "@/lib/admin-demo";
import { formatVND } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function AdminOrdersPage() {
  const { orders, ready } = useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    return orders.filter((order) => {
      const haystack = [order.id, order.sender.name, order.sender.phone, order.receiver.name, order.receiver.phone, order.driver?.name].join(" ").toLocaleLowerCase("vi-VN");
      const matchesStatus = status === "ALL" || (status === "ACTIVE" ? ["DA_GAN", "DA_LAY_HANG", "DANG_GIAO"].includes(order.status) : order.status === status);
      const matchesPayment = payment === "ALL" || (payment === "PAID" ? order.paid : !order.paid);
      return haystack.includes(normalized) && matchesStatus && matchesPayment;
    }).sort((a, b) => sort === "OLDEST" ? a.createdTimestamp - b.createdTimestamp : sort === "FEE_DESC" ? b.totalFee - a.totalFee : b.createdTimestamp - a.createdTimestamp);
  }, [orders, query, status, payment, sort]);
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const clear = () => { setQuery(""); setStatus("ALL"); setPayment("ALL"); setSort("NEWEST"); setPage(1); };

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">Quản lý vận hành</span><h1>Đơn hàng</h1><p>Tìm, theo dõi và xử lý các đơn trong đội xe.</p></div>
      <div className="admin-heading-actions"><span className="admin-demo-pill">{orders.length} đơn trong dữ liệu demo</span></div></div>
    {!ready && <p role="status" className="admin-feedback">Đang nạp dữ liệu demo...</p>}
    <section className="admin-panel admin-filter-panel" aria-label="Bộ lọc đơn hàng"><div className="admin-filter-grid">
      <div className="admin-field"><label htmlFor="admin-search">Tìm đơn hàng</label><input id="admin-search" value={query} onChange={(event) => setFilter(setQuery, event.target.value)} placeholder="Mã đơn, tên hoặc số điện thoại" /></div>
      <div className="admin-field"><label htmlFor="admin-status">Trạng thái</label><select id="admin-status" value={status} onChange={(event) => setFilter(setStatus, event.target.value)}><option value="ALL">Tất cả</option><option value="CHO_GAN">Chờ gán</option><option value="ACTIVE">Đang xử lý</option><option value="HOAN_TAT">Hoàn tất</option><option value="CHUA_THANH_TOAN">Chờ thanh toán</option><option value="DA_HUY">Đã hủy</option></select></div>
      <div className="admin-field"><label htmlFor="admin-payment">Thanh toán</label><select id="admin-payment" value={payment} onChange={(event) => setFilter(setPayment, event.target.value)}><option value="ALL">Tất cả</option><option value="PAID">Đã thu</option><option value="UNPAID">Chưa thu</option></select></div>
      <div className="admin-field"><label htmlFor="admin-sort">Sắp xếp</label><select id="admin-sort" value={sort} onChange={(event) => setFilter(setSort, event.target.value)}><option value="NEWEST">Mới nhất</option><option value="OLDEST">Cũ nhất</option><option value="FEE_DESC">Cước cao nhất</option></select></div>
      <button type="button" className="admin-filter-reset" onClick={clear}>Xóa lọc</button>
    </div></section>
    <section className="admin-panel" aria-label="Danh sách đơn hàng"><div className="admin-result-bar"><span><strong>{filtered.length}</strong> đơn phù hợp</span><span>Trang {currentPage}/{maxPage}</span></div>
      {visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Người gửi / nhận</th><th>Tuyến</th><th>Tài xế</th><th>Trạng thái</th><th>Thanh toán</th><th className="money">Cước</th><th className="action">Thao tác</th></tr></thead><tbody>
        {visible.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.createdAt}</small></td><td><strong>{order.sender.name}</strong><small>Đến {order.receiver.name}</small></td><td><strong>{order.sender.district} → {order.receiver.district}</strong><small>{order.distanceKm} km · {order.packageType}</small></td><td>{order.driver?.name ?? "Chưa phân công"}</td><td><span className={`admin-status ${statusTone(order)}`}>{statusLabel(order)}</span></td><td><span className={`admin-status ${order.paid ? "success" : "danger"}`}>{order.paid ? "Đã thu" : "Chưa thu"}</span></td><td className="money">{formatVND(order.totalFee)}</td><td className="action"><Link className="admin-link" href={`/admin/orders/${encodeURIComponent(order.id)}`}>Chi tiết →</Link></td></tr>)}
      </tbody></table></div> : <div className="admin-empty"><strong>Không tìm thấy đơn hàng</strong><p>Thử từ khóa hoặc bộ lọc khác.</p><button className="admin-button" type="button" onClick={clear}>Xóa bộ lọc</button></div>}
      <div className="admin-pagination"><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length}` : "0 đơn"}</span><button type="button" aria-label="Trang trước" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</button><strong>{currentPage}</strong><button type="button" aria-label="Trang tiếp" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>›</button></div>
    </section>
  </>;
}
