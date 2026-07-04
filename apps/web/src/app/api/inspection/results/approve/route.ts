import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const userId = (req as any).user?.id;
  const { resultId, status, catatan } = body;

  const oldResult = await prisma.inspectionResult.findUnique({
    where: { id: Number(resultId) },
  });

  const result = await prisma.inspectionResult.update({
    where: { id: Number(resultId) },
    data: { status, catatan },
    include: { template: true },
  });

  // Jika APPROVED, agregasikan data ke Laporan Bulanan (DynamicLaporan & DynamicLaporanValue)
  if (status === "APPROVED" && result.template.subCategoryId) {
    const bulan = result.bulan;
    const tahun = result.tahun;
    const pkmId = result.puskesmasId;

    // Cari categoryId dari subCategory
    const subCat = await prisma.dynamicSubCategory.findUnique({
      where: { id: result.template.subCategoryId },
      select: { categoryId: true },
    });

    if (subCat) {
      const catId = subCat.categoryId;
      // 1. Cari atau buat LaporanBulanan
      let laporan = await prisma.dynamicLaporan.findFirst({
        where: { puskesmasId: pkmId, categoryId: catId, bulan, tahun },
      });

      if (!laporan) {
        laporan = await prisma.dynamicLaporan.create({
          data: {
            categoryId: catId,
            puskesmasId: pkmId,
            bulan,
            tahun,
            status: "DRAFT",
          },
        });
      }

      // 2. Tarik semua data dari inspection result values
      const inspectionValues = await prisma.inspectionResultValue.findMany({
        where: { resultId: result.id },
        include: { field: true },
      });

      // 3. Masukkan ke DynamicLaporanValue (agregasi otomatis)
      // Skenario: Kita samakan code/label field di inspection dengan parameter target di dynamic laporan
      for (const val of inspectionValues) {
        // Cari parameter laporan yang namanya mirip dengan pertanyaan pemeriksaan
        const parameter = await prisma.dynamicParameter.findFirst({
          where: {
            categoryId: catId,
            nama: { contains: val.field.pertanyaan, mode: "insensitive" },
          },
        });

        if (parameter) {
          // Update atau create nilai di laporan bulanan
          const numericVal = val.valueNumber !== null ? val.valueNumber : val.valueString === "TRUE" ? 1 : 0;

          const existingVal = await prisma.dynamicLaporanValue.findFirst({
            where: { laporanId: laporan.id, parameterId: parameter.id },
          });

          if (existingVal) {
            await prisma.dynamicLaporanValue.update({
              where: { id: existingVal.id },
              data: { value: String(Number(existingVal.value || 0) + numericVal) },
            });
          } else {
            await prisma.dynamicLaporanValue.create({
              data: {
                laporanId: laporan.id,
                parameterId: parameter.id,
                value: String(numericVal),
              },
            });
          }
        }
      }
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "UPDATE",
      tableName: "inspection_result",
      recordId: result.id,
      oldData: { status: oldResult?.status },
      newData: { status, catatan },
    },
  });

  return NextResponse.json(result);
});
