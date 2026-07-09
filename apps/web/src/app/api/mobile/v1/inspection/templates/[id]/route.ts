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
