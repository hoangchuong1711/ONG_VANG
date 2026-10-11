import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Ong Vang | System Status",
  description: "Live status for the Mini Ong Vang frontend, backend, and database.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
