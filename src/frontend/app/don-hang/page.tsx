"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OrderStatus } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { OrderCardSkeleton } from "@/components/ui/Skeleton";

type DateFilter = "ALL" | "TODAY" | "7_DAYS" | "30_DAYS";

export default function MyOrdersPage() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    showToast(`Đã sao chép mã đơn ${id} vào bộ nhớ tạm!`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast("Đã làm mới danh sách đơn hàng!", "info");
    }, 800);
  };

  // Filter orders
  const filteredOrders = SAMPLE_ORDERS.filter((order) => {
    // 1. Status filter
    if (statusFilter !== "ALL" && order.status !== statusFilter) {
      return false;
    }

    // 2. Date filter (demo simulation using order id/timestamp)
    if (dateFilter === "TODAY") {
      // Cho là đơn DH-2025-001234 và 001235 là hôm nay
      if (!order.id.endsWith("234") && !order.id.endsWith("235")) {
        return false;
      }
    } else if (dateFilter === "7_DAYS") {
      // 7 ngày qua: loại bỏ đơn quá cũ
      if (order.id.endsWith("231")) {
        return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchReceiver = order.receiver.name.toLowerCase().includes(q);
      const matchAddress = order.receiver.street.toLowerCase().includes(q);
      return matchId || matchReceiver || matchAddress;
    }
    return true;
  });

  const totalSpent = SAMPLE_ORDERS.reduce((sum, o) => sum + (o.paid ? o.totalFee : 0), 0);

  // Status counts for tabs
  const getCountForStatus = (status: "ALL" | OrderStatus) => {
    if (status === "ALL") return SAMPLE_ORDERS.length;
    return SAMPLE_ORDERS.filter((o) => o.status === status).length;
  };

  const resetFilters = () => {
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header & Thống kê chi tiêu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
              LỊCH SỬ GIAO HÀNG
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Đơn hàng của tôi (K6 / UC-19)
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Quản lý danh sách đơn hàng đã gửi, theo dõi tiến trình và hóa đơn cước phí
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateLoading}
              className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <div className="flex items-center gap-4 bg-white border border-stone-200 p-3 sm:p-4 rounded-xl shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Tổng chi tiêu
                </span>
                <span className="text-base sm:text-lg font-black text-amber-600">
                  {formatVND(totalSpent)}
                </span>
              </div>
              <div className="w-px h-8 bg-stone-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Tổng đơn
                </span>
                <span className="text-base sm:text-lg font-black text-stone-900">
                  {SAMPLE_ORDERS.length} đơn
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bộ lọc & Tìm kiếm */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Ô tìm kiếm */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Tìm theo mã đơn (DH-...), tên người nhận, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
              <svg
                className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lọc thời gian nhanh */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-xs text-stone-400 font-semibold shrink-0 mr-1">Thời gian:</span>
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "TODAY", label: "Hôm nay" },
                { key: "7_DAYS", label: "7 ngày qua" },
                { key: "30_DAYS", label: "30 ngày qua" },
              ].map((df) => (
                <button
                  key={df.key}
                  onClick={() => setDateFilter(df.key as DateFilter)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    dateFilter === df.key
                      ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                      : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab lọc trạng thái với đếm số lượng */}
          <div className="pt-3 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { key: "ALL", label: "Tất cả" },
                { key: "DANG_GIAO", label: "Đang giao" },
                { key: "CHO_GAN", label: "Chờ gán" },
                { key: "CHUA_THANH_TOAN", label: "Chờ thanh toán" },
                { key: "HOAN_TAT", label: "Hoàn tất" },
              ] as const
            ).map((f) => {
              const count = getCountForStatus(f.key);
              const isActive = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-stone-900 text-white font-bold shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-stone-700 text-amber-300" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bảng / Danh sách đơn hàng */}
        {isLoading ? (
          <div className="space-y-3.5">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center font-bold text-lg">
              🔍
            </div>
            <h3 className="font-bold text-stone-800 text-base">
              Không tìm thấy đơn hàng phù hợp
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Không có đơn hàng nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Xóa tất cả bộ lọc
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-stone-200 hover:border-amber-300 rounded-xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-xs text-stone-400 font-medium">{order.createdAt}</span>
                    <Badge status={order.status} isUnpaid={!order.paid && order.status === "HOAN_TAT"} />
                  </div>

                  {/* Lộ trình */}
                  <div className="text-xs space-y-1 text-stone-600">
                    <div>
                      <span className="text-stone-400">Lấy hàng:</span>{" "}
                      <strong>{order.sender.street}, {order.sender.district}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400">Giao đến:</span>{" "}
                      <strong>{order.receiver.street}, {order.receiver.district}</strong> ({order.receiver.name} - {order.receiver.phone})
                    </div>
                  </div>
                </div>

                {/* Cước phí & Action */}
                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-stone-400 block font-semibold">CƯỚC PHÍ</span>
                    <span className="text-base sm:text-lg font-black text-amber-600">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
