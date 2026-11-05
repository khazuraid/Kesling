import { ensureDbSchema, prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { createPasswordResetChallenge, maskEmail, sendPasswordResetOtpEmail } from "@/lib/email-otp";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const identifier = (body.identifier || "").trim().toLowerCase();
    const turnstileToken = body.turnstileToken || "";

    if (!identifier) {
      return NextResponse.json({ error: "Email atau username wajib diisi." }, { status: 400 });
    }

    // 1. Verifikasi Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "Verifikasi keamanan Cloudflare Turnstile gagal." },
        { status: 400 },
      );
    }

    // 2. Rate limit permintaan reset password per IP
    const ipCheck = await checkLoginRateLimit(ip, "ip");
    if (ipCheck.isBlocked) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan dari IP Anda. Coba lagi dalam beberapa saat." },
        { status: 429 },
      );
    }

    await ensureDbSchema();

    // 3. Cari User (Email atau Username)
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    // Cegah enumerasi akun: jika user tidak ditemukan atau belum aktif,
    // tetap kembalikan status sukses generik dengan token dummy
    if (user?.status !== "ACTIVE") {
      await logSecurityEvent({
        eventType: "PASSWORD_RESET_ATTEMPT_UNKNOWN",
        ip,
        path: "/api/auth/forgot-password/request",
        userAgent,
        detail: `Permintaan reset password akun tidak valid: ${identifier}`,
      });

      return NextResponse.json({
        success: true,
        message: "Jika akun terdaftar dan aktif, kode verifikasi telah dikirimkan ke alamat email terkait.",
        resetToken: "dummy-token",
        maskedEmail: maskEmail(identifier.includes("@") ? identifier : `${identifier}@kesling.biz.id`),
      });
    }

    // 4. Buat Challenge Reset Password di Redis (10 menit)
    const { resetToken, otp } = await createPasswordResetChallenge(user.id, user.email);

    // 5. Kirim email OTP
    await sendPasswordResetOtpEmail(user.email, otp, user.nama);

    await logSecurityEvent({
      eventType: "PASSWORD_RESET_REQUESTED",
      ip,
      path: "/api/auth/forgot-password/request",
      userAgent,
      detail: `Permintaan reset password untuk ${user.email}`,
    });

    return NextResponse.json({
      success: true,
      message: "Kode verifikasi telah dikirimkan ke alamat email terkait.",
      resetToken,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    console.error("[Forgot Password Request Error]:", err);
    return NextResponse.json({ error: "Gagal memproses permintaan reset password." }, { status: 500 });
  }
}
