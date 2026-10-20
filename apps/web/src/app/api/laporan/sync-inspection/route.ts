import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { recalculateLaporanBulanan } from "@/lib/aggregate-inspection";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { categoryCode, puskesmasId, bulan, tahun } = body;

    if (!categoryCode || !bulan || !tahun) {
      return NextResponse.json({ error: "Parameter categoryCode, bulan, dan tahun wajib diisi" }, { status: 400 });
    }

    const pkmId = user.role === "OPERATOR" ? user.puskesmasId : Number(puskesmasId) || user.puskesmasId;

    if (!pkmId) {
      return NextResponse.json({ error: "Puskesmas tidak valid" }, { status: 400 });
    }

    const category = await prisma.dynamicCategory.findFirst({
      where: { code: { equals: categoryCode, mode: "insensitive" } },
      include: { subCategories: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    // Hitung ulang semua sub-kategori untuk puskesmas ini
    for (const sc of category.subCategories) {
      await recalculateLaporanBulanan({
        puskesmasId: pkmId,
        categoryId: category.id,
        subCategoryId: sc.id,
        bulan: Number(bulan),
        tahun: Number(tahun),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mensinkronkan data pemeriksaan ke laporan ${category.nama}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal sinkronisasi data" }, { status: 500 });
  }
}
