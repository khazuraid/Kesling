import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedPkmId = searchParams.get("puskesmasId");
    const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();
    const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;

    const pkmFilter: { puskesmasId?: number } = {};
    if (user.role === "OPERATOR") {
      if (user.puskesmasId) pkmFilter.puskesmasId = user.puskesmasId;
    } else if (requestedPkmId && requestedPkmId !== "all") {
      pkmFilter.puskesmasId = Number(requestedPkmId);
    }

    // 1. Hitung total Sasaran (Data Dasar Fisik) per Category
    // Mengelompokkan berdasarkan subCategory.categoryId
    const sasaranGroup = await prisma.sasaran.groupBy({
      by: ["subCategoryId"],
      where: {
        ...pkmFilter,
      },
      _count: { id: true },
    });

    const subCats = await prisma.dynamicSubCategory.findMany({
      select: { id: true, categoryId: true },
    });
    const subCatToCatMap = new Map<number, number>();
    for (const sc of subCats) {
      subCatToCatMap.set(sc.id, sc.categoryId);
    }

    const sasaranPerCategory: Record<number, number> = {};
    for (const item of sasaranGroup) {
      const catId = subCatToCatMap.get(item.subCategoryId);
      if (catId) {
        sasaranPerCategory[catId] = (sasaranPerCategory[catId] || 0) + item._count.id;
      }
    }

    // 2. Ambil total parameter Terdaftar/Jumlah di Laporan Bulanan (bulan, tahun aktif)
    // Parameter terdaftar: code === 'terdaftar' | 'jumlahTotal' | 'jumlahSarana' | (code === 'jumlah' && isBaseline)
    const baselineParams = await prisma.dynamicParameter.findMany({
      where: {
        OR: [
          { code: "terdaftar" },
          { code: "jumlahTotal" },
          { code: "jumlahSarana" },
          { code: "jumlah", isBaseline: true },
        ],
      },
      select: { id: true, categoryId: true },
    });

    const paramIds = baselineParams.map((p) => p.id);
    const paramToCatMap = new Map<number, number>();
    for (const p of baselineParams) {
      paramToCatMap.set(p.id, p.categoryId);
    }

    const laporanValues = await prisma.dynamicLaporanValue.findMany({
      where: {
        parameterId: { in: paramIds },
        laporan: {
          tahun,
          bulan,
          ...pkmFilter,
        },
      },
      select: {
        parameterId: true,
        value: true,
      },
    });

    const reportedPerCategory: Record<number, number> = {};
    for (const lv of laporanValues) {
      const catId = paramToCatMap.get(lv.parameterId);
      if (catId) {
        const val = parseFloat(lv.value) || 0;
        reportedPerCategory[catId] = (reportedPerCategory[catId] || 0) + val;
      }
    }

    // Gabungkan statistik per kategori
    const categories = await prisma.dynamicCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nama: true },
    });

    const summary: Record<
      string,
      {
        categoryId: number;
        code: string;
        totalDataDasar: number; // sasaran fisik di data dasar
        totalReported: number; // terdaftar yang ada di laporan
        diff: number; // selisih yang belum masuk
      }
    > = {};

    for (const cat of categories) {
      const totalDasar = sasaranPerCategory[cat.id] || 0;
      const totalLap = reportedPerCategory[cat.id] || 0;
      summary[cat.code.toLowerCase()] = {
        categoryId: cat.id,
        code: cat.code,
        totalDataDasar: totalDasar,
        totalReported: totalLap,
        diff: Math.max(0, totalDasar - totalLap),
      };
    }

    return NextResponse.json({
      success: true,
      bulan,
      tahun,
      summary,
    });
  } catch (err: any) {
    console.error("[Data Dasar Stats Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to load stats" }, { status: 500 });
  }
}
