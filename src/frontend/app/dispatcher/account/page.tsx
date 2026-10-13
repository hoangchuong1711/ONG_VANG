import type { Metadata } from "next";
import { DemoAccountProfile } from "@/components/account/DemoAccountProfile";
import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";

export const metadata: Metadata = {
  title: "Hồ sơ điều phối viên | Mini Ong Vàng",
};

export default function DispatcherAccountPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAF9]">
      <DispatcherNavbar />
      <main className="px-4 py-8 sm:px-6 lg:py-10">
        <DemoAccountProfile
          area="dispatcher"
          profile={{
            accountId: "NV-001",
            fullName: "Trần Ngọc Huy",
            phone: "0700000001",
            email: "",
            role: "Điều phối viên",
            joinedAt: "01/10/2026",
            initials: "NH",
          }}
        />
      </main>
    </div>
  );
}
