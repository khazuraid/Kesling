"use client";

import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebarStore } from "@/stores/sidebar";

const breadcrumbMap: Record<string, string> = {
  "/": "Overview",
  "/dashboard-pkm": "Command Center",
  "/rekap": "Rekap Tahunan",
  "/perbandingan": "Perbandingan",
  "/audit-log": "Audit Log",
  "/approval": "Approval Laporan",
  "/laporan-builder": "Form Builder",
  "/settings": "Pengaturan",
  "/settings/users": "Pengguna",
  "/settings/import": "Impor Data",
  "/profile": "Profil",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: breadcrumbMap[path] || seg.charAt(0).toUpperCase() + seg.slice(1),
      href: path,
    });
  }
  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebarStore();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : "Overview";

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-5 md:px-6 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))]">
      {/* Mobile menu toggle */}
      <button
        onClick={toggle}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>

      {/* Breadcrumb */}
      <nav className="hidden md:flex items-center gap-1 text-[12px] font-semibold">
        <Link
          href="/"
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          Kesling
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-[hsl(var(--border))]" />
            {i === breadcrumbs.length - 1 ? (
              <span className="text-[hsl(var(--foreground))]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Mobile title */}
      <h1 className="md:hidden text-[14px] font-bold text-[hsl(var(--foreground))] tracking-tight truncate">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
