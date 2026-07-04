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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <Command.Input
            placeholder="Cari halaman atau aksi..."
            className="w-full px-6 py-4 border-b border-zinc-100 bg-transparent outline-none text-[14px] font-semibold text-zinc-950 placeholder:text-zinc-400"
          />
          <Command.List className="max-h-72 overflow-y-auto p-3">
            <Command.Empty className="px-4 py-3 text-[13px] font-medium text-zinc-400">Tidak ditemukan.</Command.Empty>
            {groups.map((group) => {
              const items = allPages.filter((p) => p.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className="mb-2">
                  {items.map((p) => (
                    <Command.Item
                      key={p.href}
                      value={p.label}
                      onSelect={() => {
                        router.push(p.href);
                        setOpen(false);
                      }}
                      className="px-4 py-2.5 rounded-xl cursor-pointer text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 data-[selected=true]:bg-zinc-950 data-[selected=true]:text-white transition-colors"
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
