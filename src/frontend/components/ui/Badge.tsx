import React from "react";
import { OrderStatus } from "@/lib/types";

interface BadgeProps {
  status: OrderStatus;
  isUnpaid?: boolean;
  className?: string;
}

export function Badge({ status, isUnpaid, className = "" }: BadgeProps) {
  if (isUnpaid || status === "CHUA_THANH_TOAN") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
        Chờ thanh toán
      </span>
    );
  }

  switch (status) {
    case "CHO_GAN":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Chờ gán tài xế
        </span>
      );
    case "DA_GAN":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Đã gán tài xế
        </span>
      );
    case "DA_LAY_HANG":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Đã lấy hàng
        </span>
      );
    case "DANG_GIAO":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Đang giao hàng
        </span>
      );
    case "HOAN_TAT":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Đã hoàn tất
        </span>
      );
    case "DA_HUY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
          Đã hủy
        </span>
      );
    default:
      return null;
  }
}
