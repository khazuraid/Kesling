"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useSidebarStore } from "@/stores/sidebar";

const menuItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Dashboard PKM", href: "/dashboard-pkm", icon: "🏥", role: "OPERATOR" as const },
  {
    label: "Master Data",
    icon: "📁",
    role: "ADMIN" as const,
    children: [
      { label: "Puskesmas", href: "/master/puskesmas" },
      { label: "Jenis TPP", href: "/master/jenis-tpp" },
      { label: "Jenis Sarana", href: "/master/jenis-sarana" },
      { label: "Jenis TTU", href: "/master/jenis-ttu" },
    ],
  },
  {
    label: "Laporan",
    icon: "📋",
    children: [
      { label: "TPP", href: "/laporan/tpp" },
      { label: "SPAL", href: "/laporan/spal" },
      { label: "SAB", href: "/laporan/sab" },
      { label: "Rumah", href: "/laporan/rumah" },
      { label: "Jamban", href: "/laporan/jamban" },
      { label: "TTU", href: "/laporan/ttu" },
    ],
  },
  { label: "Rekap Tahunan", href: "/rekap", icon: "📈" },
  { label: "Perbandingan", href: "/perbandingan", icon: "🏆" },
  { label: "Target & Capaian", href: "/target", icon: "🎯", role: "ADMIN" as const },
  { label: "Audit Log", href: "/audit-log", icon: "📝", role: "ADMIN" as const },
  { label: "Settings", href: "/settings", icon: "⚙️", role: "ADMIN" as const },
  { label: "Profil", href: "/profile", icon: "👤" },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState<string[]>(["Laporan"]);
  const userRole = (session?.user as any)?.role || "OPERATOR";

  const filteredMenu = menuItems.filter((item) => !item.role || item.role === userRole || userRole === "ADMIN");

  function toggleMenu(label: string) {
    setOpenMenus((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]));
  }

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children: { href: string }[]) => children.some((c) => pathname === c.href);

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-white font-bold text-sm shadow-md">
          KC
        </div>
        <span className="text-lg font-bold text-[hsl(var(--foreground))]">Kesling</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        {filteredMenu.map((item) =>
          item.children ? (
            <div key={item.label} className="mt-3">
              <button
                onClick={() => toggleMenu(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isChildActive(item.children)
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform duration-200 ${openMenus.includes(item.label) ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {openMenus.includes(item.label) && (
                <div className="mt-0.5 space-y-0.5">
                  {item.children
                    .filter((c: any) => !c.role || c.role === userRole || userRole === "ADMIN")
                    .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 pl-11 pr-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isActive(child.href) ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted-foreground))]/40"}`}
                        />
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href || "/"}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href || "/")
                  ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ),
        )}
      </nav>

      {/* User */}
      <div className="shrink-0 p-4 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-sm font-bold text-[hsl(var(--primary))]">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{(session?.user as any)?.role}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Logout"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isOpen: mobileOpen, close } = useSidebarStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[260px] h-screen bg-[hsl(var(--card))] flex-col fixed left-0 top-0 z-40 border-r border-[hsl(var(--border))]"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <aside className="relative w-[260px] h-full bg-[hsl(var(--card))] flex flex-col shadow-2xl">
            <button
              onClick={close}
              className="absolute top-4 right-3 p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              aria-label="Close menu"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <NavContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
