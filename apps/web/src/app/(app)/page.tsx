import { prisma } from "@apps-kes/database";
import { ArrowRight, BarChart3, Building2, ChevronRight, Download } from "lucide-react";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

const DashboardChart = nextDynamic(
  () => import("@/components/dashboard-chart").then((m) => ({ default: m.DashboardChart })),
  {
    loading: () => (
      <div className="h-[350px] w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] animate-pulse" />
    ),
  },
);

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

  const grouped = await prisma.dynamicLaporan.groupBy({
    by: ["categoryId"],
    where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    _count: { id: true },
  });

  const countMap = new Map(grouped.map((g) => [g.categoryId, g._count.id]));
  const counts = categories.map((cat) => ({ ...cat, count: countMap.get(cat.id) || 0 }));

  const totalData = counts.reduce((acc, c) => acc + c.count, 0);
  const targetPerPkm = categories.length;
  const completionRate =
    pkmCount > 0 && targetPerPkm > 0 ? Math.round((totalData / (pkmCount * targetPerPkm)) * 100) : 0;

  const stats = counts.map((c) => ({
    id: c.id,
    nama: c.nama,
    code: c.code,
    count: c.count,
    href: `/laporan/${c.code}`,
    icon: c.icon || "📄",
  }));

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { nama: "asc" } });
  const pkmGrouped = await prisma.dynamicLaporan.groupBy({
    by: ["puskesmasId"],
    where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    _count: { id: true },
  });
  const pkmMap = new Map(pkmGrouped.map((g) => [g.puskesmasId, g._count.id]));

  const pkmStats = puskesmasList
    .map((pkm) => {
      const submitted = pkmMap.get(pkm.id) || 0;
      const percentage = targetPerPkm > 0 ? Math.round((submitted / targetPerPkm) * 100) : 0;
      return { id: pkm.id, nama: pkm.nama, submitted, target: targetPerPkm, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Overview</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Dashboard · {BULAN[bulan]} {tahun}
          </p>
        </div>
        <a
          href="/api/export/all"
          className="h-9 px-3 flex items-center gap-1.5 border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors ml-auto"
        >
          <Download className="w-3 h-3" /> Export
        </a>
      </div>

      {/* STAT STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        <div className="flex flex-col items-center justify-center py-5 px-4 border-r border-[hsl(var(--border))]">
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-1">
            Completion
          </span>
          <span className="text-[28px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
            {completionRate}
            <span className="text-[14px] text-[hsl(var(--muted-foreground))]">%</span>
          </span>
          <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))] mt-1">
            dari {pkmCount * targetPerPkm} target
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-5 px-4 border-r border-[hsl(var(--border))]">
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-1">
            Puskesmas
          </span>
          <span className="text-[28px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
            {pkmCount}
          </span>
          <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))] mt-1">Unit aktif</span>
        </div>
        <div className="flex flex-col items-center justify-center py-5 px-4 border-r border-[hsl(var(--border))]">
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-1">
            Laporan
          </span>
          <span className="text-[28px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
            {totalData}
          </span>
          <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))] mt-1">
            {BULAN[bulan]} {tahun}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-5 px-4">
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-1">
            Target
          </span>
          <span className="text-[28px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
            {pkmCount * targetPerPkm}
          </span>
          <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))] mt-1">
            {pkmCount} × {targetPerPkm} kategori
          </span>
        </div>
      </div>

      {/* CHART + MODULE ACCESS */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Volume Laporan
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[hsl(var(--foreground))] tracking-tight mt-1">
                Tren Pengumpulan — Tahun {tahun}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-0.5">
                  Entri
                </p>
                <p className="text-[18px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
                  {totalData}
                </p>
              </div>
              <div className="w-px h-8 bg-[hsl(var(--border))]" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-0.5">
                  PKM
                </p>
                <p className="text-[18px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
                  {pkmCount}
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 min-h-[320px]">
            <DashboardChart />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                Unduh & Kelola
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[hsl(var(--foreground))] tracking-tight mt-1">Akses Modul</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[460px]">
            {stats.map((s) => (
              <a
                key={s.code}
                href={`/api/export/${s.code}?bulan=${bulan}&tahun=${tahun}`}
                className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30 transition-colors group/item"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[hsl(var(--muted))] flex items-center justify-center text-sm shrink-0">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{s.nama}</p>
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mt-0.5">
                      {s.count} entri
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 border border-[hsl(var(--border))] flex items-center justify-center group-hover/item:bg-[hsl(var(--foreground))] group-hover/item:border-[hsl(var(--foreground))] transition-colors shrink-0">
                  <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))] group-hover/item:text-[hsl(var(--background))] transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* LEADERBOARD */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                Peringkat
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[hsl(var(--foreground))] tracking-tight mt-1">
              Leaderboard Puskesmas — {BULAN[bulan]} {tahun}
            </h3>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.1em]">
            <span className="flex items-center gap-1.5 text-[hsl(var(--success))]">
              <span className="w-2.5 h-2.5 bg-[hsl(var(--success))]" /> ≥ 80%
            </span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--warning))]">
              <span className="w-2.5 h-2.5 bg-[hsl(var(--warning))]" /> 50-79%
            </span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--error))]">
              <span className="w-2.5 h-2.5 bg-[hsl(var(--error))]" /> &lt; 50%
            </span>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pkmStats.map((pkm, idx) => {
            const isMet = pkm.percentage >= 80;
            const tierColor =
              pkm.percentage >= 80
                ? "bg-[hsl(var(--success))]"
                : pkm.percentage >= 50
                  ? "bg-[hsl(var(--warning))]"
                  : "bg-[hsl(var(--error))]";
            return (
              <div
                key={pkm.id}
                className={`relative border p-4 flex flex-col gap-3 transition-colors ${isMet ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--foreground))]/20"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 flex items-center justify-center text-[11px] font-black tabular-nums ${idx === 0 ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : idx === 1 ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]" : idx === 2 ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]" : "bg-transparent text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]"}`}
                  >
                    {idx + 1}
                  </span>
                  <div className="w-8 h-8 bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))] stroke-[2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{pkm.nama}</p>
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mt-0.5">
                      {pkm.submitted} / {pkm.target} laporan
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                      Progress
                    </span>
                    <span className="text-[14px] font-black tabular-nums text-[hsl(var(--foreground))]">
                      {pkm.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[hsl(var(--muted))] overflow-hidden">
                    <div
                      className={`h-full ${tierColor} transition-all duration-500`}
                      style={{ width: `${pkm.percentage}%` }}
                    />
                  </div>
                </div>
                <a
                  href={`/laporan/tpp?puskesmasId=${pkm.id}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  Detail <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
