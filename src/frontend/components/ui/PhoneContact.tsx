"use client";

import { useState } from "react";

export function PhoneContact({ phone, label, className = "" }: {
  phone?: string | null;
  label: string;
  className?: string;
}) {
  const [visiblePhone, setVisiblePhone] = useState<string | null>(null);
  const number = phone?.trim() ?? "";
  const expanded = Boolean(number && visiblePhone === number);

  return (
    <span className="inline-flex flex-col items-start gap-1 align-middle">
      <button type="button" className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={!number} aria-expanded={expanded}
        title={number ? "Hiện số điện thoại để tự liên hệ" : "Chưa có số điện thoại"}
        onClick={() => setVisiblePhone(expanded ? null : number)}>
        {label}
      </button>
      {!number && <span className="text-xs text-stone-500">Chưa có số điện thoại</span>}
      {expanded && <span role="status" className="select-text text-sm font-semibold text-stone-900">
        SĐT: {number}
      </span>}
    </span>
  );
}
