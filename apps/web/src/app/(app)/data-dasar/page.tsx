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
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories?includeSub=true");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="w-full h-[calc(100dvh-4rem)] overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="h-14 border-b border-[hsl(var(--border))] px-5 flex items-center justify-between bg-[hsl(var(--card))]">
        <div className="flex items-center gap-3 min-w-0">
          <Database className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0">
            <h1 className="text-[13px] font-black uppercase tracking-widest">Data Dasar</h1>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
              Form mengikuti tab Data Dasar di Laporan Builder
            </p>
          </div>
        </div>
        <Link
          href="/laporan-builder"
          className="h-8 px-3 border border-[hsl(var(--border))] flex items-center gap-2 text-[10px] font-black uppercase tracking-wider hover:border-[hsl(var(--foreground))] transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" /> Builder
        </Link>
      </div>

      <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-5">
        {isLoading ? (
          <div className="border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse bg-[hsl(var(--muted))]/20" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] h-72 flex flex-col items-center justify-center text-center gap-2">
            <Folder className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-40" />
            <p className="text-[13px] font-black">Belum ada kategori</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Buat modul dulu di Laporan Builder.</p>
          </div>
        ) : (
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
            {categories.map((cat) => {
              const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
              const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
              const subCount = cat.subCategories?.length || 0;
              return (
                <Link
                  key={cat.id}
                  href={`/data-dasar/${cat.code.toLowerCase()}`}
                  className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_120px_120px_auto] gap-4 items-center px-4 py-4 hover:bg-[hsl(var(--muted))]/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black uppercase tracking-tight truncate">{cat.nama}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                        {cat.code}
                      </span>
                    </div>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 truncate">
                      {dataDasarFields.length > 0
                        ? dataDasarFields
                            .slice(0, 4)
                            .map((p) => p.nama)
                            .join(" • ")
                        : "Belum ada field Data Dasar — atur di Builder"}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Entitas
                    </p>
                    <p className="text-[13px] font-black tabular-nums">{subCount}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Field
                    </p>
                    <p className="text-[13px] font-black tabular-nums">{dataDasarFields.length}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Sinkron
                    </p>
                    <p className="text-[13px] font-black tabular-nums">{syncFields.length}</p>
                  </div>

                  <div className="h-8 w-8 border border-[hsl(var(--border))] flex items-center justify-center group-hover:border-[hsl(var(--foreground))] group-hover:bg-[hsl(var(--foreground))] group-hover:text-[hsl(var(--background))] transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
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
