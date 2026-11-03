import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { verifyRegisterOtpChallenge } from "@/lib/email-otp";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const challengeToken = (body.challengeToken || "").trim();
    const otp = (body.otp || "").trim();

    if (!challengeToken || !otp) {
      return NextResponse.json({ error: "Token challenge dan kode OTP wajib diisi." }, { status: 400 });
    }

    // 1. Verifikasi OTP dari Redis
    const verifyResult = await verifyRegisterOtpChallenge(challengeToken, otp);
    if (!verifyResult.success || !verifyResult.userId) {
      return NextResponse.json({ error: verifyResult.error || "Kode verifikasi tidak valid." }, { status: 400 });
    }

    // 2. Ambil User & Update Status ke PENDING_APPROVAL
    const user = await prisma.user.findUnique({
      where: { id: verifyResult.userId },
      include: { puskesmas: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });
    }

    if (user.status === "ACTIVE") {
      return NextResponse.json({
        success: true,
        message: "Akun Anda sudah aktif. Silakan masuk.",
        status: "ACTIVE",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "PENDING_APPROVAL",
        emailVerifiedAt: new Date(),
      },
    });

    // 3. Notifikasi Telegram ke Admin Dinkes
    try {
      const adminSetting = await prisma.appSetting.findUnique({
        where: { key: "telegram_admin_chat_id" },
      });
      const adminChatId = adminSetting?.value || process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (adminChatId) {
        const puskesmasNama = user.puskesmas?.nama ? `\n*Puskesmas:* ${user.puskesmas.nama}` : "";
        await sendTelegramMessage(
          adminChatId,
          `✅ *Email Terverifikasi - Menunggu Persetujuan Admin*\n\n` +
            `*Nama:* ${user.nama}\n` +
            `*Username:* \`${user.username}\`\n` +
            `*Email:* \`${user.email}\`\n` +
            `*Role:* ${user.role}${puskesmasNama}\n` +
            `*Status:* ⏳ \`PENDING_APPROVAL\`\n\n` +
            `Silakan buka menu *Settings > Users* di web untuk menyetujui akun ini.`,
        );
      }
    } catch (tgErr) {
      console.warn("[Register Verify] Telegram notify error:", tgErr);
    }

    await logSecurityEvent({
      eventType: "REGISTER_EMAIL_VERIFIED",
      ip,
      path: "/api/auth/register/verify",
      userAgent,
      detail: `Email terverifikasi untuk ${user.email}, status kini PENDING_APPROVAL`,
    });

    return NextResponse.json({
      success: true,
      message: "Email berhasil diverifikasi. Pendaftaran akun Anda kini menunggu persetujuan Administrator.",
      status: "PENDING_APPROVAL",
    });
  } catch (err: any) {
    console.error("[Register Verify Error]:", err);
    return NextResponse.json({ error: "Gagal memverifikasi OTP pendaftaran." }, { status: 500 });
  }
}
