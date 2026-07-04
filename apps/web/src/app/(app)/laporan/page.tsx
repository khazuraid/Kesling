"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, Droplets, Folder, GlassWater, Home, Toilet, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
  const isAdmin = userRole === "ADMIN";

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
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Laporan</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Pilih kategori laporan untuk mengelola data</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex flex-col items-center justify-center py-4 px-2 border-r border-[hsl(var(--border))]">
          <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
            Kategori
          </span>
          <span className="text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--foreground))]">
            {categories.length}
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">Jenis aktif</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-2 border-r border-[hsl(var(--border))]">
          <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
            Total Sub
          </span>
          <span className="text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--foreground))]">
            {totalSub}
          </span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">Sub-kategori</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-2">
          <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
            Format
          </span>
          <Link href="/laporan-builder" className="text-[12px] font-bold text-[hsl(var(--foreground))] hover:underline">
            Builder →
          </Link>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">Atur template</span>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 animate-pulse">
              <div className="w-10 h-10 bg-[hsl(var(--muted))] mb-3" />
              <div className="h-3 w-28 bg-[hsl(var(--muted))] mb-2" />
              <div className="h-2 w-40 bg-[hsl(var(--muted))]" />
            </div>
          ))}
        </div>
      )}

      {/* CATEGORY CARDS */}
      {!isLoading && categories.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map((cat) => {
            const subCount = cat.subCategories?.length || 0;
            return (
              <Link
                key={cat.id}
                href={`/laporan/${cat.code.toLowerCase()}`}
                className="group border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--foreground))] transition-colors"
              >
                <div className="w-10 h-10 bg-[hsl(var(--muted))] flex items-center justify-center mb-3 group-hover:bg-[hsl(var(--foreground))] group-hover:text-[hsl(var(--background))] transition-colors">
                  {ICON_MAP[cat.code.toLowerCase()] || <Folder className="w-5 h-5" />}
                </div>
                <h3 className="text-[13px] font-bold text-[hsl(var(--foreground))] mb-1">{cat.nama}</h3>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">
                  {subCount} sub-kategori · {cat.isRowBased ? "Berbasis baris" : "Berbasis kolom"}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[hsl(var(--foreground))] group-hover:underline">
                    Buka Laporan
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* EMPTY */}
      {!isLoading && categories.length === 0 && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-2">
          <Folder className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
          <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum ada laporan</p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Hubungi admin untuk mengaktifkan kategori laporan.
          </p>
        </div>
      )}
    </div>
  );
}
