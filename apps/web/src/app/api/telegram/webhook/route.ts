import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { type Bot, InlineKeyboard } from "grammy";
import { type NextRequest, NextResponse } from "next/server";
import { getBotInstance } from "@/lib/telegram/bot";

type TelegramBot = Bot;

let handlersReadyForToken: string | null = null;

function escapeMd(value: unknown) {
  return String(value ?? "-").replace(/([_*`[])/g, "\\$1");
}

async function getSetting(key: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value || null;
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function deleteSetting(key: string) {
  await prisma.appSetting.deleteMany({ where: { key } });
}

function loginStateKey(telegramUserId: number | string) {
  return `telegram_login_state:${telegramUserId}`;
}

async function getLinkedUser(telegramUserId: number | string) {
  return prisma.user.findUnique({
    where: { telegramUserId: String(telegramUserId) },
    include: { puskesmas: { select: { nama: true } } },
  });
}

function mainMenuKeyboard(role?: string) {
  const kb = new InlineKeyboard();

  if (role === "OPERATOR") {
    kb.text("📝 Laporan", "menu:laporan").text("🔍 Inspeksi", "menu:inspeksi").row();
    kb.text("📍 Data Dasar", "menu:data-dasar").text("📊 Status", "menu:status").row();
    kb.text("🔔 Notifikasi", "menu:notifikasi").text("👤 Akun", "menu:akun");
    return kb;
  }

  if (role === "DINKES") {
    kb.text("✅ Approval", "menu:approval").text("📊 Rekap", "menu:rekap").row();
    kb.text("🔍 Monitoring", "menu:monitoring").text("⚠️ Temuan Kritis", "menu:temuan").row();
    kb.text("📈 Perbandingan", "menu:perbandingan").text("📣 Broadcast", "menu:broadcast").row();
    kb.text("👤 Akun", "menu:akun");
    return kb;
  }

  if (role === "ADMIN") {
    kb.text("🚨 Error Logs", "menu:error-logs").text("🛡️ Security Logs", "menu:security-logs").row();
    kb.text("👥 User Telegram", "menu:user-telegram").text("⚙️ Bot Settings", "menu:bot-settings").row();
    kb.text("📡 Webhook", "menu:webhook").text("🧪 Test", "menu:test").row();
    kb.text("👤 Akun", "menu:akun");
    return kb;
  }

  return new InlineKeyboard().text("🔐 Login / Pairing Akun", "auth:login").row().text("ℹ️ Bantuan", "menu:help");
}

async function renderHome(ctx: any, edit = false) {
  const tgUser = ctx.from;
  const user = tgUser?.id ? await getLinkedUser(tgUser.id) : null;

  const text = user
    ? `🏥 *Kesling Cirebon*\n\n` +
      `Selamat datang, *${escapeMd(user.nama)}*.\n` +
      `Role: *${escapeMd(user.role)}*\n` +
      `Puskesmas: *${escapeMd(user.puskesmas?.nama || "Dinas/Admin")}*\n\n` +
      `Pilih aktivitas:`
    : `🏥 *Kesling Cirebon*\n\n` +
      `Akun Telegram Anda belum terhubung.\n\n` +
      `Silakan login/pairing akun Kesling terlebih dahulu untuk membuka menu sesuai role.`;

  const options = { parse_mode: "Markdown" as const, reply_markup: mainMenuKeyboard(user?.role) };
  if (edit && ctx.callbackQuery?.message) {
    await ctx.editMessageText(text, options).catch(() => ctx.reply(text, options));
  } else {
    await ctx.reply(text, options);
  }
}

async function showAccount(ctx: any) {
  const user = await getLinkedUser(ctx.from.id);
  if (!user) return renderHome(ctx, true);

  await ctx.editMessageText(
    `👤 *Akun Terhubung*\n\n` +
      `Nama: *${escapeMd(user.nama)}*\n` +
      `Email: \`${escapeMd(user.email)}\`\n` +
      `Role: *${escapeMd(user.role)}*\n` +
      `Telegram: @${escapeMd(user.telegramUsername || ctx.from.username || "-")}\n\n` +
      `Jika ingin memutus akses bot dari akun ini, tekan logout.`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("🚪 Logout", "auth:logout_confirm").row().text("🏠 Menu", "menu:home"),
    },
  );
}

async function beginLogin(ctx: any) {
  await upsertSetting(loginStateKey(ctx.from.id), JSON.stringify({ step: "email" }));
  await ctx.reply(
    `🔐 *Login / Pairing Akun*\n\n` + `Masukkan email akun Kesling Anda.\n\n` + `Ketik /cancel untuk membatalkan.`,
    { parse_mode: "Markdown" },
  );
}

async function handleLoginMessage(ctx: any) {
  const tgUser = ctx.from;
  const text = ctx.message?.text?.trim();
  if (!tgUser?.id || !text) return false;

  const stateRaw = await getSetting(loginStateKey(tgUser.id));
  if (!stateRaw) return false;

  if (text === "/cancel") {
    await deleteSetting(loginStateKey(tgUser.id));
    await ctx.reply("Login dibatalkan.");
    return true;
  }

  const state = JSON.parse(stateRaw) as { step: "email" | "password"; email?: string };

  if (state.step === "email") {
    const user = await prisma.user.findUnique({ where: { email: text } });
    if (!user) {
      await ctx.reply("Email tidak ditemukan. Masukkan email yang terdaftar, atau ketik /cancel.");
      return true;
    }

    await upsertSetting(loginStateKey(tgUser.id), JSON.stringify({ step: "password", email: text }));
    await ctx.reply(
      "Masukkan password akun Kesling Anda.\n\nCatatan: pesan password akan coba dihapus otomatis oleh bot.",
    );
    return true;
  }

  if (state.step === "password" && state.email) {
    const user = await prisma.user.findUnique({ where: { email: state.email }, include: { puskesmas: true } });
    if (!user) {
      await deleteSetting(loginStateKey(tgUser.id));
      await ctx.reply("Sesi login tidak valid. Silakan mulai lagi dengan /login.");
      return true;
    }

    const ok = await compare(text, user.password);
    await ctx.deleteMessage().catch(() => null);

    if (!ok) {
      await ctx.reply("Password salah. Silakan masukkan password lagi, atau ketik /cancel.");
      return true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramUserId: String(tgUser.id),
        telegramChatId: String(ctx.chat.id),
        telegramUsername: tgUser.username || null,
      },
    });
    await deleteSetting(loginStateKey(tgUser.id));

    await ctx.reply(
      `✅ *Akun berhasil terhubung!*\n\n` +
        `Nama: *${escapeMd(user.nama)}*\n` +
        `Role: *${escapeMd(user.role)}*\n` +
        `Puskesmas: *${escapeMd(user.puskesmas?.nama || "Dinas/Admin")}*`,
      { parse_mode: "Markdown" },
    );
    await renderHome(ctx);
    return true;
  }

  return false;
}

