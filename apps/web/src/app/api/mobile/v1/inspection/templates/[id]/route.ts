import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const templateId = Number(params.id);
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: "ID template tidak valid." }, { status: 400 });
  }

  const template = await prisma.inspectionTemplate.findFirst({
    where: {
      id: templateId,
      isActive: true,
      OR: [{ puskesmasId: user.puskesmasId }, { puskesmasId: null }],
    },
    include: {
      fields: { orderBy: { urutan: "asc" } },
      subCategory: { select: { nama: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template tidak ditemukan atau tidak dapat diakses." }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const templateId = Number(params.id);
  if (Number.isNaN(templateId)) return NextResponse.json({ error: "ID template tidak valid." }, { status: 400 });

  // Hanya template milik puskesmas operator yang bisa diedit dari mobile.
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { id: templateId, puskesmasId: user.puskesmasId },
  });
  if (!existing)
    return NextResponse.json({ error: "Template tidak ditemukan atau tidak dapat diakses." }, { status: 404 });

  const body = await req.json();
  const nama = String(body.nama || "").trim();
  if (!nama) return NextResponse.json({ error: "Nama template wajib diisi." }, { status: 400 });

  const fields = Array.isArray(body.fields) ? body.fields : undefined;
  if (fields !== undefined && fields.length === 0)
    return NextResponse.json({ error: "Minimal satu pertanyaan wajib dibuat." }, { status: 400 });

  const updated = await prisma.inspectionTemplate.update({
    where: { id: templateId },
    data: {
      nama,
      deskripsi: body.deskripsi != null ? String(body.deskripsi).trim() : existing.deskripsi,
      subCategoryId: body.subCategoryId ? Number(body.subCategoryId) : existing.subCategoryId,
      ...(fields
        ? {
            fields: {
              deleteMany: {},
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
          }
        : {}),
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
    id: updated.id,
    nama: updated.nama,
    deskripsi: updated.deskripsi,
    scope: updated.puskesmasId ? "Puskesmas" : "Global Dinas",
    subCategoryId: updated.subCategoryId,
    subCategoryName: updated.subCategory?.nama ?? null,
    requiredFieldCount: updated.fields.length,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const templateId = Number(params.id);
  if (Number.isNaN(templateId)) return NextResponse.json({ error: "ID template tidak valid." }, { status: 400 });

  // Hanya template milik puskesmas operator yang bisa dihapus dari mobile.
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { id: templateId, puskesmasId: user.puskesmasId },
  });
  if (!existing)
    return NextResponse.json({ error: "Template tidak ditemukan atau tidak dapat diakses." }, { status: 404 });

  await prisma.inspectionTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ success: true });
}
