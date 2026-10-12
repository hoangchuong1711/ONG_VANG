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
  "Khác...",
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
      `Đã tạo đơn hotline thành công mã ${orderId}! Đơn đã được chuyển thẳng vào hàng đợi điều phối.`,
      "success"
    );

    setTimeout(() => {
      router.push("/dieu-phoi");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1024px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Tổng Đài Tiếp Nhận Cuộc Gọi Tạo Đơn (UC-02)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tra cứu khách hàng theo SĐT, tạo đơn tức thì và đẩy trực tiếp vào hàng đợi gán tài xế
            </p>
          </div>
          <Link
            href="/dieu-phoi"
            className="text-xs text-slate-400 hover:text-amber-400 font-bold"
          >
            ← Về Bàn Điều Phối
          </Link>
        </div>

        <form onSubmit={handleCreateOrder} className="space-y-6">
          {/* PHẦN 1: TÌM KIẾM KHÁCH HÀNG GỌI ĐẾN */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                1. Khách Hàng Gọi Đến (Người Gửi)
              </h2>
              {isVipMember && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  👑 Thành Viên VIP Vàng (-10.000đ)
                </span>
              )}
            </div>

            {/* Tra cứu nhanh */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Số điện thoại khách gọi (Nhập SĐT để tự động tra cứu hồ sơ):
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  required
                  value={callerPhone}
                  onChange={(e) => handleLookupCustomer(e.target.value)}
                  placeholder="Ví dụ: 0900000001"
                  className="flex-1 h-11 px-3.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm focus:border-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000001")}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-400 font-bold"
                >
                  Khách VIP (Thu Hà)
                </button>
                <button
                  type="button"
                  onClick={() => handleLookupCustomer("0900000002")}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-bold"
                >
                  Khách thường
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Họ tên người gửi:</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Địa chỉ lấy hàng:</label>
                <input
                  type="text"
                  required
                  value={senderStreet}
                  onChange={(e) => setSenderStreet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Quận / Huyện:</label>
                <select
                  value={senderDistrict}
                  onChange={(e) => setSenderDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
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

          {/* PHẦN 2: THÔNG TIN NGƯỜI NHẬN */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-blue-400 uppercase tracking-wider">
              2. Điểm Giao Hàng (Người Nhận)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Họ tên người nhận:</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Số điện thoại người nhận:</label>
                <input
                  type="tel"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Địa chỉ chi tiết:</label>
                <input
                  type="text"
                  required
                  value={receiverStreet}
                  onChange={(e) => setReceiverStreet(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Quận / Huyện:</label>
                <select
                  value={receiverDistrict}
                  onChange={(e) => setReceiverDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
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
              <label className="block text-xs font-bold text-slate-300 mb-1">Ghi chú cho tài xế:</label>
              <input
                type="text"
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>
          </section>

          {/* PHẦN 3: KIỆN HÀNG & BÁO GIÁ SNAPSHOT */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
              3. Kiện Hàng & Báo Giá Cước Tức Thì (UC-04 / UC-05)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Loại bưu phẩm:</label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Khối lượng (kg):</label>
                <input
                  type="number"
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phương thức thu cước:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "TIEN_MAT" | "VNPAY")}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                >
                  <option value="TIEN_MAT">💵 Thu tiền mặt COD khi giao</option>
                  <option value="VNPAY">💳 Khách thanh toán VNPay Online</option>
                </select>
              </div>
            </div>

            {/* BẢNG TÍNH CƯỚC SNAPSHOT */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1 text-xs text-slate-300">
                <div>Cự ly lộ trình: <strong>{distanceKm} km</strong></div>
                <div>Cước cơ bản: <strong>{formatVND(baseFee)}</strong></div>
                {vipDiscount > 0 && (
                  <div className="text-emerald-400">Giảm VIP Vàng: <strong>-{formatVND(vipDiscount)}</strong></div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Tổng cước thanh toán
                </span>
                <span className="text-2xl font-black text-amber-400">
                  {formatVND(totalFee)}
                </span>
              </div>
            </div>
          </section>

          {/* ACTION BUTTON */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link href="/dieu-phoi">
              <Button variant="outline" size="md" className="border-slate-700 text-slate-300">
                Hủy bỏ
              </Button>
            </Link>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md h-12 px-6"
            >
              ⚡ TẠO ĐƠN & ĐƯA VÀO HÀNG ĐỢI ĐIỀU PHỐI ➔
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
