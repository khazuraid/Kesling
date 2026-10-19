"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  Calendar,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Database,
  Droplets,
  FileEdit,
  Folder,
  GlassWater,
  HardDrive,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  ShieldCheck,
  Toilet,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";

interface DynamicCategory {
  id: number;
  nama: string;
  code: string;
  icon: string;
  isRowBased: boolean;
  urutan: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tpp: <UtensilsCrossed className="w-4 h-4" />,
  spal: <Droplets className="w-4 h-4" />,
  sab: <GlassWater className="w-4 h-4" />,
  jamban: <Toilet className="w-4 h-4" />,
  rumah: <Home className="w-4 h-4" />,
  ttu: <Building2 className="w-4 h-4" />,
};

const SHORT_NAMES: Record<string, string> = {
  tpp: "TPP",
  spal: "SPAL",
  sab: "SAB",
  rumah: "Rumah",
  jamban: "Jamban",
  ttu: "TTU",
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  role?: "ADMIN" | "OPERATOR" | "DINKES";
  roles?: ("ADMIN" | "OPERATOR" | "DINKES")[];
  puskesmasOnly?: boolean;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

function useMenuGroups() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "OPERATOR";

  const isPkm = userRole === "OPERATOR";
  const isAdmin = userRole === "ADMIN";
  const isDinkes = userRole === "DINKES";
  const isAdminOrDinkes = isAdmin || isDinkes;

  const groups: MenuGroup[] = [
    {
      title: "Utama",
      items: [
        ...(isAdminOrDinkes ? [{ label: "Overview", href: "/", icon: <LayoutDashboard className="w-4 h-4" /> }] : []),
        ...(isPkm ? [{ label: "Command Center", href: "/dashboard-pkm", icon: <Activity className="w-4 h-4" /> }] : []),
        { label: "Laporan", href: "/laporan", icon: <Folder className="w-4 h-4" /> },
        { label: "Rekap", href: "/rekap", icon: <BarChart3 className="w-4 h-4" /> },
        { label: "Perbandingan", href: "/perbandingan", icon: <ArrowLeftRight className="w-4 h-4" /> },
      ],
    },
    ...(isPkm
      ? [
          {
            title: "Pemeriksaan",
            items: [
              { label: "Pemeriksaan Baru", href: "/pemeriksaan", icon: <ClipboardList className="w-4 h-4" /> },
              { label: "Form Pemeriksaan", href: "/form-pemeriksaan", icon: <ClipboardCheck className="w-4 h-4" /> },
              { label: "Data Dasar", href: "/data-dasar", icon: <Database className="w-4 h-4" /> },
            ],
          },
          {
            title: "Perencanaan",
            items: [
              { label: "Rencana Bulanan", href: "/rencana-bulanan", icon: <Calendar className="w-4 h-4" /> },
              { label: "Rencana Tahunan", href: "/rencana-tahunan", icon: <CalendarRange className="w-4 h-4" /> },
            ],
          },
        ]
      : []),
    ...(isAdminOrDinkes
      ? [
          {
            title: "Admin",
            items: [
              { label: "Approval", href: "/approval", icon: <ShieldCheck className="w-4 h-4" /> },
              { label: "Format Laporan", href: "/laporan-builder", icon: <FileEdit className="w-4 h-4" /> },
              ...(isAdmin
                ? [
                    { label: "Audit Log", href: "/audit-log", icon: <ClipboardCheck className="w-4 h-4" /> },
                    { label: "File Manager", href: "/file-manager", icon: <HardDrive className="w-4 h-4" /> },
                    { label: "Settings", href: "/settings", icon: <Settings2 className="w-4 h-4" /> },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];

  return { groups, userRole, session };
}

const LS_KEY = "kesling:sidebar-collapsed";

export function SideNav() {
  const pathname = usePathname();
  const { groups, userRole, session } = useMenuGroups();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(LS_KEY);
    if (v === "1") setCollapsed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "64px" : "232px");
  }, [collapsed]);

  const { data: categories = [] } = useQuery<DynamicCategory[]>({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/laporan") return pathname === "/laporan";
    return pathname.startsWith(href);
  };

  const renderItem = (item: MenuItem) => {
    const active = isActive(item.href);
    return (
      <div key={item.href} className="relative group">
        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center rounded-lg h-9 text-[12px] font-semibold transition-all duration-150 ${
            collapsed ? "md:justify-center px-3 md:px-0" : "gap-2.5 px-3"
          } ${
            active
              ? "bg-emerald-500/20 text-[#7CF5CE] border-l-2 border-[#10B981]"
              : "text-white/60 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent"
          }`}
        >
          <span className="shrink-0">{item.icon}</span>
          {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
        </Link>
        {collapsed && (
          <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
            {item.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top Navbar (Visible on < md) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[#0C1B16] text-white border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Buka navigasi"
            className="p-1.5 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-[#7CF5CE]">KC</span>
            </div>
            <span className="text-[13px] font-extrabold tracking-tight">Kesling</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
            aria-label="Cari"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="[&_button]:!text-white/70 [&_button:hover]:!text-white [&_button]:!bg-transparent [&_button:hover]:!bg-white/10">
            <NotificationBell placement="bottom" />
          </div>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-[#0C1B16] border-r border-[#16352B] text-white flex flex-col ${
          mounted ? "transition-all duration-200" : ""
        } overflow-hidden select-none ${
          mobileOpen ? "translate-x-0 z-50 w-[260px] shadow-2xl" : "-translate-x-full md:translate-x-0 z-40"
        } ${collapsed ? "md:w-16" : "md:w-[232px]"}`}
      >
        {/* Logo & Mobile Close */}
        <div
          className={`flex items-center h-14 shrink-0 border-b border-[#16352B] ${
            collapsed ? "md:justify-center px-4" : "justify-between px-4"
          }`}
        >
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-[#7CF5CE]">KC</span>
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="leading-none min-w-0">
                <p className="text-[13px] font-extrabold tracking-tight truncate">Kesling</p>
                <p className="text-[8px] font-bold text-[#7CF5CE]/70 uppercase tracking-[0.22em] mt-0.5">Cirebon</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 pt-3 pb-1 px-3">
          <div className="relative group">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
              className={`flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.07] text-white/50 hover:text-white transition-all h-9 w-full ${
                collapsed ? "justify-center" : "gap-2 px-3"
              }`}
            >
              <Search className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-[12px] font-medium flex-1 text-left">Cari...</span>
                  <kbd className="text-[9px] font-bold text-white/40 border border-white/15 rounded px-1.5 py-0.5 bg-white/[0.04]">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                Cari (⌘K)
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
          {groups.map((group, gi) => (
            <div key={group.title}>
              {gi > 0 && !collapsed && (
                <p className="px-3 pt-3.5 pb-1 text-[9px] font-extrabold text-white/35 uppercase tracking-[0.22em]">
                  {group.title}
                </p>
              )}
              {gi > 0 && collapsed && <div className="mx-2 my-2 border-t border-[#16352B]" />}
              {group.items.map((item) => {
                if (item.href === "/laporan") {
                  const lapActive = pathname === "/laporan";
                  const catActive = pathname.startsWith("/laporan/");
                  return (
                    <div key={item.href} className="relative group">
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center rounded-lg h-9 text-[12px] font-semibold transition-all duration-150 ${
                          collapsed ? "justify-center px-0" : "gap-2.5 px-3"
                        } ${
                          lapActive
                            ? "bg-emerald-500/20 text-[#7CF5CE] border-l-2 border-[#10B981]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                        {!collapsed && categories.length > 0 && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 text-white/40 transition-transform ${
                              catActive ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </Link>

                      {collapsed && (
                        <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                          {item.label}
                        </span>
                      )}

                      {/* Submenu kategori — inline indent */}
                      {!collapsed && categories.length > 0 && (
                        <div className="mt-1 mb-1.5 ml-4 pl-2.5 border-l border-white/10 space-y-0.5">
                          {categories.map((cat) => {
                            const code = cat.code.toLowerCase();
                            const href = `/laporan/${code}`;
                            const active = pathname === href;
                            return (
                              <Link
                                key={cat.id}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2 rounded-md h-8 px-2.5 text-[11px] font-semibold transition-colors ${
                                  active
                                    ? "bg-emerald-500/20 text-[#7CF5CE]"
                                    : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                                }`}
                              >
                                <span className="shrink-0 scale-90">
                                  {CATEGORY_ICONS[code] || <Folder className="w-4 h-4" />}
                                </span>
                                <span className="truncate">{SHORT_NAMES[code] || cat.nama}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}

                      {/* Collapsed: kategori jadi icon row dengan tooltip */}
                      {collapsed &&
                        categories.map((cat) => {
                          const code = cat.code.toLowerCase();
                          const href = `/laporan/${code}`;
                          const active = pathname === href;
                          const name = SHORT_NAMES[code] || cat.nama;
                          return (
                            <div key={cat.id} className="relative group">
                              <Link
                                href={href}
                                className={`flex items-center justify-center rounded-lg h-9 transition-colors ${
                                  active
                                    ? "bg-emerald-500/20 text-[#7CF5CE] border-l-2 border-[#10B981]"
                                    : "text-white/50 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent"
                                }`}
                              >
                                {CATEGORY_ICONS[code] || <Folder className="w-4 h-4" />}
                              </Link>
                              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                                {name}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  );
                }
                return renderItem(item);
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Dock */}
        <div className="shrink-0 border-t border-[#16352B] p-2 space-y-1 bg-[#0C1B16]">
          {/* Notification */}
          <div className="relative group">
            <div
              className={`flex items-center rounded-lg transition-colors ${
                collapsed ? "justify-center p-1" : "px-2 py-1 gap-2 hover:bg-white/[0.05]"
              }`}
            >
              <div className="[&_button]:!text-white/60 [&_button:hover]:!text-white [&_button]:!bg-transparent [&_button:hover]:!bg-white/[0.08] [&_button]:!rounded-lg">
                <NotificationBell placement={collapsed ? "side" : "top"} />
              </div>
              {!collapsed && <span className="text-[12px] font-semibold text-white/60 select-none">Notifikasi</span>}
            </div>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                Notifikasi
              </span>
            )}
          </div>

          {/* Profile */}
          <div className="relative group">
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center rounded-lg hover:bg-white/[0.06] transition-colors h-11 ${
                collapsed ? "justify-center px-0" : "gap-2.5 px-2"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-black text-[#7CF5CE] shrink-0">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate text-white/90">{session?.user?.name || "User"}</p>
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.18em]">{userRole}</p>
                </div>
              )}
            </Link>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                {session?.user?.name || "Profil"} ({userRole})
              </span>
            )}
          </div>

          {/* Logout & Collapse toggle */}
          <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
            <div className={`relative group ${collapsed ? "w-full" : "flex-1"}`}>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={`flex items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors h-9 w-full ${
                  collapsed ? "justify-center" : "gap-2.5 px-2.5"
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-[12px] font-semibold">Keluar</span>}
              </button>
              {collapsed && (
                <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                  Keluar
                </span>
              )}
            </div>

            <div className="relative group">
              <button
                onClick={() => {
                  const next = !collapsed;
                  setCollapsed(next);
                  try {
                    localStorage.setItem(LS_KEY, next ? "1" : "0");
                  } catch {}
                  document.dispatchEvent(new CustomEvent("kesling:toggle-sidebar", { detail: { collapsed: next } }));
                }}
                aria-label={collapsed ? "Buka sidebar" : "Sembunyikan sidebar"}
                className={`flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors h-9 ${
                  collapsed ? "w-full" : "w-9"
                }`}
              >
                {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
              {collapsed && (
                <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0C1B16] border border-[#16352B] text-white text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                  Buka sidebar
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// Back-compat exports
export function TopNav() {
  return <SideNav />;
}
export function Sidebar() {
  return <SideNav />;
}
