"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type OrderDetail, vnd } from "@/lib/live-orders";
import { QRCodeSVG } from "qrcode.react";

type Payment = {
  maGiaoDich: string; soTien: string; phuongThuc: string; trangThai: string; taoLuc: string;
  paymentUrl: string | null; daXacNhanDu: boolean; canDoiSoat: boolean;
  maTkThu: string | null; thoiGianThanhToan: string | null; soTienGiuHo: string;
};

export function FareCollection({ order, refresh }: { order: OrderDetail; refresh: () => Promise<void> }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkedAt, setCheckedAt] = useState(0);
  const key = useRef<string | null>(null);
  const lastConfirmed = useRef(false);
  const sender = order.benThanhToan === "NGUOI_DAT";
  const free = order.thanhToan.trangThai === "MIEN_CUOC";
  const needsReview = payment?.canDoiSoat || order.thanhToan.canDoiSoat;
  const paid = !needsReview && (order.thanhToan.trangThai === "DA_THANH_TOAN" || payment?.daXacNhanDu === true);
  const milestone = sender ? order.trangThai === "DA_LAY_HANG" : order.trangThai === "DANG_GIAO"
    && order.nhatKy.some(event => event.loaiSuKien === "DEN_DIEM_NHAN");
  const load = useCallback(async () => {
    const result = await api<{ items: Payment[] }>(`/orders/${encodeURIComponent(order.maDon)}/payments?size=1`);
    const latest = result.items[0] ?? null;
    setPayment(latest); setLoaded(true); setCheckedAt(Date.now());
    const confirmed = latest?.daXacNhanDu === true && !latest.canDoiSoat;
    if (confirmed && !lastConfirmed.current) void refresh();
    lastConfirmed.current = confirmed;
  }, [order.maDon, refresh]);
  useEffect(() => {
    let active = true;
    const poll = () => { void load().catch(cause => { if (active) { setLoaded(false); setError((cause as Error).message); } }); };
    poll(); const timer = setInterval(poll, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [load]);

  async function act(action: "open" | "cash" | "query") {
    if (busy) return;
    // Open the tab during the click event so mobile browsers do not block it after the API call.
    const checkout = action === "open" && order.phuongThucThanhToan === "VNPAY_QR"
      ? window.open("", "_blank") : null;
    if (checkout?.document.body) checkout.document.body.textContent = "Đang mở cổng thanh toán VNPay…";
    let launched = false;
    setBusy(true); setError(""); setNotice("");
    try {
      if (action === "open") {
        const storageKey = `fare-collection:${order.maDon}:${order.phuongThucThanhToan}`;
        key.current ??= sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
        sessionStorage.setItem(storageKey, key.current);
        const created = await api<Payment>(`/orders/${encodeURIComponent(order.maDon)}/payments`, {
          method: "POST", headers: { "Idempotency-Key": key.current },
          body: JSON.stringify({ phuongThuc: order.phuongThucThanhToan }),
        });
        setPayment(created);
        if (created.phuongThuc === "VNPAY_QR") {
          if (!created.paymentUrl) throw new Error("Máy chủ chưa trả URL thanh toán VNPay.");
          if (checkout && !checkout.closed) {
            checkout.opener = null;
            checkout.location.replace(created.paymentUrl);
          }
          else window.location.assign(created.paymentUrl);
          launched = true;
        }
      } else if (payment) {
        const updated = await api<Payment>(`/payments/${encodeURIComponent(payment.maGiaoDich)}/${action === "cash" ? "confirm-cash" : "reconcile"}`, {
          method: "POST", ...(action === "cash" ? { body: JSON.stringify({ soTienDaThu: payment.soTien }) } : {}),
        });
        setPayment(updated);
        if (action === "query" && !updated.daXacNhanDu) setNotice(
          updated.trangThai === "KHONG_THU_DA_XAC_MINH"
            ? "VNPay đã xác nhận chưa thu tiền. Bạn có thể tạo link mới."
            : "VNPay chưa xác nhận đã thu tiền. Nếu chưa thanh toán, bấm nút mở VNPay bên dưới."
        );
      }
      await load(); await refresh();
    } catch (cause) {
      if (!launched) checkout?.close();
      setError((cause as Error).message);
      await load().catch(() => setLoaded(false));
      await refresh();
    } finally { setBusy(false); }
  }

  const button = "rounded-xl bg-amber-500 px-4 py-3 font-bold text-stone-950 disabled:opacity-50";
  const urlExpired = payment?.taoLuc && checkedAt > 0
    ? checkedAt >= Date.parse(payment.taoLuc) + 15 * 60_000 : false;
  const canOpenUrl = payment?.phuongThuc === "VNPAY_QR" && payment.paymentUrl && !paid
    && ["CHO_XU_LY", "CHUA_RO_KET_QUA"].includes(payment.trangThai) && !urlExpired;
  const openCheckout = () => {
    if (busy) return;
    const reusable = payment?.paymentUrl && !urlExpired
      && ["CHO_XU_LY", "CHUA_RO_KET_QUA"].includes(payment.trangThai);
    if (reusable) {
      window.open(payment.paymentUrl!, "_blank", "noopener,noreferrer");
      return;
    }
    const storageKey = `fare-collection:${order.maDon}:${order.phuongThucThanhToan}`;
    sessionStorage.removeItem(storageKey);
    key.current = null;
    void act("open");
  };
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5" aria-label="Thu cước">
    <h2 className="text-lg font-bold">Thu cước · {sender ? "Người gửi trả" : "Người nhận trả"}</h2>
    <p>{sender ? "Sau khi nhận kiện, trước khi bắt đầu giao" : "Sau khi đến điểm giao, trước khi hoàn tất"}</p>
    <p className="text-xl font-extrabold">{vnd(order.cuoc.tongCuoc)} · {order.phuongThucThanhToan === "TIEN_MAT" ? "Tiền mặt" : "VNPay Sandbox"}</p>
    <p role="status">{free ? "Miễn cước — không cần thu tiền" : paid ? "BE đã xác nhận thu đủ; tài xế có thể đi tiếp" : needsReview
      ? "Chưa xác nhận thu đủ; đang chờ kiểm tra kết quả thanh toán" : payment?.trangThai === "KHONG_THU_DA_XAC_MINH"
        ? "VNPay xác nhận yêu cầu cũ chưa thu tiền; có thể tạo link mới" : payment?.trangThai === "CHO_THU_LAI_DEMO"
        ? "Yêu cầu demo cũ đã đóng; bấm để mở VNPay lần nữa" : payment
        ? order.phuongThucThanhToan === "TIEN_MAT" ? "Chờ tài xế xác nhận đã thu đúng tổng cước" : "Đang chờ người trả hoàn tất thanh toán"
        : "Chưa mở yêu cầu thu cước"}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-amber-800">{notice}</p>}
    {!free && !paid && !payment && <button className={button} disabled={!loaded || !milestone || busy} onClick={() => void act("open")}>{order.phuongThucThanhToan === "VNPAY_QR" ? "Mở VNPay để thanh toán" : "Mở yêu cầu thu tiền mặt"}</button>}
    {payment && !paid && milestone && payment.phuongThuc === "TIEN_MAT" && payment.trangThai === "CHO_XU_LY" &&
      <button className={button} disabled={busy || !loaded} onClick={() => void act("cash")}>Xác nhận đã nhận đúng {vnd(payment.soTien)} tiền mặt</button>}
    {loaded && payment?.paymentUrl && canOpenUrl && milestone && <div className="space-y-3">
      <QRCodeSVG value={payment.paymentUrl} size={256} marginSize={4} title="Quét để mở cổng VNPay Sandbox" className="h-auto max-w-full" />
      <p className="text-sm">Người trả có thể quét QR trên điện thoại khác. Nếu đã đóng trang VNPay khi chưa thanh toán, mở lại cùng yêu cầu bên dưới.</p>
      <a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer" className={button + " inline-block"}>Mở lại trang thanh toán VNPay</a>
    </div>}
    {payment?.phuongThuc === "VNPAY_QR" && urlExpired && !paid && <p role="status" className="text-sm text-amber-900">Link VNPay cũ đã hết hạn. Bấm nút bên dưới để mở link thanh toán mới.</p>}
    {payment?.phuongThuc === "VNPAY_QR" && !["KHONG_THU_DA_XAC_MINH", "CHO_THU_LAI_DEMO"].includes(payment.trangThai) && !free && (!paid || payment.canDoiSoat) && milestone && <>
      <p className="text-sm text-stone-600">VNPay Sandbox sẽ báo kết quả về máy chủ. Việc đóng tab hoặc quay lại từ VNPay chưa xác nhận đã thu tiền; màn hình này tự cập nhật trạng thái. Đây không phải QR tài khoản cá nhân tài xế.</p>
      <button className="text-sm font-semibold text-amber-800 underline" disabled={busy || !loaded} onClick={() => void act("query")}>Đã thanh toán? Kiểm tra kết quả với VNPay</button>
    </>}
    {payment?.phuongThuc === "VNPAY_QR" && !paid && milestone && <button className={button} disabled={busy || !loaded} onClick={openCheckout}>{urlExpired || ["THAT_BAI", "DA_HUY", "KHONG_THU_DA_XAC_MINH", "CHO_THU_LAI_DEMO"].includes(payment.trangThai) ? "Tạo link mới và mở VNPay" : "Mở VNPay để thanh toán"}</button>}
    {payment?.maTkThu && <p className="text-sm">Người thu: {payment.maTkThu} · {payment.thoiGianThanhToan && new Date(payment.thoiGianThanhToan).toLocaleString("vi-VN")} · Giữ hộ: {vnd(payment.soTienGiuHo)}</p>}
    <button className="block text-sm underline" disabled={busy} onClick={() => {
      if (payment?.phuongThuc === "VNPAY_QR" && !paid)
        openCheckout();
      else void load().then(refresh).catch(cause => setError((cause as Error).message));
    }}>Làm mới trạng thái thu cước</button>
  </section>;
}
