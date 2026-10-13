"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { statusLabel, statusTone } from "@/lib/admin-demo";
import { formatVND } from "@/lib/utils";

type Period = "ALL" | "7D" | "30D";

export default function AdminOverviewPage() {
  const { orders, events, incidents, ready } = useAdmin();
  const [period, setPeriod] = useState<Period>("ALL");
  const [asOf] = useState(() => Date.now());
  const shown = orders.filter((order) => period === "ALL" || order.createdTimestamp >= asOf - (period === "7D" ? 7 : 30) * 86400000);
  const count = (status: string) => shown.filter((order) => order.status === status).length;
  const completed = shown.filter((order) => ["HOAN_TAT", "CHUA_THANH_TOAN"].includes(order.status));
  const collected = completed.filter((order) => order.paid).reduce((sum, order) => sum + order.totalFee, 0);
  const receivable = completed.filter((order) => !order.paid).reduce((sum, order) => sum + order.totalFee, 0);
  const inProgress = shown.filter((order) => ["DA_GAN", "DA_LAY_HANG", "DANG_GIAO"].includes(order.status)).length;
  const chart = [
    { label: "Chờ gán", value: count("CHO_GAN") },
    { label: "Đang xử lý", value: inProgress },
    { label: "Hoàn tất", value: completed.length },
    { label: "Đã hủy", value: count("DA_HUY") },
  ];
  const attention = shown.filter((order) => order.status === "CHO_GAN" || incidents.some((incident) => incident.orderId === order.id && incident.status !== "DA_GIAI_QUYET") || order.status === "CHUA_THANH_TOAN");
  const recent = [...shown].sort((a, b) => b.createdTimestamp - a.createdTimestamp).slice(0, 5);

  return <>
    <div className="admin-page-heading">
      <div><span className="admin-eyebrow">Bức tranh vận hành</span><h1>Tổng quan đội xe</h1>
        <p>Theo dõi đơn hàng và các việc cần xử lý trong cùng một nơi.</p></div>
      <div className="admin-heading-actions">
        <label className="admin-field"><span className="sr-only">Kỳ xem</span><select aria-label="Kỳ xem" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
          <option value="ALL">Toàn bộ dữ liệu</option><option value="7D">7 ngày gần đây</option><option value="30D">30 ngày gần đây</option>
        </select></label>
        <Link className="admin-button primary" href="/admin/orders">Xem đơn hàng <span aria-hidden="true">→</span></Link>
      </div>
    </div>
    {!ready && <p role="status" className="admin-feedback">Đang nạp dữ liệu demo...</p>}
    <div className="admin-stat-grid" aria-label="Chỉ số tổng quan">
      <div className="admin-panel admin-stat"><div className="admin-stat-label">Tổng đơn hàng</div><div className="admin-stat-value">{shown.length}</div><div className="admin-stat-note">Theo kỳ đang chọn</div></div>
      <div className="admin-panel admin-stat accent"><div className="admin-stat-label">Đơn chờ phân công</div><div className="admin-stat-value">{count("CHO_GAN")}</div><div className="admin-stat-note">Cần sắp tài xế</div></div>
      <div className="admin-panel admin-stat"><div className="admin-stat-label">Đơn đang xử lý</div><div className="admin-stat-value">{inProgress}</div><div className="admin-stat-note">Đã gán hoặc đang giao</div></div>
      <div className="admin-panel admin-stat alert"><div className="admin-stat-label">Cước chưa thu</div><div className="admin-stat-value">{formatVND(receivable)}</div><div className="admin-stat-note">Đơn hoàn tất trong tập dữ liệu</div></div>
    </div>
    <div className="admin-main-grid">
      <section className="admin-panel" aria-labelledby="chart-title"><div className="admin-section-head"><div><h2 id="chart-title">Tình trạng đơn hàng</h2><p>Phân bố trong kỳ đang xem</p></div></div>
        <div className="admin-chart">{chart.map((item) => <div className="admin-chart-row" key={item.label}>
          <span>{item.label}</span><div className="admin-chart-track" role="img" aria-label={`${item.label}: ${item.value} đơn`}><div className="admin-chart-fill" style={{ width: `${shown.length ? item.value / shown.length * 100 : 0}%` }} /></div><strong>{item.value}</strong>
        </div>)}<div className="admin-chart-foot">Cước đã thu của đơn hoàn tất: <strong>{formatVND(collected)}</strong>. Số liệu được tính từ đơn hàng demo đang hiển thị.</div></div>
      </section>
      <section className="admin-panel" aria-labelledby="attention-title"><div className="admin-section-head"><div><h2 id="attention-title">Cần chú ý</h2><p>Đơn chờ gán, sự cố và cước chưa thu</p></div></div>
        <div className="admin-attention-list">{attention.length ? attention.slice(0, 5).map((order) => <Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="admin-attention-item" key={order.id}>
          <span><strong>{order.id}</strong><small>{incidents.some((incident) => incident.orderId === order.id && incident.status !== "DA_GIAI_QUYET") && order.status !== "DA_HUY" ? "Có sự cố giao hàng" : statusLabel(order)} · {order.receiver.name}</small></span><span className="admin-attention-arrow" aria-hidden="true">→</span>
        </Link>) : <div className="admin-empty"><strong>Không có việc cần chú ý</strong><p>Các đơn trong kỳ đang xem đều ổn.</p></div>}</div>
      </section>
    </div>
    <section className="admin-panel" aria-labelledby="recent-title"><div className="admin-section-head"><div><h2 id="recent-title">Đơn hàng gần đây</h2><p>Truy cập nhanh vào từng đơn để xem và xử lý</p></div><Link href="/admin/orders">Xem tất cả →</Link></div>
      {recent.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Người nhận</th><th>Tài xế</th><th>Trạng thái</th><th className="money">Cước</th><th className="action">Chi tiết</th></tr></thead><tbody>
        {recent.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.createdAt}</small></td><td>{order.receiver.name}</td><td>{order.driver?.name ?? "Chưa gán"}</td><td><span className={`admin-status ${statusTone(order)}`}>{statusLabel(order)}</span></td><td className="money">{formatVND(order.totalFee)}</td><td className="action"><Link className="admin-link" href={`/admin/orders/${encodeURIComponent(order.id)}`}>Xem →</Link></td></tr>)}
      </tbody></table></div> : <div className="admin-empty"><strong>Chưa có đơn hàng trong kỳ</strong><p>Chọn khoảng thời gian khác để xem dữ liệu.</p></div>}
    </section>
    {events.length > 0 && <section className="admin-panel" style={{ marginTop: 20 }}><div className="admin-section-head"><h2>Thao tác gần đây</h2></div><div className="admin-attention-list">{events.slice(0, 3).map((event) => <Link className="admin-attention-item" href={`/admin/orders/${encodeURIComponent(event.orderId)}`} key={event.id}><span><strong>{event.title} · {event.orderId}</strong><small>{event.detail}</small></span><span className="admin-attention-arrow">→</span></Link>)}</div></section>}
  </>;
}
