import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pkmId = Number(req.nextUrl.searchParams.get("puskesmasId")) || user.puskesmasId;
  if (!pkmId) return NextResponse.json({ error: "No puskesmas" }, { status: 400 });

  const bulan = Number(req.nextUrl.searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const where = { puskesmasId: pkmId, bulan, tahun };

  const [tpp, spal, sab, rumah, jamban, ttu, puskesmas] = await Promise.all([
    prisma.laporanTpp.findMany({ where, include: { jenisTpp: true } }),
    prisma.laporanSpal.findMany({ where, include: { jenisSarana: true } }),
    prisma.laporanSab.findMany({ where, include: { jenisSarana: true } }),
    prisma.laporanRumah.findMany({ where: { puskesmasId: pkmId, bulan, tahun } }),
    prisma.laporanJamban.findMany({ where, include: { jenisSarana: true } }),
    prisma.laporanTtu.findMany({ where, include: { jenisTtu: true } }),
    prisma.puskesmas.findUnique({ where: { id: pkmId } }),
  ]);

  return NextResponse.json({ puskesmas, tpp, spal, sab, rumah, jamban, ttu });
}
