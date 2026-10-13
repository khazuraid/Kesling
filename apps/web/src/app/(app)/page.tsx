import { prisma } from "@apps-kes/database";
import { ArrowRight, ArrowUpRight, Download, TrendingDown, TrendingUp } from "lucide-react";
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
  const rest = pkmStats.slice(3);

  return (
    <div className="w-full mx-auto pb-10 fade-in">
      {/* ── HEADER HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0C1B16] text-white px-8 py-7 mb-8">
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#00A876] opacity-[0.14]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#123527_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
              {BULAN[bulan]} {tahun} · Kota Cirebon
            </p>
            <h1 className="text-[32px] font-black tracking-[-0.03em] leading-none">Overview</h1>
            <p className="text-[13px] font-medium text-white/50 mt-2">
              {pkmCount} puskesmas · {categories.length} kategori · {totalData} laporan masuk
            </p>
          </div>
          <div className="flex items-end gap-6">
            <div className="text-right">
              <p className="text-[44px] font-black tabular-nums leading-none text-[#BEF264]">{completionRate}%</p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1">Capaian bulan ini</p>
            </div>
            <a
              href="/api/export/all"
              className="h-10 px-4 flex items-center gap-2 rounded-2xl bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </a>
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]">
        {/* Capaian — highlighted */}
        <div className="bg-[#0C1B16] text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7CF5CE]/70">Capaian</p>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${
                delta >= 0 ? "text-[#7CF5CE]" : "text-red-300"
              }`}
            >
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {delta >= 0 ? "+" : ""}
              {delta}
            </span>
          </div>
          <p className="text-[52px] font-black tabular-nums leading-none tracking-[-0.04em]">
            {completionRate}
            <span className="text-[22px] font-bold text-white/40">%</span>
          </p>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#7CF5CE]" style={{ width: `${Math.max(completionRate, 2)}%` }} />
          </div>
          <p className="text-[10px] font-semibold text-white/50 mt-2">
            {totalData} dari {totalTarget} laporan
          </p>
        </div>

        {/* Tercapai */}
        <div className="bg-[hsl(var(--card))] p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-4">
            Tercapai
          </p>
          <p className="text-[52px] font-black tabular-nums leading-none tracking-[-0.04em] text-[hsl(var(--success))]">
            {achieved}
          </p>
          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-4">puskesmas ≥ 80%</p>
        </div>

        {/* Parsial */}
        <div className="bg-[hsl(var(--card))] p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-4">
            Parsial
          </p>
          <p className="text-[52px] font-black tabular-nums leading-none tracking-[-0.04em] text-[hsl(var(--warning))]">
            {partial}
          </p>
          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-4">50–79% target</p>
        </div>

        {/* Rendah */}
        <div className="bg-[hsl(var(--card))] p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-4">
            Rendah
          </p>
          <p className="text-[52px] font-black tabular-nums leading-none tracking-[-0.04em] text-[hsl(var(--error))]">
            {low}
          </p>
          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-4">&lt; 50% target</p>
        </div>
      </div>

      {/* ── MODUL SPARK CHIPS ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-extrabold tracking-tight text-[hsl(var(--foreground))]">Modul</h2>
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A876] hover:underline"
          >
            Semua <ArrowRight className="w-3 h-3" />
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

      {/* ── LEADERBOARD ── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 podium */}
        <div className="rounded-2xl bg-[#0C1B16] text-white p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7CF5CE]/70 mb-5">
            Teratas Bulan Ini
          </p>
          <div className="space-y-4">
            {top3.map((pkm, idx) => (
              <Link key={pkm.id} href={`/laporan/tpp?puskesmasId=${pkm.id}`} className="flex items-center gap-3 group">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black tabular-nums shrink-0 ${
                    idx === 0
                      ? "bg-[#BEF264] text-[#06281E]"
                      : idx === 1
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold truncate group-hover:text-[#7CF5CE] transition-colors">
                    {pkm.nama}
                  </p>
                  <p className="text-[10px] font-semibold text-white/40">
                    {pkm.submitted} / {pkm.target} laporan
                  </p>
                </div>
                <span className="text-[18px] font-black tabular-nums text-[#BEF264]">{pkm.percentage}%</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sisanya — compact list */}
        <div className="lg:col-span-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mb-4">
            Peringkat Lengkap
          </p>
          <div className="space-y-1">
            {rest.map((pkm, idx) => (
              <Link
                key={pkm.id}
                href={`/laporan/tpp?puskesmasId=${pkm.id}`}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[hsl(var(--muted))]/40 transition-colors group"
              >
                <span className="w-6 text-[11px] font-extrabold tabular-nums text-[hsl(var(--muted-foreground))]">
                  {idx + 4}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate group-hover:text-[#00A876] transition-colors">
                    {pkm.nama}
                  </p>
                </div>
                <div className="hidden sm:block w-24 h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pkm.percentage >= 80
                        ? "bg-[hsl(var(--success))]"
                        : pkm.percentage >= 50
                          ? "bg-[hsl(var(--warning))]"
                          : "bg-[hsl(var(--error))]"
                    }`}
                    style={{ width: `${pkm.percentage}%` }}
                  />
                </div>
                <span
                  className={`w-12 text-right text-[12px] font-extrabold tabular-nums ${
                    pkm.percentage >= 80
                      ? "text-[hsl(var(--success))]"
                      : pkm.percentage >= 50
                        ? "text-[hsl(var(--warning))]"
                        : "text-[hsl(var(--error))]"
                  }`}
                >
                  {pkm.percentage}%
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
