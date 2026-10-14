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

export const PUT = withAuth(async (req: NextRequest, context: any) => {
  try {
    const pkmId = (req as any).user?.puskesmasId;
    const role = (req as any).user?.role;
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const body = await req.json();
    const where: any = { id };
    if (role !== "ADMIN") where.puskesmasId = pkmId;

    const existing = await prisma.sasaran.findFirst({
      where,
      include: { subCategory: { include: { category: { include: { parameters: true } } } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Data tidak ditemukan atau tidak memiliki akses" }, { status: 404 });

    const dataDinamis = body.dataDinamis && typeof body.dataDinamis === "object" ? { ...body.dataDinamis } : {};
    for (const p of existing.subCategory.category.parameters) {
      if (p.isBaseline && isEmpty(dataDinamis[p.code])) {
        if (p.config?.syncToEntityField === "nama" && body.nama) dataDinamis[p.code] = body.nama;
        else if (p.config?.syncToEntityField === "alamat" && body.alamat) dataDinamis[p.code] = body.alamat;
        else if (p.config?.syncToEntityField === "pemilik" && body.pemilik) dataDinamis[p.code] = body.pemilik;
        else if (p.config?.syncToEntityField === "kontak" && body.kontak) dataDinamis[p.code] = body.kontak;
        else if (["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"].includes(p.code) && body.nama)
          dataDinamis[p.code] = body.nama;
        else if (["alamat", "alamat_lengkap"].includes(p.code) && body.alamat) dataDinamis[p.code] = body.alamat;
        else if (["pemilik", "pengelola", "nama_pemilik"].includes(p.code) && body.pemilik)
          dataDinamis[p.code] = body.pemilik;
        else if (["kontak", "telepon", "no_hp", "hp"].includes(p.code) && body.kontak)
          dataDinamis[p.code] = body.kontak;
      }
    }

    const missing = existing.subCategory.category.parameters
      .filter((p) => p.isBaseline && p.required && isEmpty((dataDinamis as any)[p.code]))
      .map((p) => p.nama);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(", ")}` }, { status: 400 });
    }

    const data = await prisma.sasaran.update({
      where: { id: existing.id },
      data: {
        nama: body.nama || "Data Dasar",
        alamat: body.alamat || null,
        pemilik: body.pemilik || null,
        kontak: body.kontak || null,
        lat: optionalFloat(body.lat),
        lng: optionalFloat(body.lng),
        dataDinamis,
      },
    });

    await syncDataDasarToLaporan(data.subCategoryId, data.puskesmasId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memperbarui Data Dasar" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, context: any) => {
  try {
    const pkmId = (req as any).user?.puskesmasId;
    const role = (req as any).user?.role;
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const where: any = { id };
    if (role !== "ADMIN") where.puskesmasId = pkmId;

    const old = await prisma.sasaran.findFirst({ where, select: { id: true, subCategoryId: true, puskesmasId: true } });
    if (!old) return NextResponse.json({ error: "Data tidak ditemukan atau tidak memiliki akses" }, { status: 404 });

    await prisma.sasaran.delete({ where: { id: old.id } });
    await syncDataDasarToLaporan(old.subCategoryId, old.puskesmasId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal menghapus Data Dasar" }, { status: 500 });
  }
});
