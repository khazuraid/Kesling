import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// FIX: Sebelumnya pakai static (prisma as any).target -- diganti ke dynamicTarget
// Fungsi: copy target global ke semua puskesmas untuk tahun tertentu
export const POST = withAdmin(async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const { tahun } = await req.json();
    const year = Number(tahun) || new Date().getFullYear();

    // Ambil target global (puskesmasId null) untuk tahun ini dari DynamicTarget
    const globalTargets = await prisma.dynamicTarget.findMany({
      where: { tahun: year, puskesmasId: null },
    });

    if (globalTargets.length === 0) {
      return NextResponse.json(
        { error: `Belum ada target global untuk tahun ${year}. Set target global terlebih dahulu.` },
        { status: 400 },
      );
    }

    const puskesmasList = await prisma.puskesmas.findMany();

    let count = 0;
    for (const pkm of puskesmasList) {
      for (const gt of globalTargets) {
        const existing = await prisma.dynamicTarget.findFirst({
          where: { tahun: year, categoryId: gt.categoryId, puskesmasId: pkm.id },
        });
        if (existing) {
          await prisma.dynamicTarget.update({
            where: { id: existing.id },
            data: { targetPersen: gt.targetPersen },
          });
        } else {
          await prisma.dynamicTarget.create({
            data: {
              tahun: year,
              categoryId: gt.categoryId,
              puskesmasId: pkm.id,
              targetPersen: gt.targetPersen,
            },
          });
        }
        count++;
      }
    }

    await cacheInvalidate("dashboard:*");
    await cacheInvalidate("ranking:*");

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        tableName: "dynamic_target",
        recordId: 0,
        newData: { tahun, count, action: "bulk_copy" },
      },
    });

    return NextResponse.json({ success: true, count });
  } catch (err: any) {
    console.error("Gagal melakukan bulk target copy:", err);
    return NextResponse.json({ error: err.message || "Gagal menyalin target" }, { status: 500 });
  }
});
