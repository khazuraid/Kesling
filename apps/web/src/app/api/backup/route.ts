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
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
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
