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
  // FIX: previous month calculation was wrong for January edge case
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const operators = await prisma.user.findMany({
    where: { role: "OPERATOR", puskesmasId: { not: null } },
  });

  // FIX: Check ALL active dynamic categories, not just static TPP
  const activeCategories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
  });

  let notified = 0;

  for (const op of operators) {
    if (!op.puskesmasId) continue;

    for (const cat of activeCategories) {
      const count = await prisma.dynamicLaporan.count({
        where: {
          puskesmasId: op.puskesmasId,
          categoryId: cat.id,
          bulan: prevMonth,
          tahun: prevYear,
        },
      });

      if (count === 0) {
        await prisma.notification.create({
          data: {
            userId: op.id,
            title: `Deadline Laporan ${cat.nama}`,
            message: `Laporan ${cat.nama} bulan ${prevMonth}/${prevYear} belum diinput. Segera lengkapi data.`,
          },
        });
        notified++;
      }
    }
  }

  return NextResponse.json({ notified, message: `${notified} notifikasi dikirim` });
}
