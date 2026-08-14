"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Database, Folder, Settings2 } from "lucide-react";
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
    <div className="w-full min-h-[calc(100dvh-4rem)] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="h-14 border-b border-[hsl(var(--border))] px-5 flex items-center justify-between bg-[hsl(var(--card))]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--accent-light))] border border-[hsl(var(--accent))/0.15] flex items-center justify-center">
            <Database className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-bold tracking-tight">Data Dasar</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
              Form mengikuti tab Data Dasar di Laporan Builder
            </p>
          </div>
        </div>
        <Link
          href="/laporan-builder"
          className="h-9 px-4 rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] flex items-center gap-2 text-[12px] font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Settings2 className="w-3.5 h-3.5" /> Builder
        </Link>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse bg-[hsl(var(--muted))]/40" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] h-72 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
              <Folder className="w-7 h-7 text-[hsl(var(--accent))] opacity-60" />
            </div>
            <div>
              <p className="text-[14px] font-bold">Belum ada kategori</p>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                Buat modul dulu di Laporan Builder.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((cat) => {
              const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
              const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
              const subCount = cat.subCategories?.length || 0;
              return (
                <Link
                  key={cat.id}
                  href={`/data-dasar/${encodeURIComponent(cat.code.toLowerCase())}`}
                  className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--accent))/0.4] hover:shadow-[var(--shadow-md)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-bold truncate">{cat.nama}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] inline-block mt-0.5">
                          {cat.code}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center group-hover:bg-[hsl(var(--accent))] group-hover:border-[hsl(var(--accent))] group-hover:text-[hsl(var(--accent-foreground))] transition-colors shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-3 line-clamp-2">
                    {dataDasarFields.length > 0
                      ? dataDasarFields
                          .slice(0, 4)
                          .map((p) => p.nama)
                          .join(" • ")
                      : "Belum ada field Data Dasar — atur di Builder"}
                  </p>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Entitas
                      </p>
                      <p className="text-[16px] font-bold tabular-nums text-[hsl(var(--foreground))]">{subCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Field
                      </p>
                      <p
                        className={`text-[16px] font-bold tabular-nums ${dataDasarFields.length > 0 ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))]"}`}
                      >
                        {dataDasarFields.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Sinkron
                      </p>
                      <p
                        className={`text-[16px] font-bold tabular-nums ${syncFields.length > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"}`}
                      >
                        {syncFields.length}
                      </p>
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
