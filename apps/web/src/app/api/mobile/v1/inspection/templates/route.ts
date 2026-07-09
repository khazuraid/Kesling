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
