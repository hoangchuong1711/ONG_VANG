"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDemoStore, updateDemoState } from "@/lib/demo-store";
import { OrderItem } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherOrderDetailPage() {
  const { showToast } = useToast();
  const params = useParams();
  const orderId = params?.id as string;
  const { state: demo, ready } = useDemoStore();
  const order = demo.orders.find((item) => item.id === orderId);
  const setOrder = (next: OrderItem) => updateDemoState((previous) => ({
    ...previous, orders: previous.orders.map((item) => item.id === next.id ? next : item),
  }));
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Khách yêu cầu hủy qua hotline");
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("TX-DEMO-1");

  // Hủy đơn (UC-14)
  const handleConfirmCancel = () => {
    if (!order) return;
    updateDemoState((previous) => ({ ...previous,
      orders: previous.orders.map((item) => item.id === order.id ? { ...item,
        status: "DA_HUY", statusText: `Đã hủy: ${cancelReason}` } : item),
      drivers: previous.drivers.map((driver) => driver.id === order.driver?.id ?
        { ...driver, status: "ONLINE_IDLE" } : driver),
      incidents: previous.incidents.map((incident) => incident.orderId === order.id ?
        { ...incident, status: "DA_GIAI_QUYET", resolution: "Đơn đã hủy" } : incident),
    }));
    setIsCancelModalOpen(false);
    showToast(`Đã hủy đơn ${order.id} thành công! Lý do: "${cancelReason}"`, "error");
  };

  // Điều phối lại tài xế (UC-13)
  const handleConfirmReassign = () => {
    const newDriver = demo.drivers.find((d) => d.id === selectedDriverId);
    if (!newDriver || !order) return;

    updateDemoState((previous) => ({ ...previous,
      orders: previous.orders.map((item) => item.id === order.id ? { ...item,
        status: "DA_GAN", statusText: "Đã gán lại tài xế", incident: undefined,
        driver: {
        id: newDriver.id,
        name: newDriver.name,
        phone: newDriver.phone,
        vehiclePlate: newDriver.vehiclePlate,
        vehicleType: newDriver.vehicleType,
        },
      } : item),
      drivers: previous.drivers.map((driver) => driver.id === newDriver.id ?
        { ...driver, status: "ONLINE_BUSY" } : driver.id === order.driver?.id ?
          { ...driver, status: "ONLINE_IDLE" } : driver),
      incidents: previous.incidents.map((incident) => incident.orderId === order.id ?
        { ...incident, status: "DA_GIAI_QUYET", resolution: "Đã gán lại tài xế" } : incident),
    }));
    setIsReassignModalOpen(false);
    showToast(`Đã điều phối lại tài xế ${newDriver.name} cho đơn ${order.id}!`, "success");
  };

  // Xác nhận thu COD hộ (UC-08)
  const handleConfirmCODCollect = () => {
    if (!order) return;
    setOrder({ ...order, paid: true,
      status: order.status === "CHUA_THANH_TOAN" ? "HOAN_TAT" : order.status,
      statusText: order.status === "CHUA_THANH_TOAN" ? "Đã giao và thu tiền" : order.statusText });
    showToast(`Đã xác nhận thu đối soát ${formatVND(order.totalFee)} thành công!`, "success");
  };

  if (!ready) return <div className="min-h-dvh bg-[#FAFAF9]"><DispatcherNavbar /><main className="p-6">Đang tải đơn hàng...</main></div>;
  if (!order) return <div className="min-h-dvh bg-[#FAFAF9]"><DispatcherNavbar /><main className="p-6"><h1 className="text-xl font-bold">Không tìm thấy đơn hàng</h1><Link href="/dispatcher" className="text-amber-800 underline">Về bàn điều phối</Link></main></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1240px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/dispatcher"
              className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800 transition-colors whitespace-nowrap"
            >
              ← Bàn điều phối
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-sm sm:text-base font-extrabold text-stone-900 whitespace-nowrap">{order.id}</span>
            <Badge status={order.status} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {order.status !== "DA_HUY" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-bold whitespace-nowrap"
              >
                Hủy đơn khẩn cấp
              </Button>
            )}
          </div>
        </div>

        {/* INCIDENT BANNER IF PRESENT */}
        {order.incident && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wide">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-[11px] text-rose-800 font-extrabold">
                  CẢNH BÁO SỰ CỐ
                </span>
                <span>{order.incident.type}</span>
              </div>
              <span className="text-xs font-medium text-stone-500">
                Ghi nhận lúc: {order.incident.reportedAt}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-rose-950 leading-relaxed font-medium">
              {order.incident.note}
            </p>

            <div className="pt-1 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReassignModalOpen(true)}
                className="text-xs font-bold shadow-sm"
              >
                Thu hồi & đổi tài xế khác
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
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
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-200 shadow-2xs">
              <div className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Điểm lấy hàng (Người gửi)
                  </span>
                  <a
                    href={`tel:${order.sender.phone}`}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    Gọi: {order.sender.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-base font-extrabold text-stone-900">{order.sender.name}</div>
                  <div className="text-xs sm:text-sm text-stone-600 font-medium">
                    {order.sender.street}, {order.sender.district}, {order.sender.city}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Điểm giao hàng (Người nhận)
                  </span>
                  <a
                    href={`tel:${order.receiver.phone}`}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    Gọi: {order.receiver.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-base font-extrabold text-stone-900">{order.receiver.name}</div>
                  <div className="text-xs sm:text-sm text-stone-600 font-medium">
                    {order.receiver.street}, {order.receiver.district}, {order.receiver.city}
                  </div>
                  {order.receiver.notes && (
                    <div className="text-xs text-amber-950 bg-amber-50 border border-amber-200 p-3 rounded-xl mt-2.5 font-medium">
                      <span className="font-bold text-amber-900 block mb-0.5">
                        Chỉ dẫn cho tài xế:
                      </span>
                      {order.receiver.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thông số kiện hàng & Snapshot Cước phí */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Thông số kiện hàng & Cước phí
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    order.paid
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {order.paid ? "ĐÃ THANH TOÁN" : "CHƯA THU TIỀN"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block font-medium mb-0.5">Loại bưu phẩm</span>
                  <span className="text-stone-900 font-bold text-sm">{order.packageType}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium mb-0.5">Khối lượng</span>
                  <span className="text-stone-900 font-bold text-sm">{order.packageWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium mb-0.5">Khoảng cách</span>
                  <span className="text-stone-900 font-bold text-sm">{order.distanceKm} km</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-stone-200 text-xs sm:text-sm">
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Cước vận chuyển cơ bản:</span>
                  <span className="font-semibold text-stone-900">{formatVND(order.baseFee)}</span>
                </div>
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Phụ phí cồng kềnh:</span>
                  <span className="font-semibold text-stone-900">{formatVND(order.surchargeFee)}</span>
                </div>
                {order.vipDiscountFee > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Ưu đãi VIP Vàng:</span>
                    <span className="font-bold">-{formatVND(order.vipDiscountFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2.5 border-t border-stone-200">
                  <span className="text-stone-900 font-bold text-sm sm:text-base">Tổng tiền thu:</span>
                  <span className="font-extrabold text-amber-700 text-lg sm:text-xl">
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
                    className="border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-bold"
                  >
                    Xác nhận đã thu tiền mặt tại bàn
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DRIVER & AUDIT TRAIL (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Driver in-charge */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Tài xế tiếp nhận
                </span>
                {order.driver && (
                  <button
                    type="button"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                  >
                    Đổi tài xế
                  </button>
                )}
              </div>

              {order.driver ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-extrabold text-stone-900">{order.driver.name}</div>
                      <div className="text-xs text-stone-500 font-medium">Mã TX: {order.driver.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-amber-700">
                        {order.driver.vehiclePlate}
                      </div>
                      <div className="text-xs text-stone-500 font-medium">{order.driver.vehicleType}</div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <a
                      href={`tel:${order.driver.phone}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-800 transition-colors"
                    >
                      Gọi tài xế: {order.driver.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-stone-400 font-medium">Chưa gán tài xế cho đơn hàng này</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="text-xs font-bold shadow-sm"
                  >
                    Gán tài xế ngay
                  </Button>
                </div>
              )}
            </div>

            {/* Audit Trail / Timeline */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block border-b border-stone-200 pb-3">
                Nhật ký vận hành (Audit Trail)
              </span>

              <div className="relative pl-5 space-y-4 text-xs before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-stone-200">
                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-stone-400" />
                  <div className="text-stone-900 font-bold">10:15 - Tiếp nhận yêu cầu</div>
                  <div className="text-stone-500 font-medium text-xs">
                    Khách hàng khởi tạo đơn qua hệ thống Mini Ong Vàng.
                  </div>
                </div>

                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="text-stone-900 font-bold">10:18 - Phân công cuốc xe</div>
                  <div className="text-stone-500 font-medium text-xs">
                    Hệ thống điều phối gán tài xế tiếp nhận lộ trình.
                  </div>
                </div>

                <div className="relative space-y-1">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="text-stone-900 font-bold">10:35 - Lấy hàng thành công</div>
                  <div className="text-stone-500 font-medium text-xs">
                    Tài xế đã nhận bưu kiện từ người gửi.
                  </div>
                </div>

                {order.incident && (
                  <div className="relative space-y-1">
                    <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="text-rose-800 font-bold">10:55 - Báo cáo sự cố</div>
                    <div className="text-rose-900 font-medium text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-6 space-y-4 text-stone-800">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
              Hủy đơn hàng {order.id}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium">
              Tài xế phụ trách sẽ được giải phóng ngay lập tức về trạng thái trực tuyến rảnh.
            </p>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-stone-700">
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
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    cancelReason === r
                      ? "border-rose-400 bg-rose-50 text-rose-900 font-semibold"
                      : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="text-rose-600 focus:ring-0"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-xs font-semibold"
              >
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCancel}
                className="text-xs font-bold"
              >
                Xác nhận hủy đơn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐIỀU PHỐI LẠI TÀI XẾ (UC-13) */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-6 space-y-4 text-stone-800">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
              Điều phối tài xế mới cho {order.id}
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Chọn tài xế đang trực tuyến rảnh:
              </label>
              {demo.drivers.filter((d) => d.status === "ONLINE_IDLE").map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedDriverId === d.id
                      ? "border-amber-500 bg-amber-50 shadow-2xs"
                      : "border-stone-200 bg-stone-50 hover:border-stone-300"
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
                      <span className="font-bold text-sm text-stone-900 block">{d.name}</span>
                      <span className="text-xs text-stone-500 font-medium">
                        {d.vehiclePlate} · {d.currentDistrict}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700 text-xs">
                    Rảnh {d.idleSinceMinutes}m
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignModalOpen(false)}
                className="text-xs font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReassign}
                className="text-xs font-bold shadow-sm"
              >
                Gán tài xế thay thế
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
