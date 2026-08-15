"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Database,
  Droplets,
  GlassWater,
  Home,
  Settings2,
  Toilet,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CardSkeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="pr-5 py-5 space-y-6 fade-in">
      <PageHeader
        title="Data Dasar"
        description="Kelola data master sasaran per kategori pemeriksaan"
        icon={<Database className="w-4 h-4" />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/laporan-builder">
              <Settings2 className="w-3.5 h-3.5" /> Builder
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="card-shell p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center">
            <Database className="w-7 h-7 text-[hsl(var(--muted-foreground))] opacity-60" />
          </div>
          <div>
            <p className="text-[15px] font-bold">Belum ada kategori</p>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-1">Buat modul dulu di Laporan Builder.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/laporan-builder">Buka Builder</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const code = cat.code.toLowerCase();
            const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
            const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
            const subCount = cat.subCategories?.length || 0;
            return (
              <Link
                key={cat.id}
                href={`/data-dasar/${encodeURIComponent(code)}`}
                className="card-hover group p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))] flex items-center justify-center shrink-0 border border-[hsl(var(--accent))]/10">
                      {ICON_MAP[code] || <Database className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold truncate leading-tight">{cat.nama}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--accent))] bg-[hsl(var(--accent-light))] px-2 py-0.5 rounded-full inline-block mt-1">
                        {cat.code}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center group-hover:bg-[hsl(var(--accent))] group-hover:border-[hsl(var(--accent))] group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-[13px] text-[hsl(var(--muted-foreground))] line-clamp-2 flex-1">
                  {dataDasarFields.length > 0
                    ? dataDasarFields
                        .slice(0, 4)
                        .map((p) => p.nama)
                        .join(" • ")
                    : "Belum ada field — atur di Builder"}
                </p>

                <div className="flex items-center gap-5 pt-4 border-t border-[hsl(var(--border))]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Entitas
                    </span>
                    <span className="text-[18px] font-bold tabular-nums">{subCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Field
                    </span>
                    <span
                      className={`text-[18px] font-bold tabular-nums ${dataDasarFields.length > 0 ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))]"}`}
                    >
                      {dataDasarFields.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Sinkron
                    </span>
                    <span
                      className={`text-[18px] font-bold tabular-nums ${syncFields.length > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"}`}
                    >
                      {syncFields.length}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
