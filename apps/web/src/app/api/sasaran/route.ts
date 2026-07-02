import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { syncDataDasarToLaporan } from "@/lib/sync-data-dasar";

function optionalFloat(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "";
}

export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const url = new URL(req.url);
  const subCatId = url.searchParams.get("subCategoryId");

  const where: any = {};
  if (role !== "ADMIN" && pkmId) where.puskesmasId = pkmId;
  if (subCatId) {
    const parsedSubCatId = Number(subCatId);
    if (!Number.isInteger(parsedSubCatId)) {
      return NextResponse.json({ error: "subCategoryId tidak valid" }, { status: 400 });
    }
    where.subCategoryId = parsedSubCatId;
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
  try {
    const pkmId = (req as any).user?.puskesmasId;
    const role = (req as any).user?.role;
    const body = await req.json();

    const subCategoryId = Number(body.subCategoryId);
    if (!Number.isInteger(subCategoryId)) {
      return NextResponse.json({ error: "subCategoryId wajib dan harus valid" }, { status: 400 });
    }

    const targetPuskesmasId = role === "ADMIN" ? Number(body.puskesmasId) : Number(pkmId);
    if (!Number.isInteger(targetPuskesmasId)) {
      return NextResponse.json({ error: "Puskesmas wajib dipilih" }, { status: 400 });
    }

    const subCategory = await prisma.dynamicSubCategory.findUnique({
      where: { id: subCategoryId },
      include: { category: { include: { parameters: true } } },
    });
    if (!subCategory) {
      return NextResponse.json({ error: "Sub kategori tidak ditemukan" }, { status: 404 });
    }

    const dataDinamis = body.dataDinamis && typeof body.dataDinamis === "object" ? body.dataDinamis : {};
    const missing = subCategory.category.parameters
      .filter((p) => p.isBaseline && p.required && isEmpty((dataDinamis as any)[p.code]))
      .map((p) => p.nama);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(", ")}` }, { status: 400 });
    }

    const data = await prisma.sasaran.create({
      data: {
        nama: body.nama || "Data Dasar",
        alamat: body.alamat || null,
        pemilik: body.pemilik || null,
        kontak: body.kontak || null,
        lat: optionalFloat(body.lat),
        lng: optionalFloat(body.lng),
        puskesmasId: targetPuskesmasId,
        subCategoryId,
        dataDinamis,
      },
    });

    await syncDataDasarToLaporan(subCategoryId, data.puskesmasId);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal menyimpan Data Dasar" }, { status: 500 });
  }
});
