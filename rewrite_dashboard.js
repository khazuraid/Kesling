const fs = require('fs');

const code = `import { prisma } from "@apps-kes/database";
import { ChevronRight, Download, FileSpreadsheet, TrendingUp, Activity, Target } from "lucide-react";
import nextDynamic from "next/dynamic";
import Link from "next/link";

const DashboardChart = nextDynamic(() => import("@/components/dashboard-chart").then(m => ({ default: m.DashboardChart })), {
  loading: () => <div className="h-[300px] w-full rounded-[2rem] bg-slate-100 animate-pulse" />,
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

const STYLES = [
  { text: "text-indigo-900", iconBg: "bg-indigo-100", highlight: "bg-indigo-500" },
  { text: "text-emerald-900", iconBg: "bg-emerald-100", highlight: "bg-emerald-500" },
  { text: "text-cyan-900", iconBg: "bg-cyan-100", highlight: "bg-cyan-500" },
  { text: "text-amber-900", iconBg: "bg-amber-100", highlight: "bg-amber-500" },
  { text: "text-rose-900", iconBg: "bg-rose-100", highlight: "bg-rose-500" },
  { text: "text-purple-900", iconBg: "bg-purple-100", highlight: "bg-purple-500" },
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

  const stats = counts.map((c, index) => {
    const style = STYLES[index % STYLES.length];
    return {
      id: c.id,
      nama: c.nama,
      code: c.code,
      count: c.count,
      href: \`/laporan/\${c.code}\`,
      icon: c.icon || "📄",
      style,
    };
  });

  return (
    <div className="min-h-screen bg-[#FDFDFD] w-full pb-32">
      {/* MACRO-WHITESPACE & EDITORIAL TYPOGRAPHY */}
      <div className="pt-20 pb-16 px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-100/50 border border-slate-200/60 mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Sistem Aktif</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900 leading-[1.1] mb-6">
            Rekapitulasi
            <br />
            <span className="text-slate-400">Kesehatan Lingkungan.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
            Memantau <b>{pkmCount} Puskesmas</b> secara real-time untuk periode <b className="text-slate-900">{BULAN[bulan]} {tahun}</b>.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto space-y-12">
        {/* THE ASYMMETRICAL BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Metric Card (Double-Bezel Architecture) */}
          <div className="col-span-1 md:col-span-8 p-2 rounded-[2.5rem] bg-slate-50/50 border border-slate-200/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="h-full rounded-[calc(2.5rem-0.5rem)] bg-white p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-110" />
              
              <div className="relative z-10">
                <p className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase mb-8">Tingkat Penyelesaian</p>
                <div className="flex items-end gap-4 mb-4">
                  <span className="text-7xl md:text-8xl font-extrabold text-slate-900 tracking-tighter leading-none">{completionRate}%</span>
                  <div className="pb-2">
                    <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Target Tercapai
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-12">
                <div className="flex justify-between text-sm font-semibold text-slate-500 mb-4">
                  <span>Progress Input Wilayah</span>
                  <span className="text-slate-900">{totalData} / {pkmCount * targetPerPkm} Laporan</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] relative overflow-hidden"
                    style={{ width: \`\${Math.min(completionRate, 100)}%\` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="col-span-1 md:col-span-4 p-2 rounded-[2.5rem] bg-slate-50/50 border border-slate-200/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="h-full rounded-[calc(2.5rem-0.5rem)] bg-indigo-600 p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
              
              <div className="relative z-10 text-white/80">
                <FileSpreadsheet className="w-10 h-10 text-white mb-6" />
                <h3 className="text-3xl font-bold text-white tracking-tight mb-3 leading-tight">Unduh Rekap Laporan</h3>
                <p className="text-sm text-indigo-200 font-medium leading-relaxed">Dapatkan hasil agregat data kesehatan lingkungan bulan ini dalam format Excel.</p>
              </div>

              <div className="relative z-10 mt-10">
                <a href="/api/export/all" className="group flex items-center justify-between w-full p-2 pl-6 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  <span className="text-sm font-semibold text-white tracking-wide">Export Semua Data</span>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]">
                    <Download className="w-4 h-4 text-indigo-600" />
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* INDICATOR CARDS (Masonry / Flex Wrapping) */}
        <div className="pt-8">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Indikator Pemantauan</h2>
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">{stats.length} Kategori</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((s) => (
              <Link 
                key={s.code} 
                href={s.href}
                className="group p-2 rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 block"
              >
                <div className="h-full rounded-[calc(2rem-0.5rem)] bg-slate-50/30 p-6 flex items-start justify-between relative overflow-hidden">
                  <div className="space-y-6">
                    <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm \${s.style.iconBg}\`}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-4xl font-extrabold text-slate-900 tracking-tighter mb-2">{s.count}</p>
                      <p className="text-sm font-bold text-slate-600">{s.nama}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:border-slate-300">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* TREND CHART */}
        <div className="pt-8 pb-12">
          <div className="p-2 rounded-[2.5rem] bg-slate-50/50 border border-slate-200/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="h-full rounded-[calc(2.5rem-0.5rem)] bg-white p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] relative">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Trend Capaian Tahunan</h3>
                  <p className="text-sm text-slate-500 font-medium">Akumulasi laporan bulanan di tahun {tahun}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-slate-500" />
                </div>
              </div>
              
              <div className="w-full">
                <DashboardChart />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/app/(app)/page.tsx', code, 'utf8');
console.log('Dashboard redesigned!');
