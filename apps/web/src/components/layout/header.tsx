"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notification-bell";
import { useSidebarStore } from "@/stores/sidebar";

const breadcrumbMap: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard-pkm": "Dashboard PKM",
  "/master": "Master Data",
  "/master/puskesmas": "Puskesmas",
  "/master/jenis-tpp": "Jenis TPP",
  "/master/jenis-sarana": "Jenis Sarana",
  "/master/jenis-ttu": "Jenis TTU",
  "/laporan": "Laporan",
  "/laporan/tpp": "TPP",
  "/laporan/spal": "SPAL",
  "/laporan/sab": "SAB",
  "/laporan/rumah": "Rumah",
  "/laporan/jamban": "Jamban",
  "/laporan/ttu": "TTU",
  "/laporan/bulk": "Bulk Input",
  "/rekap": "Rekap Tahunan",
  "/perbandingan": "Perbandingan",
  "/target": "Target & Capaian",
  "/audit-log": "Audit Log",
  "/settings": "Settings",
  "/settings/users": "Users",
  "/settings/import": "Import",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({ label: breadcrumbMap[path] || seg.charAt(0).toUpperCase() + seg.slice(1), href: path });
  }
  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toggle } = useSidebarStore();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : "Dashboard";

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 lg:px-6 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]"
      style={{ boxShadow: "0 1px 4px rgba(76,78,100,0.05)" }}
    >
      {/* Mobile menu */}
      <button
        onClick={toggle}
        className="lg:hidden p-2 rounded-lg hover:bg-[hsl(var(--muted))]"
        aria-label="Toggle menu"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <nav className="hidden md:flex items-center gap-1.5 text-sm">
        <Link
          href="/"
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <span className="text-[hsl(var(--border))]">/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-[hsl(var(--foreground))]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Mobile title */}
      <h1 className="md:hidden text-sm font-semibold">{pageTitle}</h1>

      {/* Right */}
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-[hsl(var(--border))]">
          <div>
            <p className="text-sm font-medium leading-none text-right">{session?.user?.name}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-right">{(session?.user as any)?.role}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-sm font-bold text-[hsl(var(--primary))]">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
