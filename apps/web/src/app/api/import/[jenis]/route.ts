import { prisma } from "@apps-kes/database";
import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAdmin(async (req: NextRequest, { params }: { params: Promise<{ jenis: string }> }) => {
    const { jenis } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bulan = Number(formData.get("bulan"));
    const tahun = Number(formData.get("tahun"));

    if (!file || !bulan || !tahun) {
      return NextResponse.json({ error: "File, bulan, dan tahun wajib diisi" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File terlalu besar (max 5MB)" }, { status: 400 });
    }

    if (!file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: "Format file harus .xlsx atau .xls" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: "Sheet tidak ditemukan" }, { status: 400 });

    const rows: any[][] = [];
    ws.eachRow((row) => {
      rows.push(row.values as any[]);
    });

    const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });
    let imported = 0;

    if (jenis === "tpp") {
      const jenisList = await prisma.jenisTpp.findMany({ orderBy: { urutan: "asc" } });
      for (const row of rows) {
        const pkmName = String(row[2] || row[1] || "")
          .trim()
          .toUpperCase();
        const pkm = puskesmasList.find((p) => p.nama.toUpperCase() === pkmName);
        if (!pkm) continue;

        let colIdx = 3;
        for (const j of jenisList) {
          const terdaftar = Number(row[colIdx]) || 0;
          const diperiksa = Number(row[colIdx + 1]) || 0;
          const laikJumlah = Number(row[colIdx + 2]) || 0;
          const laikPersen = diperiksa > 0 ? (laikJumlah / diperiksa) * 100 : 0;
          colIdx += 4;

          if (terdaftar || diperiksa || laikJumlah) {
            await prisma.laporanTpp.upsert({
              where: { puskesmasId_bulan_tahun_jenisTppId: { puskesmasId: pkm.id, bulan, tahun, jenisTppId: j.id } },
              update: { terdaftar, diperiksa, laikJumlah, laikPersen },
              create: {
                puskesmasId: pkm.id,
                bulan,
                tahun,
                jenisTppId: j.id,
                terdaftar,
                diperiksa,
                laikJumlah,
                laikPersen,
              },
            });
            imported++;
          }
        }
      }
    } else if (jenis === "spal" || jenis === "jamban") {
      const kategori = jenis === "spal" ? "SPAL" : "JAMBAN";
      const jenisList = await prisma.jenisSarana.findMany({
        where: { kategori: kategori as any },
        orderBy: { urutan: "asc" },
      });
      const model = jenis === "spal" ? prisma.laporanSpal : prisma.laporanJamban;

      for (const row of rows) {
        const pkmName = String(row[2] || row[1] || "")
          .trim()
          .toUpperCase();
        const pkm = puskesmasList.find((p) => p.nama.toUpperCase() === pkmName);
        if (!pkm) continue;

        let colIdx = 3;
        for (const j of jenisList) {
          const data = {
            jumlah: Number(row[colIdx]) || 0,
            kk: Number(row[colIdx + 1]) || 0,
            pddk: Number(row[colIdx + 2]) || 0,
            diperiksaJumlah: Number(row[colIdx + 3]) || 0,
            diperiksaMs: Number(row[colIdx + 4]) || 0,
            diperiksaKk: Number(row[colIdx + 5]) || 0,
            diperiksaPddk: Number(row[colIdx + 6]) || 0,
          };
          colIdx += 7;
          if (Object.values(data).some((v) => v > 0)) {
            await (model as any).upsert({
              where: {
                puskesmasId_bulan_tahun_jenisSaranaId: { puskesmasId: pkm.id, bulan, tahun, jenisSaranaId: j.id },
              },
              update: data,
              create: { puskesmasId: pkm.id, bulan, tahun, jenisSaranaId: j.id, ...data },
            });
            imported++;
          }
        }
      }
    } else if (jenis === "ttu") {
      const jenisList = await prisma.jenisTtu.findMany({ orderBy: [{ kategori: "asc" }, { urutan: "asc" }] });
      for (const row of rows) {
        const pkmName = String(row[2] || row[1] || "")
          .trim()
          .toUpperCase();
        const pkm = puskesmasList.find((p) => p.nama.toUpperCase() === pkmName);
        if (!pkm) continue;

        let colIdx = 3;
        for (const j of jenisList) {
          const jumlahTotal = Number(row[colIdx]) || 0;
          const ms = Number(row[colIdx + 1]) || 0;
          const tms = Number(row[colIdx + 2]) || 0;
          colIdx += 3;
          if (jumlahTotal || ms || tms) {
            await prisma.laporanTtu.upsert({
              where: { puskesmasId_bulan_tahun_jenisTtuId: { puskesmasId: pkm.id, bulan, tahun, jenisTtuId: j.id } },
              update: { jumlahTotal, ms, tms },
              create: { puskesmasId: pkm.id, bulan, tahun, jenisTtuId: j.id, jumlahTotal, ms, tms },
            });
            imported++;
          }
        }
      }
    } else if (jenis === "rumah") {
      const keys = [
        "ventilasiMs",
        "ventilasiTms",
        "peneranganMs",
        "peneranganTms",
        "lantaiMs",
        "lantaiTms",
        "kepadatanHuniMs",
        "kepadatanHuniTms",
        "lubangAsapMs",
        "lubangAsapTms",
        "jambanMs",
        "jambanTms",
        "airBersihMs",
        "airBersihTms",
        "airLimbahMs",
        "airLimbahTms",
        "sampahMs",
        "sampahTms",
        "kandangMs",
        "kandangTms",
        "kandangTidakAda",
        "hasilMs",
        "hasilTms",
      ];
      for (const row of rows) {
        const pkmName = String(row[2] || row[1] || "")
          .trim()
          .toUpperCase();
        const pkm = puskesmasList.find((p) => p.nama.toUpperCase() === pkmName);
        if (!pkm) continue;

        const jumlahRumahAda = Number(row[3]) || 0;
        const jumlahDiperiksa = Number(row[4]) || 0;
        if (!jumlahRumahAda && !jumlahDiperiksa) continue;

        const data: any = { jumlahRumahAda, jumlahDiperiksa };
        let colIdx = 5;
        for (const k of keys) {
          data[k] = Number(row[colIdx]) || 0;
          colIdx++;
        }

        await prisma.laporanRumah.upsert({
          where: { puskesmasId_bulan_tahun: { puskesmasId: pkm.id, bulan, tahun } },
          update: data,
          create: { puskesmasId: pkm.id, bulan, tahun, ...data },
        });
        imported++;
      }
    } else {
      return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });
    }

    return NextResponse.json({ imported, message: `${imported} data berhasil diimport` });
  }),
  { windowMs: 60_000, max: 10 },
);
