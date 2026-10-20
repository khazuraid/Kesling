import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sasaran = await prisma.sasaran.findUnique({
      where: { id: Number(id) },
      include: {
        subCategory: {
          include: {
            category: { select: { id: true, nama: true, code: true } },
          },
        },
        puskesmas: { select: { id: true, nama: true } },
      },
    });

    if (!sasaran) return NextResponse.json({ error: "Sasaran tidak ditemukan" }, { status: 404 });

    if (user.role === "OPERATOR" && sasaran.puskesmasId !== user.puskesmasId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    return NextResponse.json(sasaran);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat sasaran" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sasaranId = Number(id);

    const existing = await prisma.sasaran.findUnique({
      where: { id: sasaranId },
    });
    if (!existing) return NextResponse.json({ error: "Sasaran tidak ditemukan" }, { status: 404 });

    if (user.role === "OPERATOR" && existing.puskesmasId !== user.puskesmasId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { nama, subCategoryId, puskesmasId, alamat, pemilik, kontak, lat, lng, dataDinamis } = body;

    const updated = await prisma.sasaran.update({
      where: { id: sasaranId },
      data: {
        nama: nama ? String(nama).trim() : existing.nama,
        subCategoryId: subCategoryId ? Number(subCategoryId) : existing.subCategoryId,
        puskesmasId:
          user.role === "OPERATOR" ? existing.puskesmasId : puskesmasId ? Number(puskesmasId) : existing.puskesmasId,
        alamat: alamat !== undefined ? (alamat ? String(alamat).trim() : null) : existing.alamat,
        pemilik: pemilik !== undefined ? (pemilik ? String(pemilik).trim() : null) : existing.pemilik,
        kontak: kontak !== undefined ? (kontak ? String(kontak).trim() : null) : existing.kontak,
        lat: typeof lat === "number" ? lat : existing.lat,
        lng: typeof lng === "number" ? lng : existing.lng,
        dataDinamis: dataDinamis !== undefined ? dataDinamis : existing.dataDinamis,
      },
      include: {
        subCategory: { select: { id: true, nama: true } },
        puskesmas: { select: { id: true, nama: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memperbarui sasaran" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sasaranId = Number(id);

    const existing = await prisma.sasaran.findUnique({
      where: { id: sasaranId },
    });
    if (!existing) return NextResponse.json({ error: "Sasaran tidak ditemukan" }, { status: 404 });

    if (user.role === "OPERATOR" && existing.puskesmasId !== user.puskesmasId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    await prisma.sasaran.delete({
      where: { id: sasaranId },
    });

    return NextResponse.json({ message: "Sasaran berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal menghapus sasaran" }, { status: 500 });
  }
}
