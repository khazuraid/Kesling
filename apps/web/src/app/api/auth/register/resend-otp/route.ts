import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { createRegisterOtpChallenge, maskEmail, sendVerificationOtpEmail } from "@/lib/email-otp";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const challengeToken = (body.challengeToken || "").trim();

    if (!challengeToken) {
      return NextResponse.json({ error: "Sesi registrasi tidak valid." }, { status: 400 });
    }

    // 1. Cek Cooldown kirim ulang (60 detik)
    const cooldownKey = `otp:cooldown:register:${challengeToken}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json(
        { error: `Harap tunggu ${ttl > 0 ? ttl : 60} detik sebelum meminta kode baru.` },
        { status: 429 },
      );
    }

    // 2. Ambil data challenge lama dari Redis
    const oldRaw = await redis.get(`otp:register:${challengeToken}`);
    if (!oldRaw) {
      return NextResponse.json(
        { error: "Sesi verifikasi telah kadaluarsa. Silakan lakukan pendaftaran ulang." },
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

    if (user.status !== "PENDING_EMAIL") {
      return NextResponse.json({ error: "Email akun ini sudah diverifikasi atau akun telah aktif." }, { status: 400 });
    }

    // 3. Buat OTP Baru dengan challengeToken yang sama
    const { otp } = await createRegisterOtpChallenge(user.id, user.email);

    // Update challenge lama dengan token yang sama
    await redis.set(
      `otp:register:${challengeToken}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        otp,
        attempts: 0,
      }),
      "EX",
      600,
    );

    // Set Cooldown 60 detik
    await redis.set(cooldownKey, "1", "EX", 60);

    // 4. Kirim email OTP
    await sendVerificationOtpEmail(user.email, otp, user.nama);

    return NextResponse.json({
      success: true,
      message: "Kode verifikasi baru telah dikirimkan ke email Anda.",
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    console.error("[Register Resend OTP Error]:", err);
    return NextResponse.json({ error: "Gagal mengirim ulang kode OTP." }, { status: 500 });
  }
}
