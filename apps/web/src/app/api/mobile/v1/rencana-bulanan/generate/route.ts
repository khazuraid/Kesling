import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

// POST: Auto-generate rencana for all sasaran in puskesmas for given bulan/tahun
// Uses simple round-robin scheduling across working days (Sen-Sab, skip Sundays)
export async function POST(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || !user.puskesmasId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const bulan = Number(body.bulan) || new Date().getMonth() + 1;
  const tahun = Number(body.tahun) || new Date().getFullYear();
  const kapasitasPerHari = Number(body.kapasitasPerHari) || 5; // max sasaran per hari

  // Get all sasaran for this puskesmas
  const sasarans = await prisma.sasaran.findMany({
    where: { puskesmasId: user.puskesmasId },
    orderBy: { nama: "asc" },
  });

  if (!sasarans.length) {
    return NextResponse.json({ error: "Belum ada sasaran terdaftar" }, { status: 400 });
  }

  // Generate working days for this month (Sen-Sab, skip Sunday)
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const workingDays: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(tahun, bulan - 1, d);
    const dow = date.getDay();
    if (dow !== 0) workingDays.push(date); // skip Sunday
  }

  // Assign sasaran to working days, kapasitasPerHari per day
  let dayIndex = 0;
  let slotInDay = 0;
  const created: Array<{ sasaranId: number; tanggalRencana: string }> = [];

  // Use upsert to avoid duplicates — unique constraint [puskesmasId, sasaranId, bulan, tahun]
  for (const s of sasarans) {
    if (dayIndex >= workingDays.length) {
      dayIndex = 0; // wrap around if more sasaran than capacity
      slotInDay = 0;
    }
    const tanggal = workingDays[dayIndex];
    const result = await prisma.rencanaBulanan.upsert({
      where: {
        puskesmasId_sasaranId_bulan_tahun: {
          puskesmasId: user.puskesmasId,
          sasaranId: s.id,
          bulan,
          tahun,
        },
      },
      create: {
        puskesmasId: user.puskesmasId,
        sasaranId: s.id,
        bulan,
        tahun,
        tanggalRencana: tanggal,
        status: "TERJADWAL",
      },
      update: {}, // don't overwrite existing
    });
    created.push({ sasaranId: s.id, tanggalRencana: result.tanggalRencana?.toISOString() || tanggal.toISOString() });

    slotInDay++;
    if (slotInDay >= kapasitasPerHari) {
      slotInDay = 0;
      dayIndex++;
    }
  }

  // Create notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: `Rencana Bulanan ${bulan}/${tahun}`,
      message: `${created.length} sasaran dijadwalkan untuk bulan ini. Kapasitas ${kapasitasPerHari}/hari.`,
    },
  });

  return NextResponse.json({ success: true, count: created.length, bulan, tahun });
}
