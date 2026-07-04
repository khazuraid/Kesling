"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Database,
  Droplets,
  Folder,
  GlassWater,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Settings2,
  ShieldCheck,
  Toilet,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useSidebarStore } from "@/stores/sidebar";

interface DynamicCategory {
  id: number;
  nama: string;
  code: string;
  icon: string;
  isRowBased: boolean;
  urutan: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tpp: <UtensilsCrossed className="w-[16px] h-[16px]" />,
  spal: <Droplets className="w-[16px] h-[16px]" />,
  sab: <GlassWater className="w-[16px] h-[16px]" />,
  jamban: <Toilet className="w-[16px] h-[16px]" />,
  rumah: <Home className="w-[16px] h-[16px]" />,
  ttu: <Building2 className="w-[16px] h-[16px]" />,
};

const SHORT_NAMES: Record<string, string> = {
  tpp: "TPP",
  spal: "SPAL",
  sab: "SAB",
  rumah: "Rumah",
  jamban: "Jamban",
  ttu: "TTU",
};

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState<string[]>(["Laporan"]);
  const userRole = (session?.user as any)?.role || "OPERATOR";
  const isAdmin = userRole === "ADMIN";

  const { data: categories = [] } = useQuery<DynamicCategory[]>({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const laporanChildren =
    categories.length > 0
      ? categories.map((cat) => ({
          label: SHORT_NAMES[cat.code.toLowerCase()] || cat.nama,
          href: `/laporan/${cat.code.toLowerCase()}`,
          code: cat.code.toLowerCase(),
        }))
      : Object.entries(SHORT_NAMES).map(([code, label]) => ({
          label,
          href: `/laporan/${code}`,
          code,
        }));

  type MenuItem = {
    label: string;
    href?: string;
    icon: React.ReactNode;
    children?: { label: string; href: string; code: string }[];
    role?: "ADMIN" | "OPERATOR";
    puskesmasOnly?: boolean;
  };

  const menuItems: MenuItem[] = [
    {
      label: "Overview",
      href: "/",
      icon: <LayoutDashboard className="w-[17px] h-[17px]" />,
      role: "ADMIN",
    },
    {
      label: "Command Center",
      href: "/dashboard-pkm",
      icon: <Activity className="w-[17px] h-[17px]" />,
      role: "OPERATOR",
    },
    {
      label: "Laporan",
      href: "/laporan",
      icon: <Folder className="w-[17px] h-[17px]" />,
    },
    {
      label: "Rekap Tahunan",
      href: "/rekap",
      icon: <BarChart3 className="w-[17px] h-[17px]" />,
    },
    {
      label: "Perbandingan",
      href: "/perbandingan",
      icon: <LayoutTemplate className="w-[17px] h-[17px]" />,
    },
    {
      label: "Format Laporan Bulanan",
      href: "/laporan-builder",
      icon: <LayoutTemplate className="w-[17px] h-[17px]" />,
      role: "ADMIN",
    },
    {
      label: "Form Pemeriksaan Lapangan",
      href: "/form-pemeriksaan",
      icon: <ClipboardCheck className="w-[17px] h-[17px]" />,
      role: "OPERATOR",
      puskesmasOnly: true,
    },
    {
      label: "Pemeriksaan Baru",
      href: "/pemeriksaan",
      icon: <ClipboardList className="w-[17px] h-[17px]" />,
      role: "OPERATOR",
      puskesmasOnly: true,
    },
    {
      label: "Data Dasar",
      href: "/data-dasar",
      icon: <Database className="w-[17px] h-[17px]" />,
    },
    {
      label: "Approval",
      href: "/approval",
      icon: <ShieldCheck className="w-[17px] h-[17px]" />,
      role: "ADMIN",
    },
    {
      label: "Audit Log",
      href: "/audit-log",
      icon: <ShieldCheck className="w-[17px] h-[17px]" />,
      role: "ADMIN",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings2 className="w-[17px] h-[17px]" />,
      role: "ADMIN",
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    if (item.puskesmasOnly && isAdmin) return false;
    return !item.role || item.role === userRole || isAdmin;
  });

  function toggleMenu(label: string) {
    setOpenMenus((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]));
  }

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children: { href: string }[]) => children.some((c) => pathname.startsWith(c.href));

  return (
    <>
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <div className="w-9 h-9 border border-[hsl(var(--accent))] flex items-center justify-center shrink-0">
          <span className="text-sm font-black text-[hsl(var(--foreground))] tracking-tight">KC</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight">
            Kesling Core
          </p>
          <p className="text-[9px] font-semibold text-[hsl(var(--accent))]/70 uppercase tracking-[0.15em]">Cirebon</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-[hsl(var(--border))]" />

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        <p className="px-3 mb-2 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em]">
          Menu
        </p>

        {filteredMenu.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
                  isChildActive(item.children)
                    ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    openMenus.includes(item.label) ? "" : "-rotate-90"
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-200 ${
                  openMenus.includes(item.label) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="py-1 space-y-0.5">
                    {item.children.map((child: any) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 pl-9 pr-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                          isActive(child.href)
                            ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]"
                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                        }`}
                      >
                        <span className="shrink-0">
                          {CATEGORY_ICONS[child.code] || <Folder className="w-[14px] h-[14px]" />}
                        </span>
                        <span className="flex-1">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href || "/"}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
                isActive(item.href || "/")
                  ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </Link>
          ),
        )}
      </nav>

      {/* ── User Section ── */}
      <div className="shrink-0 px-3 pb-3 pt-2">
        <div className="mx-1 mb-3 h-px bg-[hsl(var(--border))]" />
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 p-2 hover:bg-[hsl(var(--muted))] transition-colors duration-150 group"
        >
          <div className="avatar-initial shrink-0">{session?.user?.name?.charAt(0) || "U"}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate leading-tight">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[9px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.12em]">
              {userRole}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              signOut({ callbackUrl: "/login" });
            }}
            className="w-8 h-8 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--error))/0.1] hover:text-[hsl(var(--error))] transition-colors opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isOpen: mobileOpen, close } = useSidebarStore();

  return (
    <>
      {/* ── Desktop: Fixed sidebar ── */}
      <aside className="hidden lg:flex w-[248px] h-dvh flex-col fixed left-0 top-0 z-40 bg-[hsl(var(--background))] border-r border-[hsl(var(--border))]">
        <NavContent />
      </aside>

      {/* ── Mobile: Sheet overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[hsl(var(--foreground))]/40 backdrop-blur-sm fade-in" onClick={close} />
          <aside className="relative w-[280px] h-full bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] flex flex-col fade-in">
            <div className="flex items-center justify-between px-5 h-16 shrink-0">
              <span className="text-[13px] font-bold text-[hsl(var(--foreground))]">Navigation</span>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-[hsl(var(--border))]" />
            <NavContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
