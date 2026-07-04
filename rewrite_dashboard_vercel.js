const fs = require('fs');

const code = `import { prisma } from "@apps-kes/database";
import { Activity, ArrowUpRight, BarChart3, Building2, ChevronRight, Download, FileSpreadsheet, Target } from "lucide-react";
import nextDynamic from "next/dynamic";
import Link from "next/link";

const DashboardChart = nextDynamic(() => import("@/components/dashboard-chart").then(m => ({ default: m.DashboardChart })), {
  loading: () => <div className="h-[300px] w-full rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />,
});

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
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [pkmCount, categories] = await Promise.all([
    prisma.puskesmas.count(),
    prisma.dynamicCategory.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  const grouped = await prisma.dynamicLaporan.groupBy({
    by: ["categoryId"],
    where: { bulan, tahun },
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
    href: \`/laporan/\${c.code}\`,
    icon: c.icon || "📄",
  }));

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen pb-12">
      {/* 1. COMPACT HEADER */}
      <div className="border-b border-slate-200 bg-white px-6 md:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Pemantauan kesehatan lingkungan real-time periode {BULAN[bulan]} {tahun}</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/api/export/all" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Export Data
            </a>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* 2. VERCEL-STYLE METRICS (Top Row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600 mb-2">
              <Building2 className="w-4 h-4" />
              <h3 className="text-sm font-medium">Total Puskesmas</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">{pkmCount}</span>
              <span className="text-xs text-slate-500 font-medium">Unit Aktif</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600 mb-2">
              <BarChart3 className="w-4 h-4" />
              <h3 className="text-sm font-medium">Laporan Terkumpul</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">{totalData}</span>
              <span className="text-xs text-slate-500 font-medium">Bulan Ini</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600 mb-2">
              <Target className="w-4 h-4" />
              <h3 className="text-sm font-medium">Target Capaian</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">{pkmCount * targetPerPkm}</span>
              <span className="text-xs text-slate-500 font-medium">Indikator</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-medium">Completion Rate</h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +{completionRate}%
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold text-slate-900 tracking-tight">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: \`\${Math.min(completionRate, 100)}%\` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. MIDDLE SECTION (Chart & Quick Actions Split) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Trend Capaian Bulanan</h3>
                <p className="text-xs text-slate-500 mt-0.5">Akumulasi laporan masuk sepanjang tahun {tahun}</p>
              </div>
            </div>
            <div className="p-5 flex-1 w-full min-h-[300px]">
              <DashboardChart />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Rekapitulasi Kategori</h3>
              <p className="text-xs text-slate-500 mt-0.5">Unduh data per indikator laporan</p>
            </div>
            <div className="p-2 overflow-y-auto max-h-[340px]">
              {stats.map((s) => (
                <a
                  key={s.code}
                  href={\`/api/export/\${s.code}?bulan=\${bulan}&tahun=\${tahun}\`}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-200/60">
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{s.nama}</p>
                      <p className="text-xs text-slate-500">{s.count} laporan</p>
                    </div>
                  </div>
                  <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 4. BOTTOM SECTION (Compact Indicator Grid) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Detail Indikator Wilayah</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pemantauan progres input per kategori</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100">
            {stats.map((s, i) => (
              <Link
                key={s.code}
                href={s.href}
                className={\`p-5 hover:bg-slate-50 transition-colors group relative flex flex-col justify-between \${i > 3 && i % 4 === 0 ? "lg:border-l-0 lg:border-t" : i > 3 ? "lg:border-t" : ""}\`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xl">
                    {s.icon}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-600 line-clamp-1 mb-1">{s.nama}</h4>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-slate-900 tracking-tight">{s.count}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Data</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/app/(app)/page.tsx', code, 'utf8');
console.log('Dashboard redesigned to Vercel/Stripe style!');
