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

  // Thống kê nhanh
  const pendingOrders = orders.filter((o) => o.status === "CHO_GAN");
  const deliveringOrders = orders.filter(
    (o) => o.status === "DA_GAN" || o.status === "DA_LAY_HANG" || o.status === "DANG_GIAO"
  );
  const onlineIdleDrivers = drivers.filter((d) => d.status === "ONLINE_IDLE");
  const onlineBusyDrivers = drivers.filter((d) => d.status === "ONLINE_BUSY");

  // Mở modal gán tài xế
  const handleOpenAssignModal = (order: OrderItem) => {
    setAssigningOrder(order);
    // Tự động chọn tài xế rảnh tối ưu nhất
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

    // Cập nhật trạng thái đơn sang DA_GAN
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

    // Cập nhật trạng thái tài xế sang ONLINE_BUSY
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

  // Giải quyết sự cố: Đổi tài xế khác (Reassign)
  const handleReassignIncidentOrder = (orderId: string) => {
    // Trả đơn về CHO_GAN
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
    // Xóa sự cố khỏi danh sách chờ xử lý
    setIncidents((prev) => prev.filter((i) => i.orderId !== orderId));
    showToast(`Đã thu hồi đơn ${orderId} về hàng đợi chờ gán để phân công tài xế mới!`, "info");
  };

  // Hủy đơn hàng từ phía điều phối (UC-14)
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
    showToast(`Ting ting! Tiếp nhận 01 đơn hỏa tốc mới (${newId}) đưa vào hàng đợi!`, "info");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DispatcherNavbar
        pendingCount={pendingOrders.length}
        incidentCount={incidents.filter((i) => i.status === "CHO_XU_LY").length}
      />

      {/* TOP METRICS & QUICK ACTIONS BAR */}
      <section className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-slate-400">Đơn chờ gán:</span>
              <strong className="text-base font-black text-amber-400">{pendingOrders.length}</strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-slate-400">Đang thực hiện:</span>
              <strong className="text-base font-black text-blue-400">{deliveringOrders.length}</strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Tài xế rảnh:</span>
              <strong className="text-base font-black text-emerald-400">
                {onlineIdleDrivers.length} / {drivers.length}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-slate-400">Sự cố khẩn:</span>
              <strong className="text-base font-black text-rose-400">{incidents.length}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition-colors"
            >
              ⚡ Nhận đơn hotline mô phỏng
            </button>
            <Link
              href="/dieu-phoi/tao-don"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors"
            >
              + Tạo đơn thủ công
            </Link>
          </div>
        </div>
      </section>

      {/* MAIN 3-COLUMN KANBAN DISPATCH COMMAND CENTER */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* ========================================================================= */}
        {/* CỘT 1: HÀNG ĐỢI ĐƠN CHỜ GÁN (CHO_GAN)                                     */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                1. Đơn Chờ Gán ({pendingOrders.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Auto-Queue
            </span>
          </div>

          <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Hiện không có đơn nào chờ gán.
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-4 space-y-3 transition-colors shadow-2xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-amber-400">
                        {order.id}
                      </span>
                      <span className="text-slate-400 text-xs">· {order.createdAt}</span>
                    </div>
                    <span className="text-sm font-black text-slate-100">
                      {formatVND(order.totalFee)}
                    </span>
                  </div>

                  {/* Route points */}
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-slate-400 font-semibold">Lấy: </span>
                        <strong>{order.sender.street}</strong> ({order.sender.district})
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-amber-300 font-semibold">Giao: </span>
                        <strong>{order.receiver.street}</strong> ({order.receiver.district})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px] text-slate-400">
                    <span>
                      📦 {order.packageType} ({order.distanceKm} km)
                    </span>
                    <span className="font-mono text-amber-400/90 font-bold">
                      {order.paymentMethod === "TIEN_MAT" ? "COD Tiền mặt" : "VNPay"}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleOpenAssignModal(order)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-9 text-xs"
                    >
                      ⚡ GÁN TÀI XẾ THÔNG MINH
                    </Button>
                    <Link
                      href={`/dieu-phoi/don-hang/${order.id}`}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700/80 text-slate-300 text-xs font-bold"
                      title="Xem chi tiết đơn"
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
        {/* CỘT 2: ĐANG THỰC HIỆN & SỰ CỐ KHẨN (IN PROGRESS & INCIDENTS)             */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                2. Đang Giao & Sự Cố ({deliveringOrders.length})
              </h2>
            </div>
            {incidents.length > 0 && (
              <span className="text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 animate-pulse">
                ⚠️ {incidents.length} sự cố
              </span>
            )}
          </div>

          <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {/* CÁC THẺ SỰ CỐ KHẨN CẤP ĐƯỢC ƯU TIÊN LÊN TRÊN CÙNG */}
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-rose-950/40 border-2 border-rose-500 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-md animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-mono font-black text-sm text-rose-400">
                      {inc.orderId}
                    </span>
                    <span className="text-[10px] uppercase font-black bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded border border-rose-400/50">
                      SỰ CỐ KHẨN
                    </span>
                  </div>
                  <span className="text-xs text-rose-300 font-mono">{inc.reportedAt}</span>
                </div>

                <div className="bg-rose-900/30 p-2.5 rounded-lg border border-rose-800/60 space-y-1">
                  <strong className="text-xs text-rose-200 block">⚠️ {inc.type}</strong>
                  <p className="text-[11px] text-rose-300 italic">{inc.note}</p>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    Tài xế báo: <strong>{inc.driverName}</strong> ({inc.driverPhone})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReassignIncidentOrder(inc.orderId)}
                    className="py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  >
                    🔄 Đổi tài xế khác
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(inc.orderId, inc.type)}
                    className="py-1.5 px-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
                  >
                    ✕ Hủy đơn hàng
                  </button>
                </div>
              </div>
            ))}

            {/* CÁC ĐƠN ĐANG GIAO BÌNH THƯỜNG */}
            {deliveringOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-4 space-y-3 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-100">
                      {order.id}
                    </span>
                    <Badge status={order.status} />
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    {formatVND(order.totalFee)}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <div className="truncate">
                    <span className="text-slate-400">Từ:</span> {order.sender.street}
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Đến:</span> {order.receiver.street}
                  </div>
                </div>

                {order.driver && (
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tài xế phụ trách:</span>
                      <strong className="text-slate-200">{order.driver.name}</strong>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-amber-400 text-[11px] block">
                        {order.driver.vehiclePlate}
                      </span>
                      <a
                        href={`tel:${order.driver.phone}`}
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        📞 Gọi {order.driver.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-end">
                  <Link
                    href={`/dieu-phoi/don-hang/${order.id}`}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Xem toàn trình đơn hàng ➔
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CỘT 3: ĐỘI XE & TÀI XẾ TRỰC TUYẾN (LIVE FLEET MONITORING)                */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                3. Đội Xe Trực Tuyến ({drivers.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-bold">{onlineIdleDrivers.length} rảnh</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-bold">{onlineBusyDrivers.length} bận</span>
            </div>
          </div>

          <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {drivers.map((driver) => {
              const isIdle = driver.status === "ONLINE_IDLE";
              const isBusy = driver.status === "ONLINE_BUSY";

              return (
                <div
                  key={driver.id}
                  className={`border rounded-xl p-3.5 space-y-2.5 transition-colors ${
                    isIdle
                      ? "bg-slate-800/90 border-emerald-500/40 hover:border-emerald-400"
                      : isBusy
                      ? "bg-slate-800/60 border-amber-500/30"
                      : "bg-slate-900/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isIdle
                            ? "bg-emerald-400 animate-pulse"
                            : isBusy
                            ? "bg-amber-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <strong className="text-sm text-slate-100">{driver.name}</strong>
                      <span className="font-mono text-[10px] text-slate-400">({driver.id})</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isIdle
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : isBusy
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isIdle
                        ? `Rảnh (${driver.idleSinceMinutes}m)`
                        : isBusy
                        ? "Đang giao hàng"
                        : "Tạm nghỉ"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Khu vực:</span>
                      <strong>{driver.currentDistrict}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Biển số:</span>
                      <span className="font-mono font-semibold">{driver.vehiclePlate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/50 text-slate-400">
                    <span>★ {driver.rating} ({driver.completedOrdersToday} cuốc)</span>
                    <span>Tỷ lệ nhận: {driver.acceptanceRate}%</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Phân công tài xế (UC-12)
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Đơn hàng: {assigningOrder.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Order snapshot */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
              <div>
                Lấy hàng: <strong>{assigningOrder.sender.street}</strong> ({assigningOrder.sender.district})
              </div>
              <div>
                Giao đến: <strong>{assigningOrder.receiver.street}</strong> ({assigningOrder.receiver.district})
              </div>
              <div className="pt-1 text-amber-400 font-bold">
                Cước phí: {formatVND(assigningOrder.totalFee)} ({assigningOrder.distanceKm} km)
              </div>
            </div>

            {/* Driver Recommendation List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Gợi ý tài xế trực tuyến phù hợp nhất:
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {drivers
                  .filter((d) => d.status === "ONLINE_IDLE")
                  .map((driver) => (
                    <label
                      key={driver.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedDriverId === driver.id
                          ? "border-amber-400 bg-amber-500/10"
                          : "border-slate-800 bg-slate-800/60 hover:bg-slate-800"
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
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{driver.name}</span>
                            <span className="text-[10px] text-amber-400">★ {driver.rating}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {driver.vehiclePlate} · {driver.currentDistrict}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 block">
                          Rảnh {driver.idleSinceMinutes} phút
                        </span>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssigningOrder(null)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAssignment}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
              >
                XÁC NHẬN GÁN TÀI XẾ ➔
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
