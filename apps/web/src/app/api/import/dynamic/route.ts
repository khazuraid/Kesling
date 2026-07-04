import { prisma } from "@apps-kes/database";
import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAdmin(async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const categoryCode = formData.get("categoryCode") as string;
    const bulan = Number(formData.get("bulan"));
    const tahun = Number(formData.get("tahun"));

    if (!file || !categoryCode || !bulan || !tahun) {
      return NextResponse.json({ error: "File, categoryCode, bulan, dan tahun wajib diisi" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File terlalu besar (max 5MB)" }, { status: 400 });
    }

    if (!file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: "Format file harus .xlsx atau .xls" }, { status: 400 });
    }

    // Find the dynamic category
    const category = await prisma.dynamicCategory.findFirst({
      where: { code: categoryCode, isActive: true },
      include: {
        parameters: { orderBy: { urutan: "asc" } },
        subCategories: { orderBy: { urutan: "asc" } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: `Kategori "${categoryCode}" tidak ditemukan atau tidak aktif` },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) {
      return NextResponse.json({ error: "File Excel tidak memiliki worksheet" }, { status: 400 });
    }

    const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });
    const pkmNameMap = new Map(puskesmasList.map((p) => [p.nama.toLowerCase().trim(), p.id]));
    let imported = 0;
    let skipped = 0;

    if (category.isRowBased) {
      // Row-based: columns = Puskesmas | SubCategory rows | Parameter values per cell
      // Expected format: Row 1 = headers, subsequent rows = data
      // Column A: Puskesmas nama
      // Columns B..N: parameter values (one column per parameter)
      // SubCategories are row groups within each puskesmas block

      for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
        const row = ws.getRow(rowNum);
        const pkmNama = String(row.getCell(1).value || "")
          .toLowerCase()
          .trim();
        const pkmId = pkmNameMap.get(pkmNama);
        if (!pkmId) {
          skipped++;
          continue;
        }

        // Find or create laporan for this puskesmas + category + periode
        let laporan = await prisma.dynamicLaporan.findFirst({
          where: { categoryId: category.id, puskesmasId: pkmId, bulan, tahun },
          include: { values: true },
        });

        if (!laporan) {
          laporan = await prisma.dynamicLaporan.create({
            data: {
              categoryId: category.id,
              puskesmasId: pkmId,
              bulan,
              tahun,
              status: "DRAFT",
            },
            include: { values: true },
          });
        }

        // Determine which subCategory this row belongs to
        // For row-based with subCategories, we expect: Puskesmas | SubCatName | param1 | param2 | ...
        // OR: Puskesmas | param1_sub1 | param2_sub1 | ... | param1_sub2 | param2_sub2 | ...
        // We'll handle the simpler case: row per subCategory
        const subCatNama = String(row.getCell(2).value || "")
          .toLowerCase()
          .trim();
        const subCat = category.subCategories.find((sc) => sc.nama.toLowerCase().trim() === subCatNama);

        for (const [idx, param] of category.parameters.entries()) {
          const cellVal = row.getCell(idx + 3).value;
          let value: string;
          if (cellVal === null || cellVal === undefined || cellVal === "") {
            continue; // skip empty cells
          } else if (typeof cellVal === "object" && "result" in (cellVal as any)) {
            value = String((cellVal as any).result);
          } else {
            value = String(cellVal);
          }

          const subCatId = subCat?.id ?? null;

          // Use findFirst for nullable unique composite key
          const existing = await prisma.dynamicLaporanValue.findFirst({
            where: {
              laporanId: laporan.id,
              parameterId: param.id,
              subCategoryId: subCatId ?? undefined,
            },
          });

          if (existing) {
            await prisma.dynamicLaporanValue.update({
              where: { id: existing.id },
              data: { value },
            });
          } else {
            await prisma.dynamicLaporanValue.create({
              data: {
                laporanId: laporan.id,
                parameterId: param.id,
                subCategoryId: subCatId ?? undefined,
                value,
              },
            });
          }
          imported++;
        }
      }
    } else {
      // Flat layout: Row per Puskesmas, columns = parameter values
      // Expected: Column A = No, Column B = Puskesmas, Columns C..N = parameter values
      for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
        const row = ws.getRow(rowNum);
        const pkmNama = String(row.getCell(2).value || "")
          .toLowerCase()
          .trim();
        const pkmId = pkmNameMap.get(pkmNama);
        if (!pkmId) {
          skipped++;
          continue;
        }

        let laporan = await prisma.dynamicLaporan.findFirst({
          where: { categoryId: category.id, puskesmasId: pkmId, bulan, tahun },
          include: { values: true },
        });

        if (!laporan) {
          laporan = await prisma.dynamicLaporan.create({
            data: {
              categoryId: category.id,
              puskesmasId: pkmId,
              bulan,
              tahun,
              status: "DRAFT",
            },
            include: { values: true },
          });
        }

        for (const [idx, param] of category.parameters.entries()) {
          const cellVal = row.getCell(idx + 3).value;
          let value: string;
          if (cellVal === null || cellVal === undefined || cellVal === "") {
            continue;
          } else if (typeof cellVal === "object" && "result" in (cellVal as any)) {
            value = String((cellVal as any).result);
          } else {
            value = String(cellVal);
          }

          const existing = await prisma.dynamicLaporanValue.findFirst({
            where: {
              laporanId: laporan.id,
              parameterId: param.id,
            },
          });

          if (existing) {
            await prisma.dynamicLaporanValue.update({
              where: { id: existing.id },
              data: { value },
            });
          } else {
            await prisma.dynamicLaporanValue.create({
              data: {
                laporanId: laporan.id,
                parameterId: param.id,
                value,
              },
            });
          }
          imported++;
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      message: `${imported} data berhasil diimport, ${skipped} baris dilewati (puskesmas tidak ditemukan). Periode: ${bulan}/${tahun}, Kategori: ${category.nama}`,
    });
  }),
);
