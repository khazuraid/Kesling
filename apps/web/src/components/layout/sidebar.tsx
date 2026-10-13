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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  ShieldCheck,
  Toilet,
  UtensilsCrossed,
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

  useEffect(() => {
    const v = localStorage.getItem(LS_KEY);
    if (v === "1") setCollapsed(true);
  }, []);

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
    if (href === "/laporan") return pathname === "/laporan"; // jangan startsWith — submenu punya path sendiri
    return pathname.startsWith(href);
  };

  const renderItem = (item: MenuItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`flex items-center rounded-lg h-9 text-[12px] font-bold transition-colors ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-3"
        } ${active ? "bg-[#00A876] text-[#06281E]" : "text-white/60 hover:text-white hover:bg-white/8"}`}
      >
        <span className="shrink-0">{item.icon}</span>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0C1B16] text-white flex flex-col transition-[width] duration-200 overflow-hidden ${
        collapsed ? "w-16" : "w-[232px]"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-14 shrink-0 border-b border-white/8 ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-4"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#00A876] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-[#06281E]">KC</span>
          </div>
          {!collapsed && (
            <div className="leading-none min-w-0">
              <p className="text-[13px] font-extrabold tracking-tight truncate">Kesling</p>
              <p className="text-[8px] font-bold text-[#7CF5CE]/60 uppercase tracking-[0.22em] mt-0.5">Cirebon</p>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      <div className="shrink-0 pt-3 pb-1 px-3">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
          title="Cari (⌘K)"
          className={`flex items-center rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white transition-colors h-9 w-full ${
            collapsed ? "justify-center" : "gap-2 px-3"
          }`}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-[12px] font-semibold flex-1 text-left">Cari...</span>
              <kbd className="text-[9px] font-bold text-white/30 border border-white/15 rounded px-1 py-px">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-none">
        {groups.map((group, gi) => (
          <div key={group.title}>
            {gi > 0 && !collapsed && (
              <p className="px-3 pt-4 pb-1 text-[9px] font-extrabold text-white/35 uppercase tracking-[0.22em]">
                {group.title}
              </p>
            )}
            {gi > 0 && collapsed && <div className="mx-2 my-2 border-t border-white/8" />}
            {group.items.map((item) => {
              if (item.href === "/laporan") {
                const lapActive = pathname === "/laporan";
                const catActive = pathname.startsWith("/laporan/");
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg h-9 text-[12px] font-bold transition-colors ${
                        collapsed ? "justify-center px-0" : "gap-2.5 px-3"
                      } ${lapActive ? "bg-[#00A876] text-[#06281E]" : "text-white/60 hover:text-white hover:bg-white/8"}`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                      {!collapsed && categories.length > 0 && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${catActive ? "rotate-180" : ""}`}
                        />
                      )}
                    </Link>
                    {/* Submenu kategori — inline indent */}
                    {!collapsed && categories.length > 0 && (
                      <div className="mt-0.5 mb-1 ml-[26px] space-y-0.5 border-l border-white/10 pl-2">
                        {categories.map((cat) => {
                          const code = cat.code.toLowerCase();
                          const href = `/laporan/${code}`;
                          const active = pathname === href;
                          return (
                            <Link
                              key={cat.id}
                              href={href}
                              className={`flex items-center gap-2 rounded-md h-8 px-2.5 text-[11px] font-bold transition-colors ${
                                active
                                  ? "bg-[#00A876]/20 text-[#7CF5CE]"
                                  : "text-white/50 hover:text-white hover:bg-white/6"
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
                    {/* Collapsed: kategori jadi icon row */}
                    {collapsed &&
                      categories.map((cat) => {
                        const code = cat.code.toLowerCase();
                        const href = `/laporan/${code}`;
                        const active = pathname === href;
                        return (
                          <Link
                            key={cat.id}
                            href={href}
                            title={SHORT_NAMES[code] || cat.nama}
                            className={`flex items-center justify-center rounded-lg h-9 transition-colors ${
                              active ? "bg-[#00A876] text-[#06281E]" : "text-white/55 hover:text-white hover:bg-white/8"
                            }`}
                          >
                            {CATEGORY_ICONS[code] || <Folder className="w-4 h-4" />}
                          </Link>
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

      {/* Bottom */}
      <div className="shrink-0 border-t border-white/8 p-2 space-y-1">
        <div className={`flex items-center ${collapsed ? "justify-center" : "px-1"}`}>
          <div className="[&_button]:!text-white/60 [&_button:hover]:!text-white [&_button]:!bg-transparent [&_button:hover]:!bg-white/8 [&_button]:!rounded-lg">
            <NotificationBell />
          </div>
          {!collapsed && <span className="text-[11px] font-bold text-white/50 ml-1">Notifikasi</span>}
        </div>

        <Link
          href="/profile"
          title={collapsed ? session?.user?.name || "Profil" : undefined}
          className={`flex items-center rounded-lg hover:bg-white/8 transition-colors h-11 ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-2"
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-[#00A876] flex items-center justify-center text-[11px] font-extrabold text-[#06281E] shrink-0">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold truncate">{session?.user?.name || "User"}</p>
              <p className="text-[8px] font-bold text-white/35 uppercase tracking-[0.18em]">{userRole}</p>
            </div>
          )}
        </Link>

        <div className={`flex items-center ${collapsed ? "flex-col gap-1" : ""}`}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Logout"
            className={`flex items-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors h-9 ${
              collapsed ? "justify-center w-full" : "gap-2.5 px-3 flex-1"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-[12px] font-bold">Keluar</span>}
          </button>
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              document.dispatchEvent(new CustomEvent("kesling:toggle-sidebar"));
            }}
            title={collapsed ? "Buka sidebar" : "Sembunyikan sidebar"}
            className={`flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors h-9 ${
              collapsed ? "w-full" : "w-9"
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Back-compat exports
export function TopNav() {
  return <SideNav />;
}
export function Sidebar() {
  return <SideNav />;
}
