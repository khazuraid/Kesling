import { prisma, type Role } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export const POST = withAdmin(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const {
      title,
      message,
      targetType = "ALL", // "ALL" | "ROLE" | "PUSKESMAS" | "USER"
      targetRole,
      puskesmasId,
      userId,
      sendTelegram = false,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Judul dan pesan wajib diisi." }, { status: 400 });
    }

    // Bangun filter penerima
    const whereClause: any = {};

    if (targetType === "ROLE" && targetRole) {
      whereClause.role = targetRole as Role;
    } else if (targetType === "PUSKESMAS" && puskesmasId) {
      whereClause.puskesmasId = Number(puskesmasId);
    } else if (targetType === "USER" && userId) {
      whereClause.id = Number(userId);
    }

    const recipients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        nama: true,
        role: true,
        telegramChatId: true,
      },
    });

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Tidak ada pengguna yang cocok dengan target ini." }, { status: 400 });
    }

    // 1. Simpan in-app notifications
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        title: title.trim(),
        message: message.trim(),
      })),
    });

    // 2. Kirim telegram jika diminta
    let telegramSent = 0;
    let telegramFailed = 0;

    if (sendTelegram) {
      const telegramText = `📢 *${title.trim()}*\n\n${message.trim()}\n\n_Dikirim oleh Admin via Kesling Core_`;

      // Kumpulkan chatId unik
      const targetChatIds = new Set<string>();
      for (const r of recipients) {
        if (r.telegramChatId) {
          targetChatIds.add(r.telegramChatId);
        }
      }

      // Jika target mencakup DINKES atau ALL, sertakan juga chat grup Dinkes jika disetel di setting
      if (targetType === "ALL" || (targetType === "ROLE" && targetRole === "DINKES")) {
        const dinkesSetting = await prisma.appSetting.findUnique({
          where: { key: "telegram_dinkes_chat_id" },
        });
        if (dinkesSetting?.value) {
          targetChatIds.add(dinkesSetting.value);
        }
      }

      if (targetChatIds.size > 0) {
        const results = await Promise.allSettled(
          Array.from(targetChatIds).map((chatId) => sendTelegramMessage(chatId, telegramText)),
        );
        for (const res of results) {
          if (res.status === "fulfilled" && res.value) {
            telegramSent++;
          } else {
            telegramFailed++;
          }
        }
      }
    }

    // Catat ke audit log
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "notification_broadcast",
      recordId: recipients[0]?.id || 0,
      newData: {
        title,
        targetType,
        recipientCount: recipients.length,
        telegramSent,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
      telegramSent,
      telegramFailed,
    });
  } catch (error) {
    console.error("[Broadcast Notification] Error:", error);
    return NextResponse.json({ error: "Gagal menyiarkan notifikasi." }, { status: 500 });
  }
});
