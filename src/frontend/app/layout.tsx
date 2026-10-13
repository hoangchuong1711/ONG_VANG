import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SupportWidget } from "@/components/layout/SupportWidget";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Mini Ong Vàng | Giao Hàng Siêu Tốc & Tiện Lợi",
  description: "Mini Ong Vàng giúp bạn tạo đơn, xem cước dự kiến và theo dõi tiến độ giao hàng nội thành trên cùng một website.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAFAF9] text-[#1C1917] selection:bg-[#FDE68A] selection:text-[#78350F]">
        <ToastProvider>
          <AuthGuard>{children}</AuthGuard>
          <SupportWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
