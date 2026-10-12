"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { OrderStatus } from "@/lib/types";
import { formatVND } from "@/lib/utils";

import { useToast } from "@/components/ui/Toast";
import { OrderCardSkeleton, StatsCardSkeleton } from "@/components/ui/Skeleton";

export default function CustomerDashboardKH01() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [isEmptyView, setIsEmptyView] = useState<boolean>(false);
  const [isLoadingView, setIsLoadingView] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState<boolean>(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    showToast(`Đã sao chép mã đơn ${id} vào bộ nhớ tạm!`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateLoading = () => {
    setIsLoadingView(true);
    setTimeout(() => {
      setIsLoadingView(false);
      showToast("Đã tải xong dữ liệu đơn hàng!", "info");
    }, 1200);
  };

  const orders = isEmptyView ? [] : SAMPLE_ORDERS;

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "ALL") return true;
    return order.status === statusFilter;
  });

  // Calculate statistics
  const countDelivering = orders.filter((o) => o.status === "DANG_GIAO").length;
  const countWaiting = orders.filter((o) => o.status === "CHO_GAN").length;
  const countCompleted = orders.filter((o) => o.status === "HOAN_TAT" || o.status === "CHUA_THANH_TOAN").length;
  const unpaidOrder = orders.find((o) => !o.paid && (o.status === "CHUA_THANH_TOAN" || o.status === "HOAN_TAT"));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] antialiased">
      {/* 1. TOP NAVBAR */}
      <Navbar />

      {/* 2. MAIN CONTAINER (Responsive, max-width 1360px centered) */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        
        {/* HERO SECTION: Greeting & Big Mobile-Friendly CTA */}
        <section className="bg-gradient-to-br from-amber-50/90 via-white to-stone-50 border border-amber-200/80 rounded-2xl p-5 sm:p-7 shadow-2xs relative overflow-hidden">
          {/* Subtle honey-comb geometric decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden sm:block">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-500">
              <polygon points="50,15 90,38 90,83 50,105 10,83 10,38" />
              <polygon points="90,38 130,60 130,105 90,127 50,105 50,60" />
            </svg>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold tracking-tight">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                DỊCH VỤ GIAO HÀNG TRONG NGÀY TP.HCM
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight">
                Xin chào, Nguyễn Thu Hà!
              </h1>
              <p className="text-sm sm:text-base text-stone-600 max-w-xl">
                Kiểm tra hành trình đơn hàng hiện tại hoặc tạo nhanh đơn mới chỉ trong 60 giây.
              </p>
            </div>

            {/* Primary Action Button (Touch target 48px+ on mobile) & Quick Demo Tools */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleSimulateLoading}
                className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                title="Giả lập hiệu ứng Skeleton khi tải dữ liệu từ máy chủ"
              >
                <span>⏳</span>
                <span>Giả lập tải (Skeleton)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEmptyView(!isEmptyView)}
                className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                title="Chuyển đổi giao diện khi chưa có đơn hàng"
              >
                <span>📦</span>
                <span>{isEmptyView ? "Xem có đơn mẫu" : "Xem Empty State"}</span>
              </button>

              <Link href="/tao-don" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tạo đơn mới</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* UNPAID WARNING BANNER (Nổi bật nếu có đơn hoàn tất nhưng chưa thanh toán) */}
        {unpaidOrder && !showPaymentSuccess && (
          <section className="bg-red-50/90 border border-red-200 rounded-xl p-4 sm:p-5 shadow-2xs transition-all duration-200 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-red-950">
                      Đơn hàng đã hoàn tất nhưng chưa thanh toán cước phí
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white text-red-700 border border-red-200">
                      {unpaidOrder.id}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-red-800 mt-1">
                    Kiện hàng đã được giao an toàn tới người nhận. Số tiền cần thanh toán:{" "}
                    <strong className="font-extrabold text-red-950 text-base">{formatVND(unpaidOrder.totalFee)}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Link href={`/theo-doi/${unpaidOrder.id}`}>
                  <Button variant="outline" size="sm" className="bg-white border-red-200 text-red-800">
                    Xem chi tiết
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setShowPaymentSuccess(true);
                    setTimeout(() => setShowPaymentSuccess(false), 4000);
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Thanh toán VNPay ngay</span>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Payment Success Toast */}
        {showPaymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-emerald-600 text-base">✓</span>
            Giao dịch thanh toán sandbox qua VNPay thành công! Đơn hàng đã được cập nhật trạng thái &quot;Đã thanh toán&quot;.
          </div>
        )}

        {/* 3 QUICK STATS CARDS: Đang giao, Chờ gán, Hoàn tất */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5" aria-label="Tóm tắt đơn hàng">
          {isLoadingView ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              {/* Card 1: Đang giao */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover:border-amber-300 transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Đơn đang giao
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                    {String(countDelivering).padStart(2, "0")}
                  </div>
                  <p className="text-[11px] text-stone-500">Tài xế đang trên đường vận chuyển</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Chờ gán tài xế */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover:border-amber-300 transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Đơn chờ gán
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                    {String(countWaiting).padStart(2, "0")}
                  </div>
                  <p className="text-[11px] text-stone-500">Đang chờ điều phối viên xếp xe</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Đã hoàn tất */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover:border-amber-300 transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Đã hoàn tất
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                    {String(countCompleted).padStart(2, "0")}
                  </div>
                  <p className="text-[11px] text-stone-500">Giao hàng thành công</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 4. RECENT ORDERS SECTION */}
        <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-5">
          {/* Section Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                Danh sách đơn hàng gần đây
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Xem tình trạng bưu kiện, lịch trình vận chuyển và thông tin cước phí
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                [
                  { key: "ALL", label: "Tất cả" },
                  { key: "DANG_GIAO", label: "Đang giao" },
                  { key: "CHO_GAN", label: "Chờ gán" },
                  { key: "CHUA_THANH_TOAN", label: "Chưa trả" },
                  { key: "HOAN_TAT", label: "Hoàn tất" },
                ] as const
              ).map((f) => {
                const isSelected = statusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-stone-900 text-white font-bold"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIST VIEW / SKELETON / EMPTY STATE */}
          {isLoadingView ? (
            <div className="space-y-3.5">
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </div>
          ) : filteredOrders.length === 0 ? (
            /* EMPTY STATE VIEW */
            <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  Chưa có đơn hàng nào
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  {isEmptyView
                    ? "Bạn chưa tạo đơn hàng nào gần đây. Hãy gửi kiện hàng đầu tiên để trải nghiệm dịch vụ giao siêu tốc của Mini Ong Vàng."
                    : "Không có đơn hàng nào khớp với bộ lọc đã chọn."}
                </p>
              </div>
              <Link href="/tao-don">
                <Button variant="primary">
                  Tạo đơn hàng ngay
                </Button>
              </Link>
            </div>
          ) : (
            /* LIST OF ORDERS: Mobile Single-Column Card & Desktop Structured Rows */
            <div className="space-y-3.5">
              {filteredOrders.map((order) => {
                const isUnpaid = !order.paid && (order.status === "CHUA_THANH_TOAN" || order.status === "HOAN_TAT");

                return (
                  <article
                    key={order.id}
                    className={`border rounded-xl p-4 sm:p-5 transition-all duration-150 hover:shadow-md ${
                      isUnpaid
                        ? "bg-red-50/30 border-red-200 hover:border-red-300"
                        : "bg-white border-stone-200 hover:border-amber-300"
                    }`}
                  >
                    {/* Top line of Card: Code + Time + Status Badge + Copy Button */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm sm:text-base text-stone-900">
                          {order.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(order.id)}
                          className="p-1 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                          title="Sao chép mã đơn"
                          aria-label={`Sao chép mã đơn ${order.id}`}
                        >
                          {copiedId === order.id ? (
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-500 font-medium">
                          {order.createdAt}
                        </span>
                      </div>

                      <Badge status={order.status} isUnpaid={isUnpaid} />
                    </div>

                    {/* Middle: Pickup and Drop-off Route (Timeline Layout) */}
                    <div className="py-3 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                      {/* Timeline Route */}
                      <div className="md:col-span-7 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 flex flex-col items-center shrink-0 mt-0.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                            <span className="w-0.5 h-6 bg-stone-200" />
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              Lấy hàng
                            </span>
                            <span className="font-semibold text-stone-900">{order.sender.street}</span>,{" "}
                            <span className="text-stone-500">{order.sender.district}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="w-5 flex flex-col items-center shrink-0 mt-0.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                              Giao hàng đến
                            </span>
                            <span className="font-semibold text-stone-900">{order.receiver.street}</span>,{" "}
                            <span className="text-stone-500">{order.receiver.district}</span>
                          </div>
                        </div>
                      </div>

                      {/* Receiver and Package Type */}
                      <div className="md:col-span-3 text-xs space-y-1 bg-stone-50/70 p-2.5 rounded-lg border border-stone-100">
                        <div>
                          <span className="text-stone-500">Người nhận:</span>{" "}
                          <strong className="text-stone-800">{order.receiver.name}</strong> ({order.receiver.phone})
                        </div>
                        <div>
                          <span className="text-stone-500">Hàng hóa:</span>{" "}
                          <span className="font-medium text-stone-700">{order.packageType}</span>
                        </div>
                      </div>

                      {/* Fee and Action Button */}
                      <div className="md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-semibold text-stone-400 block">Cước phí</span>
                          <span className="text-base sm:text-lg font-black text-stone-900">
                            {formatVND(order.totalFee)}
                          </span>
                        </div>

                        <Link href={`/theo-doi/${order.id}`}>
                          <Button variant="outline" size="sm">
                            Theo dõi tiến độ →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. FOOTER */}
        <footer className="pt-4 pb-12 text-center text-xs text-stone-400 space-y-1">
          <p>
            Phân hệ Khách hàng <strong>Mini Ong Vàng</strong> · Thiết kế theo chuẩn Figma và kỹ năng Design Taste Frontend.
          </p>
          <p className="text-[11px] text-stone-400">
            Dữ liệu minh họa (Sample Data) · Responsive 320px đến 1920px
          </p>
        </footer>
      </main>
    </div>
  );
}
