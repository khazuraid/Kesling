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

export async function POST(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  if (!user.puskesmasId) return NextResponse.json({ error: "Akun tidak terikat puskesmas." }, { status: 403 });

  const body = await req.json();
  const nama = String(body.nama || "").trim();
  const alamat = body.alamat ? String(body.alamat).trim() : null;
  const pemilik = body.pemilik ? String(body.pemilik).trim() : null;
  const kontak = body.kontak ? String(body.kontak).trim() : null;
  const subCategoryId = Number(body.subCategoryId);
  const lat = body.lat != null ? Number(body.lat) : null;
  const lng = body.lng != null ? Number(body.lng) : null;

  if (!nama) return NextResponse.json({ error: "Nama sasaran wajib diisi." }, { status: 400 });
  if (!Number.isFinite(subCategoryId) || subCategoryId <= 0)
    return NextResponse.json({ error: "Sub-kategori wajib dipilih." }, { status: 400 });

  const created = await prisma.sasaran.create({
    data: {
      nama,
      alamat,
      pemilik,
      kontak,
      puskesmasId: user.puskesmasId,
      subCategoryId,
      lat,
      lng,
    },
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
  });

  return NextResponse.json(created, { status: 201 });
}
