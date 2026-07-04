import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAdmin(async (req: NextRequest) => {
    const userId = (req as any).user?.id;
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
      // FIX: Include dynamic model data for restore
      dynamicCategories,
      dynamicSubCategories,
      dynamicParameters,
      dynamicComplianceFormulas,
      dynamicLaporan,
      dynamicLaporanValues,
      dynamicTargets,
    } = backup.data;

    await prisma.$transaction(
      async (tx) => {
        // Static models (legacy)
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

        // FIX: Restore dynamic model data -- previously missing, causing data loss
        // Must restore in correct order: Category -> SubCategory/Parameter -> Formula -> Laporan -> Values -> Targets
        for (const c of dynamicCategories || []) {
          const { id, createdAt, updatedAt, ...rest } = c;
          await tx.dynamicCategory.upsert({
            where: { id: c.id },
            update: rest,
            create: { id: c.id, ...rest },
          });
        }
        for (const s of dynamicSubCategories || []) {
          const { id, createdAt, updatedAt, ...rest } = s;
          await tx.dynamicSubCategory.upsert({
            where: { id: s.id },
            update: rest,
            create: { id: s.id, ...rest },
          });
        }
        for (const p of dynamicParameters || []) {
          const { id, createdAt, updatedAt, ...rest } = p;
          await tx.dynamicParameter.upsert({
            where: { id: p.id },
            update: rest,
            create: { id: p.id, ...rest },
          });
        }
        for (const f of dynamicComplianceFormulas || []) {
          const { id, createdAt, updatedAt, ...rest } = f;
          await tx.dynamicComplianceFormula.upsert({
            where: { id: f.id },
            update: rest,
            create: { id: f.id, ...rest },
          });
        }
        for (const l of dynamicLaporan || []) {
          const { id, createdAt, updatedAt, ...rest } = l;
          await tx.dynamicLaporan.upsert({
            where: {
              puskesmasId_categoryId_bulan_tahun: {
                puskesmasId: l.puskesmasId,
                categoryId: l.categoryId,
                bulan: l.bulan,
                tahun: l.tahun,
              },
            },
            update: rest,
            create: { id: l.id, ...rest },
          });
        }
        for (const v of dynamicLaporanValues || []) {
          const { id, createdAt, updatedAt, ...rest } = v;
          await tx.dynamicLaporanValue.upsert({
            where: { id: v.id },
            update: rest,
            create: { id: v.id, ...rest },
          });
        }
        for (const t of dynamicTargets || []) {
          const { id, createdAt, updatedAt, ...rest } = t;
          await tx.dynamicTarget.upsert({
            where: { id: t.id },
            update: rest,
            create: { id: t.id, ...rest },
          });
        }
      },
      { timeout: 60000 },
    );

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        tableName: "system_restore",
        recordId: 0,
        newData: { action: "restore", version: backup.version },
      },
    });

    return NextResponse.json({ message: "Restore berhasil" });
  }),
  { windowMs: 60_000, max: 3 },
);
