import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { syncDataDasarToLaporan } from "@/lib/sync-data-dasar";

export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const url = new URL(req.url);
  const subCatId = url.searchParams.get("subCategoryId");

  const where: any = {};
  if (role !== "ADMIN" && pkmId) {
    where.puskesmasId = pkmId;
  }
  if (subCatId) {
    where.subCategoryId = Number(subCatId);
  }

  const data = await prisma.sasaran.findMany({
    where,
    include: {
      subCategory: { include: { category: true } },
      puskesmas: true,
      _count: { select: { results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const body = await req.json();

  if (role !== "ADMIN" && !pkmId) {
    return NextResponse.json({ error: "Akun Anda tidak terhubung ke Puskesmas" }, { status: 400 });
  }

  const data = await prisma.sasaran.create({
    data: {
      nama: body.nama,
      alamat: body.alamat,
      pemilik: body.pemilik,
      kontak: body.kontak,
      lat: body.lat ? parseFloat(body.lat) : null,
      lng: body.lng ? parseFloat(body.lng) : null,
      puskesmasId: role === "ADMIN" && body.puskesmasId ? Number(body.puskesmasId) : pkmId,
      subCategoryId: Number(body.subCategoryId),
      dataDinamis: body.dataDinamis ? body.dataDinamis : null,
    },
  });

  await syncDataDasarToLaporan(Number(body.subCategoryId), data.puskesmasId);

  return NextResponse.json(data);
});
