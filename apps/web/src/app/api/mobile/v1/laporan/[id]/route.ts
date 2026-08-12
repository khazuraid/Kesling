import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

// GET laporan detail with parameters, subCategories, and existing values
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id } = await params;
  const laporanId = Number(id);
  if (!laporanId) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const laporan = await prisma.dynamicLaporan.findUnique({
    where: { id: laporanId },
    include: {
      category: {
        include: {
          parameters: { orderBy: { urutan: "asc" } },
          subCategories: { orderBy: { urutan: "asc" } },
        },
      },
      values: true,
    },
  });

  if (!laporan) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  if (laporan.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Bukan laporan puskesmas Anda." }, { status: 403 });
  }

  type ParamRow = {
    id: number;
    nama: string;
    code: string;
    type: string;
    required: boolean;
    urutan: number;
    config: any;
  };
  type SubRow = { id: number; nama: string; grup: string | null; urutan: number };
  type ValRow = { id: number; parameterId: number; subCategoryId: number | null; value: string };

  return NextResponse.json({
    id: laporan.id,
    categoryName: laporan.category.nama,
    categoryCode: laporan.category.code,
    isRowBased: laporan.category.isRowBased,
    bulan: laporan.bulan,
    tahun: laporan.tahun,
    status: laporan.status,
    catatan: laporan.catatan,
    parameters: (laporan.category.parameters as ParamRow[]).map((p) => ({
      id: p.id,
      nama: p.nama,
      code: p.code,
      type: p.type,
      required: p.required,
      urutan: p.urutan,
      config: p.config,
    })),
    subCategories: (laporan.category.subCategories as SubRow[]).map((s) => ({
      id: s.id,
      nama: s.nama,
      grup: s.grup,
      urutan: s.urutan,
    })),
    values: (laporan.values as ValRow[]).map((v) => ({
      id: v.id,
      parameterId: v.parameterId,
      subCategoryId: v.subCategoryId,
      value: v.value,
    })),
  });
}

// PUT save laporan values
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id } = await params;
  const laporanId = Number(id);
  if (!laporanId) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const laporan = await prisma.dynamicLaporan.findUnique({
    where: { id: laporanId },
    include: { values: true, category: true },
  });

  if (!laporan) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  if (laporan.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Bukan laporan puskesmas Anda." }, { status: 403 });
  }

  const body = await req.json();
  const { values, catatan, status } = body;

  const allowedStatuses = user.role === "ADMIN" ? ["DRAFT", "SUBMITTED", "APPROVED"] : ["DRAFT", "SUBMITTED"];
  const finalStatus = status && allowedStatuses.includes(status) ? status : "DRAFT";

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.dynamicLaporan.update({
      where: { id: laporanId },
      data: {
        catatan: catatan || null,
        status: finalStatus,
        updatedBy: user.id,
      },
    });

    if (Array.isArray(values) && values.length > 0) {
      for (const val of values) {
        const paramId = Number(val.parameterId);
        const subCatId = val.subCategoryId ? Number(val.subCategoryId) : null;
        const valStr = String(val.value);

        const existingVal = (laporan.values as any[]).find(
          (v: any) => v.parameterId === paramId && v.subCategoryId === subCatId,
        );

        if (existingVal) {
          if (existingVal.value !== valStr) {
            await tx.dynamicLaporanValue.update({
              where: { id: existingVal.id },
              data: { value: valStr },
            });
          }
        } else {
          await tx.dynamicLaporanValue.create({
            data: {
              laporanId,
              parameterId: paramId,
              subCategoryId: subCatId,
              value: valStr,
            },
          });
        }
      }
    }
  });

  return NextResponse.json({ success: true });
}
