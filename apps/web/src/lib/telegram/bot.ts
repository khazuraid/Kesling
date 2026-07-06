import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn("[Telegram] TELEGRAM_BOT_TOKEN tidak diset. Bot tidak aktif.");
}

export const bot = token ? new Bot(token) : null;
