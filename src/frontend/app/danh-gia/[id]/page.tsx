"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { SAMPLE_ORDERS } from "@/lib/sample-data";
import { OrderItem } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

const QUICK_TAGS = [
  "⚡ Giao hàng siêu tốc",
  "😊 Tài xế thân thiện, lịch sự",
  "📦 Hàng hóa nguyên vẹn, cẩn thận",
  "📞 Gọi điện trước khi giao",
  "🏍️ Lái xe an toàn",
  "💬 Hỗ trợ nhiệt tình",
];

const RATING_LABELS: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời & Rất hài lòng!",
};

export default function DriverRatingPage() {
  const { showToast } = useToast();
  const params = useParams();
  const orderId = (params?.id as string) || "DH-2025-001231";

  const order: OrderItem =
    SAMPLE_ORDERS.find((o) => o.id === orderId) || {
      ...SAMPLE_ORDERS[0],
      id: orderId,
    };

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "⚡ Giao hàng siêu tốc",
    "😊 Tài xế thân thiện, lịch sự",
  ]);
  const [comment, setComment] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    showToast("Cảm ơn bạn! Bạn nhận được +50 điểm thưởng Vàng.", "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />

      <main className="flex-1 max-w-[720px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <div className="space-y-1">
          <Link
            href={`/theo-doi/${order.id}`}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1"
          >
            ← Quay lại hành trình đơn hàng
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900">
              Đánh giá dịch vụ giao hàng (K11)
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {order.id}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FORM ĐÁNH GIÁ (K11)                                                       */}
        {/* ========================================================================= */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
            {/* Driver Profile Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Tài xế phụ trách đơn hàng
              </span>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-xl shadow-2xs">
                  {order.driver?.name?.charAt(0) || "T"}
                </div>
                <div className="space-y-0.5 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">
                    {order.driver?.name || "Trần Minh Tuấn"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                    <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700 font-mono font-semibold">
                      {order.driver?.vehiclePlate || "59-K1 889.23"}
                    </span>
                    <span>·</span>
                    <span className="text-amber-600 font-bold">★ 4.9 (420+ chuyến)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Star Rating Section */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-2xs text-center space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900">
                Bạn cảm thấy trải nghiệm chuyến giao hàng như thế nào?
              </h2>

              {/* Interactive Stars */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = hoverRating || rating;
                  const isFilled = star <= activeStar;

                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                      aria-label={`Chấm ${star} sao`}
                    >
                      <svg
                        className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors ${
                          isFilled
                            ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                            : "text-stone-300 fill-stone-100"
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>

              <p className="text-sm font-bold text-amber-700 min-h-6">
                {RATING_LABELS[hoverRating || rating]}
              </p>

              {/* Quick Tags */}
              <div className="pt-4 border-t border-stone-100 space-y-2.5">
                <span className="text-xs font-bold text-stone-600 block">
                  Điểm bạn thấy ấn tượng nhất:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-2xs"
                            : "bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Text feedback */}
              <div className="pt-2 text-left">
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Lời nhắn gửi tài xế (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Gửi lời cảm ơn hoặc góp ý để Mini Ong Vàng hoàn thiện chất lượng..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href={`/theo-doi/${order.id}`}>
                <Button variant="outline" size="lg">
                  Để sau
                </Button>
              </Link>
              <Button variant="primary" size="lg" type="submit">
                Gửi đánh giá (+50 xu thưởng)
              </Button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* MÀN HÌNH CẢM ƠN & TÍCH XU (K12)                                            */
          /* ========================================================================= */
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-2xs animate-scaleUp">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center text-3xl">
              🐝
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                CẢM ƠN BẠN ĐÃ GÓP Ý (K12)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                Đánh giá thành công!
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Ý kiến của bạn là động lực rất lớn giúp tài xế <strong>{order.driver?.name || "Trần Minh Tuấn"}</strong> và đội ngũ Mini Ong Vàng nâng cao chất lượng dịch vụ mỗi ngày.
              </p>
            </div>

            {/* Reward Box */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 p-5 rounded-2xl text-stone-950 text-left shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                  Thưởng tích lũy thành viên Vàng
                </span>
                <span className="text-2xl font-black text-stone-950">
                  +50 Điểm Ong Vàng
                </span>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Đã tự động cộng vào tài khoản của Nguyễn Thu Hà
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center font-bold text-2xl">
                🪙
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  Về Trang chủ
                </Button>
              </Link>
              <Link href="/don-hang" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  Xem danh sách đơn hàng
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
