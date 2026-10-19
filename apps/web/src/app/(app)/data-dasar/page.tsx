"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Database, Droplets, GlassWater, Home, Settings2, Toilet, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

interface Category {
  id: number;
  nama: string;
  code: string;
  icon: string;
  isRowBased: boolean;
  urutan: number;
  parameters?: { id: number; nama: string; code: string; type: string; isBaseline: boolean; config?: any }[];
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

export default function DataDasarIndexPage() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["laporan-categories", "data-dasar-index"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories?includeSub=true");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const totalFields = categories.reduce((s, c) => s + (c.parameters || []).filter((p) => p.isBaseline).length, 0);
  const totalSubs = categories.reduce((s, c) => s + (c.subCategories?.length || 0), 0);
  const totalSync = categories.reduce(
    (s, c) => s + (c.parameters || []).filter((p) => p.isBaseline && p.config?.syncToParamId).length,
    0,
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 fade-in bg-canvas min-h-screen">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0C1B16] text-white border border-[#16352B] shadow-lg">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.14] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#153A2D_0%,transparent_60%)] pointer-events-none" />
        <div className="relative z-10 px-6 sm:px-8 py-6 sm:py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/70 mb-2">Master Data</p>
            <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-none">Data Dasar</h1>
            <p className="text-[13px] font-medium text-white/60 mt-2">
              <span className="tabular-nums font-semibold">{categories.length}</span> kategori ·{" "}
              <span className="tabular-nums font-semibold">{totalSubs}</span> entitas ·{" "}
              <span className="tabular-nums font-semibold">{totalFields}</span> field
            </p>
          </div>
          <Link
            href="/laporan-builder"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#BEF264] text-[#06281E] text-[12px] font-black hover:brightness-105 active:scale-95 transition shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5" /> Buka Builder
          </Link>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary-subtle border border-primary/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-primary leading-none">{categories.length}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-primary/80 mt-1">Kategori</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-amber-500/10 border border-amber-500/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-amber-600 leading-none">{totalSubs}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-amber-600/80 mt-1">Entitas</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary-subtle border border-primary/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-primary leading-none">{totalFields}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-primary/80 mt-1">Field</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-surface border border-border shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-foreground leading-none">{totalSync}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-1">Sync</span>
        </span>
      </div>

      {/* ── LIST / TABLE CONTAINER ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.22em]">
            Kategori Pemeliharaan
          </h3>
          <span className="text-[11px] font-bold text-muted-foreground">
            <span className="tabular-nums">{categories.length}</span> modul terdaftar
          </span>
        </div>

        {isLoading ? (
          <div className="rounded-card bg-surface border border-border shadow-subtle p-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-[12px] font-medium text-muted-foreground">Memuat data kategori...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-card bg-surface border border-dashed border-border shadow-subtle p-10 flex flex-col items-center justify-center text-center">
            <Database className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-[13px] font-bold text-foreground">Belum Ada Kategori</p>
            <p className="text-[12px] text-muted-foreground mt-1">Buat modul dulu di Laporan Builder.</p>
          </div>
        ) : (
          <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Kategori</th>
                    <th className="px-4 py-3.5 hidden md:table-cell">Contoh Parameter Dasar</th>
                    <th className="px-4 py-3.5 text-center">Entitas</th>
                    <th className="px-4 py-3.5 text-center">Field</th>
                    <th className="px-4 py-3.5 text-center">Sync</th>
                    <th className="px-5 py-3.5 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {categories.map((cat) => {
                    const code = cat.code.toLowerCase();
                    const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
                    const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
                    const subCount = cat.subCategories?.length || 0;
                    const hasData = dataDasarFields.length > 0;
                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-surface-subtle/70 transition-colors group cursor-pointer"
                        onClick={() => {
                          window.location.href = `/data-dasar/${encodeURIComponent(code)}`;
                        }}
                      >
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                hasData ? "bg-primary-subtle text-primary" : "bg-surface-subtle text-muted-foreground"
                              }`}
                            >
                              {ICON_MAP[code] || <Database className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/data-dasar/${encodeURIComponent(code)}`}
                                className="text-[13px] font-extrabold text-foreground group-hover:text-primary transition-colors block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {cat.nama}
                              </Link>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                {cat.code}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle hidden md:table-cell">
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {hasData
                              ? dataDasarFields
                                  .slice(0, 3)
                                  .map((p) => p.nama)
                                  .join(" · ")
                              : "Belum ada field"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span className="text-[15px] font-black tabular-nums leading-none text-foreground block">
                            {subCount}
                          </span>
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Entitas
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span
                            className={`text-[15px] font-black tabular-nums leading-none block ${
                              hasData ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {dataDasarFields.length}
                          </span>
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Field
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span
                            className={`text-[15px] font-black tabular-nums leading-none block ${
                              syncFields.length > 0 ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {syncFields.length}
                          </span>
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Sync
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle text-right">
                          <Link
                            href={`/data-dasar/${encodeURIComponent(code)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[11px] font-bold text-primary hover:bg-primary-subtle transition-colors shadow-subtle"
                          >
                            Buka
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
