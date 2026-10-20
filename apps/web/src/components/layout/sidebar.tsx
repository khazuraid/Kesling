"use client";

import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileEdit,
  Folder,
  HardDrive,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { YStack } from "tamagui";
import { NotificationBell } from "@/components/notification-bell";

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
              ? "bg-primary-subtle text-primary border-l-2 border-primary font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border-l-2 border-transparent"
          }`}
        >
          <span className={`shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}>{item.icon}</span>
          {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
        </Link>
        {collapsed && (
          <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
            {item.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-surface/95 backdrop-blur-md text-foreground border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Buka navigasi"
            className="p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-primary">KC</span>
            </div>
            <span className="text-[13px] font-extrabold tracking-tight text-foreground">Kesling</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
            aria-label="Cari"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Search className="w-4 h-4" />
          </button>
          <NotificationBell placement="bottom" />
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-surface border-r border-border text-foreground flex flex-col ${
          mounted ? "transition-all duration-200" : ""
        } overflow-hidden select-none ${
          mobileOpen ? "translate-x-0 z-50 w-[260px] shadow-2xl" : "-translate-x-full md:translate-x-0 z-40"
        } ${collapsed ? "md:w-16" : "md:w-[232px]"}`}
      >
        {/* Logo & Mobile Close */}
        <div
          className={`flex items-center h-14 shrink-0 border-b border-border ${
            collapsed ? "md:justify-center px-4" : "justify-between px-4"
          }`}
        >
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-primary">KC</span>
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="leading-none min-w-0">
                <p className="text-[13px] font-extrabold tracking-tight truncate text-foreground">Kesling</p>
                <p className="text-[8px] font-bold text-primary uppercase tracking-[0.22em] mt-0.5">Cirebon</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Trigger */}
        <div className="shrink-0 pt-3 pb-1 px-3">
          <div className="relative group">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
              className={`flex items-center rounded-lg bg-muted/60 border border-border hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all h-9 w-full ${
                collapsed ? "justify-center" : "gap-2 px-3"
              }`}
            >
              <Search className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-[12px] font-medium flex-1 text-left">Cari...</span>
                  <kbd className="text-[9px] font-bold text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-surface">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                Cari (⌘K)
              </span>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
          {groups.map((group, gi) => (
            <div key={group.title}>
              {gi > 0 && !collapsed && (
                <p className="px-3 pt-3.5 pb-1 text-[9px] font-extrabold text-muted-foreground/70 uppercase tracking-[0.22em]">
                  {group.title}
                </p>
              )}
              {gi > 0 && collapsed && <div className="mx-2 my-2 border-t border-border" />}
              {group.items.map((item) => renderItem(item))}
            </div>
          ))}
        </nav>

        {/* Bottom Dock */}
        <YStack className="shrink-0 border-t border-border p-2 space-y-1 bg-surface">
          {/* Notification */}
          <div className="relative group">
            <div
              className={`flex items-center rounded-lg transition-colors ${
                collapsed ? "justify-center p-1" : "px-2 py-1 gap-2 hover:bg-muted/60"
              }`}
            >
              <NotificationBell placement={collapsed ? "side" : "top"} />
              {!collapsed && (
                <span className="text-[12px] font-semibold text-muted-foreground select-none">Notifikasi</span>
              )}
            </div>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                Notifikasi
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="relative group">
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center rounded-lg hover:bg-muted/60 transition-colors h-11 ${
                collapsed ? "justify-center px-0" : "gap-2.5 px-2"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate text-foreground">{session?.user?.name || "User"}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.18em]">{userRole}</p>
                </div>
              )}
            </Link>
            {collapsed && (
              <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                {session?.user?.name || "Profil"} ({userRole})
              </span>
            )}
          </div>

          {/* Action Row */}
          <XStack className={`items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
            <div className={`relative group ${collapsed ? "w-full" : "flex-1"}`}>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={`flex items-center rounded-lg text-muted-foreground hover:text-error hover:bg-error-light/50 transition-colors h-9 w-full ${
                  collapsed ? "justify-center" : "gap-2.5 px-2.5"
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-[12px] font-semibold">Keluar</span>}
              </button>
              {collapsed && (
                <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
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
                className={`flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors h-9 ${
                  collapsed ? "w-full" : "w-9"
                }`}
              >
                {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
              {collapsed && (
                <span className="hidden md:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface border border-border text-foreground text-[11px] font-medium rounded-md shadow-float whitespace-nowrap z-50 pointer-events-none items-center">
                  Buka sidebar
                </span>
              )}
            </div>
          </XStack>
        </YStack>
      </aside>
    </>
  );
}
