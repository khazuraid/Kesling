import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";

// Helper to get settings
async function getSetting(key: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value || null;
}

// Secret validation guard
async function validateSecret(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = (await getSetting("telegram_webhook_secret")) || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secretHeader !== expectedSecret) {
    return false;
  }
  return true;
}

/**
 * POST /api/telegram/auth-helper
 * Body: {
 *   action: "status" | "login" | "logout",
 *   telegramUserId?: string,
 *   telegramChatId?: string,
 *   telegramUsername?: string,
 *   email?: string,
 *   password?: string
 * }
 */
export async function POST(req: NextRequest) {
  const isValid = await validateSecret(req);
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, telegramUserId, telegramChatId, telegramUsername, email, password } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action field" }, { status: 400 });
    }

    // ACTION: STATUS (Cek status pairing user berdasarkan telegramUserId)
    if (action === "status") {
      if (!telegramUserId) {
        return NextResponse.json({ error: "telegramUserId is required for status check" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { telegramUserId: String(telegramUserId) },
        include: { puskesmas: { select: { nama: true } } },
      });

      if (!user) {
        return NextResponse.json({ linked: false });
      }

      return NextResponse.json({
        linked: true,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          puskesmas: user.puskesmas?.nama || "Dinas/Admin",
        },
      });
    }

    // ACTION: LOGIN (Pairing akun dengan email & password)
    if (action === "login") {
      if (!email || !password || !telegramUserId) {
        return NextResponse.json({ error: "email, password, and telegramUserId are required" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { puskesmas: true },
      });

      if (!user) {
        return NextResponse.json({ success: false, error: "Email tidak ditemukan." });
      }

      const isPasswordMatch = await compare(password, user.password);
      if (!isPasswordMatch) {
        return NextResponse.json({ success: false, error: "Password salah." });
      }

      // Hubungkan akun
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUserId: String(telegramUserId),
          telegramChatId: telegramChatId ? String(telegramChatId) : null,
          telegramUsername: telegramUsername || null,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          nama: updatedUser.nama,
          role: updatedUser.role,
          puskesmas: user.puskesmas?.nama || "Dinas/Admin",
        },
      });
    }

    // ACTION: LOGOUT (Memutuskan hubungan user)
    if (action === "logout") {
      if (!telegramUserId) {
        return NextResponse.json({ error: "telegramUserId is required for logout" }, { status: 400 });
      }

      await prisma.user.updateMany({
        where: { telegramUserId: String(telegramUserId) },
        data: {
          telegramUserId: null,
          telegramChatId: null,
          telegramUsername: null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("[Telegram Auth Helper Error]", e);
    return NextResponse.json({ error: "Internal Server Error", details: e?.message }, { status: 500 });
  }
}
