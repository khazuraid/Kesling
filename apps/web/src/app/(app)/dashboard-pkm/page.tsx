"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LaporanFilter } from "@/components/laporan-filter";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

const BULAN_NAMES = [
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

export default function DashboardPkmPage() {
  const { data: session } = useSession();
  const { bulan, tahun } = useLaporanFilter();
  const pkmId = (session?.user as any)?.puskesmasId;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-pkm", pkmId, bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/puskesmas?puskesmasId=${pkmId}&bulan=${bulan}&tahun=${tahun}`);
      return res.json();
    },
    enabled: !!pkmId,
  });

  if (!pkmId) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">Anda belum terhubung ke Puskesmas manapun.</p>
        <p className="text-sm">Hubungi admin untuk assign Puskesmas ke akun Anda.</p>
      </div>
    );
  }

  if (isLoading) return <div className="text-center py-8 text-slate-500">Loading...</div>;

  const summary = [
    { label: "TPP", count: data?.tpp?.length || 0, icon: "📊" },
    { label: "SPAL", count: data?.spal?.length || 0, icon: "🚰" },
    { label: "SAB", count: data?.sab?.length || 0, icon: "💧" },
    { label: "Rumah", count: data?.rumah?.length || 0, icon: "🏠" },
    { label: "Jamban", count: data?.jamban?.length || 0, icon: "🚽" },
    { label: "TTU", count: data?.ttu?.length || 0, icon: "🏢" },
  ];

  // Calculate % laik for chart
  const chartData = [
    { name: "TPP", persen: calcLaikPersen(data?.tpp) },
    { name: "SPAL", persen: calcMsPersen(data?.spal) },
    { name: "SAB", persen: calcMsPersen(data?.sab) },
    { name: "Jamban", persen: calcMsPersen(data?.jamban) },
    { name: "TTU", persen: calcTtuPersen(data?.ttu) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard {data?.puskesmas?.nama}</h1>
      <p className="text-slate-500 mb-4">
        {BULAN_NAMES[bulan]} {tahun}
      </p>
      <LaporanFilter />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-3">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-lg font-bold">
              {s.count} <span className="text-xs font-normal text-slate-500">data</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3">% Laik / Memenuhi Syarat</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="persen" fill="#0d9488" radius={[4, 4, 0, 0]} name="% Laik" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TPP Detail */}
      {data?.tpp?.length > 0 && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Detail TPP</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-1 text-left">Jenis</th>
                <th className="px-3 py-1 text-center">Terdaftar</th>
                <th className="px-3 py-1 text-center">Diperiksa</th>
                <th className="px-3 py-1 text-center">Laik</th>
                <th className="px-3 py-1 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {data.tpp.map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-1">{t.jenisTpp?.nama}</td>
                  <td className="px-3 py-1 text-center">{t.terdaftar}</td>
                  <td className="px-3 py-1 text-center">{t.diperiksa}</td>
                  <td className="px-3 py-1 text-center">{t.laikJumlah}</td>
                  <td className="px-3 py-1 text-center">{t.laikPersen?.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function calcLaikPersen(items: any[]) {
  if (!items?.length) return 0;
  const total = items.reduce((s, i) => s + i.diperiksa, 0);
  const laik = items.reduce((s, i) => s + i.laikJumlah, 0);
  return total > 0 ? Math.round((laik / total) * 100) : 0;
}

function calcMsPersen(items: any[]) {
  if (!items?.length) return 0;
  const total = items.reduce((s, i) => s + i.diperiksaJumlah, 0);
  const ms = items.reduce((s, i) => s + i.diperiksaMs, 0);
  return total > 0 ? Math.round((ms / total) * 100) : 0;
}

function calcTtuPersen(items: any[]) {
  if (!items?.length) return 0;
  const total = items.reduce((s, i) => s + i.ms + i.tms, 0);
  const ms = items.reduce((s, i) => s + i.ms, 0);
  return total > 0 ? Math.round((ms / total) * 100) : 0;
}
