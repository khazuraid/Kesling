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
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white rounded-b-3xl">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />
        <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Master Data</p>
            <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Data Dasar</h1>
            <p className="text-[13px] font-medium text-white/50 mt-2">
              {categories.length} kategori · {totalSubs} entitas · {totalFields} field
            </p>
          </div>
          <Link
            href="/laporan-builder"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
          >
            <Settings2 className="w-3.5 h-3.5" /> Buka Builder
          </Link>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="mt-6 flex items-center gap-3">
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-2xl bg-[#00A876]/10 border border-[#00A876]/20">
          <span className="text-[18px] font-black tabular-nums text-[#00A876] leading-none">{categories.length}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#00A876]/70 mt-1">Kategori</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-2xl bg-[#E8A33D]/10 border border-[#E8A33D]/20">
          <span className="text-[18px] font-black tabular-nums text-[#C07F1F] leading-none">{totalSubs}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#C07F1F]/70 mt-1">Entitas</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-2xl bg-[#00A876]/10 border border-[#00A876]/20">
          <span className="text-[18px] font-black tabular-nums text-[#00A876] leading-none">{totalFields}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#00A876]/70 mt-1">Field</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-2xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
          <span className="text-[18px] font-black tabular-nums text-[hsl(var(--foreground))] leading-none">
            {totalSync}
          </span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mt-1">
            Sync
          </span>
        </span>
      </div>

      {/* ── LIST ── */}
      <div className="pt-6">
        <h3 className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.22em] px-1 pb-2">
          Kategori Pemeliharaan
        </h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-[hsl(var(--muted))]/20 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <Database className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Kategori</p>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">Buat modul dulu di Laporan Builder.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => {
              const code = cat.code.toLowerCase();
              const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
              const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
              const subCount = cat.subCategories?.length || 0;
              const hasData = dataDasarFields.length > 0;
              const rail = hasData ? "#00A876" : "#d6d3d1";
              return (
                <Link
                  key={cat.id}
                  href={`/data-dasar/${encodeURIComponent(code)}`}
                  className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden"
                >
                  <div className="w-1 shrink-0" style={{ background: rail }} />
                  <div className="flex-1 flex items-center gap-4 px-5 py-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        hasData
                          ? "bg-[#00A876]/10 text-[#00A876]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {ICON_MAP[code] || <Database className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">{cat.nama}</h4>
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5 uppercase tracking-wider">
                        {cat.code}
                      </p>
                    </div>
                    <div className="hidden md:block flex-1 text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                      {hasData
                        ? dataDasarFields
                            .slice(0, 3)
                            .map((p) => p.nama)
                            .join(" · ")
                        : "Belum ada field"}
                    </div>
                    <div className="shrink-0 flex items-center gap-5">
                      <div className="text-center">
                        <div className="text-[16px] font-black tabular-nums leading-none">{subCount}</div>
                        <div className="text-[8px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">
                          Entitas
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-[16px] font-black tabular-nums leading-none ${hasData ? "text-[#00A876]" : "text-[hsl(var(--muted-foreground))]"}`}
                        >
                          {dataDasarFields.length}
                        </div>
                        <div className="text-[8px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">
                          Field
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-[16px] font-black tabular-nums leading-none ${syncFields.length > 0 ? "text-[#00A876]" : "text-[hsl(var(--muted-foreground))]"}`}
                        >
                          {syncFields.length}
                        </div>
                        <div className="text-[8px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">
                          Sync
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
