import { prisma } from "@apps-kes/database";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleSparkChips } from "@/components/module-spark-chips";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const BULAN = [
  "",
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user?.role === "OPERATOR") redirect("/dashboard-pkm");

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [pkmCount, categories] = await Promise.all([
    prisma.puskesmas.count(),
    prisma.dynamicCategory.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  // Bulan ini + bulan lalu (untuk delta)
  const prevBulan = bulan === 1 ? 12 : bulan - 1;
  const prevTahun = bulan === 1 ? tahun - 1 : tahun;

  const [grouped, prevGrouped] = await Promise.all([
    prisma.dynamicLaporan.groupBy({
      by: ["categoryId"],
      where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
      _count: { id: true },
    }),
    prisma.dynamicLaporan.groupBy({
      by: ["categoryId"],
      where: { bulan: prevBulan, tahun: prevTahun, status: { in: ["SUBMITTED", "APPROVED"] } },
      _count: { id: true },
    }),
  ]);

  const countMap = new Map(
    (grouped as Array<{ categoryId: number; _count: { id: number } }>).map((g) => [g.categoryId, g._count.id]),
  );
  const prevCountMap = new Map(
    (prevGrouped as Array<{ categoryId: number; _count: { id: number } }>).map((g) => [g.categoryId, g._count.id]),
  );

  const counts = (categories as Array<{ id: number; nama: string; code: string; icon: string | null }>).map((cat) => ({
    ...cat,
    count: countMap.get(cat.id) || 0,
    prevCount: prevCountMap.get(cat.id) || 0,
  }));

  const totalData = counts.reduce((acc, c) => acc + c.count, 0);
  const prevTotal = counts.reduce((acc, c) => acc + c.prevCount, 0);
  const delta = totalData - prevTotal;
  const targetPerPkm = categories.length;
  const totalTarget = pkmCount * targetPerPkm;
  const completionRate = totalTarget > 0 ? Math.round((totalData / totalTarget) * 100) : 0;

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { nama: "asc" } });
  const pkmGrouped = await prisma.dynamicLaporan.groupBy({
    by: ["puskesmasId"],
    where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    _count: { id: true },
  });
  const pkmMap = new Map(
    (pkmGrouped as Array<{ puskesmasId: number; _count: { id: number } }>).map((g) => [g.puskesmasId, g._count.id]),
  );

  const pkmStats = (puskesmasList as Array<{ id: number; nama: string }>)
    .map((pkm) => {
      const submitted = pkmMap.get(pkm.id) || 0;
      const percentage = targetPerPkm > 0 ? Math.round((submitted / targetPerPkm) * 100) : 0;
      return { id: pkm.id, nama: pkm.nama, submitted, target: targetPerPkm, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const achieved = pkmStats.filter((p) => p.percentage >= 80).length;
  const partial = pkmStats.filter((p) => p.percentage >= 50 && p.percentage < 80).length;
  const low = pkmStats.filter((p) => p.percentage < 50).length;
  const top3 = pkmStats.slice(0, 3);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 fade-in">
      {/* ── HEADER HERO (Tamagui Bento Style) ── */}
      <div className="relative overflow-hidden rounded-card bg-[#0C1B16] text-white border border-[#16352B] shadow-float">
        {/* Decorative background glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#00A876] opacity-[0.16] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.08] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#153A2D_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 px-5 sm:px-8 py-5 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider text-[#7CF5CE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7CF5CE] animate-pulse" />
                Dinas Kesehatan · Kota Cirebon
              </span>
              <span className="text-[11px] font-bold text-white/50">
                {BULAN[bulan]} {tahun}
              </span>
            </div>
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight leading-tight">
              Executive Dashboard Kesling
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-white/70 flex items-center gap-2 flex-wrap">
              <span>{pkmCount} Puskesmas</span>
              <span>·</span>
              <span>{categories.length} Program Prioritas</span>
              <span>·</span>
              <span className="text-[#BEF264] font-bold tabular-nums">{totalData} Laporan Terverifikasi</span>
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 self-start md:self-auto shrink-0">
            <div className="text-right border-r border-white/10 pr-4 sm:pr-6">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-[36px] sm:text-[42px] font-black tabular-nums leading-none text-[#BEF264]">
                  {completionRate}
                </span>
                <span className="text-[16px] sm:text-[18px] font-bold text-[#BEF264]/70">%</span>
              </div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">Capaian Kota</p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2">
              <a
                href="/api/export/all"
                className="h-9 sm:h-10 px-4 sm:px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#BEF264] text-[#06281E] text-[12px] font-black hover:bg-[#aee64b] active:scale-[0.98] transition shadow-subtle shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Export Data</span>
              </a>
              <Link
                href="/laporan"
                className="h-8 sm:h-9 px-3.5 sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 text-white text-[11px] font-bold hover:bg-white/15 active:scale-[0.98] transition border border-white/10 shrink-0"
              >
                <span>Semua Laporan</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Capaian */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-subtle hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Capaian</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
              }`}
            >
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="tabular-nums">{delta >= 0 ? `+${delta}` : delta}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] sm:text-[36px] font-black tabular-nums tracking-tight text-foreground">
              {completionRate}%
            </span>
          </div>
          <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(Math.max(completionRate, 3), 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium leading-relaxed">
            <span className="tabular-nums font-bold text-foreground">{totalData}</span> dari{" "}
            <span className="tabular-nums">{totalTarget}</span> target laporan
          </p>
        </div>

        {/* Card 2: Tercapai */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-subtle hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Target Tercapai</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] sm:text-[36px] font-black tabular-nums tracking-tight text-emerald-600">
              {achieved}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">/ {pkmCount} PKM</span>
          </div>
          <div className="mt-3 h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pkmCount > 0 ? (achieved / pkmCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium leading-relaxed">
            Kepatuhan &ge; 80% (
            <span className="tabular-nums">{pkmCount > 0 ? Math.round((achieved / pkmCount) * 100) : 0}%</span> wilayah)
          </p>
        </div>

        {/* Card 3: Parsial */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-subtle hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Kinerja Parsial</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] sm:text-[36px] font-black tabular-nums tracking-tight text-amber-600">
              {partial}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">/ {pkmCount} PKM</span>
          </div>
          <div className="mt-3 h-2 w-full bg-amber-500/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${pkmCount > 0 ? (partial / pkmCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium leading-relaxed">
            Capaian 50% &ndash; 79% (
            <span className="tabular-nums">{pkmCount > 0 ? Math.round((partial / pkmCount) * 100) : 0}%</span> wilayah)
          </p>
        </div>

        {/* Card 4: Rendah / Butuh Pembinaan */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-subtle hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Perlu Pembinaan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] sm:text-[36px] font-black tabular-nums tracking-tight text-rose-600">
              {low}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">/ {pkmCount} PKM</span>
          </div>
          <div className="mt-3 h-2 w-full bg-rose-500/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-500 transition-all duration-500"
              style={{ width: `${pkmCount > 0 ? (low / pkmCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium leading-relaxed">
            Capaian &lt; 50% target bulanan
          </p>
        </div>
      </div>

      {/* ── MODUL / PROGRAM PRIORITAS ── */}
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-black text-foreground">Status Program & Modul</h2>
            <p className="text-[12px] text-muted-foreground font-medium mt-0.5">
              Distribusi input laporan per indikator kesehatan lingkungan
            </p>
          </div>
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
          >
            Buka Semua Modul <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <ModuleSparkChips
          stats={counts.map((c) => ({
            id: c.id,
            nama: c.nama,
            code: c.code,
            icon: c.icon,
            count: c.count,
            prevCount: c.prevCount,
            pkmCount,
          }))}
        />
      </div>

      {/* ── LEADERBOARD WILAYAH KERJA ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[16px] font-black text-foreground">Pemantauan Kinerja Puskesmas</h2>
          <p className="text-[12px] text-muted-foreground font-medium mt-0.5">
            Peringkat kepatuhan pelaporan seluruh puskesmas se-Kota Cirebon
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 3 Podium Cards */}
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Top 3 Teratas
            </span>
            <div className="space-y-2.5">
              {top3.map((pkm, idx) => {
                const medalColors = [
                  { bg: "bg-amber-400 text-amber-950 border-amber-300", badge: "🥇 Rank 1", color: "text-amber-500" },
                  { bg: "bg-slate-300 text-slate-900 border-slate-200", badge: "🥈 Rank 2", color: "text-slate-400" },
                  { bg: "bg-amber-600/80 text-white border-amber-500", badge: "🥉 Rank 3", color: "text-amber-600" },
                ][idx];

                return (
                  <Link
                    key={pkm.id}
                    href={`/laporan/tpp?puskesmasId=${pkm.id}`}
                    className="group block p-4 rounded-card border border-border bg-surface hover:border-primary hover:shadow-md transition-all shadow-subtle"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${medalColors.bg}`}>
                        {medalColors.badge}
                      </span>
                      <span className="text-[18px] font-black tabular-nums text-primary">{pkm.percentage}%</span>
                    </div>
                    <h3 className="text-[14px] font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
                      {pkm.nama}
                    </h3>
                    <p className="text-[11px] font-medium text-muted-foreground mt-1">
                      <span className="tabular-nums font-semibold">{pkm.submitted}</span> dari{" "}
                      <span className="tabular-nums">{pkm.target}</span> target laporan terpenuhi
                    </p>
                    <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(pkm.percentage, 100)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Full Ranking Table */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Peringkat Keseluruhan ({pkmStats.length} Puskesmas)
            </span>
            <div className="rounded-card border border-border bg-surface divide-y divide-border overflow-hidden shadow-subtle">
              <div className="p-3 bg-surface-subtle grid grid-cols-12 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-6 sm:col-span-6">Nama Puskesmas</span>
                <span className="hidden sm:block sm:col-span-3 text-center">Progress Target</span>
                <span className="col-span-5 sm:col-span-2 text-right">Capaian</span>
              </div>
              <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
                {pkmStats.map((pkm, idx) => (
                  <Link
                    key={pkm.id}
                    href={`/laporan/tpp?puskesmasId=${pkm.id}`}
                    className="grid grid-cols-12 items-center p-3 hover:bg-surface-subtle transition-colors group text-[12px]"
                  >
                    <span className="col-span-1 text-center font-bold font-mono text-muted-foreground tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="col-span-6 sm:col-span-6 min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {pkm.nama}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="tabular-nums">{pkm.submitted}</span> /{" "}
                        <span className="tabular-nums">{pkm.target}</span> laporan
                      </p>
                    </div>
                    <div className="hidden sm:block sm:col-span-3 px-2">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pkm.percentage >= 80
                              ? "bg-emerald-500"
                              : pkm.percentage >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(pkm.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-5 sm:col-span-2 text-right flex items-center justify-end gap-1.5 font-black tabular-nums">
                      <span
                        className={`text-[12px] px-2 py-0.5 rounded-md ${
                          pkm.percentage >= 80
                            ? "bg-emerald-500/10 text-emerald-600"
                            : pkm.percentage >= 50
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {pkm.percentage}%
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
