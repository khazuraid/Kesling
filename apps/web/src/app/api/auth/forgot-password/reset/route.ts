import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetChallenge } from "@/lib/email-otp";
import { clearLoginRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const resetToken = (body.resetToken || "").trim();
    const otp = (body.otp || "").trim();
    const newPassword = body.newPassword || "";

    if (!resetToken || !otp || !newPassword) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }

    if (resetToken === "dummy-token") {
      return NextResponse.json({ error: "Kode verifikasi tidak valid atau telah kadaluarsa." }, { status: 400 });
    }

    // 1. Validasi Kekuatan Password Baru
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Kata sandi baru minimal 8 karakter." }, { status: 400 });
    }

    // 2. Verifikasi OTP dari Redis
    const verifyResult = await verifyPasswordResetChallenge(resetToken, otp);
    if (!verifyResult.success || !verifyResult.userId) {
      return NextResponse.json({ error: verifyResult.error || "Kode verifikasi tidak valid." }, { status: 400 });
    }

    // 3. Update Password di Database
    const hashedPassword = await hash(newPassword, 12);

    const user = await prisma.user.update({
      where: { id: verifyResult.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    // 4. Bersihkan kunci rate-limit brute force di Redis
    await clearLoginRateLimit(ip, "ip");
    await clearLoginRateLimit(user.email, "email");
    if (user.username) {
      await clearLoginRateLimit(user.username, "email");
    }

    await logSecurityEvent({
      eventType: "PASSWORD_RESET_SUCCESS",
      ip,
      path: "/api/auth/forgot-password/reset",
      userAgent,
      detail: `Kata sandi berhasil direset untuk ${user.email}`,
    });

    return NextResponse.json({
      success: true,
      message: "Kata sandi Anda berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.",
    });
  } catch (err: any) {
    console.error("[Forgot Password Reset Error]:", err);
    return NextResponse.json({ error: "Gagal mereset kata sandi." }, { status: 500 });
  }
}
