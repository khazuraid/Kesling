import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(
  withAdmin(async () => {
    const [
      puskesmas,
      jenisTpp,
      jenisSarana,
      jenisTtu,
      users,
      laporanTpp,
      laporanSpal,
      laporanSab,
      laporanRumah,
      laporanJamban,
      laporanTtu,
      // FIX: Include dynamic tables that were previously missing
      dynamicCategories,
      dynamicSubCategories,
      dynamicParameters,
      dynamicComplianceFormulas,
      dynamicLaporan,
      dynamicLaporanValues,
      dynamicTargets,
    ] = await Promise.all([
      prisma.puskesmas.findMany(),
      prisma.jenisTpp.findMany(),
      prisma.jenisSarana.findMany(),
      prisma.jenisTtu.findMany(),
      prisma.user.findMany({ select: { id: true, nama: true, email: true, role: true, puskesmasId: true } }),
      prisma.laporanTpp.findMany(),
      prisma.laporanSpal.findMany(),
      prisma.laporanSab.findMany(),
      prisma.laporanRumah.findMany(),
      prisma.laporanJamban.findMany(),
      prisma.laporanTtu.findMany(),
      prisma.dynamicCategory.findMany(),
      prisma.dynamicSubCategory.findMany(),
      prisma.dynamicParameter.findMany(),
      prisma.dynamicComplianceFormula.findMany(),
      prisma.dynamicLaporan.findMany(),
      prisma.dynamicLaporanValue.findMany(),
      prisma.dynamicTarget.findMany(),
    ]);

    const backup = {
      version: 2, // bumped version since schema changed
      exportedAt: new Date().toISOString(),
      data: {
        puskesmas,
        jenisTpp,
        jenisSarana,
        jenisTtu,
        users,
        // Static model data (legacy)
        laporanTpp,
        laporanSpal,
        laporanSab,
        laporanRumah,
        laporanJamban,
        laporanTtu,
        // Dynamic model data -- was missing, caused data loss on restore
        dynamicCategories,
        dynamicSubCategories,
        dynamicParameters,
        dynamicComplianceFormulas,
        dynamicLaporan,
        dynamicLaporanValues,
        dynamicTargets,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_kesling_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }),
  { windowMs: 60_000, max: 5 },
);
