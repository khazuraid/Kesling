import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const templates = await prisma.inspectionTemplate.findMany({
    where: {
      isActive: true,
      OR: [{ puskesmasId: user.puskesmasId }, { puskesmasId: null }],
    },
    select: {
      id: true,
      nama: true,
      deskripsi: true,
      puskesmasId: true,
      subCategoryId: true,
      updatedAt: true,
      fields: { select: { id: true }, where: { isRequired: true } },
      subCategory: { select: { nama: true } },
    },
    orderBy: [{ puskesmasId: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(
    templates.map((template) => ({
      id: template.id,
      nama: template.nama,
      deskripsi: template.deskripsi,
      scope: template.puskesmasId ? "Puskesmas" : "Global Dinas",
      subCategoryId: template.subCategoryId,
      subCategoryName: template.subCategory?.nama ?? null,
      requiredFieldCount: template.fields.length,
      updatedAt: template.updatedAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const body = await req.json();
  const nama = String(body.nama || "").trim();
  const deskripsi = body.deskripsi ? String(body.deskripsi).trim() : null;
  const subCategoryId = body.subCategoryId ? Number(body.subCategoryId) : null;
  const fields = Array.isArray(body.fields) ? body.fields : [];

  if (!nama) return NextResponse.json({ error: "Nama template wajib diisi." }, { status: 400 });
  if (fields.length === 0)
    return NextResponse.json({ error: "Minimal satu pertanyaan wajib dibuat." }, { status: 400 });

  const created = await prisma.inspectionTemplate.create({
    data: {
      nama,
      deskripsi,
      isActive: true,
      // Mobile-created templates belong to the operator's Puskesmas.
      // ADMIN/DINKES may create global templates from web builder instead.
      puskesmasId: user.puskesmasId ?? null,
      subCategoryId,
      config: { source: "mobile" },
      fields: {
        create: fields.map((f: any, idx: number) => ({
          pertanyaan: String(f.pertanyaan || "").trim(),
          tipe: String(f.tipe || "BOOLEAN").toUpperCase(),
          isRequired: f.isRequired !== false,
          urutan: Number(f.urutan || idx + 1),
          grup: f.grup ? String(f.grup).trim() : "Pertanyaan Lapangan",
          options: Array.isArray(f.options) ? JSON.stringify(f.options) : null,
          config: f.config || { skor: 1, skorBenar: 1, skorSalah: 0 },
        })),
      },
    },
    select: {
      id: true,
      nama: true,
      deskripsi: true,
      puskesmasId: true,
      subCategoryId: true,
      updatedAt: true,
      fields: { select: { id: true }, where: { isRequired: true } },
      subCategory: { select: { nama: true } },
    },
  });

  return NextResponse.json({
    id: created.id,
    nama: created.nama,
    deskripsi: created.deskripsi,
    scope: created.puskesmasId ? "Puskesmas" : "Global Dinas",
    subCategoryId: created.subCategoryId,
    subCategoryName: created.subCategory?.nama ?? null,
    requiredFieldCount: created.fields.length,
    updatedAt: created.updatedAt,
  });
}
