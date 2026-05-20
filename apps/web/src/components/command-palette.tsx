"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const pages = [
  { label: "Dashboard", href: "/" },
  { label: "Master Puskesmas", href: "/master/puskesmas" },
  { label: "Master Jenis TPP", href: "/master/jenis-tpp" },
  { label: "Master Jenis Sarana", href: "/master/jenis-sarana" },
  { label: "Master Jenis TTU", href: "/master/jenis-ttu" },
  { label: "Laporan TPP", href: "/laporan/tpp" },
  { label: "Laporan SPAL", href: "/laporan/spal" },
  { label: "Laporan SAB", href: "/laporan/sab" },
  { label: "Laporan Rumah", href: "/laporan/rumah" },
  { label: "Laporan Jamban", href: "/laporan/jamban" },
  { label: "Laporan TTU", href: "/laporan/ttu" },
  { label: "Rekap Tahunan", href: "/rekap" },
  { label: "Import Excel", href: "/settings/import" },
  { label: "Audit Log", href: "/audit-log" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-lg shadow-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <Command.Input
            placeholder="Cari halaman..."
            className="w-full px-4 py-3 border-b bg-transparent outline-none"
          />
          <Command.List className="max-h-64 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-2 text-sm text-slate-400">Tidak ditemukan.</Command.Empty>
            {pages.map((p) => (
              <Command.Item
                key={p.href}
                value={p.label}
                onSelect={() => {
                  router.push(p.href);
                  setOpen(false);
                }}
                className="px-4 py-2 rounded cursor-pointer text-sm hover:bg-slate-100 data-[selected=true]:bg-slate-100"
              >
                {p.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
