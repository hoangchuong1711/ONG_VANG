import type { Metadata } from "next";
import { DemoAccountProfile } from "@/components/account/DemoAccountProfile";

export const metadata: Metadata = {
  title: "Hồ sơ quản trị viên | Mini Ong Vàng",
};

export default function AdminAccountPage() {
  return (
    <DemoAccountProfile
      area="admin"
      profile={{
        accountId: "NV-003",
        fullName: "Phạm Văn Minh",
        phone: "0600000001",
        email: "",
        role: "Chủ đội xe",
        joinedAt: "01/10/2026",
        initials: "VM",
      }}
    />
  );
}
