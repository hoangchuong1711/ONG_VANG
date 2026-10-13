import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SupportWidget } from "@/components/layout/SupportWidget";
import { AuthGuard } from "@/components/auth/AuthGuard";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

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
    <html lang="vi" data-scroll-behavior="smooth" className={`h-full antialiased ${plusJakartaSans.variable}`}>
      <body className="min-h-full flex flex-col bg-[#FAFAF9] text-[#1C1917] selection:bg-[#FDE68A] selection:text-[#78350F]">
        <ToastProvider>
          <AuthGuard>{children}</AuthGuard>
          <SupportWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
