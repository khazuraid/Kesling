import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getBotInstance } from "@/lib/telegram/bot";

async function setupCommands() {
  const bot = await getBotInstance();
  if (!bot) return;

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Halo! Selamat datang di *Bot Kesling Cirebon*.\n\n" +
        "Bot ini terhubung dengan sistem aplikasi pemantauan kesehatan lingkungan.\n\n" +
        "Gunakan perintah /help untuk melihat menu yang tersedia.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📚 *Daftar Perintah Bot*\n\n" +
        "• `/status` - Cek status server aplikasi\n" +
        "• `/rekap` - Ringkasan laporan masuk & setuju\n" +
        "• `/pkm` - Total puskesmas terdaftar\n" +
        "• `/help` - Tampilkan panduan ini",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("status", async (ctx) => {
    await ctx.reply(
      "🟢 *Server Status: ONLINE*\n\n" +
        `• Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n` +
        "• Database: Active\n" +
        "• Sistem Kesling Cirebon siap digunakan.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("pkm", async (ctx) => {
    try {
      const count = await prisma.puskesmas.count();
      await ctx.reply(`🏥 Total *${count} Puskesmas* terdaftar di sistem Kesling Cirebon.`, {
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply("❌ Gagal mengambil data Puskesmas.");
    }
  });

  bot.command("rekap", async (ctx) => {
    try {
      const total = await prisma.dynamicLaporan.count();
      const approved = await prisma.dynamicLaporan.count({ where: { status: "APPROVED" } });
      const submitted = await prisma.dynamicLaporan.count({ where: { status: "SUBMITTED" } });
      const draft = await prisma.dynamicLaporan.count({ where: { status: "DRAFT" } });

      await ctx.reply(
        "📊 *Rekapitulasi Laporan*\n\n" +
          `• Total: *${total}*\n` +
          `• Menunggu Persetujuan: *${submitted}*\n` +
          `• Disetujui: *${approved}*\n` +
          `• Draft: *${draft}*`,
        { parse_mode: "Markdown" },
      );
    } catch {
      await ctx.reply("❌ Gagal memuat rekap laporan.");
    }
  });
}

// Setup commands sekali saat modul diload
setupCommands();

export async function POST(req: NextRequest) {
  const bot = await getBotInstance();
  if (!bot) {
    return NextResponse.json({ error: "Bot Telegram belum dikonfigurasi" }, { status: 503 });
  }

  // Verifikasi secret token
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const storedSecret = await prisma.appSetting.findUnique({ where: { key: "telegram_webhook_secret" } });
  const expectedSecret = storedSecret?.value || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await req.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    console.error("[Telegram Webhook Error]", e);
    return NextResponse.json({ error: "Failed to process update" }, { status: 500 });
  }
}
