"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, logout } from "@/lib/auth";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch (failure) {
      if (failure instanceof AuthError && failure.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      setBusy(false);
      alert("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  return <button type="button" className={className} disabled={busy} onClick={handleLogout}>
    {busy ? "Đang đăng xuất..." : "Đăng xuất"}
  </button>;
}
