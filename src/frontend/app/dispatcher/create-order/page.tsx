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
      router.push("/dispatcher");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1100px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="shrink-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5 whitespace-nowrap">
              HOTLINE TIẾP NHẬN (UC-02)
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Tiếp Nhận Cuộc Gọi Tạo Đơn Nhanh
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Tra cứu hồ sơ khách hàng theo SĐT, tự động tính cước snapshot và đẩy vào hàng đợi tác chiến
            </p>
          </div>

          <Link
            href="/dispatcher"
            className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800 transition-colors whitespace-nowrap shrink-0"
          >
            ← Bàn điều phối
          </Link>
        </div>

        <form onSubmit={handleCreateOrder} className="space-y-6">
          {/* STEP 1: KHÁCH HÀNG GỌI ĐẾN */}
          <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                1. Thông tin khách gọi đến (Người gửi)
              </span>
              {isVipMember && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Hội viên VIP Vàng (Giảm 10.000đ)
                </span>
              )}
            </div>

            {/* Quick lookup by phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Số điện thoại khách gọi:
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="tel"
                  required
                  value={callerPhone}
                  onChange={(e) => handleLookupCustomer(e.target.value)}
                  placeholder="Ví dụ: 0900000001"
                  className="flex-1 h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000001")}
                  className="h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-amber-900 border border-stone-200 transition-colors cursor-pointer"
                >
                  Mẫu VIP (Thu Hà)
                </button>
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000002")}
                  className="h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                >
                  Mẫu Thường
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Họ tên người gửi:
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Địa chỉ lấy hàng:
                </label>
                <input
                  type="text"
                  required
                  value={senderStreet}
                  onChange={(e) => setSenderStreet(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Quận huyện:
                </label>
                <select
                  value={senderDistrict}
                  onChange={(e) => setSenderDistrict(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
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
          <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block border-b border-stone-200 pb-3">
              2. Điểm giao hàng (Người nhận)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Họ tên người nhận:
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Số điện thoại người nhận:
                </label>
                <input
                  type="tel"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Địa chỉ chi tiết:
                </label>
                <input
                  type="text"
                  required
                  value={receiverStreet}
                  onChange={(e) => setReceiverStreet(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Quận huyện giao:
                </label>
                <select
                  value={receiverDistrict}
                  onChange={(e) => setReceiverDistrict(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
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
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Ghi chú điều phối cho tài xế:
              </label>
              <input
                type="text"
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </section>

          {/* STEP 3: KIỆN HÀNG & BÁO GIÁ CƯỚC TỨC THÌ */}
          <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block border-b border-stone-200 pb-3">
              3. Kiện hàng & Tính cước tức thì (UC-04 / UC-05)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Phân loại bưu phẩm:
                </label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Khối lượng (kg):
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Phương thức thanh toán:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "TIEN_MAT" | "VNPAY")}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="TIEN_MAT">Tiền mặt COD khi giao</option>
                  <option value="VNPAY">Cổng VNPay trực tuyến</option>
                </select>
              </div>
            </div>

            {/* BẢNG TÍNH CƯỚC */}
            <div className="bg-stone-50 p-4 sm:p-5 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="space-y-1.5 text-stone-600 font-medium">
                <div>Khoảng cách dự kiến: <span className="text-stone-900 font-bold">{distanceKm} km</span></div>
                <div>Cước cơ bản: <span className="text-stone-900 font-bold">{formatVND(baseFee)}</span></div>
                {vipDiscount > 0 && (
                  <div className="text-emerald-700 font-semibold">Giảm hội viên VIP: <strong>-{formatVND(vipDiscount)}</strong></div>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs text-stone-500 uppercase tracking-wider block font-bold">
                  Tổng cước thanh toán
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
                  {formatVND(totalFee)}
                </span>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dispatcher">
              <Button variant="outline" size="md" className="text-xs font-semibold">
                Hủy bỏ
              </Button>
            </Link>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="text-xs sm:text-sm font-bold shadow-sm"
            >
              Tạo đơn & Đưa vào hàng đợi điều phối ➔
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
