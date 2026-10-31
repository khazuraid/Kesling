import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { cacheInvalidate } from "@/lib/redis";
import { getCurrentUser } from "@/lib/session";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const testTelegram = Boolean(body.testTelegram);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 1. Buat Notifikasi In-App di Database
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Uji Coba Notifikasi Berhasil! 🔔",
      message: `Fitur notifikasi in-app aktif dan terhubung ke akun Anda (${timeStr}). Seluruh alert approval, laporan, dan inspeksi siap diterima.`,
    },
  });

  // Invalidate cache count
  await cacheInvalidate(`notif:count:${user.id}`).catch(() => null);

  // 2. Opsional test Telegram jika diminta & user memiliki chatId atau admin chatId
  let telegramSent = false;
  if (testTelegram) {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { telegramChatId: true },
    });

    const targetChatId = fullUser?.telegramChatId;
    if (targetChatId) {
      telegramSent = await sendTelegramMessage(
        targetChatId,
        `🔔 *Uji Coba Notifikasi Telegram Kesling*\n\nHalo *${user.name || "Pengguna"}*! Notifikasi Telegram Anda aktif dan siap menerima update laporan serta approval (${timeStr}).`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    notification,
    telegramSent,
  });
}
