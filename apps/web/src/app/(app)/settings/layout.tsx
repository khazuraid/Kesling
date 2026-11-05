import type { Metadata } from "next";
import { SettingsNav } from "./settings-nav";

export const metadata: Metadata = { title: "Pengaturan Sistem - Kesling Cirebon" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen bg-canvas fade-in">
      {/* ── HEADER SETTINGS DENGAN NAVIGASI SUB-RUTE ── */}
      <SettingsNav />

      {/* ── CONTENT BODY SUB-RUTE ── */}
      <main className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6">{children}</main>
    </div>
  );
}
