import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

// GET: list sasaran (mobile) + info inspeksi terakhir untuk filter status
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

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
      subCategory: { select: { nama: true } },
      results: {
        select: { id: true, tanggal: true, status: true },
        orderBy: { tanggal: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const flat = sasarans.map(({ results, subCategory, ...s }) => ({
    ...s,
    kategoriNama: subCategory?.nama ?? null,
    lastInspection: results[0] ? { tanggal: results[0].tanggal, status: results[0].status } : null,
  }));
  return NextResponse.json(flat);
}
