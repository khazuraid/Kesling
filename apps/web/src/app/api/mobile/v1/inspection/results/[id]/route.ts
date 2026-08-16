import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { computeResultSkor } from "@/lib/result-skor";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const result = await prisma.inspectionResult.findFirst({
    where: {
      id,
      ...(user.role === "OPERATOR" ? { userId: user.id } : user.puskesmasId ? { puskesmasId: user.puskesmasId } : {}),
    },
    include: {
      template: { select: { nama: true, config: true } },
      values: { include: { field: { select: { pertanyaan: true, tipe: true } } } },
    },
  });

  if (!result) return NextResponse.json({ error: "Pemeriksaan tidak ditemukan." }, { status: 404 });

  // Skor pakai rumus resmi (sama dengan agregasi laporan)
  const skor = computeResultSkor(
    result.values.map((v: any) => ({
      valueString: v.valueString,
      valueNumber: v.valueNumber,
      field: v.field ? { tipe: v.field.tipe, grup: null, config: null } : null,
    })),
    (result.template as any)?.config,
  );

  return NextResponse.json({
    id: result.id,
    namaSasaran: result.namaSasaran,
    alamatSasaran: result.alamatSasaran,
    status: result.status,
    catatan: result.catatan,
    lat: result.lat,
    lng: result.lng,
    tanggal: result.tanggal || result.createdAt,
    templateName: result.template?.nama ?? "Template Dihapus",
    skor,
    fotoPaths: (result.fotoPaths as string[] | null) ?? [],
    signatureData: result.signatureData ?? null,
    values: result.values.map((v: any) => ({
      pertanyaan: v.field?.pertanyaan ?? `Pertanyaan #${v.fieldId ?? v.id}`,
      tipe: v.field?.tipe ?? "TEXT",
      value: v.valueString ?? v.valueNumber ?? null,
    })),
  });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const existing = await prisma.inspectionResult.findFirst({
    where: {
      id,
      ...(user.role === "OPERATOR" ? { userId: user.id } : user.puskesmasId ? { puskesmasId: user.puskesmasId } : {}),
    },
  });
  if (!existing) return NextResponse.json({ error: "Pemeriksaan tidak ditemukan." }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.inspectionResult.update({
    where: { id },
    data: {
      namaSasaran: body.namaSasaran != null ? String(body.namaSasaran).trim() : existing.namaSasaran,
      alamatSasaran: body.alamatSasaran != null ? String(body.alamatSasaran).trim() : existing.alamatSasaran,
      catatan: body.catatan != null ? String(body.catatan).trim() : existing.catatan,
      lat: body.lat != null ? Number(body.lat) : existing.lat,
      lng: body.lng != null ? Number(body.lng) : existing.lng,
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const existing = await prisma.inspectionResult.findFirst({
    where: {
      id,
      ...(user.role === "OPERATOR" ? { userId: user.id } : user.puskesmasId ? { puskesmasId: user.puskesmasId } : {}),
    },
  });
  if (!existing) return NextResponse.json({ error: "Pemeriksaan tidak ditemukan." }, { status: 404 });

  await prisma.inspectionResult.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
