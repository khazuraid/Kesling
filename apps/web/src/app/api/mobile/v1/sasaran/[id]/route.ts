import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  if (!user.puskesmasId) return NextResponse.json({ error: "Akun tidak terikat puskesmas." }, { status: 403 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "ID sasaran tidak valid." }, { status: 400 });

  const existing = await prisma.sasaran.findFirst({
    where: { id, puskesmasId: user.puskesmasId },
  });
  if (!existing) return NextResponse.json({ error: "Sasaran tidak ditemukan." }, { status: 404 });

  const body = await req.json();
  const nama = String(body.nama || "").trim();
  if (!nama) return NextResponse.json({ error: "Nama sasaran wajib diisi." }, { status: 400 });

  const updated = await prisma.sasaran.update({
    where: { id },
    data: {
      nama,
      alamat: body.alamat != null ? String(body.alamat).trim() : existing.alamat,
      pemilik: body.pemilik != null ? String(body.pemilik).trim() : existing.pemilik,
      kontak: body.kontak != null ? String(body.kontak).trim() : existing.kontak,
      subCategoryId: body.subCategoryId ? Number(body.subCategoryId) : existing.subCategoryId,
      lat: body.lat != null ? Number(body.lat) : existing.lat,
      lng: body.lng != null ? Number(body.lng) : existing.lng,
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

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  if (!user.puskesmasId) return NextResponse.json({ error: "Akun tidak terikat puskesmas." }, { status: 403 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "ID sasaran tidak valid." }, { status: 400 });

  const existing = await prisma.sasaran.findFirst({
    where: { id, puskesmasId: user.puskesmasId },
  });
  if (!existing) return NextResponse.json({ error: "Sasaran tidak ditemukan." }, { status: 404 });

  await prisma.sasaran.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
