import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SupportWidget } from "@/components/layout/SupportWidget";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mini Ong Vàng | Giao Hàng Siêu Tốc & Tiện Lợi",
  description: "Trang chủ khách hàng Mini Ong Vàng - Đặt và theo dõi đơn giao hàng trực tuyến thông minh, minh bạch.",
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
          {children}
          <SupportWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
