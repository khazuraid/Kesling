"use client";

import { useQuery } from "@tanstack/react-query";
import { LaporanFilter } from "@/components/laporan-filter";
import { PdfExportButton } from "@/components/pdf-export-button";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

interface RankingItem {
  id: number;
  nama: string;
  tpp: number;
  spal: number;
  sab: number;
  jamban: number;
  avg: number;
}

export default function PerbandinganPage() {
  const { bulan, tahun } = useLaporanFilter();

  const { data: ranking = [], isLoading } = useQuery<RankingItem[]>({
    queryKey: ["ranking", bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/ranking?bulan=${bulan}&tahun=${tahun}`);
      return res.json();
    },
  });

  const pdfHeaders = ["#", "Puskesmas", "TPP %", "SPAL %", "SAB %", "Jamban %", "Rata-rata %"];
  const pdfRows = ranking.map((r, i) => [i + 1, r.nama, r.tpp, r.spal, r.sab, r.jamban, r.avg]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🏆 Perbandingan Puskesmas</h1>
        {ranking.length > 0 && (
          <PdfExportButton
            title={`Ranking Puskesmas - ${bulan}/${tahun}`}
            headers={pdfHeaders}
            rows={pdfRows}
            filename="ranking-puskesmas"
          />
        )}
      </div>
      <LaporanFilter />

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left w-12">#</th>
                <th className="px-4 py-2 text-left">Puskesmas</th>
                <th className="px-4 py-2 text-center">TPP %</th>
                <th className="px-4 py-2 text-center">SPAL %</th>
                <th className="px-4 py-2 text-center">SAB %</th>
                <th className="px-4 py-2 text-center">Jamban %</th>
                <th className="px-4 py-2 text-center">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                  <td className="px-4 py-2 font-medium">{r.nama}</td>
                  <td className="px-4 py-2 text-center">{r.tpp}%</td>
                  <td className="px-4 py-2 text-center">{r.spal}%</td>
                  <td className="px-4 py-2 text-center">{r.sab}%</td>
                  <td className="px-4 py-2 text-center">{r.jamban}%</td>
                  <td className="px-4 py-2 text-center font-bold">
                    <span className={r.avg >= 80 ? "text-green-600" : r.avg >= 50 ? "text-yellow-600" : "text-red-600"}>
                      {r.avg}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
