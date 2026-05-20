import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAdmin(async (req: NextRequest) => {
    const backup = await req.json();

    if (!backup?.version || !backup?.data) {
      return NextResponse.json({ error: "Format backup tidak valid" }, { status: 400 });
    }

    const {
      puskesmas,
      jenisTpp,
      jenisSarana,
      jenisTtu,
      laporanTpp,
      laporanSpal,
      laporanSab,
      laporanRumah,
      laporanJamban,
      laporanTtu,
    } = backup.data;

    await prisma.$transaction(
      async (tx) => {
        for (const p of puskesmas || []) {
          await tx.puskesmas.upsert({ where: { id: p.id }, update: { nama: p.nama, urutan: p.urutan }, create: p });
        }
        for (const j of jenisTpp || []) {
          await tx.jenisTpp.upsert({ where: { id: j.id }, update: { nama: j.nama, urutan: j.urutan }, create: j });
        }
        for (const j of jenisSarana || []) {
          await tx.jenisSarana.upsert({
            where: { id: j.id },
            update: { nama: j.nama, kategori: j.kategori, urutan: j.urutan },
            create: j,
          });
        }
        for (const j of jenisTtu || []) {
          await tx.jenisTtu.upsert({
            where: { id: j.id },
            update: { nama: j.nama, kategori: j.kategori, urutan: j.urutan },
            create: j,
          });
        }
        for (const d of laporanTpp || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanTpp.upsert({
            where: {
              puskesmasId_bulan_tahun_jenisTppId: {
                puskesmasId: d.puskesmasId,
                bulan: d.bulan,
                tahun: d.tahun,
                jenisTppId: d.jenisTppId,
              },
            },
            update: rest,
            create: rest,
          });
        }
        for (const d of laporanSpal || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanSpal.upsert({
            where: {
              puskesmasId_bulan_tahun_jenisSaranaId: {
                puskesmasId: d.puskesmasId,
                bulan: d.bulan,
                tahun: d.tahun,
                jenisSaranaId: d.jenisSaranaId,
              },
            },
            update: rest,
            create: rest,
          });
        }
        for (const d of laporanSab || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanSab.upsert({
            where: {
              puskesmasId_bulan_tahun_jenisSaranaId: {
                puskesmasId: d.puskesmasId,
                bulan: d.bulan,
                tahun: d.tahun,
                jenisSaranaId: d.jenisSaranaId,
              },
            },
            update: rest,
            create: rest,
          });
        }
        for (const d of laporanRumah || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanRumah.upsert({
            where: { puskesmasId_bulan_tahun: { puskesmasId: d.puskesmasId, bulan: d.bulan, tahun: d.tahun } },
            update: rest,
            create: rest,
          });
        }
        for (const d of laporanJamban || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanJamban.upsert({
            where: {
              puskesmasId_bulan_tahun_jenisSaranaId: {
                puskesmasId: d.puskesmasId,
                bulan: d.bulan,
                tahun: d.tahun,
                jenisSaranaId: d.jenisSaranaId,
              },
            },
            update: rest,
            create: rest,
          });
        }
        for (const d of laporanTtu || []) {
          const { id, createdAt, updatedAt, ...rest } = d;
          await tx.laporanTtu.upsert({
            where: {
              puskesmasId_bulan_tahun_jenisTtuId: {
                puskesmasId: d.puskesmasId,
                bulan: d.bulan,
                tahun: d.tahun,
                jenisTtuId: d.jenisTtuId,
              },
            },
            update: rest,
            create: rest,
          });
        }
      },
      { timeout: 60000 },
    );

    return NextResponse.json({ message: "Restore berhasil" });
  }),
  { windowMs: 60_000, max: 3 },
);
