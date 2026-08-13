import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

const BULAN_NAMES = [
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

// GET rencana tahunan — 12 bulan overview, derived from rencanaBulanan + actual inspections
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || !user.puskesmasId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear();

  // Get all sasaran count
  const totalSasaran = await prisma.sasaran.count({ where: { puskesmasId: user.puskesmasId } });

  // Get all rencana for this year
  const rencanas = await prisma.rencanaBulanan.findMany({
    where: { puskesmasId: user.puskesmasId, tahun },
    select: { id: true, bulan: true, status: true, sasaranId: true },
  });

  // Get all actual inspections for this year
  const inspections = await prisma.inspectionResult.findMany({
    where: { puskesmasId: user.puskesmasId, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    select: { id: true, bulan: true, sasaranId: true },
  });

  // Build 12-month overview
  const months = BULAN_NAMES.map((nama, i) => {
    const bulan = i + 1;
    const rencanaCount = rencanas.filter((r) => r.bulan === bulan).length;
    const selesaiCount = inspections.filter((r) => r.bulan === bulan).length;
    const terjadwalCount = rencanas.filter((r) => r.bulan === bulan && r.status === "TERJADWAL").length;
    const dilewatiCount = rencanas.filter((r) => r.bulan === bulan && r.status === "DILEWATI").length;
    return {
      bulan,
      nama,
      totalSasaran,
      terjadwal: rencanaCount,
      selesai: selesaiCount,
      dilewati: dilewatiCount,
      belum: Math.max(0, totalSasaran - selesaiCount),
      progress: totalSasaran > 0 ? Math.round((selesaiCount / totalSasaran) * 100) : 0,
    };
  });

  // Triwulan
  const triwulan = [
    { label: "Triwulan I", bulans: [1, 2, 3] },
    { label: "Triwulan II", bulans: [4, 5, 6] },
    { label: "Triwulan III", bulans: [7, 8, 9] },
    { label: "Triwulan IV", bulans: [10, 11, 12] },
  ].map((t) => {
    const selesai = inspections.filter((r) => t.bulans.includes(r.bulan)).length;
    const target = totalSasaran * 3;
    return {
      label: t.label,
      selesai,
      target,
      progress: target > 0 ? Math.round((selesai / target) * 100) : 0,
    };
  });

  // Semester
  const semester = [
    { label: "Semester I", bulans: [1, 2, 3, 4, 5, 6] },
    { label: "Semester II", bulans: [7, 8, 9, 10, 11, 12] },
  ].map((s) => {
    const selesai = inspections.filter((r) => s.bulans.includes(r.bulan)).length;
    const target = totalSasaran * 6;
    return {
      label: s.label,
      selesai,
      target,
      progress: target > 0 ? Math.round((selesai / target) * 100) : 0,
    };
  });

  // Tahunan
  const totalSelesai = inspections.length;
  const totalTarget = totalSasaran * 12;

  return NextResponse.json({
    tahun,
    totalSasaran,
    totalSelesai,
    totalTarget,
    progressTahunan: totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0,
    months,
    triwulan,
    semester,
  });
}
