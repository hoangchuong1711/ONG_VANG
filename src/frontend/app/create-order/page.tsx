"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

// Quận TP.HCM hợp lệ trong hệ thống
const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 5",
  "Quận 7",
  "Quận 10",
  "Quận Bình Thạnh",
  "Quận Phú Nhuận",
];

const PACKAGE_TYPES = [
  "Tài liệu & Hợp đồng",
  "Đồ ăn & Thực phẩm đóng gói",
  "Mỹ phẩm & Dược phẩm",
  "Hàng điện tử nhỏ (điện thoại, phụ kiện)",
  "Quần áo & Phụ kiện thời trang",
  "Khác...",
];

export default function BookingWizardPage() {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [senderName, setSenderName] = useState("Nguyễn Thu Hà");
  const [senderPhone, setSenderPhone] = useState("0900000001");
  const [senderStreet, setSenderStreet] = useState("123 Nguyễn Văn Linh");
  const [senderDistrict, setSenderDistrict] = useState("Quận 7");

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverStreet, setReceiverStreet] = useState("");
  const [receiverDistrict, setReceiverDistrict] = useState("Quận 1");

  const [packageType, setPackageType] = useState("Tài liệu & Hợp đồng");
  const [packageNote, setPackageNote] = useState("");

  // Error state for > 30km (K5 Screen)
  const [isDistanceExceeded, setIsDistanceExceeded] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");

  // Calculation simulation
  const distanceKm = senderDistrict === receiverDistrict ? 3.5 : 7.8;
  const baseFee = 30000 + Math.round(distanceKm * 5000);
  const surcharge = 10000;
  const vipDiscount = 10000; // Thành viên Vàng được giảm
  const totalFee = Math.max(0, baseFee + surcharge - vipDiscount);

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || !receiverPhone || !receiverStreet) {
      alert("Vui lòng nhập đầy đủ thông tin người nhận và địa chỉ giao hàng.");
      return;
    }

    // Kiểm tra giả lập nếu người dùng nhập cự ly quá xa (K5 testing trigger)
    if (receiverStreet.toLowerCase().includes("hà nội") || receiverStreet.toLowerCase().includes("vũng tàu")) {
      setIsDistanceExceeded(true);
      return;
    }

    setIsDistanceExceeded(false);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmOrder = () => {
    const randomId = "DH-2025-00" + Math.floor(1000 + Math.random() * 9000);
    setCreatedOrderId(randomId);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Progress Stepper Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Step 1 Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= 1 ? "bg-amber-500 text-stone-900" : "bg-stone-100 text-stone-400"
                }`}
              >
                1
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step >= 1 ? "text-stone-900" : "text-stone-400"}`}>
                Tuyến & Hàng hóa
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? "bg-amber-400" : "bg-stone-200"}`} />

            {/* Step 2 Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= 2 ? "bg-amber-500 text-stone-900" : "bg-stone-100 text-stone-400"
                }`}
              >
                2
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step >= 2 ? "text-stone-900" : "text-stone-400"}`}>
                Báo giá cước
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? "bg-amber-400" : "bg-stone-200"}`} />

            {/* Step 3 Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === 3 ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400"
                }`}
              >
                3
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === 3 ? "text-stone-900" : "text-stone-400"}`}>
                Hoàn tất
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* K5: LỖI VƯỢT QUÁ CỰ LY 30KM HOẶC NGOÀI PHẠM VI                           */}
        {/* ========================================================================= */}
        {isDistanceExceeded && (
          <div className="bg-white border border-red-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-stone-900">
                Khoảng cách vượt quá phạm vi phục vụ
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Hệ thống <strong>Mini Ong Vàng</strong> chỉ hỗ trợ giao hàng nội thành với cự ly tối đa <strong>30 km</strong>. Tuyến đường bạn chọn đã vượt quá giới hạn này.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsDistanceExceeded(false)}>
              Quay lại chỉnh sửa địa chỉ
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 1 (K1): NHẬP THÔNG TIN TUYẾN ĐƯỜNG & HÀNG HÓA                         */}
        {/* ========================================================================= */}
        {!isDistanceExceeded && step === 1 && (
          <form onSubmit={handleGoToStep2} className="space-y-6">
            {/* Box 1: Điểm lấy hàng */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="w-3 h-3 rounded-full bg-stone-900" />
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  1. Điểm lấy hàng (Người gửi)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Tên người gửi
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Số điện thoại người gửi
                  </label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Địa chỉ số nhà, tên đường
                  </label>
                  <input
                    type="text"
                    required
                    value={senderStreet}
                    onChange={(e) => setSenderStreet(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Quận / Khu vực
                  </label>
                  <select
                    value={senderDistrict}
                    onChange={(e) => setSenderDistrict(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white transition-all"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}, TP.HCM
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box 2: Điểm giao hàng */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  2. Điểm giao hàng (Người nhận)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lê Hoàng Phúc"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Số điện thoại người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Địa chỉ số nhà, tên đường <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 45 Nguyễn Huệ, P. Bến Nghé"
                    value={receiverStreet}
                    onChange={(e) => setReceiverStreet(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Quận / Khu vực
                  </label>
                  <select
                    value={receiverDistrict}
                    onChange={(e) => setReceiverDistrict(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white transition-all"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}, TP.HCM
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box 3: Thông tin hàng hóa */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 pb-3 border-b border-stone-100">
                3. Thông tin kiện hàng
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Loại hàng hóa
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white transition-all"
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
                    Ghi chú cho tài xế (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Gọi trước khi giao 10 phút"
                    value={packageNote}
                    onChange={(e) => setPackageNote(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/">
                <Button variant="ghost" type="button">
                  Hủy bỏ
                </Button>
              </Link>
              <Button variant="primary" size="lg" type="submit">
                Tiếp tục xem báo giá cước →
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 2 (K2): BÁO GIÁ & XÁC NHẬN CƯỚC (QUOTE BREAKDOWN)                    */}
        {/* ========================================================================= */}
        {!isDistanceExceeded && step === 2 && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xs">
              <div className="pb-3 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                  BƯỚC 2 / KIỂM TRA ĐƠN HÀNG
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                  Xác nhận thông tin & Báo giá cước phí
                </h2>
              </div>

              {/* Tóm tắt tuyến đường */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Lộ trình vận chuyển
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                    <span className="text-stone-500">Lấy:</span>
                    <strong>{senderStreet}, {senderDistrict}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-stone-500">Giao:</span>
                    <strong>{receiverStreet}, {receiverDistrict}</strong> ({receiverName} - {receiverPhone})
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                  <span>Khoảng cách ước tính: <strong>{distanceKm} km</strong></span>
                  <span>Thời gian dự kiến: <strong>25 - 35 phút</strong></span>
                </div>
              </div>

              {/* Bảng chi tiết cước phí (Breakdown) */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Chi tiết cước phí (Áp dụng chính sách V1)
                </h3>
                <div className="divide-y divide-stone-100 text-sm">
                  <div className="py-2.5 flex justify-between text-stone-600">
                    <span>Cước vận chuyển cơ bản ({distanceKm} km):</span>
                    <span>{formatVND(baseFee)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-stone-600">
                    <span>Phụ thu giờ cao điểm & bảo hiểm kiện hàng:</span>
                    <span>{formatVND(surcharge)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-amber-700 font-semibold bg-amber-50/60 px-3 rounded-lg">
                    <span>Ưu đãi thành viên Hạng Vàng:</span>
                    <span>-{formatVND(vipDiscount)}</span>
                  </div>
                  <div className="pt-3.5 flex justify-between text-base sm:text-lg font-extrabold text-stone-900">
                    <span>Tổng cước thanh toán:</span>
                    <span className="text-xl sm:text-2xl text-amber-600">
                      {formatVND(totalFee)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-stone-500 bg-amber-50/40 p-3 rounded-xl border border-amber-200/60">
                💡 <strong>Lưu ý:</strong> Cước phí đã được hệ thống chốt cố định theo chính sách giá. Bạn có thể chọn thanh toán tiền mặt khi tài xế giao hoặc quét mã VNPay sau khi đơn hoàn tất.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Quay lại chỉnh sửa
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirmOrder}>
                Xác nhận tạo đơn hàng ngay
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 3 (K3): TẠO ĐƠN THÀNH CÔNG (SUCCESS CONFIRMATION)                      */}
        {/* ========================================================================= */}
        {!isDistanceExceeded && step === 3 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-sm animate-scaleUp">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                GHI NHẬN ĐƠN HÀNG THÀNH CÔNG
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                Đã tạo đơn giao hàng!
              </h2>
              <div className="font-mono text-xl sm:text-2xl font-black text-amber-600 py-1 flex items-center justify-center gap-2">
                <span>{createdOrderId}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(createdOrderId);
                    showToast(`Đã sao chép mã đơn ${createdOrderId}!`, "success");
                  }}
                  className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors shadow-2xs"
                  title="Sao chép mã đơn"
                  aria-label={`Sao chép mã đơn ${createdOrderId}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Đơn hàng đã được đưa vào hàng đợi <strong>Chờ gán tài xế</strong>. Điều phối viên sẽ phân công tài xế phù hợp nhất trong vòng 3–5 phút.
              </p>
            </div>

            {/* What's next card */}
            <div className="max-w-md mx-auto text-left p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2 text-stone-600">
              <div className="font-bold text-stone-900">Tiếp theo là gì?</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Tài xế sẽ liên hệ xác nhận trước khi đến lấy hàng tại {senderStreet}.</li>
                <li>Bạn có thể hủy đơn miễn phí trong vòng <strong>5 phút (300 giây)</strong> nếu cần đổi ý.</li>
              </ul>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={`/tracking/${createdOrderId}`} className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  Theo dõi tiến độ đơn hàng
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  Về trang chủ
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
