import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

// Create laporan records (DRAFT) for all active categories — bulan/tahun.
export async function POST(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  }
  if (!user.puskesmasId) {
    return NextResponse.json({ error: "Akun tidak terikat puskesmas." }, { status: 403 });
  }

  const body = await req.json();
  const bulan = Number(body.bulan);
  const tahun = Number(body.tahun);
  if (!Number.isFinite(bulan) || bulan < 1 || bulan > 12)
    return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
  if (!Number.isFinite(tahun) || tahun < 2000)
    return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
  });

  const created: number[] = [];
  for (const cat of categories) {
    const laporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: user.puskesmasId,
          categoryId: cat.id,
          bulan,
          tahun,
        },
      },
      create: {
        categoryId: cat.id,
        puskesmasId: user.puskesmasId,
        bulan,
        tahun,
        status: "DRAFT",
        createdBy: user.id,
      },
      update: {},
    });
    created.push(laporan.id);
  }

  return NextResponse.json({ success: true, count: created.length });
}
