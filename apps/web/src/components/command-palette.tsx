"use client";

import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Fetch dynamic categories for navigation
  const { data: categories = [] } = useQuery({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open,
  });

  const staticPages = [
    { label: "Dashboard Overview", href: "/", group: "Dashboard" },
    { label: "Dashboard Puskesmas", href: "/dashboard-pkm", group: "Dashboard" },
    { label: "Perbandingan Puskesmas", href: "/perbandingan", group: "Dashboard" },
    { label: "Rekap Tahunan", href: "/rekap", group: "Laporan" },
    { label: "Laporan Builder", href: "/laporan-builder", group: "Admin" },
    { label: "Approval Laporan", href: "/approval", group: "Admin" },
    { label: "Settings", href: "/settings", group: "Admin" },
    { label: "Manajemen User", href: "/settings/users", group: "Admin" },
    { label: "Import Excel", href: "/settings/import", group: "Admin" },
    { label: "Audit Log", href: "/audit-log", group: "Admin" },
    { label: "File Manager", href: "/file-manager", group: "Admin" },
    { label: "Profile", href: "/profile", group: "User" },
  ];

  const dynamicPages = categories.map((c: any) => ({
    label: `Laporan ${c.nama}`,
    href: `/laporan/${c.code}`,
    group: "Laporan",
  }));

  const allPages = [...staticPages, ...dynamicPages];
  const groups = ["Dashboard", "Laporan", "Admin", "User"];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const onOpen = () => setOpen(true);
    document.addEventListener("kesling:open-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("kesling:open-palette", onOpen);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-card shadow-float text-text-main overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <Command.Input
            placeholder="Cari halaman atau aksi..."
            className="w-full px-5 py-3.5 border-b border-border bg-transparent outline-none text-[13px] font-semibold text-text-main placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-72 overflow-y-auto p-2 scrollbar-none">
            <Command.Empty className="px-4 py-6 text-center text-[12px] font-medium text-muted-foreground">
              Tidak ditemukan.
            </Command.Empty>
            {groups.map((group) => {
              const items = allPages.filter((p) => p.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="mb-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items.map((p) => (
                    <Command.Item
                      key={p.href}
                      value={p.label}
                      onSelect={() => {
                        router.push(p.href);
                        setOpen(false);
                      }}
                      className="px-3 py-2 rounded-lg cursor-pointer text-[12px] font-semibold text-text-main hover:bg-surface-subtle data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                    >
                      {p.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
