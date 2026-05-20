import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Kesling Cirebon - Laporan Kesehatan Lingkungan",
  description: "Aplikasi Laporan Kesehatan Lingkungan Kota Cirebon",
  manifest: "/manifest.json",
  themeColor: "#7C6BF0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
