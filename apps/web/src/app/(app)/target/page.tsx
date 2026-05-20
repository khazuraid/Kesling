"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LaporanFilter } from "@/components/laporan-filter";
import { Input } from "@/components/ui/input";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

interface CapaianItem {
  jenis: string;
  target: number;
  capaian: number;
}

const JENIS_LIST = ["tpp", "spal", "sab", "jamban", "ttu", "rumah"];

export default function TargetCapaianPage() {
  const { bulan, tahun } = useLaporanFilter();

  const { data = [], isLoading: loading } = useQuery<CapaianItem[]>({
    queryKey: ["target-capaian", bulan, tahun],
    queryFn: async () => {
      const [resTarget, resRanking] = await Promise.all([
        fetch(`/api/target?tahun=${tahun}`),
        fetch(`/api/dashboard/ranking?bulan=${bulan}&tahun=${tahun}`),
      ]);
      const targetList: any[] = await resTarget.json();
      const ranking: any[] = await resRanking.json();

      const tMap: Record<string, number> = {};
      for (const t of targetList.filter((t: any) => !t.puskesmasId)) {
        tMap[t.jenis] = t.targetPersen;
      }

      return JENIS_LIST.map((jenis) => {
        const target = tMap[jenis] || 80;
        let avg = 0;
        if (ranking.length > 0 && jenis in ranking[0]) {
          avg = Math.round(ranking.reduce((s: number, r: any) => s + (r[jenis] || 0), 0) / ranking.length);
        }
        return { jenis, target, capaian: avg };
      });
    },
  });

  async function saveTarget(jenis: string, value: number) {
    const res = await fetch("/api/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tahun, jenis, puskesmasId: null, targetPersen: value }),
    });
    if (res.ok) toast.success(`Target ${jenis.toUpperCase()} disimpan`);
    else toast.error("Gagal menyimpan target");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🎯 Target & Capaian</h1>
      <LaporanFilter />

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => {
            const persen = item.capaian;
            const tercapai = persen >= item.target;
            return (
              <div key={item.jenis} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{item.jenis.toUpperCase()}</h3>
                  <span className={`text-sm font-bold ${tercapai ? "text-green-600" : "text-red-600"}`}>
                    {tercapai ? "✅ Tercapai" : "❌ Belum"}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Capaian: {persen}%</span>
                    <span>Target: {item.target}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${tercapai ? "bg-green-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(persen, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-500">Set target:</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={item.target}
                    className="w-20 h-7 text-xs"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== item.target) {
                        saveTarget(item.jenis, v);
                      }
                    }}
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
