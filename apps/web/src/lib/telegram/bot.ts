import { prisma } from "@apps-kes/database";
import { Bot } from "grammy";

// Token cache
let botInstance: Bot | null = null;
let currentToken: string | null = null;

export async function getBotInstance() {
  try {
    // Cari token di database
    const tokenSetting = await prisma.appSetting.findUnique({
      where: { key: "telegram_bot_token" },
    });

    const dbToken = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN;

    if (!dbToken) {
      botInstance = null;
      currentToken = null;
      return null;
    }

    // Jika token berubah, buat instance baru
    if (dbToken !== currentToken || !botInstance) {
      currentToken = dbToken;
      botInstance = new Bot(dbToken);
    }

    return botInstance;
  } catch (e) {
    console.error("[Telegram] Gagal memuat instance bot:", e);
    return null;
  }
}
