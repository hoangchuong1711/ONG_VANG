"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SAMPLE_ORDERS, SAMPLE_DRIVERS } from "@/lib/sample-data";
import { OrderItem } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherOrderDetailPage() {
  const { showToast } = useToast();
  const params = useParams();
  const orderId = (params?.id as string) || "DH-2025-001235";

  const initialOrder =
    SAMPLE_ORDERS.find((o) => o.id === orderId) || {
      ...SAMPLE_ORDERS[0],
      id: orderId,
    };

  const [order, setOrder] = useState<OrderItem>(initialOrder);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Khách yêu cầu hủy qua hotline");
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("TX-DEMO-1");

  // Hủy đơn (UC-14)
  const handleConfirmCancel = () => {
    setOrder({
      ...order,
      status: "DA_HUY",
      statusText: `Đã hủy: ${cancelReason}`,
    });
    setIsCancelModalOpen(false);
    showToast(`Đã hủy đơn ${order.id} thành công! Lý do: "${cancelReason}"`, "error");
  };

  // Điều phối lại tài xế (UC-13)
  const handleConfirmReassign = () => {
    const newDriver = SAMPLE_DRIVERS.find((d) => d.id === selectedDriverId);
    if (!newDriver) return;

    setOrder({
      ...order,
      status: "DA_GAN",
      statusText: "Đã gán lại tài xế",
      incident: undefined,
      driver: {
        id: newDriver.id,
        name: newDriver.name,
        phone: newDriver.phone,
        vehiclePlate: newDriver.vehiclePlate,
        vehicleType: newDriver.vehicleType,
      },
    });
    setIsReassignModalOpen(false);
    showToast(`Đã điều phối lại tài xế ${newDriver.name} cho đơn ${order.id}!`, "success");
  };

  // Xác nhận thu COD hộ (UC-08)
  const handleConfirmCODCollect = () => {
    setOrder({
      ...order,
      paid: true,
    });
    showToast(`Đã xác nhận thu đối soát ${formatVND(order.totalFee)} thành công!`, "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-200">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <Link
              href="/dieu-phoi"
              className="text-xs font-mono font-medium text-zinc-400 hover:text-amber-400 transition-colors"
            >
              ← BÀN ĐIỀU PHỐI
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="font-mono text-sm font-bold text-amber-400">{order.id}</span>
            <Badge status={order.status} />
          </div>

          <div className="flex items-center gap-2">
            {order.status !== "DA_HUY" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-mono font-medium"
              >
                HỦY ĐƠN KHẨN CẤP (UC-14)
              </Button>
            )}
          </div>
        </div>

        {/* INCIDENT BANNER IF PRESENT (ANTI-SLOP: CRISP SEMANTIC BAR, NO ANIMATE-PING) */}
        {order.incident && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px]">
                  CẢNH BÁO SỰ CỐ
                </span>
                <span>{order.incident.type}</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Ghi nhận lúc: {order.incident.reportedAt}
              </span>
            </div>

            <p className="text-xs text-rose-200/90 font-sans leading-relaxed">
              {order.incident.note}
            </p>

            <div className="pt-1 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReassignModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
              >
                Thu hồi & Đổi tài xế khác (UC-13)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-medium"
              >
                Hủy đơn do sự cố
              </Button>
            </div>
          </div>
        )}

        {/* 2-COLUMN OPERATIONAL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: ROUTE & SENDER/RECEIVER (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Điểm lấy & Giao hàng */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Điểm lấy hàng (Người gửi)
                  </span>
                  <a
                    href={`tel:${order.sender.phone}`}
                    className="text-xs font-mono font-medium text-amber-400 hover:underline"
                  >
                    Gọi: {order.sender.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-100">{order.sender.name}</div>
                  <div className="text-xs text-zinc-400 font-sans">
                    {order.sender.street}, {order.sender.district}, {order.sender.city}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400/90">
                    Điểm giao hàng (Người nhận)
                  </span>
                  <a
                    href={`tel:${order.receiver.phone}`}
                    className="text-xs font-mono font-medium text-amber-400 hover:underline"
                  >
                    Gọi: {order.receiver.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-100">{order.receiver.name}</div>
                  <div className="text-xs text-zinc-400 font-sans">
                    {order.receiver.street}, {order.receiver.district}, {order.receiver.city}
                  </div>
                  {order.receiver.notes && (
                    <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg mt-2">
                      <span className="font-mono font-bold text-[10px] uppercase block text-amber-400">
                        Chỉ dẫn giao hàng:
                      </span>
                      {order.receiver.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thông số kiện hàng & Snapshot Cước phí */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Thông số kiện hàng & Cước phí
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    order.paid
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {order.paid ? "ĐÃ THANH TOÁN" : "CHƯA THU TIỀN"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Loại hàng</span>
                  <span className="text-zinc-200 font-sans font-medium">{order.packageType}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Trọng lượng</span>
                  <span className="text-zinc-200">{order.packageWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Khoảng cách</span>
                  <span className="text-zinc-200">{order.distanceKm} km</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-zinc-800/80 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Cước cơ bản:</span>
                  <span>{formatVND(order.baseFee)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Phụ phí kiện nặng/cồng kềnh:</span>
                  <span>{formatVND(order.surchargeFee)}</span>
                </div>
                {order.vipDiscountFee > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Ưu đãi VIP Vàng:</span>
                    <span>-{formatVND(order.vipDiscountFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800 text-sm">
                  <span className="text-zinc-300 font-sans font-bold">Tổng thu:</span>
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {formatVND(order.totalFee)}
                  </span>
                </div>
              </div>

              {!order.paid && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={handleConfirmCODCollect}
                    className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-mono text-xs font-medium"
                  >
                    XÁC NHẬN THU COD TẠI BÀN (UC-08)
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DRIVER & AUDIT TRAIL (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Driver in-charge */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Tài xế tiếp nhận
                </span>
                {order.driver && (
                  <button
                    type="button"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    Đổi tài xế
                  </button>
                )}
              </div>

              {order.driver ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-100">{order.driver.name}</div>
                      <div className="text-xs font-mono text-zinc-500">Mã: {order.driver.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-amber-400">
                        {order.driver.vehiclePlate}
                      </div>
                      <div className="text-[11px] text-zinc-400">{order.driver.vehicleType}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`tel:${order.driver.phone}`}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-200 transition-colors"
                    >
                      Gọi tài xế: {order.driver.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-zinc-500">Chưa gán tài xế cho đơn hàng này</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                  >
                    Gán tài xế ngay (UC-12)
                  </Button>
                </div>
              )}
            </div>

            {/* Audit Trail / Timeline */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block border-b border-zinc-800/80 pb-3">
                Nhật ký vận hành (Audit Trail)
              </span>

              <div className="relative pl-5 space-y-4 text-xs font-mono before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-zinc-800">
                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-zinc-600" />
                  <div className="text-zinc-200 font-bold">10:15 - Tiếp nhận yêu cầu</div>
                  <div className="text-zinc-500 font-sans text-[11px]">
                    Khách hàng khởi tạo đơn qua hệ thống Mini Ong Vàng.
                  </div>
                </div>

                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-amber-400" />
                  <div className="text-zinc-200 font-bold">10:18 - Phân công cuốc xe</div>
                  <div className="text-zinc-500 font-sans text-[11px]">
                    Hệ thống điều phối gán tài xế tiếp nhận lộ trình.
                  </div>
                </div>

                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="text-zinc-200 font-bold">10:35 - Lấy hàng thành công</div>
                  <div className="text-zinc-500 font-sans text-[11px]">
                    Tài xế đã nhận bưu kiện từ người gửi.
                  </div>
                </div>

                {order.incident && (
                  <div className="relative space-y-1">
                    <span className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-rose-500" />
                    <div className="text-rose-400 font-bold">10:55 - Báo cáo sự cố</div>
                    <div className="text-rose-300 font-sans text-[11px]">
                      {order.incident.note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL HỦY ĐƠN HÀNG (UC-14) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4 text-zinc-200">
            <h3 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wide">
              HỦY ĐƠN HÀNG {order.id}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Tài xế phụ trách sẽ được giải phóng ngay lập tức về trạng thái trực tuyến rảnh.
            </p>

            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase">
                Lý do hủy đơn:
              </label>
              {[
                "Khách yêu cầu hủy qua hotline",
                "Không liên lạc được người nhận nhiều lần",
                "Khách đổi địa chỉ ngoài phạm vi phục vụ",
                "Sự cố bất khả kháng từ tài xế",
              ].map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    cancelReason === r
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="text-rose-500 focus:ring-0"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCancel}
                className="font-mono text-xs font-bold"
              >
                XÁC NHẬN HỦY ĐƠN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐIỀU PHỐI LẠI TÀI XẾ (UC-13) */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4 text-zinc-200">
            <h3 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wide">
              ĐIỀU PHỐI TÀI XẾ MỚI CHO {order.id}
            </h3>

            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase">
                Tài xế đang trực tuyến rảnh:
              </label>
              {SAMPLE_DRIVERS.filter((d) => d.status === "ONLINE_IDLE").map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedDriverId === d.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="reassignDriver"
                      checked={selectedDriverId === d.id}
                      onChange={() => setSelectedDriverId(d.id)}
                      className="text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-zinc-100 block">{d.name}</span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        {d.vehiclePlate} · {d.currentDistrict}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    Rảnh {d.idleSinceMinutes}m
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignModalOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReassign}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs"
              >
                GÁN TÀI XẾ THAY THẾ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
