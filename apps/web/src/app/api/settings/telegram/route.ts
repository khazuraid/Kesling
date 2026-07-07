import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { getBotInstance } from "@/lib/telegram/bot";

const KEYS = [
  "telegram_bot_token",
  "telegram_admin_chat_id",
  "telegram_dinkes_chat_id",
  "telegram_webhook_secret",
] as const;

async function getSettingMap() {
  const settings = await prisma.appSetting.findMany({ where: { key: { in: [...KEYS] } } });
  return Object.fromEntries(settings.map((s) => [s.key, s.value || ""]));
}

export const GET = withAdmin(async () => {
  const data = await getSettingMap();
  return NextResponse.json({
    telegramBotToken: data.telegram_bot_token ? "********" : "",
    hasToken: Boolean(data.telegram_bot_token),
    telegramAdminChatId: data.telegram_admin_chat_id || "",
    telegramDinkesChatId: data.telegram_dinkes_chat_id || "",
    telegramWebhookSecret: data.telegram_webhook_secret || "",
  });
});

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const entries: Array<[string, string]> = [];

  if (typeof body.telegramBotToken === "string" && body.telegramBotToken && body.telegramBotToken !== "********") {
    entries.push(["telegram_bot_token", body.telegramBotToken.trim()]);
  }
  if (typeof body.telegramAdminChatId === "string")
    entries.push(["telegram_admin_chat_id", body.telegramAdminChatId.trim()]);
  if (typeof body.telegramDinkesChatId === "string")
    entries.push(["telegram_dinkes_chat_id", body.telegramDinkesChatId.trim()]);
  if (typeof body.telegramWebhookSecret === "string")
    entries.push(["telegram_webhook_secret", body.telegramWebhookSecret.trim()]);

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});

export const PUT = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const action = body.action;
  const appUrl = String(body.appUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(
    /\/$/,
    "",
  );

  const data = await getSettingMap();
  const token = data.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Token Telegram belum diisi" }, { status: 400 });
  if (!appUrl) return NextResponse.json({ error: "URL aplikasi belum diisi" }, { status: 400 });

  const bot = await getBotInstance();
  if (!bot) return NextResponse.json({ error: "Bot belum aktif" }, { status: 400 });

  if (action === "setWebhook") {
    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    await bot.api.setWebhook(webhookUrl, { secret_token: data.telegram_webhook_secret || undefined });
    return NextResponse.json({ ok: true, webhookUrl });
  }

  if (action === "deleteWebhook") {
    await bot.api.deleteWebhook();
    return NextResponse.json({ ok: true });
  }

  if (action === "testAdmin") {
    const chatId = data.telegram_admin_chat_id;
    if (!chatId) return NextResponse.json({ error: "Admin Chat ID belum diisi" }, { status: 400 });
    await bot.api.sendMessage(chatId, "✅ Test notifikasi Telegram Kesling Cirebon berhasil.");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
});
