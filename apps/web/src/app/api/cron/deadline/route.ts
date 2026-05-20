import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";

// Call this endpoint via cron (e.g., every 1st of month)
// Coolify: add scheduled job hitting /api/cron/deadline
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== (process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const _puskesmasList = await prisma.puskesmas.findMany();
  const operators = await prisma.user.findMany({ where: { role: "OPERATOR", puskesmasId: { not: null } } });

  let notified = 0;

  for (const op of operators) {
    // Check if puskesmas has submitted TPP for previous month
    const count = await prisma.laporanTpp.count({
      where: { puskesmasId: op.puskesmasId ?? 0, bulan: prevMonth, tahun: prevYear },
    });

    if (count === 0) {
      await prisma.notification.create({
        data: {
          userId: op.id,
          title: "Deadline Laporan",
          message: `Laporan bulan ${prevMonth}/${prevYear} belum diinput. Segera lengkapi data.`,
        },
      });
      notified++;
    }
  }

  return NextResponse.json({ notified, message: `${notified} notifikasi dikirim` });
}
