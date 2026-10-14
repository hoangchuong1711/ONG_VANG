"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { Button } from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { api, type Order, type Quote } from "@/lib/live-orders";
import type { AdminCustomer } from "@/lib/admin-extras";

const DISTRICTS = ["Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", "Quận Bình Thạnh"];
const PACKAGE_TYPES = [
  "Tài liệu & Hợp đồng hỏa tốc", "Đồ ăn & Thực phẩm giao nhanh",
  "Mỹ phẩm & Dược phẩm", "Hàng điện tử & Phụ kiện", "Quần áo thời trang", "Khác",
];
type Customer = { maKh: string; hoTen: string; soDienThoai: string;
  diaChiMacDinh: string | null; hangThanhVien?: { tenHang?: string } | null };

export default function DispatcherCreateOrderPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [callerPhone, setCallerPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderStreet, setSenderStreet] = useState("");
  const [senderDistrict, setSenderDistrict] = useState(DISTRICTS[0]);
  const [customerTier, setCustomerTier] = useState<AdminCustomer["tier"]>("THUONG");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverStreet, setReceiverStreet] = useState("");
  const [receiverDistrict, setReceiverDistrict] = useState(DISTRICTS[0]);
  const [receiverNotes, setReceiverNotes] = useState("");
  const [packageType, setPackageType] = useState(PACKAGE_TYPES[0]);
  const [weightKg, setWeightKg] = useState<number>(0.5);
  const [paymentMethod, setPaymentMethod] = useState<"TIEN_MAT" | "VNPAY">("TIEN_MAT");
  const [quoted, setQuoted] = useState<{ input: string; result: Quote } | null>(null);
  const [creating, setCreating] = useState(false);
  const orderKey = useRef<string | null>(null);
  useEffect(() => {
    if (!/^0\d{9}$/.test(callerPhone)) return;
    let active = true;
    const timer = setTimeout(() => {
      api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(callerPhone)}&size=20`)
        .then(page => {
          if (!active) return;
          const customer = page.items.find(item => item.soDienThoai === callerPhone);
          if (!customer) { setCustomerId(""); setSenderName(""); showToast("Không tìm thấy khách hàng trong DB.", "error"); return; }
          setCustomerId(customer.maKh); setSenderName(customer.hoTen);
          if (customer.diaChiMacDinh) setSenderStreet(customer.diaChiMacDinh);
          setCustomerTier(customer.hangThanhVien?.tenHang === "VANG" ? "VANG" : "THUONG");
        }).catch(cause => { if (active) showToast((cause as Error).message, "error"); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [callerPhone, showToast]);

  const handleLookupCustomer = (phoneInput: string) => {
    if (phoneInput === callerPhone) return;
    setCallerPhone(phoneInput);
    setCustomerId("");
    setSenderName("");
  };
  const pickup = /TP\.HCM|Hồ Chí Minh/i.test(senderStreet)
    ? senderStreet.trim() : [senderStreet.trim(), senderDistrict, "TP.HCM"].filter(Boolean).join(", ");
  const dropoff = [receiverStreet.trim(), receiverDistrict, "TP.HCM"].filter(Boolean).join(", ");
  const quoteInput = { maKh: customerId, diemLayHang: pickup, diemGiaoHang: dropoff,
    kienHang: [{ loaiHangHoa: packageType, ghiChuBaoQuan: "", khoiLuongKg: weightKg.toFixed(2) }],
    benThanhToan: "NGUOI_DAT", phuongThucThanhToan: paymentMethod === "VNPAY" ? "VNPAY_QR" : "TIEN_MAT" };
  const quoteRequestBody = JSON.stringify(quoteInput);
  const quote = quoted?.input === quoteRequestBody ? quoted.result : null;
  const distanceKm = Number(quote?.loTrinh.quangDuongKm ?? 0);
  const baseFee = Number(quote?.cuoc.cuocGoc ?? 0);
  const vipDiscount = Number(quote?.cuoc.tienGiamGia ?? 0);
  const totalFee = Number(quote?.cuoc.tongCuoc ?? 0);

  useEffect(() => {
    orderKey.current = null;
    if (!customerId || !senderStreet.trim() || !receiverStreet.trim() || weightKg <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      api<Quote>("/quotes", { method: "POST", body: quoteRequestBody })
        .then(result => { if (active) setQuoted({ input: quoteRequestBody, result }); })
        .catch(() => { if (active) setQuoted(null); });
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [customerId, senderStreet, receiverStreet, weightKg, quoteRequestBody]);

  const handleCreateOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerId || !receiverName.trim() || !/^0\d{9}$/.test(receiverPhone) || !senderStreet.trim() || !receiverStreet.trim()) {
      showToast("Hãy chọn khách hàng từ DB và nhập đầy đủ địa chỉ, người nhận, SĐT.", "error"); return;
    }
    if (creating) return;
    setCreating(true);
    if (!orderKey.current) orderKey.current = crypto.randomUUID();
    try {
      const freshQuote = await api<Quote>("/quotes", { method: "POST", body: JSON.stringify(quoteInput) });
      const result = await api<Order>("/orders", { method: "POST", headers: { "Idempotency-Key": orderKey.current },
        body: JSON.stringify({ ...quoteInput, maBaoGia: freshQuote.maBaoGia,
          tenNguoiNhan: receiverName.trim(), sdtNguoiNhan: receiverPhone,
          ghiChuGiaoHang: receiverNotes.trim() }) });
      showToast(`Đã tạo đơn ${result.maDon} trong DB.`, "success");
      router.push("/dispatcher");
    } catch (cause) { showToast((cause as Error).message, "error"); }
    finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
      <DispatcherNavbar />

      <main className="flex-1 max-w-[1100px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="shrink-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5 whitespace-nowrap">
              HOTLINE TIẾP NHẬN
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
              {customerTier !== "THUONG" && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Hạng {customerTier === "VANG" ? "Vàng" : "Bạc"} (giảm {formatVND(vipDiscount)})
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
              3. Kiện hàng & tính cước tức thì
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
                <div>Khoảng cách dự kiến: <span className="text-stone-900 font-bold">{quote ? distanceKm : "—"} km</span></div>
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
                  {quote ? formatVND(totalFee) : "Đang tính cước..."}
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
              disabled={creating}
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
