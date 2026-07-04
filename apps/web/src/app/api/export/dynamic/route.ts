import { prisma } from "@apps-kes/database";
import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

const BULAN_NAMA = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();
  const puskesmasId = searchParams.get("puskesmasId") ? Number(searchParams.get("puskesmasId")) : undefined;

  const wb = new ExcelJS.Workbook();
  wb.creator = "System Builder Studio";

  // Ambil semua kategori aktif
  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      parameters: { orderBy: { urutan: "asc" } },
      subCategories: { orderBy: { urutan: "asc" } },
    },
  });

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

  const whereClause: any = { tahun };
  if (puskesmasId) whereClause.puskesmasId = puskesmasId;

  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: whereClause,
    include: { values: true },
  });

  for (const cat of categories) {
    const ws = wb.addWorksheet(cat.nama.substring(0, 31)); // Excel max sheet name length is 31
    const pkmTerpilih = puskesmasId ? puskesmasList.find((p) => p.id === puskesmasId) : null;

    ws.addRow([`REKAPITULASI LAPORAN: ${cat.nama.toUpperCase()}`]);
    ws.addRow([`TAHUN: ${tahun}`]);
    ws.addRow([`PUSKESMAS: ${pkmTerpilih ? pkmTerpilih.nama : "SEMUA PUSKESMAS"}`]);
    ws.addRow([]);

    if (cat.isRowBased) {
      // Matrix Layout Export
      const headers = ["Bulan", "Puskesmas", "Entitas"];
      const paramHeaders = cat.parameters.map((p) => p.nama);
      ws.addRow([...headers, ...paramHeaders]);

      for (let bulan = 1; bulan <= 12; bulan++) {
        for (const pkm of pkmTerpilih ? [pkmTerpilih] : puskesmasList) {
          const laporanBulanIni = allLaporan.find(
            (l) => l.categoryId === cat.id && l.bulan === bulan && l.puskesmasId === pkm.id,
          );

          for (const sub of cat.subCategories) {
            const rowData: (string | number)[] = [BULAN_NAMA[bulan], pkm.nama, sub.nama];

            for (const param of cat.parameters) {
              if (!laporanBulanIni) {
                rowData.push(0);
              } else {
                const val = laporanBulanIni.values.find(
                  (v) => v.parameterId === param.id && v.subCategoryId === sub.id,
                );
                rowData.push(val ? (Number.isNaN(Number(val.value)) ? val.value : Number(val.value)) : 0);
              }
            }
            ws.addRow(rowData);
          }
        }
      }
    } else {
      // Flat Layout Export
      const headers = ["Bulan", "Puskesmas"];
      const paramHeaders = cat.parameters.map((p) => p.nama);
      ws.addRow([...headers, ...paramHeaders]);

      for (let bulan = 1; bulan <= 12; bulan++) {
        for (const pkm of pkmTerpilih ? [pkmTerpilih] : puskesmasList) {
          const laporanBulanIni = allLaporan.find(
            (l) => l.categoryId === cat.id && l.bulan === bulan && l.puskesmasId === pkm.id,
          );

          const rowData: (string | number)[] = [BULAN_NAMA[bulan], pkm.nama];

          for (const param of cat.parameters) {
            if (!laporanBulanIni) {
              rowData.push(0);
            } else {
              const val = laporanBulanIni.values.find((v) => v.parameterId === param.id && v.subCategoryId === null);
              rowData.push(val ? (Number.isNaN(Number(val.value)) ? val.value : Number(val.value)) : 0);
            }
          }
          ws.addRow(rowData);
        }
      }
    }

    // Styling
    ws.getColumn(1).width = 15;
    ws.getColumn(2).width = 25;
    ws.getColumn(3).width = 25;
    ws.getRow(5).font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap_dinamis_${tahun}.xlsx"`,
    },
  });
});
