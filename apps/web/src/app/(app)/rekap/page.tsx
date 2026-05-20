import { prisma } from "@apps-kes/database";

export const dynamic = "force-dynamic";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function RekapPage({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const { tahun: tahunParam } = await searchParams;
  const tahun = Number(tahunParam) || new Date().getFullYear();

  const [tpp, spal, sab, rumah, jamban, ttu] = await Promise.all([
    prisma.laporanTpp.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
    prisma.laporanSpal.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
    prisma.laporanSab.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
    prisma.laporanRumah.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
    prisma.laporanJamban.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
    prisma.laporanTtu.groupBy({ by: ["bulan"], where: { tahun }, _count: true }),
  ]);

  const laporan = [
    { label: "TPP", data: tpp },
    { label: "SPAL", data: spal },
    { label: "SAB", data: sab },
    { label: "Rumah", data: rumah },
    { label: "Jamban", data: jamban },
    { label: "TTU", data: ttu },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Rekap Tahunan</h1>
        <form className="flex gap-2">
          <input
            type="number"
            name="tahun"
            defaultValue={tahun}
            className="w-24 px-3 py-2 border rounded-md"
          />
          <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-2 text-left">Laporan</th>
              {BULAN.map((b) => (
                <th key={b} className="px-3 py-2 text-center">
                  {b}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {laporan.map((l) => {
              const total = l.data.reduce((sum, d) => sum + d._count, 0);
              return (
                <tr key={l.label} className="border-t">
                  <td className="px-4 py-2 font-medium">{l.label}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const count = l.data.find((d) => d.bulan === i + 1)?._count || 0;
                    return (
                      <td
                        key={i}
                        className={`px-3 py-2 text-center ${count > 0 ? "text-teal-600 font-medium" : "text-slate-300"}`}
                      >
                        {count || "-"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-bold">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <a href={`/api/export/tpp?bulan=1&tahun=${tahun}`} className="text-sm text-teal-600 hover:underline">
          📥 Export semua laporan tahun {tahun}
        </a>
      </div>
    </div>
  );
}
