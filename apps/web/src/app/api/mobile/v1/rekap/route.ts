import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// GET rekap — bulanan + triwulan + semester + tahunan, derived from DynamicLaporan
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || !user.puskesmasId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear();

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      parameters: { orderBy: { urutan: "asc" } },
      formula: true,
    },
  });

  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: {
      tahun,
      puskesmasId: user.puskesmasId,
      status: { in: ["SUBMITTED", "APPROVED"] },
    },
    include: { values: true },
  });

  const catData = categories.map((cat) => {
    const numParam = cat.formula ? cat.parameters.find((p) => p.code === cat.formula?.numeratorCode) : null;
    const denParam = cat.formula ? cat.parameters.find((p) => p.code === cat.formula?.denominatorCode) : null;

    let pctMonthly: number[] = BULAN_NAMES.map(() => 0);

    if (cat.formula && numParam && denParam) {
      pctMonthly = BULAN_NAMES.map((_, i) => {
        const bulanData = allLaporan.filter((l) => l.categoryId === cat.id && l.bulan === i + 1);
        const n = bulanData.reduce(
          (s, l) => s + Number((l as any).values?.find((v: any) => v.parameterId === numParam.id)?.value || 0),
          0,
        );
        const d = bulanData.reduce(
          (s, l) => s + Number((l as any).values?.find((v: any) => v.parameterId === denParam.id)?.value || 0),
          0,
        );
        return d > 0 ? Math.round((n / d) * 100) : 0;
      });
    }

    // Triwulan averages
    const triwulan = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [9, 10, 11],
    ].map((idxs) => {
      const vals = idxs.map((i) => pctMonthly[i]).filter((v) => v > 0);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });

    // Semester averages
    const semester = [
      [0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11],
    ].map((idxs) => {
      const vals = idxs.map((i) => pctMonthly[i]).filter((v) => v > 0);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });

    // Tahunan
    const yearVals = pctMonthly.filter((v) => v > 0);
    const pctTahunan = yearVals.length > 0 ? Math.round(yearVals.reduce((a, b) => a + b, 0) / yearVals.length) : 0;

    return {
      id: cat.id,
      nama: cat.nama,
      icon: cat.icon || "",
      pctMonthly,
      triwulan,
      semester,
      pctTahunan,
    };
  });

  const catsWithPct = catData.filter((c) => c.pctTahunan > 0);
  const overallPct =
    catsWithPct.length > 0 ? Math.round(catsWithPct.reduce((s, c) => s + c.pctTahunan, 0) / catsWithPct.length) : 0;

  return NextResponse.json({
    tahun,
    categories: catData,
    overallPct,
    overallLabel: overallPct >= 80 ? "Baik" : overallPct >= 60 ? "Cukup" : "Perlu Perhatian",
    triwulanLabels: ["Triwulan I", "Triwulan II", "Triwulan III", "Triwulan IV"],
    semesterLabels: ["Semester I", "Semester II"],
    bulanLabels: BULAN_NAMES,
  });
}
