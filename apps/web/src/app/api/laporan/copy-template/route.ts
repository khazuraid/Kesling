import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validations";

const copyTemplateSchema = z.object({
  jenis: z.enum(["tpp", "spal", "jamban", "ttu"]),
  puskesmasId: z.number().int().positive(),
  bulanFrom: z.number().int().min(1).max(12),
  tahunFrom: z.number().int().min(2020).max(2100),
  bulanTo: z.number().int().min(1).max(12),
  tahunTo: z.number().int().min(2020).max(2100),
});

export const POST = withAuth(async (req: NextRequest) => {
  const raw = await req.json();
  const parsed = validateBody(copyTemplateSchema, raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { jenis, puskesmasId, bulanFrom, tahunFrom, bulanTo, tahunTo } = parsed.data;

  let copied = 0;

  if (jenis === "tpp") {
    const source = await prisma.laporanTpp.findMany({ where: { puskesmasId, bulan: bulanFrom, tahun: tahunFrom } });
    for (const s of source) {
      await prisma.laporanTpp.upsert({
        where: {
          puskesmasId_bulan_tahun_jenisTppId: { puskesmasId, bulan: bulanTo, tahun: tahunTo, jenisTppId: s.jenisTppId },
        },
        update: { terdaftar: s.terdaftar, diperiksa: s.diperiksa, laikJumlah: s.laikJumlah, laikPersen: s.laikPersen },
        create: {
          puskesmasId,
          bulan: bulanTo,
          tahun: tahunTo,
          jenisTppId: s.jenisTppId,
          terdaftar: s.terdaftar,
          diperiksa: s.diperiksa,
          laikJumlah: s.laikJumlah,
          laikPersen: s.laikPersen,
        },
      });
      copied++;
    }
  } else if (jenis === "spal" || jenis === "jamban") {
    const model = jenis === "spal" ? prisma.laporanSpal : prisma.laporanJamban;
    const source = await (model as any).findMany({ where: { puskesmasId, bulan: bulanFrom, tahun: tahunFrom } });
    for (const s of source) {
      await (model as any).upsert({
        where: {
          puskesmasId_bulan_tahun_jenisSaranaId: {
            puskesmasId,
            bulan: bulanTo,
            tahun: tahunTo,
            jenisSaranaId: s.jenisSaranaId,
          },
        },
        update: {
          jumlah: s.jumlah,
          kk: s.kk,
          pddk: s.pddk,
          diperiksaJumlah: s.diperiksaJumlah,
          diperiksaMs: s.diperiksaMs,
          diperiksaKk: s.diperiksaKk,
          diperiksaPddk: s.diperiksaPddk,
        },
        create: {
          puskesmasId,
          bulan: bulanTo,
          tahun: tahunTo,
          jenisSaranaId: s.jenisSaranaId,
          jumlah: s.jumlah,
          kk: s.kk,
          pddk: s.pddk,
          diperiksaJumlah: s.diperiksaJumlah,
          diperiksaMs: s.diperiksaMs,
          diperiksaKk: s.diperiksaKk,
          diperiksaPddk: s.diperiksaPddk,
        },
      });
      copied++;
    }
  } else if (jenis === "ttu") {
    const source = await prisma.laporanTtu.findMany({ where: { puskesmasId, bulan: bulanFrom, tahun: tahunFrom } });
    for (const s of source) {
      await prisma.laporanTtu.upsert({
        where: {
          puskesmasId_bulan_tahun_jenisTtuId: { puskesmasId, bulan: bulanTo, tahun: tahunTo, jenisTtuId: s.jenisTtuId },
        },
        update: { jumlahTotal: s.jumlahTotal, ms: s.ms, tms: s.tms },
        create: {
          puskesmasId,
          bulan: bulanTo,
          tahun: tahunTo,
          jenisTtuId: s.jenisTtuId,
          jumlahTotal: s.jumlahTotal,
          ms: s.ms,
          tms: s.tms,
        },
      });
      copied++;
    }
  }

  return NextResponse.json({ copied, message: `${copied} data berhasil dicopy` });
});
