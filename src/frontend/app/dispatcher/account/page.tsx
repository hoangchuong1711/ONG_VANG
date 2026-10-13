import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
import { CurrentAccountProfile } from "@/components/auth/CurrentAccountProfile";

export default function DispatcherAccountPage() {
  return <div className="min-h-dvh bg-stone-50"><DispatcherNavbar /><main className="px-4 py-10"><CurrentAccountProfile /></main></div>;
}
