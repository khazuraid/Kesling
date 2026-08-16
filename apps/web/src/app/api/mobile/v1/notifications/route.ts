import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLibur } from "@/lib/libur";
import { getMobileUser } from "@/lib/mobile-auth";

// GET notifications for current user
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const onlyUnread = sp.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(onlyUnread ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  // Hari libur mendatang (7 hari ke depan) untuk peringatan
  const now = new Date();
  const year = now.getFullYear();
  const allLibur = await getLibur(year);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const liburMendatang = allLibur
    .filter((l) => {
      const d = new Date(l.tanggal + "T00:00:00");
      return d >= now && d <= in7Days;
    })
    .map((l) => ({
      tanggal: l.tanggal,
      keterangan: l.keterangan,
      sumber: l.sumber,
      hari: new Date(l.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    }));

  // Deadline rencana bulanan: belum SELESAI, tanggalRencana lewat atau ≤3 hari lagi
  let deadlineRencana: { id: number; tanggal: string; sasaranNama: string }[] = [];
  if (user.role === "OPERATOR" && user.puskesmasId) {
    const now2 = new Date();
    const in3Days = new Date(now2.getTime() + 3 * 24 * 60 * 60 * 1000);
    const rencana = await prisma.rencanaBulanan.findMany({
      where: {
        puskesmasId: user.puskesmasId,
        bulan: now2.getMonth() + 1,
        tahun: now2.getFullYear(),
        status: { not: "SELESAI" },
        tanggalRencana: { not: null, lte: in3Days },
      },
      orderBy: { tanggalRencana: "asc" },
      take: 10,
    });
    const sasaranIds = Array.from(new Set(rencana.map((r) => r.sasaranId)));
    const sasarans = await prisma.sasaran.findMany({
      where: { id: { in: sasaranIds } },
      select: { id: true, nama: true },
    });
    const namaById = new Map(sasarans.map((s) => [s.id, s.nama]));
    deadlineRencana = rencana.map((r) => ({
      id: r.id,
      tanggal: (r.tanggalRencana as Date).toISOString().slice(0, 10),
      sasaranNama: namaById.get(r.sasaranId) || "Sasaran",
    }));
  }

  // Deadline laporan bulanan: tanggal ≤ 10 bulan ini & laporan bulan lalu belum FINAL (APPROVED)
  let deadlineLaporan: { categoryId: number; nama: string; bulan: number; tahun: number }[] = [];
  if (user.puskesmasId && now.getDate() <= 10) {
    const bulanLalu = now.getMonth() === 0 ? 12 : now.getMonth(); // bulan sebelumnya (1-12)
    const tahunLalu = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const cats = await prisma.dynamicCategory.findMany({ select: { id: true, nama: true }, take: 20 });
    const sudah = await prisma.dynamicLaporan.findMany({
      where: { puskesmasId: user.puskesmasId, bulan: bulanLalu, tahun: tahunLalu, status: "APPROVED" },
      select: { categoryId: true },
    });
    const okIds = new Set(sudah.map((l) => l.categoryId));
    deadlineLaporan = cats
      .filter((c) => !okIds.has(c.id))
      .slice(0, 5)
      .map((c) => ({ categoryId: c.id, nama: c.nama, bulan: bulanLalu, tahun: tahunLalu }));
  }

  return NextResponse.json({ notifications, unreadCount, liburMendatang, deadlineRencana, deadlineLaporan });
}

// PUT mark as read (single or all)
export async function PUT(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
