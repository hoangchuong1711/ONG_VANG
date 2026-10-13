"use client";

import React, { useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { Button } from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { updateDemoState, useDemoStore, toggleDemoDriverOnline } from "@/lib/demo-store";

export default function DriverWalletPage() {
  const { showToast } = useToast();
  const { state: demo } = useDemoStore();
  const driver = demo.drivers.find((item) => item.id === "TX-DEMO-1");
  const isOnline = driver?.status !== "OFFLINE";
  const balance = driver?.walletBalance ?? 0;
  const codHold = driver?.codCashHolding ?? 0;
  const cashOrders = demo.orders.filter((order) => order.driver?.id === driver?.id &&
    order.paymentMethod === "TIEN_MAT" && order.paid && order.status === "HOAN_TAT");

  // Modal rút tiền
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500000);

  // Modal nộp tiền COD
  const [isPayCodModalOpen, setIsPayCodModalOpen] = useState<boolean>(false);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount > balance) {
      showToast("Số dư ví không đủ để rút số tiền này!", "error");
      return;
    }
    if (withdrawAmount < 50000) return showToast("Số tiền rút tối thiểu là 50.000đ.", "error");
    updateDemoState((previous) => ({ ...previous, drivers: previous.drivers.map((item) =>
      item.id === driver?.id ? { ...item, walletBalance: balance - withdrawAmount } : item) }));
    setIsWithdrawModalOpen(false);
    showToast("Đã ghi nhận yêu cầu rút " + formatVND(withdrawAmount) + " trong demo; chưa chuyển tiền thật.", "info");
  };

  const handlePayCod = () => {
    updateDemoState((previous) => ({ ...previous, drivers: previous.drivers.map((item) =>
      item.id === driver?.id ? { ...item, codSettlementRequested: true } : item) }));
    setIsPayCodModalOpen(false);
    showToast("Đã gửi yêu cầu nộp tiền mặt. Chờ điều phối xác nhận đã nhận tiền.", "info");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => toggleDemoDriverOnline("TX-DEMO-1")} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Ví tài xế & đối soát tiền mặt
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Quản lý thu nhập thực nhận và số tiền COD cần nộp về công ty
          </p>
        </div>

        {/* 2 THẺ TÀI CHÍNH CHÍNH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Số dư thu nhập khả dụng */}
          <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Số dư ví mô phỏng
            </span>
            <div className="text-3xl font-black">
              {formatVND(balance)}
            </div>
            <p className="text-[11px] text-stone-400">
              Chưa kết nối ngân hàng hoặc hệ thống trả thu nhập.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                disabled={balance === 0}
                onClick={() => setIsWithdrawModalOpen(true)}
              >
                Rút tiền về tài khoản ngân hàng
              </Button>
            </div>
          </div>

          {/* Card 2: Tiền COD tạm giữ cần nộp */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Tiền mặt COD đang tạm giữ
            </span>
            <div className="text-3xl font-black text-rose-600">
              {formatVND(codHold)}
            </div>
            <p className="text-[11px] text-stone-500">
              {driver?.codSettlementRequested ? "Đã gửi yêu cầu, đang chờ điều phối xác nhận." : "Tiền thu từ đơn đã giao, đang chờ đối soát."}
            </p>
            <p className="text-[11px] text-stone-400">Số dư mẫu ban đầu có thể gồm các đơn ngoài danh sách đang hiển thị.</p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                disabled={codHold === 0 || driver?.codSettlementRequested}
                onClick={() => setIsPayCodModalOpen(true)}
                className="border-amber-500 text-amber-900 bg-amber-50/50 hover:bg-amber-100 font-bold"
              >
                Yêu cầu đối soát tiền mặt
              </Button>
            </div>
          </div>
        </div>

        {/* LỊCH SỬ BIẾN ĐỘNG SỐ DƯ */}
        <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
            Đơn đã thu tiền mặt
          </h3>

          <div className="divide-y divide-stone-100">
            {cashOrders.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Chưa có đơn đã thu tiền mặt.</p>}
            {cashOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs sm:text-sm text-stone-900">
                      Thu tiền mặt đơn {order.id}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {order.createdAt}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-sm sm:text-base text-emerald-600">{formatVND(order.totalFee)}</span>
                  </div>
                </div>
            ))}
          </div>
        </section>
      </main>

      {/* MODAL RÚT TIỀN */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleWithdraw}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 animate-scaleUp"
          >
            <h3 className="text-base font-extrabold text-stone-900">
              Rút tiền thu nhập về ngân hàng
            </h3>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1">
              <div>Thao tác mô phỏng. Chưa kết nối tài khoản ngân hàng để chuyển tiền.</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Số tiền muốn rút (đ):
              </label>
              <input
                type="number"
                min={50000}
                max={balance}
                step={10000}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 text-base font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Số dư hiện tại: {formatVND(balance)} (Tối thiểu 50.000đ)
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
              >
                Xác nhận rút tiền
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NỘP TIỀN COD */}
      {isPayCodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 animate-scaleUp">
            <h3 className="text-base font-extrabold text-stone-900">
              Yêu cầu nộp tiền mặt
            </h3>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-800">
                Tổng tiền COD cần nộp
              </span>
              <div className="text-2xl font-black text-amber-950">
                {formatVND(codHold)}
              </div>
            </div>

            <p className="text-xs text-stone-500 text-center">
              Gửi yêu cầu để điều phối viên kiểm tra và xác nhận tiền đã nộp. Đây là dữ liệu demo, chưa có chuyển khoản thật.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPayCodModalOpen(false)}
              >
                Để sau
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePayCod}
              >
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        </div>
      )}

      <DriverBottomNav />
    </div>
  );
}
