import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

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

// GET rencana tahunan — 12 bulan + triwulan + semester, derived dari rencanaBulanan + inspeksi
export const GET = withAuth(async (req: NextRequest) => {
  const user = (req as unknown as { user: { id: number; role: string; puskesmasId: number | null } }).user;
  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear();
  const puskesmasId =
    user.role === "OPERATOR"
      ? user.puskesmasId
      : sp.get("puskesmasId")
        ? Number(sp.get("puskesmasId"))
        : user.puskesmasId;
  if (!puskesmasId) return NextResponse.json({ error: "Tidak ada puskesmas" }, { status: 400 });

  const totalSasaran = await prisma.sasaran.count({ where: { puskesmasId } });
  const rencanas = await prisma.rencanaBulanan.findMany({
    where: { puskesmasId, tahun },
    select: { id: true, bulan: true, status: true, sasaranId: true },
  });
  const inspections = await prisma.inspectionResult.findMany({
    where: { puskesmasId, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    select: { id: true, bulan: true, sasaranId: true },
  });

  const months = BULAN_NAMES.map((nama, i) => {
    const bulan = i + 1;
    const terjadwal = rencanas.filter((r) => r.bulan === bulan).length;
    const selesai = inspections.filter((r) => r.bulan === bulan).length;
    const dilewati = rencanas.filter((r) => r.bulan === bulan && r.status === "DILEWATI").length;
    return {
      bulan,
      nama,
      totalSasaran,
      terjadwal,
      selesai,
      dilewati,
      belum: Math.max(0, totalSasaran - selesai),
      progress: totalSasaran > 0 ? Math.round((selesai / totalSasaran) * 100) : 0,
    };
  });

  const triwulan = [
    { label: "Triwulan I", bulans: [1, 2, 3] },
    { label: "Triwulan II", bulans: [4, 5, 6] },
    { label: "Triwulan III", bulans: [7, 8, 9] },
    { label: "Triwulan IV", bulans: [10, 11, 12] },
  ].map((t) => {
    const selesai = inspections.filter((r) => t.bulans.includes(r.bulan)).length;
    const target = totalSasaran * 3;
    return { label: t.label, selesai, target, progress: target > 0 ? Math.round((selesai / target) * 100) : 0 };
  });

  const semester = [
    { label: "Semester I", bulans: [1, 2, 3, 4, 5, 6] },
    { label: "Semester II", bulans: [7, 8, 9, 10, 11, 12] },
  ].map((s) => {
    const selesai = inspections.filter((r) => s.bulans.includes(r.bulan)).length;
    const target = totalSasaran * 6;
    return { label: s.label, selesai, target, progress: target > 0 ? Math.round((selesai / target) * 100) : 0 };
  });

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
});
