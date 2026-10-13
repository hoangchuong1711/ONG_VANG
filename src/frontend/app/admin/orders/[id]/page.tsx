"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { availableDrivers, canCancelOrder, statusLabel, statusTone } from "@/lib/admin-demo";
import { formatVND } from "@/lib/utils";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="admin-detail-pair"><span>{label}</span><strong>{children}</strong></div>;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { orders, drivers: allDrivers, events, ready, assignDriver, cancelOrder } = useAdmin();
  const order = orders.find((item) => item.id === params.id);
  const [modal, setModal] = useState<"assign" | "cancel" | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (!modal) return;
    const focusTarget = document.getElementById(modal === "assign" ? "driver-select" : "cancel-reason");
    focusTarget?.focus();
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [modal]);

  if (!ready) return <p role="status" className="admin-feedback">Đang nạp chi tiết đơn hàng...</p>;
  if (!order) return <div className="admin-panel admin-empty"><strong>Không tìm thấy đơn hàng</strong><p>Mã đơn không có trong dữ liệu demo.</p><Link className="admin-button" href="/admin/orders">Về danh sách</Link></div>;

  const drivers = availableDrivers(orders, order.id, allDrivers);
  const orderEvents = events.filter((event) => event.orderId === order.id);
  const openAssign = () => { setSelectedDriver(""); setModalError(""); setModal("assign"); };
  const openCancel = () => { setReason(""); setModalError(""); setModal("cancel"); };
  const submitAssign = () => {
    const result = assignDriver(order.id, selectedDriver);
    if (!result.ok) { setModalError(result.message); return; }
    setFeedback({ error: false, message: result.message }); setModal(null);
  };
  const submitCancel = () => {
    const result = cancelOrder(order.id, reason);
    if (!result.ok) { setModalError(result.message); return; }
    setFeedback({ error: false, message: result.message }); setModal(null);
  };

  return <>
    <Link className="admin-back" href="/admin/orders">← Danh sách đơn hàng</Link>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">Chi tiết đơn hàng</span><h1>{order.id}</h1><p>Tạo {order.createdAt} · {order.sender.district} đến {order.receiver.district}</p></div>
      <div className="admin-heading-actions"><span className={`admin-status ${statusTone(order)}`}>{statusLabel(order)}</span></div></div>
    {feedback && <p role="status" className={`admin-feedback ${feedback.error ? "error" : ""}`}>{feedback.message}</p>}
    <div className="admin-detail-grid">
      <div className="admin-detail-column">
        <section className="admin-panel"><div className="admin-section-head"><h2>Hành trình giao hàng</h2></div><div className="admin-detail-body">
          <div className="admin-detail-card"><small>Điểm lấy hàng · Người gửi</small><strong>{order.sender.name} · {order.sender.phone}</strong><p>{order.sender.street}, {order.sender.district}, {order.sender.city}</p></div>
          <div className="admin-detail-card"><small>Điểm giao hàng · Người nhận</small><strong>{order.receiver.name} · {order.receiver.phone}</strong><p>{order.receiver.street}, {order.receiver.district}, {order.receiver.city}</p>{order.receiver.notes && <p>Ghi chú: {order.receiver.notes}</p>}</div>
          <Field label="Quãng đường">{order.distanceKm} km</Field><Field label="Kiện hàng">{order.packageType}{order.packageWeightKg ? ` · ${order.packageWeightKg} kg` : ""}</Field>
        </div></section>
        <section className="admin-panel"><div className="admin-section-head"><h2>Cước phí & thanh toán</h2></div><div className="admin-detail-body">
          <Field label="Cước gốc">{formatVND(order.baseFee)}</Field><Field label="Phụ thu">{formatVND(order.surchargeFee)}</Field><Field label="Giảm thành viên">−{formatVND(order.vipDiscountFee)}</Field>
          <div className="admin-money-total"><span>Tổng cước</span><strong>{formatVND(order.totalFee)}</strong></div>
          <div style={{ marginTop: 14 }}><span className={`admin-status ${order.paid ? "success" : "danger"}`}>{order.paid ? "Đã thu" : "Chưa thu"}</span><span style={{ marginLeft: 9, fontSize: 12, color: "#756f66" }}>{order.paymentMethod === "VNPAY" ? "VNPay" : order.paymentMethod === "TIEN_MAT" ? "Tiền mặt" : "Chưa chọn phương thức"}</span></div>
        </div></section>
        <section className="admin-panel"><div className="admin-section-head"><h2>Nhật ký xử lý</h2></div><div className="admin-timeline">
          {orderEvents.map((event) => <div className="admin-timeline-item" key={event.id}><strong>{event.title}</strong><p>{event.detail}</p><time dateTime={event.at}>{new Date(event.at).toLocaleString("vi-VN")}</time></div>)}
          <div className="admin-timeline-item"><strong>Đơn được tạo</strong><p>Thông tin giao hàng được ghi nhận trong dữ liệu demo.</p><time>{order.createdAt}</time></div>
        </div></section>
      </div>
      <div className="admin-detail-column">
        <section className="admin-panel"><div className="admin-section-head"><h2>Tài xế phụ trách</h2></div><div className="admin-detail-body">
          {order.driver ? <><Field label="Họ tên">{order.driver.name}</Field><Field label="Điện thoại">{order.driver.phone}</Field><Field label="Biển số">{order.driver.vehiclePlate}</Field><Field label="Phương tiện">{order.driver.vehicleType}</Field></> : <div className="admin-inline-note">Đơn chưa có tài xế phụ trách.</div>}
        </div></section>
        {order.incident && order.status !== "DA_HUY" && <section className="admin-panel"><div className="admin-section-head"><h2>Sự cố cần theo dõi</h2></div><div className="admin-detail-body"><strong style={{ fontSize: 12 }}>{order.incident.type}</strong><p style={{ fontSize: 12, color: "#706c65", lineHeight: 1.55 }}>{order.incident.note}</p></div></section>}
        <section className="admin-panel"><div className="admin-section-head"><h2>Thao tác</h2></div><div className="admin-detail-body"><div className="admin-action-stack">
          {["CHO_GAN", "DA_GAN"].includes(order.status) && <button type="button" className="admin-button primary" onClick={openAssign}>{order.driver ? "Đổi tài xế" : "Phân công tài xế"}</button>}
          {canCancelOrder(order) && <button type="button" className="admin-button danger" onClick={openCancel}>Hủy đơn hàng</button>}
          {!canCancelOrder(order) && !["CHO_GAN", "DA_GAN"].includes(order.status) && <p className="admin-inline-note">Không có thao tác phù hợp với trạng thái hiện tại.</p>}
        </div><p style={{ margin: "15px 0 0", fontSize: 11, color: "#777168", lineHeight: 1.5 }}>Các thao tác trên trang này chỉ thay đổi dữ liệu demo trong trình duyệt.</p></div></section>
      </div>
    </div>
    {modal && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
      <h2 id="admin-dialog-title">{modal === "assign" ? (order.driver ? "Đổi tài xế" : "Phân công tài xế") : "Xác nhận hủy đơn"}</h2>
      <p>{modal === "assign" ? `Chọn tài xế sẵn sàng để phụ trách đơn ${order.id}.` : `Nhập lý do hủy đơn ${order.id}. Thao tác sẽ được ghi vào nhật ký demo.`}</p>
      {modal === "assign" ? <div className="admin-field"><label htmlFor="driver-select">Tài xế sẵn sàng</label><select id="driver-select" value={selectedDriver} onChange={(event) => setSelectedDriver(event.target.value)}><option value="">Chọn tài xế</option>{drivers.filter((driver) => driver.id !== order.driver?.id).map((driver) => <option value={driver.id} key={driver.id}>{driver.name} · {driver.vehiclePlate} · {driver.currentDistrict}</option>)}</select>{drivers.filter((driver) => driver.id !== order.driver?.id).length === 0 && <small>Hiện không có tài xế sẵn sàng.</small>}</div> : <div className="admin-field"><label htmlFor="cancel-reason">Lý do hủy</label><textarea id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Khách yêu cầu hủy đơn trước khi lấy hàng" /></div>}
      {modalError && <span role="alert" className="admin-modal-error">{modalError}</span>}
      <div className="admin-modal-actions"><button type="button" className="admin-button" onClick={() => setModal(null)}>Đóng</button><button type="button" className={`admin-button ${modal === "cancel" ? "danger" : "primary"}`} disabled={modal === "assign" && !selectedDriver} onClick={modal === "assign" ? submitAssign : submitCancel}>{modal === "assign" ? "Xác nhận phân công" : "Xác nhận hủy"}</button></div>
    </div></div>}
  </>;
}
