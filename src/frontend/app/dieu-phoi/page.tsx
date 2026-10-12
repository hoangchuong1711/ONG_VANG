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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-800">
      <DispatcherNavbar
        pendingCount={pendingOrders.length}
        incidentCount={incidents.filter((i) => i.status === "CHO_XU_LY").length}
      />

      {/* OPERATIONS TELEMETRY STRIP (LIGHT THEME ANTI-SLOP) */}
      <section className="bg-white border-b border-zinc-200 px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Asymmetric Telemetry Metrics */}
          <div className="flex items-center gap-6 text-xs divide-x divide-zinc-200">
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Hàng đợi chờ gán
              </span>
              <span className="font-mono text-base font-black text-amber-600">
                {pendingOrders.length}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-6">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Đang giao
              </span>
              <span className="font-mono text-base font-bold text-zinc-900">
                {deliveringOrders.length}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-6">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Tài xế rảnh
              </span>
              <span className="font-mono text-base font-bold text-emerald-600">
                {onlineIdleDrivers.length}
                <span className="text-xs text-zinc-400 font-normal">/{drivers.length}</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-6">
              <span className="text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                Sự cố can thiệp
              </span>
              <span className={`font-mono text-base font-bold ${incidents.length > 0 ? "text-rose-600" : "text-zinc-400"}`}>
                {incidents.filter((i) => i.status === "CHO_XU_LY").length}
              </span>
            </div>
          </div>

          {/* Quick Simulation Triggers */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-xs font-mono font-medium transition-colors"
            >
              + Giả lập đơn Hotline mới
            </button>
            <Link
              href="/dieu-phoi/tao-don"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold shadow-2xs transition-all active:scale-[0.98]"
            >
              + Tiếp Nhận Cuộc Gọi (UC-02)
            </Link>
          </div>
        </div>
      </section>

      {/* 3-COLUMN OPERATIONS COCKPIT */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= COLUMN 1: PENDING QUEUE (4 COLS) ================= */}
        <section className="lg:col-span-4 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                Hàng Đợi Chờ Gán
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {pendingOrders.length}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">UC-12 AUTO QUEUE</span>
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-210px)]">
            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 font-mono">
                Không có đơn hàng tồn đọng trong hàng đợi
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-lg bg-white border border-zinc-200 hover:border-amber-400 transition-colors space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-600">{order.id}</span>
                    <span className="text-[11px] font-mono text-zinc-400">{order.createdAt}</span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold text-[10px] mt-0.5">LẤY:</span>
                      <span className="text-zinc-800 line-clamp-1">
                        {order.sender.street}, {order.sender.district}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold text-[10px] mt-0.5">GIAO:</span>
                      <span className="text-zinc-800 line-clamp-1">
                        {order.receiver.street}, {order.receiver.district}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs font-mono">
                    <div className="text-zinc-500 text-[11px]">
                      <span>{order.distanceKm}km</span> · <span>{order.packageWeightKg}kg</span>
                    </div>
                    <span className="font-bold text-zinc-900">{formatVND(order.totalFee)}</span>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleOpenAssignModal(order)}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs shadow-2xs"
                    >
                      PHÂN CÔNG TÀI XẾ (UC-12)
                    </Button>
                    <Link
                      href={`/dieu-phoi/don-hang/${order.id}`}
                      className="px-2.5 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 text-xs font-mono"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ================= COLUMN 2: IN-FLIGHT OPS & INCIDENTS (5 COLS) ================= */}
        <section className="lg:col-span-5 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                Đơn Hàng Đang Thực Hiện & Can Thiệp
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-300">
                {deliveringOrders.length}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">LIVE TRACKING</span>
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-210px)]">
            {/* INCIDENT ALERTS (SEPARATE CONTAINER) */}
            {incidents.filter((i) => i.status === "CHO_XU_LY").length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-800 uppercase">
                  <span>Cảnh báo sự cố can thiệp ({incidents.length})</span>
                  <span className="text-[10px] text-rose-600">UC-13 / UC-14</span>
                </div>
                {incidents.map((inc) => (
                  <div key={inc.id} className="p-2.5 rounded bg-white border border-rose-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-700">{inc.orderId}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{inc.reportedAt}</span>
                    </div>
                    <p className="text-zinc-700 text-xs font-sans">{inc.note}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleReassignIncidentOrder(inc.orderId)}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-[11px] font-bold transition-colors"
                      >
                        Đổi tài xế khác (UC-13)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(inc.orderId, inc.note)}
                        className="px-2 py-1 rounded bg-zinc-100 hover:bg-rose-100 text-rose-700 font-mono text-[11px] border border-zinc-200 transition-colors"
                      >
                        Hủy đơn (UC-14)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LIVE DELIVERING ORDERS */}
            {deliveringOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 transition-colors space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900">{order.id}</span>
                    <Badge status={order.status} />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">{order.createdAt}</span>
                </div>

                <div className="text-xs space-y-1 text-zinc-600">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Lộ trình:</span>
                    <span className="font-medium text-zinc-800">
                      {order.sender.district} → {order.receiver.district}
                    </span>
                  </div>
                  {order.driver && (
                    <div className="flex justify-between items-baseline font-mono text-[11px]">
                      <span className="text-zinc-400">Tài xế phụ trách:</span>
                      <span className="text-amber-800 font-bold">
                        {order.driver.name} ({order.driver.vehiclePlate})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                  <span className="font-mono text-zinc-900 font-bold">{formatVND(order.totalFee)}</span>
                  <Link
                    href={`/dieu-phoi/don-hang/${order.id}`}
                    className="font-mono text-[11px] text-amber-700 hover:underline font-bold"
                  >
                    Mở bàn can thiệp →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= COLUMN 3: FLEET ROSTER (3 COLS) ================= */}
        <section className="lg:col-span-3 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                Đội Xe Trực Tuyến
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {onlineIdleDrivers.length} rảnh
              </span>
            </div>
            <Link
              href="/dieu-phoi/doi-xe"
              className="text-[10px] font-mono text-zinc-500 hover:text-amber-600"
            >
              TẤT CẢ →
            </Link>
          </div>

          <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-210px)]">
            {drivers.map((driver) => {
              const isIdle = driver.status === "ONLINE_IDLE";
              const isBusy = driver.status === "ONLINE_BUSY";

              return (
                <div
                  key={driver.id}
                  className="p-3 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 transition-colors space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-zinc-900 block">{driver.name}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{driver.vehiclePlate}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        isIdle
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isBusy
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {isIdle ? `RẢNH ${driver.idleSinceMinutes}m` : isBusy ? "ĐANG GIAO" : "OFFLINE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-100">
                    <span>{driver.currentDistrict}</span>
                    <span>COD: {formatVND(driver.codCashHolding)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* MODAL PHÂN CÔNG TÀI XẾ THÔNG MINH (UC-12) */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl shadow-2xl p-6 space-y-5 text-zinc-800">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-amber-700 uppercase tracking-widest block">
                  ĐIỀU PHỐI TÀI XẾ TỨC THÌ (UC-12)
                </span>
                <h3 className="text-base font-bold text-zinc-900 mt-0.5">
                  Phân công tài xế cho đơn {assigningOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="text-zinc-400 hover:text-zinc-600 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Lấy hàng:</span>
                <span className="text-zinc-800 font-sans font-medium">
                  {assigningOrder.sender.street}, {assigningOrder.sender.district}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Giao hàng:</span>
                <span className="text-zinc-800 font-sans font-medium">
                  {assigningOrder.receiver.street}, {assigningOrder.receiver.district}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-200">
                <span className="text-zinc-500">Cự ly & Cước:</span>
                <span className="text-amber-700 font-bold">
                  {assigningOrder.distanceKm} km · {formatVND(assigningOrder.totalFee)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-zinc-700 uppercase">
                Gợi ý tài xế tối ưu (Đang rảnh & gần vị trí lấy hàng):
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {drivers.map((d) => {
                  const isSelected = selectedDriverId === d.id;
                  const isIdle = d.status === "ONLINE_IDLE";

                  return (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/80"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="driverAssign"
                          checked={isSelected}
                          onChange={() => setSelectedDriverId(d.id)}
                          className="text-amber-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-bold text-zinc-900">{d.name}</div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {d.vehiclePlate} · {d.currentDistrict}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <span
                          className={`font-bold block ${
                            isIdle ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {isIdle ? `Rảnh ${d.idleSinceMinutes}m` : "Đang giao"}
                        </span>
                        <span className="text-zinc-400 text-[10px]">Đánh giá: ★{d.rating}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssigningOrder(null)}
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAssignment}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs shadow-2xs"
              >
                XÁC NHẬN PHÂN CÔNG (UC-12)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
