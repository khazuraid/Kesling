"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Droplets, Folder, GlassWater, Home, Toilet, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
              Modul Pelaporan
            </p>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              Laporan Bulanan
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={categories.length} />
              </span>{" "}
              kategori aktif ·{" "}
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={totalSub} />
              </span>{" "}
              sub-kategori
            </p>
          </div>
          <Button asChild size="default" className="rounded-full shadow-xs">
            <Link href="/laporan-builder">Builder Template →</Link>
          </Button>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── STAT PILLS ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Card className="px-5 py-2.5 bg-primary/10 border-primary/20 shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">
                <NumberFlow value={categories.length} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/80 mt-1">
                Kategori
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-amber-500/10 border-amber-500/20 shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-amber-600 leading-none">
                <NumberFlow value={totalSub} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-600/80 mt-1">
                Sub-kategori
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[13px] font-black text-primary leading-none mt-1">Terintegrasi</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-1">
                Data Dasar
              </span>
            </div>
          </Card>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-4 shadow-subtle">
                <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-40" />
              </Card>
            ))}
          </div>
        )}

        {/* CATEGORY CARDS */}
        {!isLoading && categories.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const subCount = cat.subCategories?.length || 0;
              return (
                <Link key={cat.id} href={`/laporan/${cat.code.toLowerCase()}`}>
                  <Card className="p-4 hover:border-primary/50 shadow-subtle hover:shadow-float transition-all group h-full">
                    <div className="w-10 h-10 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {ICON_MAP[cat.code.toLowerCase()] || <Folder className="w-5 h-5" />}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {cat.nama}
                      </h3>
                      <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                        {cat.code}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      {subCount} sub-kategori · {cat.isRowBased ? "Berbasis baris" : "Berbasis kolom"}
                    </p>
                    <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold">
                      <span className="group-hover:underline">Buka Laporan</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* EMPTY */}
        {!isLoading && categories.length === 0 && (
          <Card className="border-dashed flex flex-col items-center justify-center py-20 gap-2">
            <Folder className="w-8 h-8 text-muted-foreground opacity-30" />
            <p className="text-[13px] font-bold text-foreground">Belum ada laporan</p>
            <p className="text-[11px] text-muted-foreground">Hubungi admin untuk mengaktifkan kategori laporan.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
