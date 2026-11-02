import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { generateSecureOtp, maskEmail, type StoredOtpChallenge, sendOtpEmail } from "@/lib/email-otp";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const challengeToken = body?.challengeToken;

    if (!challengeToken) {
      return NextResponse.json({ error: "Token sesi login tidak valid." }, { status: 400 });
    }

    const cooldownKey = `otp:cooldown:${challengeToken}`;
    const isCoolingDown = await redis.get(cooldownKey);
    if (isCoolingDown) {
      const remainingSec = await redis.ttl(cooldownKey);
      return NextResponse.json(
        { error: `Harap tunggu ${remainingSec} detik sebelum meminta kode baru.` },
        { status: 429 },
      );
    }

    const key = `otp:challenge:${challengeToken}`;
    const raw = await redis.get(key);

    if (!raw) {
      return NextResponse.json(
        { error: "Sesi verifikasi telah kadaluarsa. Silakan masuk kembali dari awal." },
        { status: 400 },
      );
    }

    const data: StoredOtpChallenge = JSON.parse(raw);
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { nama: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Buat OTP baru
    const newOtp = generateSecureOtp();
    data.otp = newOtp;
    data.attempts = 0; // reset attempts untuk kode baru

    // Perpanjang TTL challenge 5 menit lagi
    await redis.set(key, JSON.stringify(data), "EX", 300);

    // Set cooldown kirim ulang 60 detik
    await redis.set(cooldownKey, "1", "EX", 60);

    // Kirim email
    await sendOtpEmail(user.email, newOtp, user.nama);

    return NextResponse.json({
      success: true,
      message: "Kode verifikasi baru telah dikirim ke email.",
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error("[Resend OTP] Error:", error);
    return NextResponse.json({ error: "Gagal mengirim ulang kode verifikasi." }, { status: 500 });
  }
}
