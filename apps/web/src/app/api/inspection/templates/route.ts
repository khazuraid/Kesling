import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const subCatId = req.nextUrl.searchParams.get("subCategoryId");

  const where: any = {};
  if (subCatId) where.subCategoryId = parseInt(subCatId, 10);
  if (role !== "ADMIN") where.OR = [{ puskesmasId: null }, { puskesmasId: pkmId }];

  const templates = await prisma.inspectionTemplate.findMany({
    where,
    include: {
      subCategory: { include: { category: true } },
      fields: { orderBy: { urutan: "asc" } },
      puskesmas: { select: { nama: true } },
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(templates);
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const userId = (req as any).user?.id;
    const pkmId = (req as any).user?.puskesmasId;
    const role = (req as any).user?.role;
    const { id, nama, deskripsi, subCategoryId, config, fields = [] } = body;
    const assignPkmId = role === "ADMIN" ? (body.puskesmasId ?? null) : pkmId;
    const safeFields = Array.isArray(fields) ? fields : [];

    if (id && id !== "undefined" && id !== null) {
      const numericId = parseInt(id, 10);
      await prisma.inspectionField.deleteMany({ where: { templateId: numericId } });
      const updated = await prisma.inspectionTemplate.update({
        where: { id: numericId },
        data: {
          nama,
          deskripsi,
          subCategoryId: subCategoryId ? Number(subCategoryId) : null,
          config: config || undefined,
          puskesmasId: assignPkmId,
          fields: {
            create: safeFields.map((f: any) => ({
              pertanyaan: f.pertanyaan,
              tipe: f.tipe,
              isRequired: f.isRequired,
              urutan: f.urutan,
              grup: f.grup,
              options: f.options ? JSON.stringify(f.options) : null,
              config: f.config || {
                skor: f.skor ?? 0,
                skorBenar: f.skorBenar ?? f.skor ?? 1,
                skorSalah: f.skorSalah ?? 0,
              },
            })),
          },
        },
      });

      await prisma.auditLog.create({
        data: { userId, action: "UPDATE", tableName: "inspection_template", recordId: numericId, newData: { nama } },
      });

      return NextResponse.json(updated);
    }

    const template = await prisma.inspectionTemplate.create({
      data: {
        nama,
        deskripsi,
        subCategoryId: subCategoryId ? Number(subCategoryId) : null,
        config: config || undefined,
        puskesmasId: assignPkmId,
        fields: {
          create: safeFields.map((f: any) => ({
            pertanyaan: f.pertanyaan,
            tipe: f.tipe,
            isRequired: f.isRequired,
            urutan: f.urutan,
            grup: f.grup,
            options: f.options ? JSON.stringify(f.options) : null,
            config: f.config || {
              skor: f.skor ?? 0,
              skorBenar: f.skorBenar ?? f.skor ?? 1,
              skorSalah: f.skorSalah ?? 0,
            },
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: { userId, action: "CREATE", tableName: "inspection_template", recordId: template.id, newData: { nama } },
    });

    return NextResponse.json(template);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
