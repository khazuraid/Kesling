import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const tahun = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const targets = await prisma.dynamicTarget.findMany({
    where: { tahun },
    include: { category: { select: { nama: true, code: true } } },
  });
  return NextResponse.json(targets);
}

// FIX: Target hanya bisa dibuat/diubah oleh ADMIN
export const POST = withAdmin(async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  const { tahun, categoryId, puskesmasId, targetPersen } = await req.json();
  const targetVal = Number(targetPersen);
  const tahunNum = Number(tahun);
  const catIdNum = Number(categoryId);
  const pkmId = puskesmasId ? Number(puskesmasId) : null;

  if (!tahun || !categoryId || !targetPersen) {
    return NextResponse.json({ error: "tahun, categoryId, dan targetPersen wajib diisi" }, { status: 400 });
  }
  if (targetVal < 0 || targetVal > 100) {
    return NextResponse.json({ error: "targetPersen harus antara 0-100" }, { status: 400 });
  }

  // Prisma nullable unique: gunakan findFirst + update/create pattern
  // karena upsert dengan nullable unique field bermasalah di TypeScript
  const existing = await prisma.dynamicTarget.findFirst({
    where: { tahun: tahunNum, categoryId: catIdNum, puskesmasId: pkmId },
  });

  const target = existing
    ? await prisma.dynamicTarget.update({
        where: { id: existing.id },
        data: { targetPersen: targetVal },
      })
    : await prisma.dynamicTarget.create({
        data: { tahun: tahunNum, categoryId: catIdNum, puskesmasId: pkmId, targetPersen: targetVal },
      });

  await prisma.auditLog.create({
    data: {
      userId,
      action: existing ? "UPDATE" : "CREATE",
      tableName: "dynamic_target",
      recordId: target.id,
      newData: { tahun, categoryId, targetPersen: targetVal },
    },
  });

  if (pkmId !== null) {
    try {
      const [operators, pkm, cat] = await Promise.all([
        prisma.user.findMany({ where: { puskesmasId: pkmId, role: "OPERATOR" } }),
        prisma.puskesmas.findUnique({ where: { id: pkmId } }),
        prisma.dynamicCategory.findUnique({ where: { id: catIdNum } }),
      ]);
      const pkmNama = pkm?.nama || "Puskesmas";
      const catNama = cat?.nama || "Kategori";
      await Promise.all(
        operators.map((op) =>
          prisma.notification.create({
            data: {
              userId: op.id,
              title: "Target Kinerja Diperbarui",
              message: `Target ${catNama} di ${pkmNama} ditetapkan ${targetVal}% untuk tahun ${tahun} oleh Admin.`,
            },
          }),
        ),
      );
    } catch (err) {
      console.error("Gagal mengirim notifikasi target:", err);
    }
  }

  await cacheInvalidate("dashboard:*");
  await cacheInvalidate("ranking:*");
  return NextResponse.json(target);
});

export const DELETE = withAdmin(async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  const { tahun, categoryId, puskesmasId } = await req.json();
  if (!puskesmasId) {
    return NextResponse.json({ error: "Cannot delete global target" }, { status: 400 });
  }
  const existing = await prisma.dynamicTarget.findFirst({
    where: { tahun: Number(tahun), categoryId: Number(categoryId), puskesmasId: Number(puskesmasId) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 });
  }
  await prisma.dynamicTarget.delete({ where: { id: existing.id } });
  await prisma.auditLog.create({
    data: { userId, action: "DELETE", tableName: "dynamic_target", recordId: existing.id, newData: undefined },
  });
  await cacheInvalidate("dashboard:*");
  await cacheInvalidate("ranking:*");
  return NextResponse.json({ success: true });
});