async function showFeaturePlaceholder(ctx: any, title: string, description: string, webPath?: string) {
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const kb = new InlineKeyboard();
  if (webPath && appUrl) kb.webApp("🚀 Buka Mini App", `${appUrl}${webPath}`).row();
  kb.text("◀️ Kembali", "menu:home").text("🏠 Menu", "menu:home");

  await ctx.editMessageText(`*${title}*\n\n${description}`, { parse_mode: "Markdown", reply_markup: kb });
}

async function setupHandlers(bot: TelegramBot) {
  const tokenId = String((bot as any).token || "active");
  if (handlersReadyForToken === tokenId) return;
  handlersReadyForToken = tokenId;

  await bot.api.setMyCommands([
    { command: "start", description: "Mulai bot" },
    { command: "menu", description: "Buka menu utama" },
    { command: "login", description: "Login / pairing akun" },
    { command: "logout", description: "Logout dari bot" },
    { command: "status", description: "Cek status ringkas" },
    { command: "help", description: "Bantuan" },
  ]);

  bot.command("start", (ctx) => renderHome(ctx));
  bot.command("menu", (ctx) => renderHome(ctx));
  bot.command("login", (ctx) => beginLogin(ctx));
  bot.command("logout", async (ctx) => {
    await ctx.reply("Yakin ingin logout dan memutus akun Telegram dari Kesling?", {
      reply_markup: new InlineKeyboard().text("❌ Batal", "menu:home").text("🚪 Ya, Logout", "auth:logout_yes"),
    });
  });
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `📚 *Bantuan Bot Kesling*\n\n` +
        `• /menu - buka menu utama\n` +
        `• /login - hubungkan akun Kesling\n` +
        `• /logout - putuskan akun Telegram\n` +
        `• /status - status ringkas`,
      { parse_mode: "Markdown" },
    );
  });
  bot.command("status", async (ctx) => {
    const total = await prisma.dynamicLaporan.count().catch(() => 0);
    const submitted = await prisma.dynamicLaporan.count({ where: { status: "SUBMITTED" } }).catch(() => 0);
    await ctx.reply(`🟢 Server ONLINE\nTotal laporan: ${total}\nMenunggu approval: ${submitted}`);
  });

  bot.on("callback_query:data", async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => null);
    const data = ctx.callbackQuery.data;

    if (data === "auth:login") return beginLogin(ctx);
    if (data === "auth:logout_confirm") {
      return ctx.editMessageText("Yakin ingin logout dan memutus akun Telegram dari Kesling?", {
        reply_markup: new InlineKeyboard().text("❌ Batal", "menu:home").text("🚪 Ya, Logout", "auth:logout_yes"),
      });
    }
    if (data === "auth:logout_yes") {
      await prisma.user.updateMany({
        where: { telegramUserId: String(ctx.from.id) },
        data: { telegramUserId: null, telegramChatId: null, telegramUsername: null },
      });
      await deleteSetting(loginStateKey(ctx.from.id));
      await ctx.editMessageText("✅ Anda sudah logout dari Bot Kesling.", {
        reply_markup: new InlineKeyboard().text("🔐 Login Lagi", "auth:login"),
      });
      return;
    }

    if (data === "menu:home") return renderHome(ctx, true);
    if (data === "menu:akun") return showAccount(ctx);
    if (data === "menu:help") {
      return ctx.editMessageText(
        "📚 *Bantuan*\n\nGunakan tombol menu untuk navigasi. Login diperlukan untuk membuka fitur sesuai role.",
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text("🔐 Login", "auth:login").row().text("🏠 Menu", "menu:home"),
        },
      );
    }

    const user = await getLinkedUser(ctx.from.id);
    if (!user) return renderHome(ctx, true);

    const screens: Record<string, [string, string, string?]> = {
      "menu:laporan": [
        "📝 Laporan Bulanan",
        "Isi, lanjutkan draft, dan pantau status laporan bulanan melalui Mini App.",
        "/telegram/laporan",
      ],
      "menu:inspeksi": [
        "🔍 Inspeksi Sarana",
        "Mulai inspeksi baru, upload foto, lokasi, tanda tangan, dan submit hasil inspeksi.",
        "/telegram/inspeksi",
      ],
      "menu:data-dasar": [
        "📍 Data Dasar",
        "Tambah atau perbarui data dasar sarana wilayah kerja puskesmas.",
        "/telegram/data-dasar",
      ],
      "menu:status": ["📊 Status", "Lihat status ringkas laporan dan inspeksi terbaru."],
      "menu:notifikasi": ["🔔 Notifikasi", "Kelola preferensi notifikasi Telegram."],
      "menu:approval": ["✅ Approval Laporan", "Review laporan yang menunggu persetujuan Dinkes.", "/approval"],
      "menu:rekap": ["📊 Rekap", "Buka rekapitulasi bulanan dan tahunan.", "/rekap"],
      "menu:monitoring": ["🔍 Monitoring Inspeksi", "Pantau inspeksi dan tindak lanjut temuan."],
      "menu:temuan": ["⚠️ Temuan Kritis", "Daftar temuan kritis yang membutuhkan tindak lanjut."],
      "menu:perbandingan": ["📈 Perbandingan", "Bandingkan capaian antar puskesmas.", "/perbandingan"],
      "menu:broadcast": ["📣 Broadcast", "Kirim reminder laporan ke operator puskesmas."],
      "menu:error-logs": ["🚨 Error Logs", "Pantau error sistem dari dashboard Admin.", "/settings/errors"],
      "menu:security-logs": ["🛡️ Security Logs", "Pantau login dan event keamanan di Audit Log.", "/audit-log"],
      "menu:user-telegram": [
        "👥 User Telegram",
        "Kelola Telegram Chat ID dan pairing user di Settings > Pengguna.",
        "/settings",
      ],
      "menu:bot-settings": ["⚙️ Bot Settings", "Atur token, chat ID, dan webhook bot Telegram.", "/settings/telegram"],
      "menu:webhook": ["📡 Webhook", "Cek dan kelola webhook dari halaman Settings Telegram.", "/settings/telegram"],
      "menu:test": ["🧪 Test Bot", "Kirim pesan uji coba dari Settings Telegram.", "/settings/telegram"],
    };

    const screen = screens[data];
    if (screen) return showFeaturePlaceholder(ctx, ...screen);
  });

  bot.on("message:text", async (ctx) => {
    const handled = await handleLoginMessage(ctx);
    if (!handled) await ctx.reply("Gunakan /menu untuk membuka menu utama.");
  });
}

export async function POST(req: NextRequest) {
  const bot = await getBotInstance();
  if (!bot) return NextResponse.json({ error: "Bot Telegram belum dikonfigurasi" }, { status: 503 });

  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = (await getSetting("telegram_webhook_secret")) || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await setupHandlers(bot);
    await bot.handleUpdate(await req.json());
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    console.error("[Telegram Webhook Error]", e);
    return NextResponse.json({ error: "Failed to process update" }, { status: 500 });
  }
}
