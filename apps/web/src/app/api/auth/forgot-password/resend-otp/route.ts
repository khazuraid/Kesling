import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { createPasswordResetChallenge, maskEmail, sendPasswordResetOtpEmail } from "@/lib/email-otp";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resetToken = (body.resetToken || "").trim();

    if (!resetToken || resetToken === "dummy-token") {
      return NextResponse.json({ error: "Sesi reset kata sandi tidak valid." }, { status: 400 });
    }

    // 1. Cooldown 60 detik
    const cooldownKey = `otp:cooldown:reset:${resetToken}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json(
        { error: `Harap tunggu ${ttl > 0 ? ttl : 60} detik sebelum meminta kode baru.` },
        { status: 429 },
      );
    }

    // 2. Ambil data resetToken dari Redis
    const oldRaw = await redis.get(`otp:reset:${resetToken}`);
    if (!oldRaw) {
      return NextResponse.json(
        { error: "Sesi reset kata sandi telah kadaluarsa. Silakan ulangi permintaan dari awal." },
        { status: 400 },
      );
    }

    const oldData = JSON.parse(oldRaw);
    const user = await prisma.user.findUnique({
      where: { id: oldData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });
    }

    // 3. Generate OTP Baru & Simpan
    const { otp } = await createPasswordResetChallenge(user.id, user.email);

    await redis.set(
      `otp:reset:${resetToken}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        otp,
        attempts: 0,
      }),
      "EX",
      600,
    );

    // Set cooldown
    await redis.set(cooldownKey, "1", "EX", 60);

    // 4. Kirim email
    await sendPasswordResetOtpEmail(user.email, otp, user.nama);

    return NextResponse.json({
      success: true,
      message: "Kode verifikasi baru telah dikirimkan ke email Anda.",
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    console.error("[Forgot Password Resend OTP Error]:", err);
    return NextResponse.json({ error: "Gagal mengirim ulang kode OTP." }, { status: 500 });
  }
}
