"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SAMPLE_ORDERS } from "@/lib/sample-data";
import { OrderItem } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type PaymentMethod = "VNPAY" | "COD";
type PaymentState = "SELECTION" | "PROCESSING" | "SUCCESS" | "FAILURE";

export default function PaymentPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const orderId = (params?.id as string) || "DH-2025-001231";

  const order: OrderItem =
    SAMPLE_ORDERS.find((o) => o.id === orderId) || {
      ...SAMPLE_ORDERS[0],
      id: orderId,
      paid: false,
    };

  const [method, setMethod] = useState<PaymentMethod>("VNPAY");
  const [state, setState] = useState<PaymentState>("SELECTION");
  const [txnCode, setTxnCode] = useState<string>("");

  const handlePay = (simulateError = false) => {
    setState("PROCESSING");

    setTimeout(() => {
      if (simulateError) {
        setState("FAILURE");
        showToast("Giao dịch thanh toán chưa thành công (Mã lỗi VNP-99)", "error");
      } else {
        const generatedTxn = `VNP${Date.now().toString().slice(-8)}`;
        setTxnCode(generatedTxn);
        setState("SUCCESS");
        showToast("Thanh toán cước phí thành công qua VNPay Sandbox!", "success");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[800px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <div className="space-y-1">
          <Link
            href={`/theo-doi/${order.id}`}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1"
          >
            ← Quay lại chi tiết đơn hàng
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900">
              Thanh toán cước vận chuyển (K7)
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {order.id}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATE 1: SELECTION (K7)                                                   */}
        {/* ========================================================================= */}
        {state === "SELECTION" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Order Summary Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Thông tin đơn hàng
                </span>
                <Badge status={order.status} isUnpaid={!order.paid} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block">Nơi lấy hàng:</span>
                  <strong className="text-stone-800">{order.sender.street}, {order.sender.district}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Nơi giao hàng:</span>
                  <strong className="text-stone-800">{order.receiver.street}, {order.receiver.district}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Tổng số tiền cần thanh toán</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-600">
                    {formatVND(order.totalFee)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-stone-400">
                  Đã bao gồm VAT &<br />phụ phí xăng dầu
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-stone-900">
                Chọn phương thức thanh toán
              </h3>

              <div className="space-y-3">
                {/* Method 1: VNPay */}
                <label
                  onClick={() => setMethod("VNPAY")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    method === "VNPAY"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-200"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={method === "VNPAY"}
                    onChange={() => setMethod("VNPAY")}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">
                        Cổng VNPay Sandbox (VNPAY-QR / Thẻ ATM / Visa)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Khuyên dùng
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Thanh toán trực tuyến bảo mật, xác nhận tức thì và tự động gửi hóa đơn điện tử vào email.
                    </p>
                  </div>
                </label>

                {/* Method 2: COD */}
                <label
                  onClick={() => setMethod("COD")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    method === "COD"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-200"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={method === "COD"}
                    onChange={() => setMethod("COD")}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-stone-900 text-sm">
                      Tiền mặt trực tiếp cho Tài xế (COD)
                    </span>
                    <p className="text-xs text-stone-500">
                      Tài xế Mini Ong Vàng sẽ thu tiền mặt khi giao kiện hàng đến tay người nhận.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePay(true)}
                className="text-stone-500 hover:text-stone-800 text-xs w-full sm:w-auto"
                title="Mô phỏng trường hợp giao dịch bị từ chối hoặc lỗi mạng (K8-E)"
              >
                ⚡ Thử trường hợp Lỗi thanh toán (K8-E)
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href={`/theo-doi/${order.id}`} className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" fullWidth>
                    Để sau
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handlePay(false)}
                >
                  {method === "VNPAY" ? "Xác nhận & Thanh toán VNPay" : "Xác nhận chọn Tiền mặt"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 2: PROCESSING SIMULATION                                            */}
        {/* ========================================================================= */}
        {state === "PROCESSING" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
            <div className="w-14 h-14 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin mx-auto" />
            <h3 className="text-lg font-extrabold text-stone-900">
              Đang kết nối cổng thanh toán...
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Vui lòng không tắt hoặc tải lại trang web trong quá trình giao dịch được xử lý.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 3: K8-S - THÀNH CÔNG                                                */}
        {/* ========================================================================= */}
        {state === "SUCCESS" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-2xs animate-scaleUp">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                GIAO DỊCH THÀNH CÔNG (K8-S)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                Thanh toán hoàn tất!
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Cảm ơn bạn đã thanh toán cước phí vận chuyển cho đơn hàng <strong>{order.id}</strong>.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="max-w-md mx-auto bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-stone-400">Mã giao dịch VNPay:</span>
                <span className="font-mono font-bold text-stone-900">{txnCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Số tiền đã trả:</span>
                <span className="font-black text-amber-600 text-sm">{formatVND(order.totalFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Phương thức:</span>
                <span className="font-semibold text-stone-800">
                  {method === "VNPAY" ? "VNPay Sandbox" : "Tiền mặt COD"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Thời gian ghi nhận:</span>
                <span className="text-stone-700">Hôm nay, 14:45</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={`/danh-gia/${order.id}`} className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  Đánh giá tài xế (Nhận 50 xu) →
                </Button>
              </Link>
              <Link href={`/theo-doi/${order.id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  Xem chi tiết đơn hàng
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 4: K8-E - THẤT BẠI / LỖI                                             */}
        {/* ========================================================================= */}
        {state === "FAILURE" && (
          <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-2xs animate-scaleUp">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                GIAO DỊCH CHƯA THÀNH CÔNG (K8-E)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                Thanh toán thất bại
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Giao dịch của bạn đã bị hủy hoặc hệ thống ngân hàng bị gián đoạn (Mã lỗi: <code>VNP-99</code>). Tài khoản của bạn chưa bị trừ tiền.
              </p>
            </div>

            {/* Assistance card */}
            <div className="max-w-md mx-auto bg-rose-50/50 border border-rose-200 rounded-xl p-4 text-xs space-y-1.5 text-left text-rose-900">
              <div className="font-bold">Gợi ý khắc phục:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                <li>Kiểm tra lại số dư thẻ ngân hàng hoặc kết nối Internet.</li>
                <li>Chọn chuyển sang phương thức tiền mặt trực tiếp cho tài xế (COD).</li>
                <li>Liên hệ tổng đài <strong>1900 6868</strong> để được hỗ trợ kiểm tra.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setState("SELECTION")}
                className="w-full sm:w-auto"
              >
                Thử thanh toán lại
              </Button>
              <Link href={`/theo-doi/${order.id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  Quay lại đơn hàng
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
