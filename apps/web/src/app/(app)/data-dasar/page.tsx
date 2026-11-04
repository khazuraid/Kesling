"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Database, Droplets, GlassWater, Home, Settings2, Toilet, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { NumberFlow } from "@/components/ui/number-flow";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Category {
  id: number;
  nama: string;
  code: string;
  icon: string;
  deskripsi?: string | null;
  isRowBased: boolean;
  urutan: number;
  parameters?: { id: number; nama: string; code: string; type: string; isBaseline: boolean; config?: any }[];
  subCategories?: { id: number; nama: string; parentId: number }[];
}

interface StatsSummaryItem {
  categoryId: number;
  code: string;
  totalDataDasar: number;
  totalReported: number;
  diff: number;
}

interface StatsResponse {
  success: boolean;
  bulan: number;
  tahun: number;
  summary: Record<string, StatsSummaryItem>;
}

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ICON_MAP: Record<string, React.ReactNode> = {
  tpp: <UtensilsCrossed className="w-5 h-5" />,
  spal: <Droplets className="w-5 h-5" />,
  sab: <GlassWater className="w-5 h-5" />,
  jamban: <Toilet className="w-5 h-5" />,
  rumah: <Home className="w-5 h-5" />,
  ttu: <Building2 className="w-5 h-5" />,
};

