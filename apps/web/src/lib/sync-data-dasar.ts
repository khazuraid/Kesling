import { prisma } from "@apps-kes/database";

function getNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getConfig(param: any) {
  const cfg = param?.config;
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return {};
  return cfg as Record<string, any>;
}

async function upsertLaporanValue(laporanId: number, parameterId: number, subCategoryId: number | null, value: string) {
  const existing = await prisma.dynamicLaporanValue.findFirst({
    where: { laporanId, parameterId, subCategoryId },
    select: { id: true },
  });

  if (existing) {
    await prisma.dynamicLaporanValue.update({ where: { id: existing.id }, data: { value } });
    return;
  }

  await prisma.dynamicLaporanValue.create({
    data: { laporanId, parameterId, subCategoryId, value },
  });
}

export async function syncDataDasarToLaporan(subCategoryId: number, puskesmasId: number) {
  if (!subCategoryId || !puskesmasId) return;

  const subCategory = await prisma.dynamicSubCategory.findUnique({
    where: { id: subCategoryId },
    include: {
      category: {
        include: { parameters: true },
      },
    },
  });
  if (!subCategory?.category) return;

  const mappings = subCategory.category.parameters
    .filter((p: any) => p.isBaseline)
    .map((p: any) => ({ source: p, config: getConfig(p) }))
    .filter(({ config }) => config.syncToParamId);

  if (mappings.length === 0) return;

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const reportSubCategoryId = subCategory.category.isRowBased ? subCategoryId : null;

  const laporan = await prisma.dynamicLaporan.upsert({
    where: {
      puskesmasId_categoryId_bulan_tahun: {
        puskesmasId,
        categoryId: subCategory.categoryId,
        bulan,
        tahun,
      },
    },
    update: {},
    create: {
      puskesmasId,
      categoryId: subCategory.categoryId,
      bulan,
      tahun,
      status: "DRAFT",
      createdBy: undefined,
      updatedBy: undefined,
    },
  });

  for (const { source, config } of mappings) {
    const targetParamId = Number(config.syncToParamId);
    if (!targetParamId || targetParamId === source.id) continue;

    const mode = config.syncMode || "COUNT";
    let value = 0;

    if (mode === "SUM") {
      const sasarans = await prisma.sasaran.findMany({
        where: { puskesmasId, subCategoryId },
        select: { dataDinamis: true },
      });
      value = sasarans.reduce((total: number, s: any) => {
        const data =
          s.dataDinamis && typeof s.dataDinamis === "object" ? (s.dataDinamis as Record<string, unknown>) : {};
        return total + getNumber(data[source.code]);
      }, 0);
    } else {
      value = await prisma.sasaran.count({ where: { puskesmasId, subCategoryId } });
    }

    await upsertLaporanValue(laporan.id, targetParamId, reportSubCategoryId, String(value));
  }
}
