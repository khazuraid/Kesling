import { prisma } from "@apps-kes/database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pctColor(pct: number) {
  if (pct >= 80) return "bg-green-100 text-green-800";
  if (pct >= 60) return "bg-yellow-100 text-yellow-800";
  if (pct > 0) return "bg-red-100 text-red-800";
  return "text-[hsl(var(--muted-foreground))]/40";
}

export default async function RekapPage({ searchParams }: { searchParams: Promise<{ tahun?: string; puskesmasId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tahun: tahunParam, puskesmasId: pkmParam } = await searchParams;
  const tahun = Number(tahunParam) || new Date().getFullYear();

  // Operator hanya bisa lihat puskesmasnya sendiri
  const puskesmasId = user.role === "OPERATOR" && user.puskesmasId
    ? user.puskesmasId
    : pkmParam ? Number(pkmParam) : undefined;

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });
  const selectedPkm = puskesmasId ? puskesmasList.find((p) => p.id === puskesmasId) : undefined;

  const where: any = { tahun };
  if (puskesmasId) where.puskesmasId = puskesmasId;

  const [tpp, spal, sab, rumah, jamban, ttu] = await Promise.all([
    prisma.laporanTpp.groupBy({ by: ["bulan"], where, _sum: { terdaftar: true, diperiksa: true, laikJumlah: true } }),
    prisma.laporanSpal.groupBy({ by: ["bulan"], where, _sum: { jumlah: true, diperiksaJumlah: true, diperiksaMs: true } }),
    prisma.laporanSab.groupBy({ by: ["bulan"], where, _sum: { jumlah: true, diperiksaJumlah: true, diperiksaMs: true } }),
    prisma.laporanRumah.groupBy({ by: ["bulan"], where, _sum: { jumlahRumahAda: true, jumlahDiperiksa: true, hasilMs: true } }),
    prisma.laporanJamban.groupBy({ by: ["bulan"], where, _sum: { jumlah: true, diperiksaJumlah: true, diperiksaMs: true } }),
    prisma.laporanTtu.groupBy({ by: ["bulan"], where, _sum: { jumlahTotal: true, ms: true } }),
  ]);

  const laporan = [
    {
      label: "TPP",
      rows: BULAN.map((_, i) => {
        const d = tpp.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.terdaftar || 0;
        const diperiksa = d?._sum.diperiksa || 0;
        const ms = d?._sum.laikJumlah || 0;
        const pct = diperiksa > 0 ? (ms / diperiksa) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
    {
      label: "SPAL",
      rows: BULAN.map((_, i) => {
        const d = spal.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.jumlah || 0;
        const diperiksa = d?._sum.diperiksaJumlah || 0;
        const ms = d?._sum.diperiksaMs || 0;
        const pct = diperiksa > 0 ? (ms / diperiksa) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
    {
      label: "SAB",
      rows: BULAN.map((_, i) => {
        const d = sab.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.jumlah || 0;
        const diperiksa = d?._sum.diperiksaJumlah || 0;
        const ms = d?._sum.diperiksaMs || 0;
        const pct = diperiksa > 0 ? (ms / diperiksa) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
    {
      label: "Rumah",
      rows: BULAN.map((_, i) => {
        const d = rumah.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.jumlahRumahAda || 0;
        const diperiksa = d?._sum.jumlahDiperiksa || 0;
        const ms = d?._sum.hasilMs || 0;
        const pct = diperiksa > 0 ? (ms / diperiksa) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
    {
      label: "Jamban",
      rows: BULAN.map((_, i) => {
        const d = jamban.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.jumlah || 0;
        const diperiksa = d?._sum.diperiksaJumlah || 0;
        const ms = d?._sum.diperiksaMs || 0;
        const pct = diperiksa > 0 ? (ms / diperiksa) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
    {
      label: "TTU",
      rows: BULAN.map((_, i) => {
        const d = ttu.find((r) => r.bulan === i + 1);
        const sasaran = d?._sum.jumlahTotal || 0;
        const diperiksa = sasaran;
        const ms = d?._sum.ms || 0;
        const pct = sasaran > 0 ? (ms / sasaran) * 100 : 0;
        return { sasaran, diperiksa, ms, pct };
      }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Tahunan</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {selectedPkm ? `Puskesmas ${selectedPkm.nama}` : "Semua Puskesmas"} — Tahun {tahun}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            name="tahun"
            defaultValue={tahun}
            className="w-24 h-10 px-3 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15"
          />
          {user.role === "ADMIN" && (
            <select
              name="puskesmasId"
              defaultValue={puskesmasId || ""}
              className="h-10 px-3 pr-8 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white appearance-none hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
            >
              <option value="">Semua Puskesmas</option>
              {puskesmasList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          )}
          <button type="submit" className="h-10 px-4 text-sm font-medium bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity">
            Filter
          </button>
        </form>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs px-1">
        <span className="font-medium text-[hsl(var(--muted-foreground))]">Indikator:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> ≥ 80% (Baik)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> 60-79% (Cukup)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> &lt; 60% (Kurang)</span>
      </div>

      {/* Table per jenis laporan */}
      {laporan.map((l) => {
        const totalSasaran = l.rows.reduce((s, r) => s + r.sasaran, 0);
        const totalDiperiksa = l.rows.reduce((s, r) => s + r.diperiksa, 0);
        const totalMs = l.rows.reduce((s, r) => s + r.ms, 0);
        const totalPct = totalDiperiksa > 0 ? (totalMs / totalDiperiksa) * 100 : 0;

        return (
          <div key={l.label} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h2 className="text-sm font-bold">Laporan {l.label}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Capaian:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${pctColor(totalPct)}`}>
                  {totalPct > 0 ? `${totalPct.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-24">Uraian</th>
                    {BULAN.map((b) => (
                      <th key={b} className="px-2 py-2.5 text-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">{b}</th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold text-[hsl(var(--primary))] uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <td className="px-3 py-2 font-medium text-[hsl(var(--muted-foreground))]">Sasaran</td>
                    {l.rows.map((r, i) => (
                      <td key={i} className={`px-2 py-2 text-center ${r.sasaran ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{r.sasaran || "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold">{totalSasaran || "—"}</td>
                  </tr>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <td className="px-3 py-2 font-medium text-[hsl(var(--muted-foreground))]">Diperiksa</td>
                    {l.rows.map((r, i) => (
                      <td key={i} className={`px-2 py-2 text-center ${r.diperiksa ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{r.diperiksa || "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold">{totalDiperiksa || "—"}</td>
                  </tr>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <td className="px-3 py-2 font-medium text-[hsl(var(--muted-foreground))]">MS/Laik</td>
                    {l.rows.map((r, i) => (
                      <td key={i} className={`px-2 py-2 text-center ${r.ms ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{r.ms || "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold">{totalMs || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">% Capaian</td>
                    {l.rows.map((r, i) => (
                      <td key={i} className="px-1 py-1.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${pctColor(r.pct)}`}>
                          {r.pct > 0 ? `${r.pct.toFixed(0)}%` : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${pctColor(totalPct)}`}>
                        {totalPct > 0 ? `${totalPct.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
