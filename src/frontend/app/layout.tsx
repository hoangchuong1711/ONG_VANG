import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Ong Vàng | Giao Hàng Siêu Tốc & Tiện Lợi",
  description: "Trang chủ khách hàng Mini Ong Vàng - Đặt và theo dõi đơn giao hàng trực tuyến thông minh, minh bạch.",
};

import { ToastProvider } from "@/components/ui/Toast";
import { SupportWidget } from "@/components/layout/SupportWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAF9] text-[#1C1917] selection:bg-[#FDE68A] selection:text-[#78350F]">
        <ToastProvider>
          {children}
          <SupportWidget />
        </ToastProvider>
      </body>
    </html>
  );
}

