import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

// options bisa array (["A","B"]) atau string ("A, B") → selalu jadi string[] bersih
function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map((o) => String(o).trim()).filter(Boolean);
  if (typeof options === "string") {
    // sudah JSON array string
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed.map((o) => String(o).trim()).filter(Boolean);
    } catch {
      /* bukan JSON — lanjut split */
    }
    return options
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return [];
}

export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const subCatId = req.nextUrl.searchParams.get("subCategoryId");
  const pkmFilter = req.nextUrl.searchParams.get("puskesmasId");

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  const where: any = includeInactive ? {} : { isActive: true };
  if (subCatId) where.subCategoryId = parseInt(subCatId, 10);
  if (pkmFilter) where.puskesmasId = parseInt(pkmFilter, 10);
  // Visibilitas template dibuka untuk seluruh puskesmas

  const templates = await prisma.inspectionTemplate.findMany({
    where,
    include: {
      subCategory: {
        include: {
          category: { include: { parameters: { where: { isBaseline: true }, orderBy: { urutan: "asc" } } } },
        },
      },
      fields: { orderBy: { urutan: "asc" } },
      puskesmas: { select: { id: true, nama: true } },
    },
    orderBy: { id: "desc" },
  });
  const categoryIds = [
    ...new Set(
      templates
        .map((template: any) =>
          Number(
            template.config?.dataDasarCategoryId ||
              template.subCategory?.categoryId ||
              template.subCategory?.category?.id,
          ),
        )
        .filter((id: number) => Number.isInteger(id) && id > 0),
    ),
  ];
  const dataDasarCategories = categoryIds.length
    ? await prisma.dynamicCategory.findMany({
        where: { id: { in: categoryIds } },
        select: {
          id: true,
          nama: true,
          code: true,
          subCategories: { select: { id: true, nama: true, grup: true }, orderBy: { urutan: "asc" } },
          parameters: {
            where: { isBaseline: true },
            orderBy: { urutan: "asc" },
            select: { id: true, code: true, nama: true, type: true, required: true, config: true, urutan: true },
          },
        },
      })
    : [];
  const categoryById = new Map(dataDasarCategories.map((category) => [category.id, category]));
  return NextResponse.json(
    templates.map((template: any) => {
      const resolvedCategoryId = Number(
        template.config?.dataDasarCategoryId || template.subCategory?.categoryId || template.subCategory?.category?.id,
      );
      return {
        ...template,
        dataDasarCategory: categoryById.get(resolvedCategoryId) ?? null,
      };
    }),
  );
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

    // Ambil info nama user dan puskesmas untuk metadata pembuat
    const userRecord = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { nama: true, puskesmas: { select: { id: true, nama: true } } },
        })
      : null;
    const authorName = userRecord?.nama || (req as any).user?.name || "Sanitarian";
    const authorPuskesmas = userRecord?.puskesmas?.nama || (role === "ADMIN" ? "Dinas Kesehatan" : "Puskesmas");

    if (id && id !== "undefined" && id !== null) {
      const numericId = parseInt(id, 10);

      // Cek apakah template ada dan verifikasi izin ubah
      const existingTemplate = await prisma.inspectionTemplate.findUnique({
        where: { id: numericId },
        include: { puskesmas: true },
      });
      if (!existingTemplate) {
        return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
      }
      if (role !== "ADMIN" && existingTemplate.puskesmasId && existingTemplate.puskesmasId !== pkmId) {
        return NextResponse.json(
          { error: "Anda tidak memiliki izin mengubah template milik puskesmas lain" },
          { status: 403 },
        );
      }

      const existingConfig = (existingTemplate.config as any) || {};
      const updatedConfig = {
        ...existingConfig,
        ...(config || {}),
        authorName: existingConfig.authorName || authorName,
        authorPuskesmas: existingConfig.authorPuskesmas || existingTemplate.puskesmas?.nama || authorPuskesmas,
        lastUpdatedBy: authorName,
      };

      // Ambil field yang sudah ada di database beserta jumlah relasi nilai inspeksi
      const existingFields = await prisma.inspectionField.findMany({
        where: { templateId: numericId },
        include: { _count: { select: { values: true } } },
      });
      const existingMap = new Map(existingFields.map((ef) => [ef.id, ef]));

      const incomingIds = safeFields
        .map((f: any) => Number(f.id))
        .filter((fId: number) => Number.isInteger(fId) && fId > 0);
      const incomingIdSet = new Set(incomingIds);

      // Hapus hanya field yang sengaja dibuang dan TIDAK memiliki relasi data riwayat
      const toDeleteFields = existingFields.filter((ef) => !incomingIdSet.has(ef.id));
      for (const df of toDeleteFields) {
        if (df._count.values === 0) {
          await prisma.inspectionField.delete({ where: { id: df.id } });
        } else {
          // Jangan hapus baris yang punya riwayat jawaban agar tidak cascade delete ke inspection_result_value
          const currentConfig = (df.config as any) || {};
          await prisma.inspectionField.update({
            where: { id: df.id },
            data: {
              config: { ...currentConfig, isDisabled: true, isArchived: true },
            },
          });
        }
      }

      // Upsert field-field yang dikirim
      for (let i = 0; i < safeFields.length; i++) {
        const f = safeFields[i];
        const fId = Number(f.id);
        const fieldData = {
          pertanyaan: f.pertanyaan,
          tipe: f.tipe,
          isRequired: f.isRequired ?? false,
          urutan: f.urutan ?? i,
          grup: f.grup,
          options: f.options ? JSON.stringify(normalizeOptions(f.options)) : null,
          config: {
            ...(typeof f.config === "object" && f.config !== null ? f.config : {}),
            skor: f.skor ?? f.config?.skor ?? 0,
            skorBenar: f.skorBenar ?? f.config?.skorBenar ?? 1,
            skorSalah: f.skorSalah ?? f.config?.skorSalah ?? 0,
            autoFill: f.autoFill || f.config?.autoFill || undefined,
            isDisabled: f.isDisabled ?? f.config?.isDisabled ?? false,
            dependsOn: f.dependsOn ?? f.config?.dependsOn ?? undefined,
            targetGolongan: f.targetGolongan || f.config?.targetGolongan || "ALL",
            allowNA: f.allowNA ?? f.config?.allowNA ?? false,
          },
        };

        if (Number.isInteger(fId) && fId > 0 && existingMap.has(fId)) {
          await prisma.inspectionField.update({
            where: { id: fId },
            data: fieldData,
          });
        } else {
          await prisma.inspectionField.create({
            data: {
              ...fieldData,
              templateId: numericId,
            },
          });
        }
      }

      const updated = await prisma.inspectionTemplate.update({
        where: { id: numericId },
        data: {
          nama,
          deskripsi,
          subCategoryId: subCategoryId ? Number(subCategoryId) : null,
          config: updatedConfig,
          puskesmasId: assignPkmId,
        },
        include: {
          fields: { orderBy: { urutan: "asc" } },
          puskesmas: { select: { id: true, nama: true } },
        },
      });

      await prisma.auditLog.create({
        data: { userId, action: "UPDATE", tableName: "inspection_template", recordId: numericId, newData: { nama } },
      });

      return NextResponse.json(updated);
    }

    const newConfig = {
      ...(config || {}),
      authorName: config?.authorName || authorName,
      authorPuskesmas: config?.authorPuskesmas || authorPuskesmas,
      creatorUserId: userId,
    };

    const template = await prisma.inspectionTemplate.create({
      data: {
        nama,
        deskripsi,
        subCategoryId: subCategoryId ? Number(subCategoryId) : null,
        config: newConfig,
        puskesmasId: assignPkmId,
        fields: {
          create: safeFields.map((f: any) => ({
            pertanyaan: f.pertanyaan,
            tipe: f.tipe,
            isRequired: f.isRequired,
            urutan: f.urutan,
            grup: f.grup,
            options: f.options ? JSON.stringify(normalizeOptions(f.options)) : null,
            config: {
              ...(typeof f.config === "object" && f.config !== null ? f.config : {}),
              skor: f.skor ?? f.config?.skor ?? 0,
              skorBenar: f.skorBenar ?? f.config?.skorBenar ?? 1,
              skorSalah: f.skorSalah ?? f.config?.skorSalah ?? 0,
              autoFill: f.autoFill || f.config?.autoFill || undefined,
              isDisabled: f.isDisabled ?? f.config?.isDisabled ?? false,
              dependsOn: f.dependsOn ?? f.config?.dependsOn ?? undefined,
              targetGolongan: f.targetGolongan || f.config?.targetGolongan || "ALL",
              allowNA: f.allowNA ?? f.config?.allowNA ?? false,
            },
          })),
        },
      },
      include: {
        fields: { orderBy: { urutan: "asc" } },
        puskesmas: { select: { id: true, nama: true } },
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
