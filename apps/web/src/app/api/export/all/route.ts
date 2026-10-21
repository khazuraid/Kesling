import { prisma } from "@apps-kes/database";
import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

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
  wb.creator = "Aplikasi Kesling";
  wb.created = new Date();

  // 1. Ambil data master
  const puskesmasList = await prisma.puskesmas.findMany({
    where: puskesmasId ? { id: puskesmasId } : undefined,
    orderBy: { urutan: "asc" },
  });

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      parameters: { orderBy: { urutan: "asc" } },
      subCategories: { orderBy: { urutan: "asc" } },
    },
  });

  // ── SHEET 1: RINGKASAN PROGRAM ───────────────────────────────────────
  const wsSummary = wb.addWorksheet("Ringkasan");
  wsSummary.addRow(["REKAPITULASI PROGRAM KESEHATAN LINGKUNGAN"]);
  wsSummary.addRow([`Tahun: ${tahun}`]);
  wsSummary.addRow([`Dicetak pada: ${new Date().toLocaleString("id-ID")}`]);
  wsSummary.addRow([]);

  wsSummary.addRow([
    "No",
    "ID Puskesmas",
    "Nama Puskesmas",
    "Total Sasaran Terdaftar",
    "Total IKL Lapangan",
    "Laporan Terinput",
  ]);

  const pkmSummaryData = await Promise.all(
    puskesmasList.map(async (pkm, idx) => {
      const [totalSasaran, totalIkl, totalLaporan] = await Promise.all([
        prisma.sasaran.count({ where: { puskesmasId: pkm.id } }),
        prisma.inspectionResult.count({
          where: {
            puskesmasId: pkm.id,
            ...(tahun ? { tahun } : {}),
          },
        }),
        prisma.dynamicLaporan.count({
          where: {
            puskesmasId: pkm.id,
            ...(tahun ? { tahun } : {}),
          },
        }),
      ]);

      return [idx + 1, pkm.id, pkm.nama, totalSasaran, totalIkl, totalLaporan];
    }),
  );

  for (const row of pkmSummaryData) {
    wsSummary.addRow(row);
  }
  wsSummary.getRow(5).font = { bold: true };
  wsSummary.getColumn(1).width = 6;
  wsSummary.getColumn(2).width = 18;
  wsSummary.getColumn(3).width = 28;
  wsSummary.getColumn(4).width = 22;
  wsSummary.getColumn(5).width = 20;
  wsSummary.getColumn(6).width = 18;

  // ── SHEET 2: DATA DASAR SASARAN ──────────────────────────────────────
  const wsSasaran = wb.addWorksheet("Data Dasar Sasaran");
  wsSasaran.addRow(["DATA DASAR SASARAN KESEHATAN LINGKUNGAN"]);
  wsSasaran.addRow([`Total Entitas Sasaran: ${puskesmasId ? `Puskesmas ID ${puskesmasId}` : "Semua Wilayah"}`]);
  wsSasaran.addRow([]);

  wsSasaran.addRow([
    "No",
    "Nama Sasaran / Tempat",
    "Puskesmas",
    "Kategori",
    "Sub-Kategori",
    "Alamat",
    "Pengelola / Pemilik",
    "Kontak",
    "Koordinat GPS",
  ]);

  const allSasaran = await prisma.sasaran.findMany({
    where: puskesmasId ? { puskesmasId } : undefined,
    include: {
      puskesmas: true,
      subCategory: {
        include: { category: true },
      },
    },
    orderBy: [{ puskesmas: { urutan: "asc" } }, { nama: "asc" }],
  });

  for (let idx = 0; idx < allSasaran.length; idx++) {
    const s = allSasaran[idx];
    wsSasaran.addRow([
      idx + 1,
      s.nama,
      s.puskesmas?.nama || "-",
      s.subCategory?.category?.nama || "-",
      s.subCategory?.nama || "-",
      s.alamat || "-",
      s.pemilik || "-",
      s.kontak || "-",
      s.lat && s.lng ? `${s.lat}, ${s.lng}` : "-",
    ]);
  }

  wsSasaran.getRow(4).font = { bold: true };
  wsSasaran.getColumn(1).width = 6;
  wsSasaran.getColumn(2).width = 30;
  wsSasaran.getColumn(3).width = 24;
  wsSasaran.getColumn(4).width = 24;
  wsSasaran.getColumn(5).width = 22;
  wsSasaran.getColumn(6).width = 35;
  wsSasaran.getColumn(7).width = 22;
  wsSasaran.getColumn(8).width = 16;
  wsSasaran.getColumn(9).width = 22;

  // ── SHEET 3: RIWAYAT INSPEKSI LAPANGAN (IKL) ─────────────────────────
  const wsIkl = wb.addWorksheet("Riwayat IKL");
  wsIkl.addRow(["RIWAYAT PEMERIKSAAN INSPEKSI KESEHATAN LINGKUNGAN (IKL)"]);
  wsIkl.addRow([`Tahun: ${tahun}`]);
  wsIkl.addRow([]);

  wsIkl.addRow([
    "No",
    "Tanggal",
    "Puskesmas",
    "Nama Sasaran",
    "Formulir / Template",
    "Petugas Pemeriksa",
    "Bulan",
    "Tahun",
    "Status",
    "Catatan",
  ]);

  const allIkl = await prisma.inspectionResult.findMany({
    where: {
      ...(puskesmasId ? { puskesmasId } : {}),
      ...(tahun ? { tahun } : {}),
    },
    include: {
      puskesmas: true,
      sasaran: true,
      template: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  for (let idx = 0; idx < allIkl.length; idx++) {
    const r = allIkl[idx];
    const tgl = r.tanggal || r.createdAt;
    wsIkl.addRow([
      idx + 1,
      tgl ? new Date(tgl).toLocaleDateString("id-ID") : "-",
      r.puskesmas?.nama || "-",
      r.sasaran?.nama || r.namaSasaran || "-",
      r.template?.nama || "-",
      r.user?.nama || "-",
      r.bulan || "-",
      r.tahun || "-",
      r.status,
      r.catatan || "-",
    ]);
  }

  wsIkl.getRow(4).font = { bold: true };
  wsIkl.getColumn(1).width = 6;
  wsIkl.getColumn(2).width = 14;
  wsIkl.getColumn(3).width = 22;
  wsIkl.getColumn(4).width = 28;
  wsIkl.getColumn(5).width = 28;
  wsIkl.getColumn(6).width = 20;
  wsIkl.getColumn(7).width = 8;
  wsIkl.getColumn(8).width = 8;
  wsIkl.getColumn(9).width = 14;
  wsIkl.getColumn(10).width = 30;

  // ── SHEET 4+: REKAPITULASI DYNAMIC CATEGORIES ────────────────────────
  const whereLaporan: any = { tahun };
  if (puskesmasId) whereLaporan.puskesmasId = puskesmasId;

  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: whereLaporan,
    include: { values: true },
  });

  for (const cat of categories) {
    // Sheet name max 31 chars in Excel
    const cleanSheetName = cat.nama.replace(/[:\\/?*[\]]/g, "").substring(0, 30);
    const ws = wb.addWorksheet(cleanSheetName);

    ws.addRow([`REKAPITULASI: ${cat.nama.toUpperCase()}`]);
    ws.addRow([`Tahun: ${tahun}`]);
    ws.addRow([]);

    if (cat.isRowBased) {
      const headers = ["Bulan", "Puskesmas", "Sub-Kategori"];
      const paramHeaders = cat.parameters.map((p) => p.nama);
      ws.addRow([...headers, ...paramHeaders]);

      for (let bulan = 1; bulan <= 12; bulan++) {
        for (const pkm of puskesmasList) {
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
      const headers = ["Bulan", "Puskesmas"];
      const paramHeaders = cat.parameters.map((p) => p.nama);
      ws.addRow([...headers, ...paramHeaders]);

      for (let bulan = 1; bulan <= 12; bulan++) {
        for (const pkm of puskesmasList) {
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

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 24;
    ws.getColumn(3).width = 24;
    ws.getRow(4).font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export_kesling_lengkap_${tahun}.xlsx"`,
    },
  });
});
