import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const data = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(data);
}

// FIX: PATCH sekarang ada auth check + ownership check
// Sebelumnya: tidak ada auth, siapapun bisa mark notification orang lain sebagai read
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Mark single notification as read
  if (body.id) {
    const notif = await prisma.notification.findUnique({ where: { id: body.id } });
    if (!notif) return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    if (notif.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.notification.update({ where: { id: body.id }, data: { isRead: true } });
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

// DELETE -- hapus semua notifikasi milik user
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
