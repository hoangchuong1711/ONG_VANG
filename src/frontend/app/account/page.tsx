import { Navbar } from "@/components/layout/Navbar";
import { CurrentAccountProfile } from "@/components/auth/CurrentAccountProfile";

export default function CustomerAccountPage() {
  return <div className="min-h-dvh bg-stone-50"><Navbar /><main className="px-4 py-10"><CurrentAccountProfile /></main></div>;
}
