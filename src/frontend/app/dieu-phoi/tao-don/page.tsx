"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 5",
  "Quận 7",
  "Quận 10",
  "Quận Bình Thạnh",
];

const PACKAGE_TYPES = [
  "Tài liệu & Hợp đồng hỏa tốc",
  "Đồ ăn & Thực phẩm giao nhanh",
  "Mỹ phẩm & Dược phẩm",
  "Hàng điện tử & Phụ kiện",
  "Quần áo thời trang",
  "Khác",
];

export default function DispatcherCreateOrderPage() {
  const { showToast } = useToast();
  const router = useRouter();

  // Khách hàng gọi đến
  const [callerPhone, setCallerPhone] = useState("0900000001");
  const [senderName, setSenderName] = useState("Nguyễn Thu Hà");
  const [senderStreet, setSenderStreet] = useState("123 Nguyễn Văn Linh");
  const [senderDistrict, setSenderDistrict] = useState("Quận 7");
  const [isVipMember, setIsVipMember] = useState(true);

  // Người nhận
  const [receiverName, setReceiverName] = useState("Lê Hoàng Phúc");
  const [receiverPhone, setReceiverPhone] = useState("0912345678");
  const [receiverStreet, setReceiverStreet] = useState("45 Nguyễn Huệ");
  const [receiverDistrict, setReceiverDistrict] = useState("Quận 1");
  const [receiverNotes, setReceiverNotes] = useState("Giao tận tay trong giờ hành chính");

  // Kiện hàng
  const [packageType, setPackageType] = useState(PACKAGE_TYPES[0]);
  const [weightKg, setWeightKg] = useState<number>(0.5);
  const [paymentMethod, setPaymentMethod] = useState<"TIEN_MAT" | "VNPAY">("TIEN_MAT");

  // Snapshot cước ước tính (UC-04 / UC-05)
  const distanceKm = 4.2;
  const baseFee = 45000;
  const surchargeFee = weightKg > 2 ? 15000 : 0;
  const vipDiscount = isVipMember ? 10000 : 0;
  const totalFee = Math.max(0, baseFee + surchargeFee - vipDiscount);

  // Tìm kiếm khách hàng theo SĐT (UC-02)
  const handleLookupCustomer = (phoneInput: string) => {
    setCallerPhone(phoneInput);
    if (phoneInput === "0900000001") {
      setSenderName("Nguyễn Thu Hà");
      setSenderStreet("123 Nguyễn Văn Linh");
      setSenderDistrict("Quận 7");
      setIsVipMember(true);
      showToast("Đã tìm thấy hồ sơ: Nguyễn Thu Hà (Hạng VIP Vàng)", "success");
    } else if (phoneInput === "0900000002") {
      setSenderName("Trần Văn Bình");
      setSenderStreet("56 Nguyễn Đình Chiểu");
      setSenderDistrict("Quận 3");
      setIsVipMember(false);
      showToast("Đã tìm thấy hồ sơ: Trần Văn Bình (Khách hàng Thường)", "info");
    } else {
      setSenderName("");
      setSenderStreet("");
      setIsVipMember(false);
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderName || !receiverName || !receiverPhone || !receiverStreet) {
      showToast("Vui lòng điền đầy đủ thông tin người gửi và người nhận!", "error");
      return;
    }

    const orderId = `DH-2025-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(
      `Tạo đơn hotline thành công (${orderId})! Đã chuyển vào hàng đợi chờ gán tài xế.`,
      "success"
    );

    setTimeout(() => {
      router.push("/dieu-phoi");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-200">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1120px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                HOTLINE INTAKE (UC-02)
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Tiếp Nhận Cuộc Gọi Tạo Đơn Nhanh
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Tra cứu hồ sơ khách hàng theo SĐT, tự động tính cước snapshot và đẩy vào hàng đợi tác chiến.
            </p>
          </div>

          <Link
            href="/dieu-phoi"
            className="text-xs font-mono font-medium text-zinc-400 hover:text-amber-400 transition-colors"
          >
            ← BÀN ĐIỀU PHỐI
          </Link>
        </div>

        <form onSubmit={handleCreateOrder} className="space-y-6">
          {/* STEP 1: KHÁCH HÀNG GỌI ĐẾN */}
          <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                1. Thông tin khách gọi đến (Người gửi)
              </span>
              {isVipMember && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  HỘI VIÊN VIP VÀNG (GIẢM 10.000Đ)
                </span>
              )}
            </div>

            {/* Quick lookup by phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Số điện thoại khách gọi:
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="tel"
                  required
                  value={callerPhone}
                  onChange={(e) => handleLookupCustomer(e.target.value)}
                  placeholder="Ví dụ: 0900000001"
                  className="flex-1 h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs focus:border-amber-400 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000001")}
                  className="h-10 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-amber-400 border border-zinc-700 transition-colors"
                >
                  Mẫu VIP (Thu Hà)
                </button>
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000002")}
                  className="h-10 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-300 border border-zinc-700 transition-colors"
                >
                  Mẫu Thường
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Họ tên người gửi:
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Địa chỉ lấy hàng:
                </label>
                <input
                  type="text"
                  required
                  value={senderStreet}
                  onChange={(e) => setSenderStreet(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Quận huyện:
                </label>
                <select
                  value={senderDistrict}
                  onChange={(e) => setSenderDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* STEP 2: ĐIỂM GIAO HÀNG (NGƯỜI NHẬN) */}
          <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 block border-b border-zinc-800/80 pb-3">
              2. Điểm giao hàng (Người nhận)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Họ tên người nhận:
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Số điện thoại người nhận:
                </label>
                <input
                  type="tel"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Địa chỉ chi tiết:
                </label>
                <input
                  type="text"
                  required
                  value={receiverStreet}
                  onChange={(e) => setReceiverStreet(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Quận huyện giao:
                </label>
                <select
                  value={receiverDistrict}
                  onChange={(e) => setReceiverDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Ghi chú điều phối cho tài xế:
              </label>
              <input
                type="text"
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
              />
            </div>
          </section>

          {/* STEP 3: KIỆN HÀNG & BÁO GIÁ CƯỚC TỨC THÌ */}
          <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 block border-b border-zinc-800/80 pb-3">
              3. Kiện hàng & Tính cước tức thì (UC-04 / UC-05)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Phân loại bưu phẩm:
                </label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Khối lượng (kg):
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Phương thức thanh toán:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "TIEN_MAT" | "VNPAY")}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs focus:border-amber-400 focus:outline-hidden"
                >
                  <option value="TIEN_MAT">Tiền mặt COD khi giao</option>
                  <option value="VNPAY">Cổng VNPay trực tuyến</option>
                </select>
              </div>
            </div>

            {/* BẢNG TÍNH CƯỚC TELEMETRY */}
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="space-y-1 text-zinc-400">
                <div>Khoảng cách dự kiến: <span className="text-zinc-200 font-bold">{distanceKm} km</span></div>
                <div>Cước cơ bản: <span className="text-zinc-200 font-bold">{formatVND(baseFee)}</span></div>
                {vipDiscount > 0 && (
                  <div className="text-emerald-400">Giảm hội viên VIP: <strong>-{formatVND(vipDiscount)}</strong></div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Tổng cước thanh toán
                </span>
                <span className="text-2xl font-black text-amber-400">
                  {formatVND(totalFee)}
                </span>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dieu-phoi">
              <Button variant="outline" size="md" className="border-zinc-800 text-zinc-400 hover:text-zinc-200">
                HỦY BỎ
              </Button>
            </Link>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs h-11 px-6 tracking-wide"
            >
              TẠO ĐƠN & ĐẨY VÀO HÀNG ĐỢI ĐIỀU PHỐI ➔
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
