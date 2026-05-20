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
  const { jenis } = await params;
  const { searchParams } = new URL(req.url);
  const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

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
});
