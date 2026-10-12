"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SAMPLE_ORDERS, SAMPLE_DRIVERS, SAMPLE_INCIDENTS } from "@/lib/sample-data";
import { OrderItem, DriverItem, IncidentItem } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function DispatcherLiveBoardPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderItem[]>(SAMPLE_ORDERS);
  const [drivers, setDrivers] = useState<DriverItem[]>(SAMPLE_DRIVERS);
  const [incidents, setIncidents] = useState<IncidentItem[]>(SAMPLE_INCIDENTS);

  // Modal phân công tài xế thông minh (UC-12)
  const [assigningOrder, setAssigningOrder] = useState<OrderItem | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // Thống kê tác chiến
  const pendingOrders = orders.filter((o) => o.status === "CHO_GAN");
  const deliveringOrders = orders.filter(
    (o) => o.status === "DA_GAN" || o.status === "DA_LAY_HANG" || o.status === "DANG_GIAO"
  );
  const onlineIdleDrivers = drivers.filter((d) => d.status === "ONLINE_IDLE");
  const onlineBusyDrivers = drivers.filter((d) => d.status === "ONLINE_BUSY");

  // Mở modal gán tài xế
  const handleOpenAssignModal = (order: OrderItem) => {
    setAssigningOrder(order);
    const bestDriver = onlineIdleDrivers[0] || drivers[0];
    if (bestDriver) {
      setSelectedDriverId(bestDriver.id);
    }
  };

  // Xác nhận gán tài xế (UC-12)
  const handleConfirmAssignment = () => {
    if (!assigningOrder || !selectedDriverId) return;

    const assignedDriver = drivers.find((d) => d.id === selectedDriverId);
    if (!assignedDriver) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === assigningOrder.id
          ? {
              ...o,
              status: "DA_GAN",
              statusText: "Đã gán tài xế",
              driver: {
                id: assignedDriver.id,
                name: assignedDriver.name,
                phone: assignedDriver.phone,
                vehiclePlate: assignedDriver.vehiclePlate,
                vehicleType: assignedDriver.vehicleType,
              },
            }
          : o
      )
    );

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriverId ? { ...d, status: "ONLINE_BUSY", idleSinceMinutes: 0 } : d
      )
    );

    showToast(
      `Đã phân công tài xế ${assignedDriver.name} (${assignedDriver.vehiclePlate}) cho đơn ${assigningOrder.id}!`,
      "success"
    );
    setAssigningOrder(null);
  };

  // Xử lý sự cố: Đổi tài xế khác (UC-13)
  const handleReassignIncidentOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "CHO_GAN",
              statusText: "Chờ gán tài xế (Điều phối lại)",
              incident: undefined,
              driver: undefined,
            }
          : o
      )
    );
    setIncidents((prev) => prev.filter((i) => i.orderId !== orderId));
    showToast(`Đã thu hồi đơn ${orderId} về hàng đợi chờ gán để phân công tài xế mới!`, "info");
  };

  // Hủy đơn hàng từ điều phối (UC-14)
  const handleCancelOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "DA_HUY",
              statusText: `Đã hủy: ${reason}`,
            }
          : o
      )
    );
    setIncidents((prev) => prev.filter((i) => i.orderId !== orderId));
    showToast(`Đã hủy đơn ${orderId} thành công theo yêu cầu nghiệp vụ!`, "error");
  };

  // Giả lập nhận đơn mới từ hotline
  const handleSimulateNewOrder = () => {
    const newId = `DH-2025-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: OrderItem = {
      id: newId,
      sender: {
        name: "Lê Minh Tuấn",
        phone: "0911223344",
        street: "45 Hai Bà Trưng",
        district: "Quận 1",
        city: "TP.HCM",
      },
      receiver: {
        name: "Trần Thị Mai",
        phone: "0988776655",
        street: "128 Cách Mạng Tháng 8",
        district: "Quận 3",
        city: "TP.HCM",
      },
      packageType: "Tài liệu hỏa tốc",
      packageWeightKg: 0.3,
      distanceKm: 2.8,
      baseFee: 35000,
      surchargeFee: 10000,
      vipDiscountFee: 0,
      totalFee: 45000,
      status: "CHO_GAN",
      statusText: "Chờ gán tài xế",
      createdAt: "Vừa xong",
      createdTimestamp: Date.now(),
      paid: false,
      paymentMethod: "TIEN_MAT",
    };

    setOrders([newOrder, ...orders]);
    showToast(`Tiếp nhận đơn hỏa tốc mới (${newId}) đưa vào hàng đợi!`, "info");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-200">
      <DispatcherNavbar
        pendingCount={pendingOrders.length}
        incidentCount={incidents.filter((i) => i.status === "CHO_XU_LY").length}
      />

      {/* OPERATIONS TELEMETRY STRIP (ANTI-SLOP: UNIFIED CONTROL STRIP INSTEAD OF 3 EQUAL BOXES) */}
      <section className="bg-zinc-950 border-b border-zinc-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Asymmetric Telemetry Metrics */}
          <div className="flex items-center gap-6 text-xs divide-x divide-zinc-800">
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Hàng đợi chờ gán
              </span>
              <span className="font-mono text-base font-black text-amber-400">
                {pendingOrders.length}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-6">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Đang giao
              </span>
              <span className="font-mono text-base font-bold text-zinc-100">
                {deliveringOrders.length}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-6">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Khả dụng đội xe
              </span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {onlineIdleDrivers.length}/{drivers.length}
              </span>
              <span className="text-[11px] text-zinc-500">
                ({onlineBusyDrivers.length} bận)
              </span>
            </div>

            {incidents.length > 0 && (
              <div className="flex items-baseline gap-2 pl-6">
                <span className="text-rose-400 uppercase tracking-wider font-mono text-[10px] font-bold">
                  Sự cố xử lý
                </span>
                <span className="font-mono text-base font-black text-rose-400">
                  {incidents.length}
                </span>
              </div>
            )}
          </div>

          {/* Precision Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-amber-400 font-mono text-xs font-bold transition-colors active:translate-y-[1px]"
            >
              + Nhận đơn mô phỏng
            </button>
            <Link
              href="/dieu-phoi/tao-don"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs transition-colors active:translate-y-[1px]"
            >
              Tạo đơn hotline
            </Link>
          </div>
        </div>
      </section>

      {/* ASYMMETRIC 3-COLUMN MISSION CONTROL GRID (VISUAL DENSITY: 8, HAIRLINES INSTEAD OF CARDS) */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* CỘT 1: HÀNG ĐỢI ĐƠN CHỜ GÁN (3 COLS / 25%)                                */}
        {/* ========================================================================= */}
        <section className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-baseline gap-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                Hàng Đợi Chờ Gán
              </h2>
              <span className="font-mono text-xs font-bold text-amber-400">
                ({pendingOrders.length})
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">Auto-Dispatcher</span>
          </div>

          <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-[calc(100vh-220px)]">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs font-mono">
                Hàng đợi trống. Toàn bộ đơn đã được gán.
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 hover:bg-zinc-850/60 transition-colors space-y-2.5 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-amber-400">
                        {order.id}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {order.createdAt}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-100">
                      {formatVND(order.totalFee)}
                    </span>
                  </div>

                  {/* Clean 2-line Route Typography */}
                  <div className="text-xs space-y-1 text-zinc-300">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px] w-8 shrink-0">LẤY</span>
                      <span className="truncate">{order.sender.street}, {order.sender.district}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-amber-500 font-mono text-[10px] w-8 shrink-0">GIAO</span>
                      <span className="truncate text-zinc-100 font-medium">{order.receiver.street}, {order.receiver.district}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-400">
                    <span>{order.packageType} · {order.distanceKm} km</span>
                    <span className="text-zinc-400">
                      {order.paymentMethod === "TIEN_MAT" ? "COD Tiền mặt" : "VNPay"}
                    </span>
                  </div>

                  {/* Tactile Actions */}
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleOpenAssignModal(order)}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-8 text-xs tracking-tight shadow-2xs active:translate-y-[1px]"
                    >
                      Gán tài xế tối ưu ➔
                    </Button>
                    <Link
                      href={`/dieu-phoi/don-hang/${order.id}`}
                      className="px-2.5 h-8 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center shrink-0 transition-colors"
                      title="Chi tiết đơn"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CỘT 2: GIÁM SÁT THỰC THI & SỰ CỐ (5 COLS / 42%)                           */}
        {/* ========================================================================= */}
        <section className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-baseline gap-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                Giám Sát Vận Hành
              </h2>
              <span className="font-mono text-xs font-bold text-zinc-400">
                ({deliveringOrders.length})
              </span>
            </div>
            {incidents.length > 0 && (
              <span className="font-mono text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
                {incidents.length} CẦN CAN THIỆP
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-[calc(100vh-220px)]">
            {/* INCIDENTS GIVEN PRIORITY STRIP (CLEAN SEMANTIC BORDER, NO AI PING) */}
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 bg-rose-950/20 border-l-2 border-rose-500 space-y-2.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-rose-400">
                      {inc.orderId}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                      SỰ CỐ
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">{inc.reportedAt}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-100">{inc.type}</div>
                  <p className="text-[11px] text-zinc-400 italic leading-relaxed">{inc.note}</p>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-rose-950/60">
                  <span>TX: <strong className="text-zinc-200">{inc.driverName}</strong> ({inc.driverPhone})</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReassignIncidentOrder(inc.orderId)}
                    className="h-8 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs transition-colors active:translate-y-[1px]"
                  >
                    Đổi tài xế khác
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(inc.orderId, inc.type)}
                    className="h-8 px-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs transition-colors active:translate-y-[1px]"
                  >
                    Hủy đơn
                  </button>
                </div>
              </div>
            ))}

            {/* STANDARD IN-FLIGHT ORDERS */}
            {deliveringOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 hover:bg-zinc-850/60 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-zinc-200">
                      {order.id}
                    </span>
                    <Badge status={order.status} />
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {formatVND(order.totalFee)}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-zinc-300">
                  <div className="flex items-baseline gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px] w-8 shrink-0">TỪ</span>
                    <span className="truncate">{order.sender.street}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px] w-8 shrink-0">ĐẾN</span>
                    <span className="truncate">{order.receiver.street}</span>
                  </div>
                </div>

                {order.driver && (
                  <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Tài xế:</span>
                      <strong className="text-zinc-200">{order.driver.name}</strong>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-amber-400 text-[11px] block">
                        {order.driver.vehiclePlate}
                      </span>
                      <a
                        href={`tel:${order.driver.phone}`}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
                      >
                        {order.driver.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-end">
                  <Link
                    href={`/dieu-phoi/don-hang/${order.id}`}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Xem chi tiết toàn trình ➔
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CỘT 3: ĐỘI XE TRỰC TUYẾN (3 COLS / 25%)                                    */}
        {/* ========================================================================= */}
        <section className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-baseline gap-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                Đội Xe
              </h2>
              <span className="font-mono text-xs font-bold text-emerald-400">
                ({onlineIdleDrivers.length} rảnh)
              </span>
            </div>
            <Link
              href="/dieu-phoi/doi-xe"
              className="text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              Tất cả ➔
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-[calc(100vh-220px)]">
            {drivers.map((driver) => {
              const isIdle = driver.status === "ONLINE_IDLE";
              const isBusy = driver.status === "ONLINE_BUSY";

              return (
                <div
                  key={driver.id}
                  className={`p-3 space-y-1.5 transition-colors ${
                    isIdle
                      ? "hover:bg-zinc-850/60"
                      : "opacity-65 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-zinc-200 block">{driver.name}</strong>
                      <span className="font-mono text-[10px] text-zinc-500">{driver.id}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isIdle
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                          : isBusy
                          ? "bg-zinc-900 text-amber-400 border-zinc-800"
                          : "bg-zinc-900 text-zinc-500 border-zinc-800"
                      }`}
                    >
                      {isIdle
                        ? `Rảnh ${driver.idleSinceMinutes}m`
                        : isBusy
                        ? "Đang giao"
                        : "Tạm nghỉ"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>{driver.currentDistrict}</span>
                    <span className="text-zinc-300">{driver.vehiclePlate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAL PHÂN CÔNG TÀI XẾ THÔNG MINH (UC-12)                                 */}
      {/* ========================================================================= */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 space-y-4 text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  Phân công tài xế
                </h3>
                <span className="text-xs font-mono text-amber-400">
                  {assigningOrder.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="text-zinc-500 hover:text-zinc-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Order snapshot */}
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs space-y-1 font-mono">
              <div className="text-zinc-400">
                Lấy: <span className="text-zinc-200">{assigningOrder.sender.street} ({assigningOrder.sender.district})</span>
              </div>
              <div className="text-zinc-400">
                Giao: <span className="text-zinc-200">{assigningOrder.receiver.street} ({assigningOrder.receiver.district})</span>
              </div>
              <div className="pt-1 text-amber-400 font-bold">
                Cước: {formatVND(assigningOrder.totalFee)} ({assigningOrder.distanceKm} km)
              </div>
            </div>

            {/* Driver Recommendation List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Gợi ý tài xế trực tuyến phù hợp:
              </label>

              <div className="divide-y divide-zinc-800 max-h-56 overflow-y-auto border border-zinc-800 rounded-lg">
                {drivers
                  .filter((d) => d.status === "ONLINE_IDLE")
                  .map((driver) => (
                    <label
                      key={driver.id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        selectedDriverId === driver.id
                          ? "bg-amber-500/10 text-amber-300"
                          : "hover:bg-zinc-850"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="driverAssign"
                          checked={selectedDriverId === driver.id}
                          onChange={() => setSelectedDriverId(driver.id)}
                          className="text-amber-500 focus:ring-amber-400"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>{driver.name}</span>
                            <span className="text-zinc-500 font-mono text-[10px]">★ {driver.rating}</span>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {driver.vehiclePlate} · {driver.currentDistrict}
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-emerald-400">
                        Rảnh {driver.idleSinceMinutes}m
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssigningOrder(null)}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAssignment}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold active:translate-y-[1px]"
              >
                Xác nhận gán ➔
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
