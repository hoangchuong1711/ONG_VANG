"use client";

import { DriverNavbar } from "@/components/layout/DriverNavbar";
import { DriverBottomNav } from "@/components/layout/DriverBottomNav";
import { CurrentAccountProfile } from "@/components/auth/CurrentAccountProfile";

export default function DriverAccountPage() {
  return <div className="min-h-dvh bg-stone-50 pb-20"><DriverNavbar isOnline={false} onToggleOnline={() => undefined} showStatus={false} /><main className="px-4 py-10"><CurrentAccountProfile /></main><DriverBottomNav /></div>;
}
