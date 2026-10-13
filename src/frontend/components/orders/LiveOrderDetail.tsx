"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Navbar } from "@/components/layout/Navbar";
import { api, type Driver, type OrderDetail, vnd } from "@/lib/live-orders";

export function LiveOrderDetail({ id, dispatcher = false }: { id: string; dispatcher?: boolean }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const refresh = useCallback(async () => {
    const current = await api<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
    setOrder(current);
    setError("");
    return current;
  }, [id]);
  useEffect(() => {
    api<OrderDetail>(`/orders/${encodeURIComponent(id)}`)
      .then(setOrder).catch(cause => setError((cause as Error).message));
  }, [id]);

  async function loadDrivers() {
    setError("");
    try {
      const result = await api<{ items: Driver[] }>(`/orders/${encodeURIComponent(id)}/driver-suggestions?size=100`);
      setDrivers(result.items);
      setSelectedDriver(result.items[0]?.maTx ?? "");
    } catch (cause) { setError((cause as Error).message); }
  }

  async function assign() {
    if (!selectedDriver || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/orders/${encodeURIComponent(id)}/assignments`, {
        method: "POST", body: JSON.stringify({ maTx: selectedDriver }),
      });
      setDrivers([]); setSelectedDriver("");
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!cancelReason.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/orders/${encodeURIComponent(id)}/cancel`, {
        method: "POST", body: JSON.stringify({ lyDo: cancelReason.trim() }),
      });
      setCancelReason("");
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-stone-50 text-stone-900">
    {dispatcher ? <DispatcherNavbar pendingCount={undefined} incidentCount={undefined} /> : <Navbar />}
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between gap-3"><Link href={dispatcher ? "/dispatcher" : "/orders"} className="text-sm font-bold text-amber-800">← Danh sách đơn</Link>
        <button type="button" onClick={() => void refresh().catch(cause => setError((cause as Error).message))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Làm mới</button></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {!order && !error && <p>Đang tải đơn...</p>}
      {order && <>
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap justify-between gap-2"><h1 className="font-mono text-xl font-bold">{order.maDon}</h1>
            <span className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-bold">{order.trangThai}</span></div>
          <p className="text-sm text-stone-600">Tạo lúc {new Date(order.thoiGianTao).toLocaleString("vi-VN")} · Tuyến {order.nguonLoTrinh === "FAKE" ? "DEMO · fixture" : "GOONG"}</p>
          <p><strong>Lấy:</strong> {order.diemLayHang}</p><p><strong>Giao:</strong> {order.diemGiaoHang}</p>
          <p><strong>Người nhận:</strong> {order.tenNguoiNhan ?? "—"} · {order.sdtNguoiNhan}</p>
          <p><strong>Kiện:</strong> {order.kienHang.map(item => `${item.loaiHangHoa} (${item.khoiLuongKg} kg)`).join(", ")}</p>
          <p><strong>Trả cước:</strong> {order.benThanhToan === "NGUOI_DAT" ? "Người đặt" : "Người nhận"} · {order.phuongThucThanhToan === "TIEN_MAT" ? "Tiền mặt" : "VNPay QR"}</p>
        </section>
        {dispatcher && order.trangThai === "CHO_GAN" && <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5">
          <h2 className="text-lg font-bold">Gán tài xế</h2>
          <button type="button" onClick={loadDrivers} disabled={busy} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold">Tìm tài xế khả dụng</button>
          {drivers.length > 0 && <div className="flex flex-wrap gap-2">
            <select value={selectedDriver} onChange={event => setSelectedDriver(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2">
              {drivers.map(driver => <option key={driver.maTx} value={driver.maTx}>{driver.hoTen} · {driver.phuongTien?.bienSoXe ?? driver.maTx}</option>)}
            </select>
            <button type="button" onClick={assign} disabled={busy || !selectedDriver} className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white disabled:opacity-50">Xác nhận gán</button>
          </div>}
          {drivers.length === 0 && selectedDriver === "" && <p className="text-sm text-stone-500">Chọn tìm để xem tài xế đang rảnh.</p>}
        </section>}
        {(order.trangThai === "CHO_GAN" || order.trangThai === "DA_GAN") && <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-bold">Hủy đơn</h2>
          <p className="text-sm text-stone-600">Backend chỉ cho hủy trong 5 phút đầu sau khi tạo.</p>
          <div className="flex flex-wrap gap-2"><input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Lý do hủy" maxLength={500}
            className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2" />
            <button type="button" onClick={cancel} disabled={busy || !cancelReason.trim()} className="rounded-xl border border-rose-300 px-4 py-2 font-bold text-rose-800 disabled:opacity-50">Hủy đơn</button></div>
        </section>}
        <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 text-lg font-bold">Cước đã chốt</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Cước km</dt><dd className="text-right">{vnd(order.cuoc.cuocKm)}</dd>
            <dt>Cước kg</dt><dd className="text-right">{vnd(order.cuoc.cuocKhoiLuong)}</dd>
            <dt>Phụ thu</dt><dd className="text-right">{vnd(order.cuoc.tienPhuThu)}</dd>
            <dt>Giảm giá</dt><dd className="text-right">−{vnd(order.cuoc.tienGiamGia)}</dd>
            <dt className="border-t pt-2 font-bold">Tổng</dt><dd className="border-t pt-2 text-right text-xl font-extrabold">{vnd(order.cuoc.tongCuoc)}</dd></dl>
          <p className="mt-3 text-xs text-stone-600">Biểu phí {order.cuoc.maBieuPhi} v{order.cuoc.phienBanBieuPhi} · {order.thanhToan.trangThai}</p>
        </section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 text-lg font-bold">Lịch sử trạng thái</h2>
          <ol className="space-y-3">{order.nhatKy.map(event => <li key={event.thuTu} className="border-l-2 border-amber-500 pl-3 text-sm">
            <strong>{event.trangThaiSau ?? event.loaiSuKien}</strong><span className="block text-stone-500">{new Date(event.thoiGian).toLocaleString("vi-VN")}</span></li>)}</ol></section>
      </>}
    </main>
  </div>;
}
