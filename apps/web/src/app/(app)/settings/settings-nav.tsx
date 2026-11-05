"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  FileSpreadsheet,
  Heart,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const SETTINGS_LINKS = [
  { href: "/settings", label: "Puskesmas", icon: Building2, exact: true },
  { href: "/settings/target", label: "Target", icon: Target },
  { href: "/settings/users", label: "Pengguna", icon: Users },
  { href: "/settings/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings/donations", label: "Donasi QRIS", icon: Heart },
  { href: "/settings/telegram", label: "Telegram", icon: Bot },
  { href: "/settings/ai", label: "AI Import", icon: Sparkles },
  { href: "/settings/health", label: "Status Sistem", icon: Activity },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-surface border-b border-border sticky top-16 z-20 backdrop-blur-md">
      {/* ── TOP MASTHEAD TITLE & QUICK ACTION ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 pt-5 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
            Pengaturan Sistem
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1.5">
            Konfigurasi master faskes, target tahunan, otoritas akun, dan integrasi API
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-full shadow-xs gap-1.5 h-9 text-xs">
            <Link href="/settings/import">
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Import Excel</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full shadow-xs gap-1.5 h-9 text-xs">
            <Link href="/settings/errors">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Log Error</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── SUB-RUTE TAB BAR ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 overflow-x-auto no-scrollbar">
        <nav
          aria-label="Sub Menu Pengaturan"
          className="flex items-center gap-1 sm:gap-2 border-t border-border/60 py-2"
        >
          {SETTINGS_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
