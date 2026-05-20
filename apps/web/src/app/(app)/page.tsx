import { prisma } from "@apps-kes/database";
import Link from "next/link";
import { DashboardChart } from "@/components/dashboard-chart";

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

  const [tpp, spal, sab, rumah, jamban, ttu, pkmCount] = await Promise.all([
    prisma.laporanTpp.count({ where: { bulan, tahun } }),
    prisma.laporanSpal.count({ where: { bulan, tahun } }),
    prisma.laporanSab.count({ where: { bulan, tahun } }),
    prisma.laporanRumah.count({ where: { bulan, tahun } }),
    prisma.laporanJamban.count({ where: { bulan, tahun } }),
    prisma.laporanTtu.count({ where: { bulan, tahun } }),
    prisma.puskesmas.count(),
  ]);

  const totalData = tpp + spal + sab + rumah + jamban + ttu;
  const targetPerPkm = 6; // 6 jenis laporan per puskesmas
  const completionRate = pkmCount > 0 ? Math.round((totalData / (pkmCount * targetPerPkm)) * 100) : 0;

  const stats = [
    {
      label: "TPP",
      count: tpp,
      href: "/laporan/tpp",
      color: "bg-blue-500",
      lightBg: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "SPAL",
      count: spal,
      href: "/laporan/spal",
      color: "bg-cyan-500",
      lightBg: "bg-cyan-50",
      textColor: "text-cyan-600",
    },
    {
      label: "SAB",
      count: sab,
      href: "/laporan/sab",
      color: "bg-teal-500",
      lightBg: "bg-teal-50",
      textColor: "text-teal-600",
    },
    {
      label: "Rumah",
      count: rumah,
      href: "/laporan/rumah",
      color: "bg-amber-500",
      lightBg: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      label: "Jamban",
      count: jamban,
      href: "/laporan/jamban",
      color: "bg-purple-500",
      lightBg: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      label: "TTU",
      count: ttu,
      href: "/laporan/ttu",
      color: "bg-rose-500",
      lightBg: "bg-rose-50",
      textColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-6">
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--primary))]">Selamat Datang! 🎉</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Periode {BULAN[bulan]} {tahun} • {pkmCount} Puskesmas
            </p>
            <div className="mt-4">
              <p className="text-3xl font-bold">
                {totalData} <span className="text-base font-normal text-[hsl(var(--muted-foreground))]">data</span>
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Tingkat kelengkapan: <span className="font-semibold text-[hsl(var(--primary))]">{completionRate}%</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="w-32 h-32 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center">
              <span className="text-5xl">📊</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--primary))] rounded-full transition-all"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card-hover p-4">
            <div className={`w-10 h-10 rounded-lg ${s.lightBg} flex items-center justify-center mb-3`}>
              <span className={`text-sm font-bold ${s.textColor}`}>{s.label.charAt(0)}</span>
            </div>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Tren Laporan</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Data per bulan tahun {tahun}</p>
            </div>
          </div>
          <DashboardChart />
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Export Cepat</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
            Download laporan {BULAN[bulan]} {tahun}
          </p>
          <div className="space-y-2">
            {stats.map((s) => (
              <a
                key={s.label}
                href={`/api/export/${s.label.toLowerCase()}?bulan=${bulan}&tahun=${tahun}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg ${s.lightBg} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${s.textColor}`}>{s.label.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{s.count} data</p>
                </div>
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
