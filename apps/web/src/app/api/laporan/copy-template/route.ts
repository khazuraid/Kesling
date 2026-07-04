import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

const copyTemplateSchema = z.object({
  categoryCode: z.string().min(1), // dynamic category code
  puskesmasId: z.number().int().positive(),
  bulanFrom: z.number().int().min(1).max(12),
  tahunFrom: z.number().int().min(2020).max(2100),
  bulanTo: z.number().int().min(1).max(12),
  tahunTo: z.number().int().min(2020).max(2100),
});

export const POST = withAuth(async (req: NextRequest) => {
  const user = (req as any).user;
  const raw = await req.json();
  const parsed = copyTemplateSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues?.[0]?.message || "Input tidak valid" }, { status: 400 });
  }

  const { categoryCode, puskesmasId, bulanFrom, tahunFrom, bulanTo, tahunTo } = parsed.data;

  // Operator hanya bisa copy data milik puskesmasnya sendiri
  if (user.role === "OPERATOR" && puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Forbidden: bukan puskesmas Anda" }, { status: 403 });
  }

  // Prevent copy to same period
  if (bulanFrom === bulanTo && tahunFrom === tahunTo) {
    return NextResponse.json({ error: "Periode sumber dan tujuan tidak boleh sama" }, { status: 400 });
  }

  // Find dynamic category
  const category = await prisma.dynamicCategory.findFirst({
    where: { code: { equals: categoryCode, mode: "insensitive" } },
  });

  if (!category) {
    return NextResponse.json({ error: `Kategori "${categoryCode}" tidak ditemukan` }, { status: 404 });
  }

  // Find source laporan
  const sourceLaporan = await prisma.dynamicLaporan.findUnique({
    where: {
      puskesmasId_categoryId_bulan_tahun: {
        puskesmasId,
        categoryId: category.id,
        bulan: bulanFrom,
        tahun: tahunFrom,
      },
    },
    include: { values: true },
  });

  if (!sourceLaporan) {
    return NextResponse.json(
      { error: `Tidak ada data laporan ${category.nama} untuk bulan ${bulanFrom}/${tahunFrom}` },
      { status: 404 },
    );
  }

  if (sourceLaporan.values.length === 0) {
    return NextResponse.json({ error: "Data sumber tidak memiliki nilai yang bisa disalin" }, { status: 400 });
  }

  // Upsert target laporan
  const result = await prisma.$transaction(async (tx) => {
    const targetLaporan = await tx.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId,
          categoryId: category.id,
          bulan: bulanTo,
          tahun: tahunTo,
        },
      },
      update: {
        status: "DRAFT",
        updatedBy: user.id,
        catatan: `Disalin dari ${bulanFrom}/${tahunFrom}`,
      },
      create: {
        puskesmasId,
        categoryId: category.id,
        bulan: bulanTo,
        tahun: tahunTo,
        status: "DRAFT",
        createdBy: user.id,
        updatedBy: user.id,
        catatan: `Disalin dari ${bulanFrom}/${tahunFrom}`,
      },
    });

    // Copy all values from source to target
    let copied = 0;
    for (const val of sourceLaporan.values) {
      const subCatId = val.subCategoryId ?? undefined;
      // Use findFirst for nullable composite key (subCategoryId can be null)
      const existing = await tx.dynamicLaporanValue.findFirst({
        where: {
          laporanId: targetLaporan.id,
          parameterId: val.parameterId,
          subCategoryId: subCatId,
        },
      });

      if (existing) {
        await tx.dynamicLaporanValue.update({
          where: { id: existing.id },
          data: { value: val.value },
        });
      } else {
        await tx.dynamicLaporanValue.create({
          data: {
            laporanId: targetLaporan.id,
            parameterId: val.parameterId,
            subCategoryId: subCatId ?? null,
            value: val.value,
          },
        });
      }
      copied++;
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        tableName: "dynamic_laporan",
        recordId: targetLaporan.id,
        newData: { copied_from: `${bulanFrom}/${tahunFrom}`, values_copied: copied },
      },
    });

    return { laporanId: targetLaporan.id, copied };
  });

  await cacheInvalidate(`laporan:${categoryCode}:*`);
  await cacheInvalidate("dashboard:*");

  return NextResponse.json({
    copied: result.copied,
    laporanId: result.laporanId,
    message: `${result.copied} nilai berhasil disalin dari ${bulanFrom}/${tahunFrom} ke ${bulanTo}/${tahunTo}`,
  });
});
