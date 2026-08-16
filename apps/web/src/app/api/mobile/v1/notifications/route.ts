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

  return NextResponse.json({ notifications, unreadCount, liburMendatang });
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
