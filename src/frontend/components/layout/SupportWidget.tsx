"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  const handleCopyHotline = () => {
    navigator.clipboard?.writeText("19006868");
    showToast("Đã sao chép hotline 1900 6868 vào bộ nhớ tạm!", "success");
  };

  return (
    <>
      {/* Floating button */}
      <aside aria-label="Hỗ trợ khách hàng" className="fixed bottom-5 left-5 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-stone-900 text-amber-400 hover:text-amber-300 hover:bg-stone-800 shadow-lg border border-amber-500/30 font-semibold text-xs transition-all duration-200 active:scale-95 group"
          aria-expanded={isOpen}
          aria-label="Mở bảng hỗ trợ khách hàng"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <svg
            className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="hidden sm:inline">Hỗ trợ 24/7</span>
        </button>
      </aside>

      {/* Support Popover Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-start sm:p-5 pointer-events-none">
          {/* Backdrop for mobile */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs pointer-events-auto sm:hidden"
          />

          <div className="pointer-events-auto w-full sm:w-88 bg-white border border-stone-200 sm:rounded-2xl rounded-t-2xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-3 relative z-10">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                  🐝
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Trung tâm trợ giúp</h4>
                  <p className="text-[11px] text-emerald-600 font-medium">Đang hoạt động (07:00 - 22:00)</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
                aria-label="Đóng bảng hỗ trợ"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                    Hotline khẩn cấp
                  </span>
                  <a
                    href="tel:19006868"
                    className="text-base font-extrabold text-amber-950 hover:underline"
                  >
                    1900 6868
                  </a>
                </div>
                <button
                  onClick={handleCopyHotline}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Sao chép
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://zalo.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-xs font-semibold text-stone-700"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                    Z
                  </span>
                  Chat Zalo OA
                </a>

                <a
                  href="mailto:hotro@ongvang.vn"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-xs font-semibold text-stone-700"
                >
                  <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Gửi Email
                </a>
              </div>
            </div>

            {/* FAQs snippet */}
            <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1">
              <p className="font-semibold text-stone-700">Chính sách bảo đảm:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Giao nhận bưu kiện tối đa 30km khu vực TP.HCM.</li>
                <li>Được hủy miễn phí trong 300 giây đầu khi chưa nhận hàng.</li>
                <li>Bảo hiểm hàng hóa 100% theo giá trị khai báo.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
