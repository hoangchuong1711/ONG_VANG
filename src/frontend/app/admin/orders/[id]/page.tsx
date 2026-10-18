"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Driver, type OrderDetail } from "@/lib/live-orders";
import { formatVND } from "@/lib/utils";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const detail = await api<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
    setOrder(detail);
    if (detail.trangThai === "CHO_GAN") {
      const result = await api<{ items: Driver[] }>(`/orders/${encodeURIComponent(id)}/driver-suggestions`);
      setDrivers(result.items);
    } else setDrivers([]);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh().catch(cause => setError((cause as Error).message)); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function assign() {
    if (!driverId || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/orders/${encodeURIComponent(id)}/assignments`, { method: "POST", body: JSON.stringify({ maTx: driverId }) });
      await refresh(); setNotice("Đã phân công tài xế trong cơ sở dữ liệu.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!reason.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ lyDo: reason.trim() }) });
      await refresh(); setNotice("Đã hủy đơn trong cơ sở dữ liệu.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <Link className="admin-back" href="/admin/orders">← Danh sách đơn hàng</Link>
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    {!order ? <p role="status" className="admin-feedback">Đang tải chi tiết đơn hàng...</p> : <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">Chi tiết đơn hàng</span>
        <h1>{order.maDon}</h1><p>Tạo {new Date(order.thoiGianTao).toLocaleString("vi-VN")}</p></div>
        <span className="admin-status">{order.trangThai}</span></div>
      <div className="admin-detail-grid">
        <section className="admin-panel"><div className="admin-section-head"><h2>Hành trình</h2></div>
          <div className="admin-detail-body"><div className="admin-detail-card"><small>Điểm lấy</small><p>{order.diemLayHang}</p></div>
            <div className="admin-detail-card"><small>Điểm giao</small><p>{order.diemGiaoHang}</p></div>
            <p>{order.quangDuongKm} km · {order.tenNguoiNhan} · {order.sdtNguoiNhan}</p>
            <p>Tài xế: {order.maTx ?? "Chưa phân công"}</p></div></section>
        <section className="admin-panel"><div className="admin-section-head"><h2>Cước phí</h2></div>
          <div className="admin-detail-body"><p>Cước quãng đường: {formatVND(Number(order.cuoc.cuocKm))}</p>
            <p>Cước khối lượng: {formatVND(Number(order.cuoc.cuocKhoiLuong))}</p>
            <p>Giảm giá: {formatVND(Number(order.cuoc.tienGiamGia))}</p>
            <div className="admin-money-total"><span>Tổng cước</span><strong>{formatVND(Number(order.cuoc.tongCuoc))}</strong></div></div></section>
        <section className="admin-panel"><div className="admin-section-head"><h2>Nhật ký</h2></div>
          <div className="admin-timeline">{order.nhatKy.map(event => <div className="admin-timeline-item" key={event.thuTu}>
            <strong>{event.loaiSuKien}</strong><p>{event.trangThaiSau}{event.ghiChu ? ` · ${event.ghiChu}` : ""}</p>
            <time>{new Date(event.thoiGian).toLocaleString("vi-VN")}</time></div>)}</div></section>
        <section className="admin-panel"><div className="admin-section-head"><h2>Thao tác</h2></div>
          <div className="admin-detail-body">
            {order.trangThai === "CHO_GAN" && <div className="admin-field"><label htmlFor="admin-assign-driver">Tài xế sẵn sàng</label>
              <select id="admin-assign-driver" value={driverId} onChange={event => setDriverId(event.target.value)}>
                <option value="">Chọn tài xế</option>
                {drivers.map(driver => <option key={driver.maTx} value={driver.maTx}>{driver.hoTen} · {driver.phuongTien?.bienSoXe}</option>)}
              </select><button type="button" className="admin-button primary" disabled={busy || !driverId} onClick={() => void assign()}>Phân công</button></div>}
            {["CHO_GAN", "DA_GAN"].includes(order.trangThai) && <div className="admin-field"><label htmlFor="admin-cancel-reason">Lý do hủy</label>
              <textarea id="admin-cancel-reason" value={reason} onChange={event => setReason(event.target.value)} />
              <button type="button" className="admin-button danger" disabled={busy || !reason.trim()} onClick={() => void cancel()}>Hủy đơn</button></div>}
          </div></section>
      </div>
    </>}
  </>;
}
