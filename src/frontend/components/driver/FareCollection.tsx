"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type OrderDetail, vnd } from "@/lib/live-orders";
import { QRCodeSVG } from "qrcode.react";

type Payment = {
  maGiaoDich: string; soTien: string; phuongThuc: string; trangThai: string;
  paymentUrl: string | null; daXacNhanDu: boolean; canDoiSoat: boolean;
  maTkThu: string | null; thoiGianThanhToan: string | null; soTienGiuHo: string;
};

export function FareCollection({ order, refresh }: { order: OrderDetail; refresh: () => Promise<void> }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const sender = order.benThanhToan === "NGUOI_DAT";
  const free = order.thanhToan.trangThai === "MIEN_CUOC";
  const paid = order.thanhToan.trangThai === "DA_THANH_TOAN" || payment?.daXacNhanDu === true;
  const milestone = sender ? order.trangThai === "DA_LAY_HANG" : order.trangThai === "DANG_GIAO"
    && order.nhatKy.some(event => event.loaiSuKien === "DEN_DIEM_NHAN");
  const load = useCallback(async () => {
    const result = await api<{ items: Payment[] }>(`/orders/${encodeURIComponent(order.maDon)}/payments?size=1`);
    setPayment(result.items[0] ?? null); setLoaded(true);
  }, [order.maDon]);
  useEffect(() => {
    let active = true;
    const poll = () => { void load().catch(cause => { if (active) { setLoaded(false); setError((cause as Error).message); } }); };
    poll(); const timer = setInterval(poll, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [load]);

  async function act(action: "open" | "cash" | "query") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (action === "open") {
        const storageKey = `fare-collection:${order.maDon}:${order.phuongThucThanhToan}`;
        key.current ??= sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
        sessionStorage.setItem(storageKey, key.current);
        setPayment(await api<Payment>(`/orders/${encodeURIComponent(order.maDon)}/payments`, {
          method: "POST", headers: { "Idempotency-Key": key.current },
          body: JSON.stringify({ phuongThuc: order.phuongThucThanhToan }),
        }));
      } else if (payment) {
        setPayment(await api<Payment>(`/payments/${encodeURIComponent(payment.maGiaoDich)}/${action === "cash" ? "confirm-cash" : "reconcile"}`, {
          method: "POST", ...(action === "cash" ? { body: JSON.stringify({ soTienDaThu: payment.soTien }) } : {}),
        }));
      }
      await load(); await refresh();
    } catch (cause) {
      setError((cause as Error).message);
      await load().catch(() => setLoaded(false));
      await refresh();
    } finally { setBusy(false); }
  }

  const button = "rounded-xl bg-amber-500 px-4 py-3 font-bold text-stone-950 disabled:opacity-50";
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5" aria-label="Thu cước">
    <h2 className="text-lg font-bold">Thu cước · {sender ? "Người gửi trả" : "Người nhận trả"}</h2>
    <p>{sender ? "Sau khi nhận kiện, trước khi bắt đầu giao" : "Sau khi đến điểm giao, trước khi hoàn tất"}</p>
    <p className="text-xl font-extrabold">{vnd(order.cuoc.tongCuoc)} · {order.phuongThucThanhToan === "TIEN_MAT" ? "Tiền mặt" : "VNPay Sandbox"}</p>
    <p role="status">{free ? "Miễn cước — không cần thu tiền" : payment?.canDoiSoat || order.thanhToan.canDoiSoat
      ? "Cần đối soát — chưa được đi tiếp" : paid ? "BE đã xác nhận thu đủ" : payment ? `Trạng thái BE: ${payment.trangThai}` : "Chưa mở yêu cầu thu cước"}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!free && !paid && !payment && <button className={button} disabled={!loaded || !milestone || busy} onClick={() => void act("open")}>Mở yêu cầu thu cước</button>}
    {payment && !paid && milestone && payment.phuongThuc === "TIEN_MAT" && payment.trangThai === "CHO_XU_LY" &&
      <button className={button} disabled={busy || !loaded} onClick={() => void act("cash")}>Xác nhận đã nhận đúng {vnd(payment.soTien)} tiền mặt</button>}
    {loaded && payment?.paymentUrl && !paid && !payment.canDoiSoat && milestone && <div className="space-y-3">
      <QRCodeSVG value={payment.paymentUrl} size={256} marginSize={4} title="Quét để mở cổng VNPay Sandbox" className="h-auto max-w-full" />
      <p className="text-sm">Người trả quét QR để mở URL thanh toán Sandbox trên điện thoại.</p>
      <a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer" className="block font-bold text-amber-800 underline">Mở cổng VNPay Sandbox cho người trả tiền</a>
    </div>}
    {payment?.phuongThuc === "VNPAY_QR" && !free && (!paid || payment.canDoiSoat) && milestone && <>
      <p className="text-sm text-stone-600">Mô phỏng thanh toán qua cổng VNPay, không phải QR tài khoản cá nhân của tài xế. Người trả không cần tài khoản ứng dụng. Quay về từ cổng chưa có nghĩa đã thu đủ.</p>
      <button className={button} disabled={busy || !loaded} onClick={() => void act("query")}>Kiểm tra / đối soát với VNPay</button>
    </>}
    {payment?.maTkThu && <p className="text-sm">Người thu: {payment.maTkThu} · {payment.thoiGianThanhToan && new Date(payment.thoiGianThanhToan).toLocaleString("vi-VN")} · Giữ hộ: {vnd(payment.soTienGiuHo)}</p>}
    <button className="block text-sm underline" disabled={busy} onClick={() => { void load().then(refresh).catch(cause => setError((cause as Error).message)); }}>Làm mới trạng thái thu cước</button>
  </section>;
}
