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

import { createHmac } from "crypto";

export async function validateTelegramInitData(initData: string): Promise<{
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
} | null> {
  try {
    const bot = await getBotInstance();
    const token = bot?.token || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
    const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      console.warn("[Telegram Auth] Hash mismatch");
      return null;
    }

    const userRaw = params.get("user");
    if (!userRaw) return null;

    return JSON.parse(userRaw);
  } catch (e) {
    console.error("[Telegram Auth] Gagal memvalidasi initData:", e);
    return null;
  }
}
