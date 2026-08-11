import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  }

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      subCategories: {
        orderBy: { urutan: "asc" },
      },
    },
  });

  return NextResponse.json(categories);
}

// List laporan bulanan per kategori untuk puskesmas operator.
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

  const laporans = await prisma.dynamicLaporan.findMany({
    where: {
      puskesmasId: user.puskesmasId,
      bulan,
      tahun,
    },
    select: {
      id: true,
      categoryId: true,
      status: true,
      catatan: true,
      updatedAt: true,
      category: { select: { nama: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    laporans.map((l: any) => ({
      id: l.id,
      categoryId: l.categoryId,
      categoryName: l.category.nama,
      status: l.status,
      catatan: l.catatan,
      updatedAt: l.updatedAt,
    })),
  );
}
