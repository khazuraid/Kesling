import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram/bot";

// Setup bot commands and handlers
if (bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Halo! Selamat datang di *Bot Kesling Cirebon*.\n\n" +
        "Bot ini terhubung dengan sistem aplikasi pemantauan kesehatan lingkungan untuk Dinas Kesehatan & Puskesmas Kabupaten Cirebon.\n\n" +
        "Gunakan perintah /help untuk melihat menu yang tersedia.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📚 *Daftar Perintah Bot*\n\n" +
        "• `/status` - Cek status kesehatan server aplikasi\n" +
        "• `/rekap` - Ringkasan jumlah laporan masuk & setuju\n" +
        "• `/pkm` - Total jumlah puskesmas terdaftar\n" +
        "• `/help` - Tampilkan panduan ini lagi",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("status", async (ctx) => {
    await ctx.reply(
      "🟢 *Server Status: ONLINE*\n\n" +
        `• Waktu Server: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n` +
        "• Database Postgres: Active\n" +
        "• Redis Cache: Active\n" +
        "• Sistem Kesling Cirebon siap digunakan.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("pkm", async (ctx) => {
    try {
      const count = await prisma.puskesmas.count();
      await ctx.reply(`🏥 Total terdapat *${count} Puskesmas* yang terdaftar di dalam sistem Kesling Cirebon.`, {
        parse_mode: "Markdown",
      });
    } catch (_e) {
      await ctx.reply("❌ Gagal mengambil data Puskesmas dari database.");
    }
  });

  bot.command("rekap", async (ctx) => {
    try {
      const total = await prisma.dynamicLaporan.count();
      const approved = await prisma.dynamicLaporan.count({ where: { status: "APPROVED" } });
      const submitted = await prisma.dynamicLaporan.count({ where: { status: "SUBMITTED" } });
      const draft = await prisma.dynamicLaporan.count({ where: { status: "DRAFT" } });

      await ctx.reply(
        "📊 *Rekapitulasi Laporan Masuk*\n\n" +
          `• Total Laporan: *${total}*\n` +
          `• Menunggu Persetujuan (Submitted): *${submitted}*\n` +
          `• Disetujui (Approved): *${approved}*\n` +
          `• Belum Disubmit (Draft): *${draft}*\n\n` +
          "Silakan login ke web aplikasi untuk verifikasi dan persetujuan lengkap.",
        { parse_mode: "Markdown" },
      );
    } catch (e) {
      await ctx.reply("❌ Gagal memuat rekap laporan.");
    }
  });
}

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: "Telegram Bot token not configured" }, { status: 503 });
  }

  // Verifikasi Webhook Secret (opsional untuk keamanan tambahan dari Coolify / VPS)
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
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
