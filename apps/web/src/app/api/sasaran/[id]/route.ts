import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { syncDataDasarToLaporan } from "@/lib/sync-data-dasar";

export const PUT = withAuth(async (req: NextRequest, context: { params: { id: string } }) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const { id } = await context.params;
  const body = await req.json();

  const where: any = { id: Number(id) };
  if (role !== "ADMIN") where.puskesmasId = pkmId;

  const data = await prisma.sasaran.update({
    where,
    data: {
      nama: body.nama,
      alamat: body.alamat,
      pemilik: body.pemilik,
      kontak: body.kontak,
      lat: body.lat ? parseFloat(body.lat) : null,
      lng: body.lng ? parseFloat(body.lng) : null,
      dataDinamis: body.dataDinamis ? body.dataDinamis : null,
    },
  });
  await syncDataDasarToLaporan(data.subCategoryId, data.puskesmasId);
  return NextResponse.json(data);
});

export const DELETE = withAuth(async (req: NextRequest, context: { params: { id: string } }) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const { id } = await context.params;

  const where: any = { id: Number(id) };
  if (role !== "ADMIN") where.puskesmasId = pkmId;

  const old = await prisma.sasaran.findFirst({ where, select: { subCategoryId: true, puskesmasId: true } });
  await prisma.sasaran.delete({ where });
  if (old) await syncDataDasarToLaporan(old.subCategoryId, old.puskesmasId);
  return NextResponse.json({ success: true });
});
