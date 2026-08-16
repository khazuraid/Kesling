import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getLibur, isLibur } from "@/lib/libur";

// POST: auto-generate rencana (kan operator & admin utk bulan)
export const POST = withAuth(async (req: NextRequest) => {
  const user = (req as unknown as { user: { id: number; role: string; puskesmasId: number | null } }).user;
  const body = await req.json().catch(() => ({}));
  const bulan = Number(body.bulan) || new Date().getMonth() + 1;
  const tahun = Number(body.tahun) || new Date().getFullYear();
  const kapasitasPerHari = Number(body.kapasitasPerHari) || 5;
  const puskesmasId =
    user.role === "OPERATOR" ? user.puskesmasId : body.puskesmasId ? Number(body.puskesmasId) : user.puskesmasId;
  if (!puskesmasId) return NextResponse.json({ error: "Tidak ada puskesmas" }, { status: 400 });

  const sasarans = await prisma.sasaran.findMany({ where: { puskesmasId }, orderBy: { nama: "asc" } });
  if (!sasarans.length) return NextResponse.json({ error: "Belum ada sasaran terdaftar" }, { status: 400 });

  // Ambil hari libur (Minggu + nasional + custom)
  const libur = await getLibur(tahun);
  const liburSet = new Set(libur.map((l) => l.tanggal));

  // Kumpulkan hari kerja (Sen–Sab, bukan libur)
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const workingDays: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(tahun, bulan - 1, d);
    if (date.getDay() !== 0 && !isLibur(date, liburSet)) workingDays.push(date);
  }
  if (!workingDays.length) return NextResponse.json({ error: "Tidak ada hari kerja di bulan ini" }, { status: 400 });

  let dayIndex = 0,
    slotInDay = 0;
  for (const s of sasarans) {
    if (dayIndex >= workingDays.length) {
      dayIndex = 0;
      slotInDay = 0;
    }
    const tanggal = workingDays[dayIndex];
    await prisma.rencanaBulanan.upsert({
      where: { puskesmasId_sasaranId_bulan_tahun: { puskesmasId, sasaranId: s.id, bulan, tahun } },
      create: { puskesmasId, sasaranId: s.id, bulan, tahun, tanggalRencana: tanggal, status: "TERJADWAL" },
      update: {},
    });
    slotInDay++;
    if (slotInDay >= kapasitasPerHari) {
      slotInDay = 0;
      dayIndex++;
    }
  }

  return NextResponse.json({ success: true, count: sasarans.length, bulan, tahun, hariKerja: workingDays.length });
});
