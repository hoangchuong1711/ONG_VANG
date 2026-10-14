"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { OrderItem, OrderStatus } from "@/lib/types";
import { api, type Driver, type OrderDetail } from "@/lib/live-orders";
import { driverForView, orderForView, type DispatchDriver } from "@/lib/dispatch-view";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const INCIDENT_TYPES = [
  "Người nhận không nghe máy (đã gọi 3 cuộc)",
  "Khách hẹn đổi giờ giao sang thời điểm khác",
  "Sai địa chỉ giao hàng / Không tìm thấy số nhà",
  "Người nhận từ chối nhận hàng do đổi ý",
  "Bưu kiện bị rách hoặc có dấu hiệu móp méo",
];

export default function DriverOrderExecutionPage() {
  const { showToast } = useToast();
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [currentDriver, setCurrentDriver] = useState<DispatchDriver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentLogs, setIncidentLogs] = useState<string[]>([]);
  const isOnline = currentDriver?.status === "ONLINE_IDLE" || currentDriver?.status === "ONLINE_BUSY";

  const refresh = useCallback(async () => {
    try {
      const [detail, self] = await Promise.all([
        api<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`), api<Driver>("/drivers/me"),
      ]);
      const driver = driverForView(self);
      setCurrentDriver(driver);
      setOrder(orderForView(detail, [driver]));
      setIncidentLogs((detail.nhatKy ?? []).filter(event => event.loaiSuKien === "SU_CO")
        .map(event => event.ghiChu ?? "Sự cố đã ghi nhận"));
      setError("");
    } catch (cause) { setOrder(null); setError((cause as Error).message); }
    finally { setReady(true); }
  }, [orderId]);
  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(initial);
  }, [refresh]);

  const handleNextStep = async () => {
    if (!order) return;
    const next = order.status === "DA_GAN" ? "DA_LAY_HANG" :
      order.status === "DA_LAY_HANG" ? "DANG_GIAO" :
      order.status === "DANG_GIAO" ? "HOAN_TAT" : null;
    if (!next) return;
    try {
      await api(`/orders/${encodeURIComponent(order.id)}/transitions`, {
        method: "POST", body: JSON.stringify({ trangThai: next }),
      });
      await refresh(); showToast("Đã cập nhật tiến trình đơn hàng.", "success");
    } catch (cause) { showToast((cause as Error).message, "error"); }
  };

  const handleSubmitIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) return;
    try {
      await api(`/orders/${encodeURIComponent(order.id)}/incidents`, {
        method: "POST", body: JSON.stringify({
          loaiSuCo: incidentType.includes("từ chối") ? "TU_CHOI_NHAN" : "KHONG_LIEN_LAC_DUOC",
          lyDo: `${incidentType}: ${incidentNote.trim() || "Đã báo tổng đài"}`,
        }),
      });
      setIsIncidentModalOpen(false); setIncidentNote(""); await refresh();
      showToast("Đã gửi báo cáo sự cố.", "success");
    } catch (cause) { showToast((cause as Error).message, "error"); }
  };

  if (!ready) return <div className="min-h-dvh bg-[#FAFAF9]"><DriverNavbar isOnline={isOnline} onToggleOnline={() => {}} showStatus={false} /><main className="p-6">Đang tải đơn hàng...</main></div>;
  if (!order) return <div className="min-h-dvh bg-[#FAFAF9]"><DriverNavbar isOnline={isOnline} onToggleOnline={() => {}} showStatus={false} /><main className="p-6"><h1 className="text-xl font-bold">{error || "Không tìm thấy đơn hàng"}</h1><Link href="/driver" className="text-amber-800 underline">Về trang tài xế</Link></main></div>;

  // Xác định bước hiện tại của timeline tài xế (1 -> 4)
  const getStepNumber = (st: OrderStatus): number => {
    switch (st) {
      case "CHO_GAN":
      case "DA_GAN":
        return 1;
      case "DA_LAY_HANG":
        return 2;
      case "DANG_GIAO":
        return 3;
      case "HOAN_TAT":
      case "CHUA_THANH_TOAN":
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getStepNumber(order.status);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => {}} showStatus={false} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Top Header & Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <Link
            href="/driver"
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1"
          >
            ← Quay lại Buồng lái
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-stone-900">
              {order.id}
            </span>
            <Badge status={order.status} />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIMELINE TIẾN TRÌNH 4 BƯỚC CỦA TÀI XẾ                                     */}
        {/* ========================================================================= */}
        <section aria-label="Tiến trình giao hàng" className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Tiến trình cuốc xe</span>
            <span className="text-amber-600">Bước {currentStep}/4</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {[
              { step: 1, label: "Được gán" },
              { step: 2, label: "Đã lấy hàng" },
              { step: 3, label: "Đang giao" },
              { step: 4, label: "Hoàn tất" },
            ].map((s) => {
              const isPast = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              return (
                <div key={s.step} className="space-y-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isPast
                        ? "bg-amber-500"
                        : isCurrent
                        ? "bg-amber-500 animate-pulse"
                        : "bg-stone-200"
                    }`}
                  />
                  <span
                    className={`block text-[10px] sm:text-xs text-center font-semibold leading-tight ${
                      isCurrent
                        ? "text-stone-950 font-extrabold"
                        : isPast
                        ? "text-amber-800"
                        : "text-stone-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* THÔNG TIN CHI TIẾT 2 CHẶNG (LẤY HÀNG & GIAO HÀNG) */}
        <div className="space-y-4">
          {/* CHẶNG 1: ĐIỂM LẤY HÀNG (NGƯỜI GỬI) */}
          <section
            className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-3.5 transition-all ${
              currentStep === 1
                ? "border-amber-400 ring-2 ring-amber-200/50 bg-amber-50/10"
                : "border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-stone-500" />
                <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wide">
                  Chặng 1: Điểm lấy hàng (Người gửi)
                </h3>
              </div>
              {currentStep === 1 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  Đang đến lấy
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-extrabold text-stone-900">
                {order.sender.street}, {order.sender.district}, {order.sender.city}
              </div>
              <div className="text-xs text-stone-600">
                Người gửi: <strong>{order.sender.name}</strong>
              </div>
            </div>

            {/* Quick Actions (Call + Open Maps) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${order.sender.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold transition-colors"
              >
                <span>📞</span>
                <span>Gọi người gửi</span>
              </a>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  order.sender.street + ", " + order.sender.district + ", TP.HCM"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-semibold transition-colors"
              >
                <span>🗺️</span>
                <span>Mở bản đồ Maps</span>
              </a>
            </div>
          </section>

          {/* CHẶNG 2: ĐIỂM GIAO HÀNG (NGƯỜI NHẬN) */}
          <section
            className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-3.5 transition-all ${
              currentStep >= 2 && currentStep < 4
                ? "border-amber-400 ring-2 ring-amber-200/50 bg-amber-50/10"
                : "border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wide">
                  Chặng 2: Điểm giao hàng (Người nhận)
                </h3>
              </div>
              {currentStep === 3 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                  Đang giao đến
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-extrabold text-stone-900">
                {order.receiver.street}, {order.receiver.district}, {order.receiver.city}
              </div>
              <div className="text-xs text-stone-600">
                Người nhận: <strong>{order.receiver.name}</strong>
              </div>
              <div className="text-xs text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                📦 Hàng hóa: <strong>{order.packageType}</strong> ({order.packageWeightKg} kg)
              </div>
            </div>

            {/* Quick Actions (Call + Open Maps) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${order.receiver.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold transition-colors"
              >
                <span>📞</span>
                <span>Gọi người nhận</span>
              </a>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  order.receiver.street + ", " + order.receiver.district + ", TP.HCM"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-semibold transition-colors"
              >
                <span>🗺️</span>
                <span>Mở bản đồ Maps</span>
              </a>
            </div>
          </section>

          {/* CƯỚC PHÍ & PHƯƠNG THỨC THU */}
          <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Cước phí & Hình thức thu
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-600">
                {formatVND(order.totalFee)}
              </div>
              <span className="text-xs text-stone-600 font-semibold">
                {order.paymentMethod === "TIEN_MAT"
                  ? "💵 Thu tiền mặt trực tiếp khi giao (COD)"
                  : "💳 Thanh toán qua VNPay QR"}
              </span>
            </div>

            {/* Incident Trigger Button (Only available while delivering) */}
            {order.status === "DANG_GIAO" && (
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(true)}
                className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
              >
                ⚠️ Báo sự cố
              </button>
            )}
          </section>

          {/* INCIDENT LOGS IF ANY */}
          {incidentLogs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
              <span className="font-bold block">Nhật ký sự cố đã ghi nhận:</span>
              {incidentLogs.map((log, idx) => (
                <div key={idx} className="font-mono text-[11px] text-red-800">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BIG BOTTOM COCKPIT ACTION BUTTON (THAO TÁC 1-CHẠM CỠ LỚN >= 56PX)          */}
        {/* ========================================================================= */}
        <div className="pt-2">
          {order.status === "DA_GAN" && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNextStep}
              className="h-14 sm:h-15 text-base font-extrabold shadow-lg"
            >
              1. XÁC NHẬN ĐÃ ĐẾN & LẤY HÀNG ➔
            </Button>
          )}

          {order.status === "DA_LAY_HANG" && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNextStep}
              className="h-14 sm:h-15 text-base font-extrabold bg-amber-500 hover:bg-amber-600 shadow-lg text-stone-950"
            >
              2. BẮT ĐẦU ĐI GIAO CHO NGƯỜI NHẬN ➔
            </Button>
          )}

          {order.status === "DANG_GIAO" && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNextStep}
              className="h-14 sm:h-15 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
            >
              3. XÁC NHẬN GIAO THÀNH CÔNG ➔
            </Button>
          )}

          {order.status === "HOAN_TAT" && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <h3 className="text-base font-black text-emerald-950">
                Cuốc xe đã hoàn tất thành công!
              </h3>
              <p className="text-xs text-emerald-800">
                Cước phí <strong>{formatVND(order.totalFee)}</strong> đã được cập nhật trạng thái giao hàng.
              </p>
              <div className="pt-1">
                <Link href="/driver" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                  >
                    Quay về buồng lái nhận cuốc mới
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL BÁO CÁO SỰ CỐ GIAO HÀNG (TX-04 / UC-13)                             */}
      {/* ========================================================================= */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSubmitIncident}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <span>⚠️</span>
                <span>Báo cáo sự cố giao hàng</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-600">
                Loại sự cố gặp phải:
              </label>
              {INCIDENT_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    incidentType === type
                      ? "border-red-400 bg-red-50 text-red-950 font-semibold"
                      : "border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="incidentType"
                    checked={incidentType === type}
                    onChange={() => setIncidentType(type)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Ghi chú bổ sung cho điều phối viên:
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Gọi 3 cuộc lúc 14:35, 14:40, 14:45 chuông reo không ai nhấc máy..."
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                maxLength={500}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="submit"
              >
                Gửi báo cáo sự cố
              </Button>
            </div>
          </form>
        </div>
      )}

      <DriverBottomNav />
    </div>
  );
}
