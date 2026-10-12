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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1024px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Breadcrumb & Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <Link
            href="/dieu-phoi"
            className="text-xs font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            ← Quay lại Bàn Điều Phối
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-amber-400">{order.id}</span>
            <Badge status={order.status} />
          </div>
        </div>

        {/* INCIDENT BANNER IF PRESENT */}
        {order.incident && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/80 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>CẢNH BÁO SỰ CỐ ĐIỀU HÀNH: {order.incident.type}</span>
            </div>
            <p className="text-xs text-rose-300 italic">{order.incident.note}</p>
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReassignModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                🔄 Thu hồi & Đổi tài xế khác
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-bold"
              >
                ✕ Hủy đơn hàng
              </Button>
            </div>
          </div>
        )}

        {/* GRID THÔNG TIN ĐƠN HÀNG & LỘ TRÌNH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Thông tin Người gửi */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Điểm lấy hàng (Người gửi)
              </span>
              <a
                href={`tel:${order.sender.phone}`}
                className="text-xs text-blue-400 hover:underline font-bold"
              >
                📞 Gọi người gửi
              </a>
            </div>
            <div className="space-y-1">
              <strong className="text-base text-white block">{order.sender.name}</strong>
              <div className="text-xs text-slate-300 font-mono">{order.sender.phone}</div>
              <div className="text-xs text-slate-300 pt-1">
                {order.sender.street}, {order.sender.district}, {order.sender.city}
              </div>
            </div>
          </section>

          {/* Thông tin Người nhận */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Điểm giao hàng (Người nhận)
              </span>
              <a
                href={`tel:${order.receiver.phone}`}
                className="text-xs text-blue-400 hover:underline font-bold"
              >
                📞 Gọi người nhận
              </a>
            </div>
            <div className="space-y-1">
              <strong className="text-base text-white block">{order.receiver.name}</strong>
              <div className="text-xs text-slate-300 font-mono">{order.receiver.phone}</div>
              <div className="text-xs text-slate-300 pt-1">
                {order.receiver.street}, {order.receiver.district}, {order.receiver.city}
              </div>
              {order.receiver.notes && (
                <div className="text-xs text-amber-300/80 bg-amber-500/10 p-2 rounded-lg mt-2">
                  Ghi chú: {order.receiver.notes}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* THÔNG TIN TÀI XẾ & CƯỚC PHÍ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tài xế phụ trách */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tài xế phụ trách
              </span>
              {order.driver && (
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(true)}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Đổi tài xế
                </button>
              )}
            </div>

            {order.driver ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-base text-white block">{order.driver.name}</strong>
                    <span className="text-xs text-slate-400 font-mono">
                      Mã TX: {order.driver.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-amber-400 block">
                      {order.driver.vehiclePlate}
                    </span>
                    <span className="text-[11px] text-slate-400">{order.driver.vehicleType}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <a
                    href={`tel:${order.driver.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold transition-colors"
                  >
                    📞 Gọi tài xế: {order.driver.phone}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                Chưa gán tài xế cho đơn này.
              </div>
            )}
          </section>

          {/* Cước phí & Thanh toán */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cước phí & Thanh toán
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  order.paid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {order.paid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Cước cơ bản ({order.distanceKm} km):</span>
                <span>{formatVND(order.baseFee)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Phụ thu bưu phẩm:</span>
                <span>{formatVND(order.surchargeFee)}</span>
              </div>
              {order.vipDiscountFee > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Ưu đãi VIP Vàng:</span>
                  <span>-{formatVND(order.vipDiscountFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-amber-400 pt-2 border-t border-slate-800">
                <span>Tổng cước thu:</span>
                <span>{formatVND(order.totalFee)}</span>
              </div>
            </div>

            {!order.paid && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleConfirmCODCollect}
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold text-xs"
                >
                  💵 Xác nhận đã thu tiền mặt COD tại quầy
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* TIMELINE NHẬT KÝ HÀNH TRÌNH ĐƠN HÀNG */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">
            Nhật Ký Hành Trình & Lịch Sử Xử Lý (Audit Trail)
          </h3>

          <div className="space-y-3 text-xs border-l-2 border-slate-800 pl-4 ml-2">
            <div className="space-y-0.5">
              <div className="font-bold text-white">10:15 - Tiếp nhận đơn hàng</div>
              <p className="text-slate-400">Khách hàng đặt giao đơn qua hệ thống Mini Ong Vàng.</p>
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-white">10:18 - Đã phân công tài xế</div>
              <p className="text-slate-400">Tài xế Nguyễn Quốc Bảo chấp nhận cuốc xe.</p>
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-white">10:35 - Đã lấy hàng thành công</div>
              <p className="text-slate-400">Tài xế xác nhận nhận bưu phẩm từ người gửi.</p>
            </div>
            {order.incident && (
              <div className="space-y-0.5 text-rose-300">
                <div className="font-bold text-rose-400">10:55 - Ghi nhận sự cố</div>
                <p>{order.incident.note}</p>
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM CANCEL BUTTON */}
        {order.status !== "DA_HUY" && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="font-bold text-xs"
            >
              Hủy đơn hàng khẩn cấp (UC-14)
            </Button>
          </div>
        )}
      </main>

      {/* MODAL HỦY ĐƠN HÀNG (UC-14) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100">
            <h3 className="text-base font-extrabold text-white">
              Xác nhận hủy đơn hàng {order.id}
            </h3>
            <p className="text-xs text-slate-400">
              Tài xế phụ trách (nếu có) sẽ được giải phóng ngay lập tức về trạng thái rảnh.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Lý do hủy đơn:</label>
              {[
                "Khách yêu cầu hủy qua hotline",
                "Không liên lạc được người nhận nhiều lần",
                "Khách đổi địa chỉ ngoài phạm vi phục vụ",
                "Sự cố bất khả kháng từ tài xế",
              ].map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer ${
                    cancelReason === r
                      ? "border-rose-400 bg-rose-500/10 text-rose-200"
                      : "border-slate-800 bg-slate-800/60 text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="text-rose-500 focus:ring-rose-400"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="border-slate-700 text-slate-300"
              >
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCancel}
              >
                Xác nhận hủy đơn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐIỀU PHỐI LẠI TÀI XẾ (UC-13) */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100">
            <h3 className="text-base font-extrabold text-white">
              Điều phối tài xế mới cho {order.id}
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Chọn tài xế đang rảnh thay thế:
              </label>
              {SAMPLE_DRIVERS.filter((d) => d.status === "ONLINE_IDLE").map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer ${
                    selectedDriverId === d.id
                      ? "border-amber-400 bg-amber-500/10"
                      : "border-slate-800 bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="reassignDriver"
                      checked={selectedDriverId === d.id}
                      onChange={() => setSelectedDriverId(d.id)}
                      className="text-amber-500"
                    />
                    <div>
                      <strong className="text-white block">{d.name}</strong>
                      <span className="text-[11px] text-slate-400">{d.vehiclePlate}</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold text-[10px]">
                    Rảnh {d.idleSinceMinutes}m
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignModalOpen(false)}
                className="border-slate-700 text-slate-300"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReassign}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
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
