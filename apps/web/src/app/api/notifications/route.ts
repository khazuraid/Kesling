import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 10));
  const filter = sp.get("filter") || "all";

  const where: any = { userId: user.id };
  if (filter === "unread") {
    where.isRead = false;
  }

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    unreadCount,
  });
}

// FIX: PATCH sekarang ada auth check + ownership check
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Mark single notification as read / toggle
  if (body.id) {
    const notif = await prisma.notification.findUnique({ where: { id: body.id } });
    if (!notif) return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    if (notif.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const isRead = typeof body.isRead === "boolean" ? body.isRead : true;
    await prisma.notification.update({ where: { id: body.id }, data: { isRead } });
    return NextResponse.json({ ok: true });
  }

  // Mark all as read (readAll: true)
  if (body.readAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "id atau readAll diperlukan" }, { status: 400 });
}

// DELETE -- hapus notifikasi: single id (query ?id=) atau semua
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const id = Number(sp.get("id"));

  if (id) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    if (notif.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  await prisma.notification.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
