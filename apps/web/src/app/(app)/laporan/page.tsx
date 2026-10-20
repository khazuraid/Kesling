"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, Droplets, Folder, GlassWater, Home, Toilet, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "tamagui";

interface Category {
  id: number;
  nama: string;
  code: string;
  icon: string;
  isRowBased: boolean;
  urutan: number;
  subCategories?: { id: number; nama: string; parentId: number }[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  tpp: <UtensilsCrossed className="w-5 h-5" />,
  spal: <Droplets className="w-5 h-5" />,
  sab: <GlassWater className="w-5 h-5" />,
  jamban: <Toilet className="w-5 h-5" />,
  rumah: <Home className="w-5 h-5" />,
  ttu: <Building2 className="w-5 h-5" />,
};

export default function LaporanListPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "OPERATOR";
  const _isAdmin = userRole === "ADMIN";

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories?includeSub=true");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const totalSub = categories.reduce((sum, c) => sum + (c.subCategories?.length || 0), 0);

  return (
    <div className="w-full mx-auto pb-6 space-y-5 fade-in bg-canvas">
      {/* HERO & STATS (Tamagui Clean Bento) */}
      <Card className="relative overflow-hidden rounded-card border border-border bg-surface shadow-subtle p-0">
        <div className="px-6 py-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-0.5">
                Modul Pelaporan
              </p>
              <h1 className="text-[20px] sm:text-[24px] font-black tracking-tight text-foreground">Laporan Bulanan</h1>
              <p className="text-[12px] text-muted-foreground">Pilih kategori laporan untuk mengelola dan entri data</p>
            </div>
          </div>

          <Link
            href="/laporan-builder"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-surface-subtle hover:bg-surface text-foreground text-[11px] font-bold border border-border shadow-subtle transition-all"
          >
            Builder Template →
          </Link>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border bg-surface-subtle/50">
          <div className="flex flex-col items-center justify-center py-4 px-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Kategori</span>
            <span className="text-[24px] font-black tabular-nums leading-none text-foreground">
              {categories.length}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">Jenis aktif</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4 px-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Sub</span>
            <span className="text-[24px] font-black tabular-nums leading-none text-foreground">{totalSub}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Sub-kategori</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4 px-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Integrasi</span>
            <span className="text-[13px] font-bold text-primary mt-1">Data Dasar</span>
            <span className="text-[10px] text-muted-foreground mt-1">Sinkronisasi otomatis</span>
          </div>
        </div>
      </Card>

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-card border border-border bg-surface p-4 animate-pulse shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-surface-subtle mb-3" />
              <div className="h-3 w-28 bg-surface-subtle rounded mb-2" />
              <div className="h-2 w-40 bg-surface-subtle rounded" />
            </div>
          ))}
        </div>
      )}

      {/* CATEGORY CARDS */}
      {!isLoading && categories.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const subCount = cat.subCategories?.length || 0;
            return (
              <Link
                key={cat.id}
                href={`/laporan/${cat.code.toLowerCase()}`}
                className="group rounded-card border border-border bg-surface p-4 hover:border-primary/50 shadow-subtle hover:shadow-float transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {ICON_MAP[cat.code.toLowerCase()] || <Folder className="w-5 h-5" />}
                </div>
                <h3 className="text-[13px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {cat.nama}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {subCount} sub-kategori · {cat.isRowBased ? "Berbasis baris" : "Berbasis kolom"}
                </p>
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="text-[11px] font-bold group-hover:underline">Buka Laporan</span>
                  <span className="text-[11px] transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* EMPTY */}
      {!isLoading && categories.length === 0 && (
        <div className="rounded-card border border-border bg-surface shadow-subtle flex flex-col items-center justify-center py-20 gap-2">
          <Folder className="w-8 h-8 text-muted-foreground opacity-30" />
          <p className="text-[13px] font-bold text-foreground">Belum ada laporan</p>
          <p className="text-[11px] text-muted-foreground">Hubungi admin untuk mengaktifkan kategori laporan.</p>
        </div>
      )}
    </div>
  );
}
