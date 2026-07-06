import { bot } from "./bot";

/**
 * Mengirim pesan teks umum ke telegram chat ID
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: "Markdown" | "HTML" = "Markdown",
) {
  if (!bot) return false;
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: parseMode });
    return true;
  } catch (e) {
    console.error(`[Telegram] Gagal mengirim pesan ke ${chatId}:`, e);
    return false;
  }
}

/**
 * Notifikasi ke Dinkes (Dinas Kesehatan) saat ada Puskesmas menyerahkan laporan baru
 */
export async function notifyDinkesNewLaporan(params: {
  puskesmasName: string;
  bulan: string;
  tahun: number;
  categoryName: string;
}) {
  const dinkesChatId = process.env.TELEGRAM_DINKES_CHAT_ID;
  if (!dinkesChatId) return;

  const text =
    `📬 *Laporan Baru Masuk*\n\n` +
    `*Puskesmas:* ${params.puskesmasName}\n` +
    `*Kategori:* ${params.categoryName}\n` +
    `*Periode:* ${params.bulan} ${params.tahun}\n\n` +
    `Mohon segera lakukan peninjauan dan persetujuan di aplikasi.`;

  await sendTelegramMessage(dinkesChatId, text);
}

/**
 * Notifikasi ke Operator Puskesmas saat laporannya disetujui (Approved)
 */
export async function notifyOperatorLaporanApproved(params: {
  operatorChatId: string | number;
  puskesmasName: string;
  bulan: string;
  tahun: number;
  categoryName: string;
  dinkesName: string;
}) {
  const text =
    `✅ *Laporan Disetujui*\n\n` +
    `*Kategori:* ${params.categoryName}\n` +
    `*Periode:* ${params.bulan} ${params.tahun}\n` +
    `*Puskesmas:* ${params.puskesmasName}\n` +
    `*Oleh:* ${params.dinkesName}\n\n` +
    `Laporan Anda telah divalidasi dan disetujui. Terima kasih!`;

  await sendTelegramMessage(params.operatorChatId, text);
}

/**
 * Notifikasi ke Operator Puskesmas saat laporannya dikembalikan (Rejected/Returned)
 */
export async function notifyOperatorLaporanRejected(params: {
  operatorChatId: string | number;
  puskesmasName: string;
  bulan: string;
  tahun: number;
  categoryName: string;
  dinkesName: string;
  catatan: string;
}) {
  const text =
    `⚠️ *Laporan Dikembalikan*\n\n` +
    `*Kategori:* ${params.categoryName}\n` +
    `*Periode:* ${params.bulan} ${params.tahun}\n` +
    `*Puskesmas:* ${params.puskesmasName}\n` +
    `*Oleh:* ${params.dinkesName}\n` +
    `*Catatan Dinas:* _${params.catatan}_\n\n` +
    `Silakan perbaiki data laporan Anda di aplikasi sesuai dengan catatan dinas di atas.`;

  await sendTelegramMessage(params.operatorChatId, text);
}

/**
 * Notifikasi ke Admin (Developer/IT) saat sistem mendeteksi error fatal
 */
export async function notifyAdminSystemError(params: { message: string; path: string; email?: string | null }) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) return;

  const text =
    `🚨 *SISTEM ERROR / BUG DETECTED*\n\n` +
    `*Path:* \`${params.path}\`\n` +
    `*User:* \`${params.email || "Guest"}\`\n` +
    `*Pesan Error:* \`${params.message}\`\n\n` +
    `Detail error selengkapnya dapat dicek di dashboard admin menu *Error Logs*.`;

  await sendTelegramMessage(adminChatId, text);
}