export default function DataDasarIndexPage() {
  const [search, setSearch] = useState("");
  const currentDate = new Date();
  const [bulan, setBulan] = useState(currentDate.getMonth() + 1);
  const [tahun, setTahun] = useState(currentDate.getFullYear());

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["laporan-categories", "data-dasar-index"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories?includeSub=true");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ["data-dasar-stats", bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/data-dasar/stats?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const statsSummary = statsData?.summary || {};

  const totalFields = categories.reduce((s, c) => s + (c.parameters || []).filter((p) => p.isBaseline).length, 0);
  const totalSubs = categories.reduce((s, c) => s + (c.subCategories?.length || 0), 0);

  const totalDataDasarSasaran = useMemo(() => {
    return Object.values(statsSummary).reduce((acc, curr) => acc + (curr.totalDataDasar || 0), 0);
  }, [statsSummary]);

  const totalReportedSasaran = useMemo(() => {
    return Object.values(statsSummary).reduce((acc, curr) => acc + (curr.totalReported || 0), 0);
  }, [statsSummary]);

  const totalBelumInputSasaran = useMemo(() => {
    return Object.values(statsSummary).reduce((acc, curr) => acc + (curr.diff || 0), 0);
  }, [statsSummary]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => {
      if ((c.nama || "").toLowerCase().includes(q) || (c.code || "").toLowerCase().includes(q)) return true;
      if ((c.deskripsi || "").toLowerCase().includes(q)) return true;
      return (c.parameters || []).some(
        (p) => p.isBaseline && ((p.nama || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)),
      );
    });
  }, [categories, search]);

  const totalSync = categories.reduce(
    (s, c) => s + (c.parameters || []).filter((p) => p.isBaseline && p.config?.syncToParamId).length,
    0,
  );

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              Data Dasar
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={categories.length} />
              </span>{" "}
              kategori ·{" "}
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={totalSubs} />
              </span>{" "}
              entitas ·{" "}
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={totalFields} />
              </span>{" "}
              field
            </p>
          </div>
          <Button asChild size="default" className="rounded-full shadow-xs">
            <Link href="/laporan-builder">
              <Settings2 className="w-3.5 h-3.5 mr-1" /> Buka Builder
            </Link>
          </Button>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── STAT PILLS ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={categories.length} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Kategori
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={totalSubs} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Entitas
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={totalDataDasarSasaran} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Sasaran Fisik
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-success leading-none">
                <NumberFlow value={totalReportedSasaran} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Di Laporan ({BULAN_NAMES[bulan - 1]?.slice(0, 3)})
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span
                className={`text-[18px] font-black tabular-nums leading-none ${
                  totalBelumInputSasaran > 0 ? "text-warning" : "text-muted-foreground"
                }`}
              >
                <NumberFlow value={totalBelumInputSasaran} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Belum Terinput
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={totalFields} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Field</span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={totalSync} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Sync</span>
            </div>
          </Card>
        </div>

        {/* ── LIST / TABLE CONTAINER ── */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-sm font-bold text-foreground">Kategori Pemeliharaan</h3>
              <p className="text-[11px] font-medium text-muted-foreground">
                Perbandingan sasaran data dasar vs jumlah terdaftar di laporan bulanan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="h-8 text-xs py-0 pl-2.5 pr-7 w-[125px]"
              >
                {BULAN_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="h-8 text-xs py-0 pl-2.5 pr-7 w-[85px]"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Cari kategori atau parameter dasar..."
            debounceMs={150}
          />

          {isLoading ? (
            <Card className="p-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
              <p className="text-[12px] font-medium text-muted-foreground">Memuat data kategori...</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed p-10 flex flex-col items-center justify-center text-center">
              <Database className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-[13px] font-bold text-foreground">
                {categories.length === 0 ? "Belum Ada Kategori" : "Tidak Ada Kategori Cocok"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {categories.length === 0
                  ? "Buat modul dulu di Laporan Builder."
                  : `Tidak ada yang cocok dengan "${search}".`}
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-5">Kategori</TableHead>
                    <TableHead className="hidden md:table-cell">Contoh Parameter Dasar</TableHead>
                    <TableHead className="text-center">Sasaran Fisik</TableHead>
                    <TableHead className="text-center">Di Laporan</TableHead>
                    <TableHead className="text-center">Belum Input</TableHead>
                    <TableHead className="text-center">Entitas</TableHead>
                    <TableHead className="text-center">Field</TableHead>
                    <TableHead className="text-center">Sync</TableHead>
                    <TableHead className="text-right w-24 px-5">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cat) => {
                    const code = cat.code.toLowerCase();
                    const dataDasarFields = (cat.parameters || []).filter((p) => p.isBaseline);
                    const syncFields = dataDasarFields.filter((p) => p.config?.syncToParamId);
                    const subCount = cat.subCategories?.length || 0;
                    const hasData = dataDasarFields.length > 0;
                    const catStat = statsSummary[code] || {
                      totalDataDasar: 0,
                      totalReported: 0,
                      diff: 0,
                    };
                    const sDataDasar = catStat.totalDataDasar;
                    const sReported = catStat.totalReported;
                    const sDiff = catStat.diff;
                    return (
                      <TableRow
                        key={cat.id}
                        className="group cursor-pointer"
                        onClick={() => {
                          window.location.href = `/data-dasar/${encodeURIComponent(code)}`;
                        }}
                      >
                        <TableCell className="px-5 py-4">
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
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 mt-0.5">
                                {cat.code}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {hasData
                              ? dataDasarFields
                                  .slice(0, 3)
                                  .map((p) => p.nama)
                                  .join(" · ")
                              : "Belum ada field"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[15px] font-black tabular-nums leading-none text-foreground block">
                            {sDataDasar}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Sasaran
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[15px] font-black tabular-nums leading-none text-success block">
                            {sReported}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Terdaftar
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {sDataDasar === 0 && sReported === 0 ? (
                            <span className="text-[12px] font-medium text-muted-foreground block">-</span>
                          ) : sDiff === 0 ? (
                            <Badge variant="success" className="text-[10px] px-2 py-0.5">
                              Lengkap
                            </Badge>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <Badge variant="warning" className="text-[11px] font-black tabular-nums px-2 py-0.5">
                                {sDiff} belum
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[15px] font-black tabular-nums leading-none text-foreground block">
                            {subCount}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Entitas
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-[15px] font-black tabular-nums leading-none block ${
                              hasData ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {dataDasarFields.length}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Field
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-[15px] font-black tabular-nums leading-none block ${
                              syncFields.length > 0 ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {syncFields.length}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                            Sync
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-5">
                          <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary-subtle">
                            <Link href={`/data-dasar/${encodeURIComponent(code)}`} onClick={(e) => e.stopPropagation()}>
                              Buka
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
