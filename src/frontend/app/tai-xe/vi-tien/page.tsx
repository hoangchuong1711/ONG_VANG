"use client";

import React, { useState } from "react";
import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { Button } from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const WALLET_LOGS = [
  { id: "TX-GD-104", type: "INCOME", title: "Cước cuốc xe DH-2025-001236", amount: 35700, time: "Hôm nay, 14:15" },
  { id: "TX-GD-103", type: "COD_HOLD", title: "Thu hộ tiền mặt COD DH-2025-001236", amount: 42000, time: "Hôm nay, 14:15" },
  { id: "TX-GD-102", type: "INCOME", title: "Cước cuốc xe DH-2025-001234", amount: 27200, time: "Hôm nay, 11:30" },
  { id: "TX-GD-101", type: "WITHDRAW", title: "Rút tiền về Vietcombank (*8899)", amount: -500000, time: "Hôm qua, 18:00" },
  { id: "TX-GD-100", type: "INCOME", title: "Cước cuốc xe DH-2025-001228", amount: 32300, time: "Hôm qua, 16:45" },
];

export default function DriverWalletPage() {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(1450000);
  const [codHold, setCodHold] = useState<number>(385000);

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
    setBalance(balance - withdrawAmount);
    setIsWithdrawModalOpen(false);
    showToast(`Đã gửi yêu cầu rút ${formatVND(withdrawAmount)} về Vietcombank! Tiền sẽ về trong 5 phút.`, "success");
  };

  const handlePayCod = () => {
    setCodHold(0);
    setIsPayCodModalOpen(false);
    showToast("Đã nộp thành công toàn bộ tiền mặt COD về công ty qua chuyển khoản QR!", "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] pb-24 md:pb-8">
      <DriverNavbar isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} />

      <main className="flex-1 max-w-[768px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Ví tài xế & Đối soát COD (TX-07)
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
              Số dư thu nhập khả dụng
            </span>
            <div className="text-3xl font-black">
              {formatVND(balance)}
            </div>
            <p className="text-[11px] text-stone-400">
              Ngân hàng nhận: Vietcombank · STK: ****8899
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
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
              Hạn mức tối đa được giữ: <strong>2.000.000đ</strong>
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setIsPayCodModalOpen(true)}
                className="border-amber-500 text-amber-900 bg-amber-50/50 hover:bg-amber-100 font-bold"
              >
                Nộp tiền COD về công ty ngay
              </Button>
            </div>
          </div>
        </div>

        {/* LỊCH SỬ BIẾN ĐỘNG SỐ DƯ */}
        <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
            Lịch sử giao dịch gần đây
          </h3>

          <div className="divide-y divide-stone-100">
            {WALLET_LOGS.map((log) => {
              const isPositive = log.amount > 0;
              return (
                <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs sm:text-sm text-stone-900">
                      {log.title}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {log.id} · {log.time}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm sm:text-base ${
                        isPositive ? "text-emerald-600" : "text-stone-900"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatVND(log.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
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
              <div>Ngân hàng: <strong>Vietcombank</strong></div>
              <div>Số tài khoản: <strong>0071000888899</strong> (Trần Minh Tuấn)</div>
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
              Nộp tiền mặt COD về công ty
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
              Quét mã QR qua ứng dụng ngân hàng hoặc ví VNPay để nộp tiền tức thì về tài khoản Mini Ong Vàng.
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
                Xác nhận đã nộp xong
              </Button>
            </div>
          </div>
        </div>
      )}

      <DriverBottomNav />
    </div>
  );
}
