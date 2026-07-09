import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  if (!user.puskesmasId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const subCategoryId = Number(searchParams.get("subCategoryId"));
  const where: any = { puskesmasId: user.puskesmasId };
  if (Number.isFinite(subCategoryId) && subCategoryId > 0) where.subCategoryId = subCategoryId;

  const sasarans = await prisma.sasaran.findMany({
    where,
    select: {
      id: true,
      nama: true,
      alamat: true,
      pemilik: true,
      kontak: true,
      lat: true,
      lng: true,
      subCategoryId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(sasarans);
}
