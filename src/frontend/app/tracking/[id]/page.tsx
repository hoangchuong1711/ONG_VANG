"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateDemoState, useDemoStore } from "@/lib/demo-store";
import { formatVND, getCancelRemainingSeconds, formatSecondsToTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function OrderTrackingPage() {
  const { showToast } = useToast();
  const params = useParams();
  const orderId = params?.id as string;
  const { state: demo, ready } = useDemoStore();
  const order = demo.orders.find((item) => item.id === orderId);

  const [remainingSeconds, setRemainingSeconds] = useState(210);

  // Modal Hủy đơn (K9 / K10)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Đặt nhầm địa chỉ nhận hàng");
  const isCancelled = order?.status === "DA_HUY";

  const handleCopyId = () => {
    if (!order) return;
    navigator.clipboard?.writeText(order.id);
    showToast(`Đã sao chép mã đơn ${order.id} vào bộ nhớ tạm!`, "success");
  };

  const handleShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast("Đã sao chép liên kết theo dõi hành trình!", "info");
  };

  // Đếm ngược 300 giây (tính toán qua interval callback)
  useEffect(() => {
    if (!order || order.status === "DA_HUY" || order.status === "HOAN_TAT") return;

    const interval = setInterval(() => {
      setRemainingSeconds(getCancelRemainingSeconds(order.createdTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  const handleCancelOrder = () => {
    if (!order) return;
    updateDemoState((previous) => ({ ...previous, orders: previous.orders.map((item) =>
      item.id === order.id ? { ...item, status: "DA_HUY", statusText: "Đã hủy đơn hàng", driver: undefined } : item) }));
  };

  const canCancel = Boolean(order && remainingSeconds > 0 && (order.status === "CHO_GAN" || order.status === "DA_GAN"));

  if (!ready) return <div className="min-h-dvh bg-[#FAFAF9]"><Navbar /><main className="mx-auto max-w-4xl px-4 py-8">Đang tải đơn hàng...</main></div>;
  if (!order) return <div className="min-h-dvh bg-[#FAFAF9]"><Navbar /><main className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-xl font-bold">Không tìm thấy đơn hàng</h1><Link href="/orders" className="mt-4 inline-block text-amber-800 underline">Về danh sách đơn</Link></main></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[1024px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Top Breadcrumb & Status bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <Link href="/" className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1">
              ← Quay lại Trang chủ
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-mono">
                {order.id}
              </h1>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
                title="Sao chép mã đơn"
                aria-label={`Sao chép mã đơn ${order.id}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
                title="Chia sẻ liên kết theo dõi"
                aria-label="Chia sẻ liên kết theo dõi"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <Badge status={order.status} isUnpaid={!order.paid && order.status === "HOAN_TAT"} />
            </div>
          </div>

          {/* Cancel Countdown Timer Widget */}
          {canCancel && !isCancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center justify-between sm:justify-start gap-3">
              <div className="text-xs">
                <span className="text-amber-800 font-medium block">Thời gian hủy đơn miễn phí:</span>
                <span className="font-mono text-base font-extrabold text-amber-900">
                  {formatSecondsToTime(remainingSeconds)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setIsCancelModalOpen(true)}
              >
                Hủy đơn
              </Button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* K10: THÔNG BÁO ĐÃ HỦY ĐƠN HÀNG THÀNH CÔNG                                 */}
        {/* ========================================================================= */}
        {isCancelled && (
          <div className="bg-stone-100 border border-stone-300 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-600 mx-auto flex items-center justify-center font-bold">
              ✕
            </div>
            <h2 className="text-lg font-bold text-stone-800">
              Đơn hàng này đã được hủy thành công
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Lý do: <em>&quot;{cancelReason}&quot;</em>. Tài xế (nếu có) đã được giải phóng về trạng thái sẵn sàng phục vụ.
            </p>
            <Link href="/create-order">
              <Button variant="primary" size="sm">
                Tạo đơn hàng mới
              </Button>
            </Link>
          </div>
        )}

        {/* TIMELINE HÀNH TRÌNH TIẾN TRÌNH 5 BƯỚC */}
        <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xs">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 pb-3 border-b border-stone-100">
            Tiến độ xử lý kiện hàng
          </h2>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
            {/* Step 1: Chờ gán */}
            <div className="relative">
              <span className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center text-white text-[10px] font-bold">
                ✓
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-stone-900">1. Đã tiếp nhận đơn hàng</div>
                <p className="text-xs text-stone-500">Khách hàng xác nhận tạo đơn và chốt cước phí.</p>
                <span className="text-[10px] font-medium text-stone-400">{order.createdAt}</span>
              </div>
            </div>

            {/* Step 2: Đã gán tài xế */}
            <div className="relative">
              <span
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-white text-[10px] font-bold ${
                  order.status === "CHO_GAN"
                    ? "bg-amber-400 ring-amber-100 animate-pulse"
                    : "bg-emerald-500 ring-emerald-100"
                }`}
              >
                {order.status === "CHO_GAN" ? "•" : "✓"}
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-stone-900">2. Điều phối & Gán tài xế</div>
                <p className="text-xs text-stone-500">
                  {order.status === "CHO_GAN"
                    ? "Đang tìm kiếm tài xế gần nhất..."
                    : `Tài xế ${order.driver?.name || "Nguyễn Văn A"} đã nhận đơn.`}
                </p>
              </div>
            </div>

            {/* Step 3: Đã lấy hàng */}
            <div className="relative">
              <span
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-white text-[10px] font-bold ${
                  order.status === "DA_LAY_HANG" || order.status === "DANG_GIAO" || order.status === "HOAN_TAT"
                    ? "bg-emerald-500 ring-emerald-100"
                    : "bg-stone-300 ring-stone-100"
                }`}
              >
                {order.status === "DA_LAY_HANG" || order.status === "DANG_GIAO" || order.status === "HOAN_TAT" ? "✓" : "3"}
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-stone-900">3. Đã lấy hàng tại điểm gửi</div>
                <p className="text-xs text-stone-500">Tài xế đã kiểm tra bưu kiện và xuất phát.</p>
              </div>
            </div>

            {/* Step 4: Đang giao hàng */}
            <div className="relative">
              <span
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-white text-[10px] font-bold ${
                  order.status === "DANG_GIAO"
                    ? "bg-sky-500 ring-sky-100 animate-pulse"
                    : order.status === "HOAN_TAT"
                    ? "bg-emerald-500 ring-emerald-100"
                    : "bg-stone-300 ring-stone-100"
                }`}
              >
                {order.status === "HOAN_TAT" ? "✓" : "4"}
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-stone-900">4. Đang vận chuyển trên đường</div>
                <p className="text-xs text-stone-500">Dự kiến giao trong 20-30 phút.</p>
              </div>
            </div>

            {/* Step 5: Hoàn tất */}
            <div className="relative">
              <span
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-white text-[10px] font-bold ${
                  order.status === "HOAN_TAT"
                    ? "bg-emerald-500 ring-emerald-100"
                    : "bg-stone-300 ring-stone-100"
                }`}
              >
                {order.status === "HOAN_TAT" ? "✓" : "5"}
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-stone-900">5. Giao hàng thành công</div>
                <p className="text-xs text-stone-500">Đơn hàng đã được bàn giao tận tay người nhận.</p>
              </div>
            </div>
          </div>
        </section>

        {/* THÔNG TIN TÀI XẾ & CHI TIẾT ĐƠN HÀNG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Driver Card (Nếu đã có tài xế) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Thông tin tài xế phụ trách
            </h3>
            {order.driver ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-extrabold text-base">
                    TX
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm sm:text-base">
                      {order.driver.name}
                    </h4>
                    <span className="text-xs text-stone-500">
                      Mã: {order.driver.id} · {order.driver.vehicleType}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs flex justify-between items-center">
                  <span>Biển số xe:</span>
                  <strong className="font-mono text-stone-800 text-sm">{order.driver.vehiclePlate}</strong>
                </div>
                <a
                  href={`tel:${order.driver.phone}`}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Gọi cho tài xế ({order.driver.phone})</span>
                </a>
              </div>
            ) : (
              <div className="text-xs text-stone-500 py-4 text-center">
                Đang chờ điều phối viên chỉ định tài xế gần nhất.
              </div>
            )}
          </div>

          {/* Route & Fee Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-2xs text-xs">
            <h3 className="font-bold uppercase tracking-wider text-stone-400">
              Chi tiết lộ trình & Cước phí
            </h3>
            <div className="space-y-2 py-1">
              <div>
                <span className="text-stone-400 block text-[10px]">ĐIỂM LẤY HÀNG:</span>
                <strong>{order.sender.street}, {order.sender.district}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">ĐIỂM GIAO HÀNG:</span>
                <strong>{order.receiver.street}, {order.receiver.district}</strong> ({order.receiver.name} - {order.receiver.phone})
              </div>
            </div>
            <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
              <span>Hàng hóa: <strong>{order.packageType}</strong></span>
              <span className="text-sm font-extrabold text-stone-900">
                Tổng: <span className="text-amber-600">{formatVND(order.totalFee)}</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL K9: XÁC NHẬN HỦY ĐƠN HÀNG                                          */}
      {/* ========================================================================= */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-scaleUp">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-stone-900">
                Xác nhận hủy đơn hàng {order.id}
              </h3>
              <p className="text-xs text-stone-500">
                Thời gian hủy miễn phí còn lại: <strong>{formatSecondsToTime(remainingSeconds)}</strong>. Vui lòng chọn lý do:
              </p>
            </div>

            <div className="space-y-2 text-xs">
              {[
                "Đặt nhầm địa chỉ nhận hàng",
                "Đổi ý không muốn gửi nữa",
                "Thời gian chờ tài xế quá lâu",
                "Nhập sai thông tin kiện hàng",
                "Lý do khác",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    cancelReason === reason ? "border-amber-500 bg-amber-50/50 font-bold" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    className="accent-amber-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
                Giữ lại đơn
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  handleCancelOrder();
                }}
              >
                Xác nhận hủy đơn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
