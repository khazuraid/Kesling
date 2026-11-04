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

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ jenis: string }> }) => {
  try {
    const { jenis } = await params;
    const { searchParams } = new URL(req.url);
    const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
    const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

    // 1. Cek apakah `jenis` cocok dengan DynamicCategory
    const category = await prisma.dynamicCategory.findFirst({
      where: { code: { equals: jenis, mode: "insensitive" } },
      include: {
        parameters: { orderBy: { urutan: "asc" } },
        subCategories: { orderBy: { urutan: "asc" } },
      },
    });

    if (category) {
      const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

      // Data laporan bulan aktif
      const currentLaporan = await prisma.dynamicLaporan.findMany({
        where: {
          categoryId: category.id,
          bulan,
          tahun,
        },
        include: { values: true },
      });

      // Data kumulatif tahun berjalan (Bulan 1 s/d Bulan aktif)
      const cumulativeReports = await prisma.dynamicLaporan.findMany({
        where: {
          categoryId: category.id,
          tahun,
          bulan: { gte: 1, lte: bulan },
        },
        include: { values: true },
      });

      const numericParamIds = new Set(
        category.parameters.filter((p) => p.type === "NUMBER" || p.type === "DECIMAL").map((p) => p.id),
      );

      // Peta kumulatif per [puskesmasId][key]
      const cumulativeMap: Record<number, Record<string, number>> = {};
      for (const yr of cumulativeReports) {
        if (!cumulativeMap[yr.puskesmasId]) cumulativeMap[yr.puskesmasId] = {};
        const pkmCum = cumulativeMap[yr.puskesmasId];
        for (const val of yr.values) {
          if (!numericParamIds.has(val.parameterId)) continue;
          const key = val.subCategoryId != null ? `${val.subCategoryId}-${val.parameterId}` : `${val.parameterId}`;
          const numVal = parseFloat(val.value) || 0;
          pkmCum[key] = (pkmCum[key] || 0) + numVal;
        }
      }

      // Peta data bulan aktif per [puskesmasId][key]
      const currentMap: Record<number, Record<string, string>> = {};
      for (const lap of currentLaporan) {
        currentMap[lap.puskesmasId] = {};
        for (const val of lap.values) {
          const key = val.subCategoryId != null ? `${val.subCategoryId}-${val.parameterId}` : `${val.parameterId}`;
          currentMap[lap.puskesmasId][key] = val.value;
        }
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = "Dinas Kesehatan Kota";
      wb.lastModifiedBy = "Sistem Kesling";
      wb.created = new Date();

      const reportParams = category.parameters.filter(
        (p) => !p.isBaseline || p.type === "NUMBER" || p.type === "DECIMAL",
      );

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };

      const cumHeaderFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };

      const totalFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };

      const populateSheet = (ws: ExcelJS.Worksheet, subCatId?: number) => {
        const subCatObj = subCatId ? category.subCategories.find((s) => s.id === subCatId) : null;
        const subCatNama = subCatObj ? ` - ${subCatObj.nama}` : "";

        ws.addRow([`LAPORAN ${category.nama.toUpperCase()}${subCatNama.toUpperCase()}`]);
        ws.addRow([
          `Periode: ${BULAN_NAMA[bulan]} ${tahun} (Kumulatif: Jan - ${BULAN_NAMA[bulan].slice(0, 3)} ${tahun})`,
        ]);
        ws.addRow([]);

        const titleRow1 = ws.getRow(1);
        titleRow1.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
        const titleRow2 = ws.getRow(2);
        titleRow2.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };

        const headerRow1 = ["No", "Puskesmas"];
        const headerRow2 = ["", ""];

        for (const p of reportParams) {
          headerRow1.push(p.nama, "");
          headerRow2.push("Bln Ini", "Kumulatif");
        }

        const r1 = ws.addRow(headerRow1);
        const r2 = ws.addRow(headerRow2);

        r1.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
        r2.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF334155" } };

        ws.mergeCells(4, 1, 5, 1);
        ws.mergeCells(4, 2, 5, 2);

        let colIdx = 3;
        for (let i = 0; i < reportParams.length; i++) {
          ws.mergeCells(4, colIdx, 4, colIdx + 1);
          colIdx += 2;
        }

        for (let r = 4; r <= 5; r++) {
          const row = ws.getRow(r);
          row.alignment = { vertical: "middle", horizontal: "center" };
          row.height = 22;
          row.eachCell({ includeEmpty: true }, (cell, cNum) => {
            cell.border = borderStyle;
            cell.fill = cNum % 2 === 0 && cNum > 2 ? cumHeaderFill : headerFill;
          });
        }

        const totalsMonth: number[] = new Array(reportParams.length).fill(0);
        const totalsCum: number[] = new Array(reportParams.length).fill(0);

        for (let i = 0; i < puskesmasList.length; i++) {
          const pkm = puskesmasList[i];
          const rowData: (string | number)[] = [i + 1, pkm.nama];

          const pkmCurrent = currentMap[pkm.id] || {};
          const pkmCumulative = cumulativeMap[pkm.id] || {};

          reportParams.forEach((p, pIdx) => {
            const key = subCatId != null ? `${subCatId}-${p.id}` : `${p.id}`;
            const valMonth = pkmCurrent[key] ? parseFloat(pkmCurrent[key]) || 0 : 0;
            const valCum = pkmCumulative[key] || 0;

            rowData.push(valMonth, valCum);
            totalsMonth[pIdx] += valMonth;
            totalsCum[pIdx] += valCum;
          });

          const dataRow = ws.addRow(rowData);
          dataRow.height = 19;
          dataRow.font = { name: "Arial", size: 9 };
          dataRow.alignment = { vertical: "middle" };

          dataRow.eachCell({ includeEmpty: true }, (cell, cNum) => {
            cell.border = borderStyle;
            if (cNum === 1) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            } else if (cNum > 2) {
              cell.alignment = { vertical: "middle", horizontal: "right" };
              cell.numFmt = "#,##0";
              if (cNum % 2 === 0) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFF8FAFC" },
                };
              }
            }
          });
        }

        const totalRowData: (string | number)[] = ["", "TOTAL KOTA"];
        reportParams.forEach((_, pIdx) => {
          totalRowData.push(totalsMonth[pIdx], totalsCum[pIdx]);
        });

        const totalRow = ws.addRow(totalRowData);
        totalRow.height = 22;
        totalRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF065F46" } };
        totalRow.alignment = { vertical: "middle" };

        totalRow.eachCell({ includeEmpty: true }, (cell, cNum) => {
          cell.border = {
            ...borderStyle,
            top: { style: "medium", color: { argb: "FF059669" } },
            bottom: { style: "double", color: { argb: "FF059669" } },
          };
          cell.fill = totalFill;
          if (cNum > 2) {
            cell.alignment = { vertical: "middle", horizontal: "right" };
            cell.numFmt = "#,##0";
          }
        });

        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 28;
        for (let c = 3; c <= 2 + reportParams.length * 2; c++) {
          ws.getColumn(c).width = 14;
        }
      };

      if (category.isRowBased && category.subCategories.length > 0) {
        for (const sc of category.subCategories) {
          const sheetName = sc.nama.slice(0, 31).replace(/[/\\?*:[\]]/g, "_");
          const ws = wb.addWorksheet(sheetName);
          populateSheet(ws, sc.id);
        }
      } else {
        const sheetName = category.nama.slice(0, 31).replace(/[/\\?*:[\]]/g, "_");
        const ws = wb.addWorksheet(sheetName);
        populateSheet(ws);
      }

      const buf = await wb.xlsx.writeBuffer();
      const safeCatCode = category.code.toLowerCase();
      const filename = `Laporan_${safeCatCode}_${BULAN_NAMA[bulan]}_${tahun}.xlsx`;

      return new NextResponse(buf as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. Fallback jika jenis adalah legacy tables
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Laporan");
    let title = "";

    if (jenis === "tpp") {
      title = `Laporan TPP ${BULAN_NAMA[bulan]} ${tahun}`;
      const data = await prisma.laporanTpp.findMany({
        where: { bulan, tahun },
        include: { puskesmas: true, jenisTpp: true },
        orderBy: [{ puskesmas: { urutan: "asc" } }, { jenisTpp: { urutan: "asc" } }],
      });
      const jenisList = await prisma.jenisTpp.findMany({ orderBy: { urutan: "asc" } });
      const pkmList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

      ws.addRow([title]);
      ws.addRow([]);
      ws.addRow(["No", "Puskesmas", ...jenisList.flatMap((j) => [j.nama, "", "", ""])]);
      ws.addRow(["", "", ...jenisList.flatMap(() => ["Terdaftar", "Diperiksa", "Laik", "%"])]);
      for (const [i, pkm] of pkmList.entries()) {
        const row: any[] = [i + 1, pkm.nama];
        for (const j of jenisList) {
          const d = data.find((x) => x.puskesmasId === pkm.id && x.jenisTppId === j.id);
          row.push(
            d?.terdaftar || 0,
            d?.diperiksa || 0,
            d?.laikJumlah || 0,
            d?.laikPersen ? `${d.laikPersen.toFixed(0)}%` : "0%",
          );
        }
        ws.addRow(row);
      }
    } else if (jenis === "spal" || jenis === "jamban") {
      const kategori = jenis === "spal" ? "SPAL" : "JAMBAN";
      title = `Laporan ${jenis.toUpperCase()} ${BULAN_NAMA[bulan]} ${tahun}`;
      const model = jenis === "spal" ? prisma.laporanSpal : prisma.laporanJamban;
      const data = await (model as any).findMany({
        where: { bulan, tahun },
        include: { puskesmas: true, jenisSarana: true },
        orderBy: [{ puskesmas: { urutan: "asc" } }, { jenisSarana: { urutan: "asc" } }],
      });
      const jenisList = await prisma.jenisSarana.findMany({
        where: { kategori: kategori as any },
        orderBy: { urutan: "asc" },
      });
      const pkmList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

      ws.addRow([title]);
      ws.addRow([]);
      ws.addRow(["No", "Puskesmas", ...jenisList.flatMap((j) => [j.nama, "", "", "", "", "", ""])]);
      ws.addRow(["", "", ...jenisList.flatMap(() => ["JML", "KK", "PDDK", "Prk", "MS", "KK", "PDDK"])]);
      for (const [i, pkm] of pkmList.entries()) {
        const row: any[] = [i + 1, pkm.nama];
        for (const j of jenisList) {
          const d = data.find((x: any) => x.puskesmasId === pkm.id && x.jenisSaranaId === j.id);
          row.push(
            d?.jumlah || 0,
            d?.kk || 0,
            d?.pddk || 0,
            d?.diperiksaJumlah || 0,
            d?.diperiksaMs || 0,
            d?.diperiksaKk || 0,
            d?.diperiksaPddk || 0,
          );
        }
        ws.addRow(row);
      }
    } else if (jenis === "sab") {
      title = `Laporan SAB ${BULAN_NAMA[bulan]} ${tahun}`;
      const data = await prisma.laporanSab.findMany({
        where: { bulan, tahun },
        include: { puskesmas: true, jenisSarana: true },
        orderBy: [{ puskesmas: { urutan: "asc" } }, { jenisSarana: { urutan: "asc" } }],
      });
      const jenisList = await prisma.jenisSarana.findMany({ where: { kategori: "SAB" }, orderBy: { urutan: "asc" } });
      const pkmList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

      ws.addRow([title]);
      ws.addRow([]);
      ws.addRow(["No", "Puskesmas", ...jenisList.flatMap((j) => [j.nama, "", "", "", "", "", "", "", "", "", ""])]);
      ws.addRow([
        "",
        "",
        ...jenisList.flatMap(() => ["JML", "KK", "PDDK", "Prk", "MS", "KK", "PDDK", "R", "S", "T", "AT"]),
      ]);
      for (const [i, pkm] of pkmList.entries()) {
        const row: any[] = [i + 1, pkm.nama];
        for (const j of jenisList) {
          const d = data.find((x) => x.puskesmasId === pkm.id && x.jenisSaranaId === j.id);
          row.push(
            d?.jumlah || 0,
            d?.kk || 0,
            d?.pddk || 0,
            d?.diperiksaJumlah || 0,
            d?.diperiksaMs || 0,
            d?.diperiksaKk || 0,
            d?.diperiksaPddk || 0,
            d?.inspeksiR || 0,
            d?.inspeksiS || 0,
            d?.inspeksiT || 0,
            d?.inspeksiAt || 0,
          );
        }
        ws.addRow(row);
      }
    } else if (jenis === "rumah") {
      title = `Laporan Rumah ${BULAN_NAMA[bulan]} ${tahun}`;
      const data = await prisma.laporanRumah.findMany({
        where: { bulan, tahun },
        include: { puskesmas: true },
        orderBy: { puskesmas: { urutan: "asc" } },
      });
      const keys = [
        "ventilasi",
        "penerangan",
        "lantai",
        "kepadatanHuni",
        "lubangAsap",
        "jamban",
        "airBersih",
        "airLimbah",
        "sampah",
        "kandang",
      ];
      const komponen = [
        "Ventilasi",
        "Penerangan",
        "Lantai",
        "Kpd.Huni",
        "Lub.Asap",
        "Jamban",
        "Air Bersih",
        "Air Limbah",
        "Sampah",
        "Kandang",
      ];

      ws.addRow([title]);
      ws.addRow([]);
      ws.addRow(["Puskesmas", "Rmh Ada", "Diperiksa", ...komponen.flatMap((k) => [k, ""]), "Hasil", ""]);
      ws.addRow(["", "", "", ...komponen.flatMap(() => ["MS", "TMS"]), "MS", "TMS"]);
      for (const d of data) {
        const row: any[] = [d.puskesmas.nama, d.jumlahRumahAda, d.jumlahDiperiksa];
        for (const k of keys) {
          row.push((d as any)[`${k}Ms`], (d as any)[`${k}Tms`]);
        }
        row.push(d.hasilMs, d.hasilTms);
        ws.addRow(row);
      }
    } else if (jenis === "ttu") {
      title = `Laporan TTU ${BULAN_NAMA[bulan]} ${tahun}`;
      const data = await prisma.laporanTtu.findMany({
        where: { bulan, tahun },
        include: { puskesmas: true, jenisTtu: true },
        orderBy: [{ puskesmas: { urutan: "asc" } }, { jenisTtu: { urutan: "asc" } }],
      });
      const jenisList = await prisma.jenisTtu.findMany({ orderBy: [{ kategori: "asc" }, { urutan: "asc" }] });
      const pkmList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

      ws.addRow([title]);
      ws.addRow([]);
      ws.addRow(["No", "Puskesmas", ...jenisList.flatMap((j) => [j.nama, "", ""])]);
      ws.addRow(["", "", ...jenisList.flatMap(() => ["Total", "MS", "TMS"])]);
      for (const [i, pkm] of pkmList.entries()) {
        const row: any[] = [i + 1, pkm.nama];
        for (const j of jenisList) {
          const d = data.find((x) => x.puskesmasId === pkm.id && x.jenisTtuId === j.id);
          row.push(d?.jumlahTotal || 0, d?.ms || 0, d?.tms || 0);
        }
        ws.addRow(row);
      }
    } else {
      return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });
    }

    const buf = await wb.xlsx.writeBuffer();

    return new NextResponse(buf as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan_${jenis}_${BULAN_NAMA[bulan]}_${tahun}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[Export Laporan Error]:", error);
    return NextResponse.json({ error: error?.message || "Gagal membuat file export Excel" }, { status: 500 });
  }
});
