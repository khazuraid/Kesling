import { ensureDbSchema, prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { createOtpChallenge, maskEmail, sendOtpEmail } from "@/lib/email-otp";
import { checkLoginRateLimit, recordFailedLogin } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const identifier = (body?.identifier || "").trim().toLowerCase();
    const password = body?.password || "";
    const turnstileToken = body?.turnstileToken || "";

    if (!identifier || !password) {
      return NextResponse.json({ error: "Username/Email dan kata sandi wajib diisi." }, { status: 400 });
    }

    // 0. Cek Turnstile jika dikonfigurasi
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "Verifikasi keamanan Cloudflare Turnstile gagal." },
        { status: 400 },
      );
    }

    // 1. Cek Rate Limit Brute Force (IP dan Identifier)
    const ipCheck = await checkLoginRateLimit(ip, "ip");
    const idCheck = await checkLoginRateLimit(identifier, "email");

    if (ipCheck.isBlocked || idCheck.isBlocked) {
      await logSecurityEvent({
        eventType: "BRUTE_FORCE",
        ip,
        path: "/api/auth/login-challenge",
        userAgent,
        detail: `Login diblokir sementara (IP: ${ipCheck.currentAttempts}/${ipCheck.maxAttempts}, Identifier: ${idCheck.currentAttempts}/${idCheck.maxAttempts})`,
      });
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login gagal. Akun/IP dikunci sementara selama 15 menit." },
        { status: 429 },
      );
    }

    // 2. Cari pengguna berdasarkan Email ATAU Username resmi (atau fallback nama/telegram)
    await ensureDbSchema();
    let user: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier },
            { telegramUsername: identifier },
            { email: { startsWith: `${identifier}@` } },
            { nama: { equals: identifier, mode: "insensitive" } },
          ],
        },
      });
    } catch (queryErr: any) {
      if (queryErr?.message?.includes("user.username")) {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { telegramUsername: identifier },
              { email: { startsWith: `${identifier}@` } },
              { nama: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });
      } else {
        throw queryErr;
      }
    }

    if (!user) {
      await recordFailedLogin(ip, "ip");
      await recordFailedLogin(identifier, "email");
      await logSecurityEvent({
        eventType: "LOGIN_FAILED",
        ip,
        path: "/api/auth/login-challenge",
        userAgent,
        detail: `Akun tidak ditemukan: ${identifier}`,
      });
      return NextResponse.json(
        { error: "Kredensial tidak valid. Silakan periksa kembali email/username atau sandi Anda." },
        { status: 401 },
      );
    }

    // 3. Verifikasi Password
    const isValid = await compare(password, user.password);
    if (!isValid) {
      await recordFailedLogin(ip, "ip");
      const attempts = await recordFailedLogin(identifier, "email");

      await logSecurityEvent({
        eventType: "LOGIN_FAILED",
        ip,
        path: "/api/auth/login-challenge",
        userAgent,
        detail: `Password salah untuk ${user.email} (Percobaan ke-${attempts})`,
      });

      if (attempts >= 5) {
        try {
          const adminSetting = await prisma.appSetting.findUnique({
            where: { key: "telegram_admin_chat_id" },
          });
          const adminChatId = adminSetting?.value || process.env.TELEGRAM_ADMIN_CHAT_ID;
          if (adminChatId) {
            const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
            await sendTelegramMessage(
              adminChatId,
              `🚨 *Peringatan Brute Force Login Terdeteksi!*\n\n` +
                `*Target Akun:* \`${user.email}\`\n` +
                `*Nama:* ${user.nama}\n` +
                `*IP:* \`${ip}\`\n` +
                `*Waktu:* ${nowStr} WIB\n` +
                `*Status:* Dikunci sementara setelah 5x gagal.`,
            );
          }
        } catch {}

        return NextResponse.json(
          { error: "Akun Anda dikunci sementara selama 15 menit karena 5 kali percobaan gagal berturut-turut." },
          { status: 429 },
        );
      }

      const sisa = Math.max(0, 5 - attempts);
      const errorMsg =
        sisa <= 2
          ? `Kata sandi salah. Tersisa ${sisa} kali kesempatan sebelum akun dikunci.`
          : "Kredensial tidak valid. Silakan periksa kembali email/username atau sandi Anda.";

      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    // 3.1. Validasi Status Akun (Dual Verifikasi)
    if (user.status && user.status !== "ACTIVE") {
      if (user.status === "PENDING_EMAIL") {
        return NextResponse.json(
          { error: "Alamat email Anda belum diverifikasi. Silakan selesaikan proses verifikasi email pendaftaran." },
          { status: 403 },
        );
      }
      if (user.status === "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Pendaftaran akun Anda sedang menunggu persetujuan Administrator Dinas Kesehatan." },
          { status: 403 },
        );
      }
      if (user.status === "REJECTED") {
        const alasan = user.rejectionReason ? ` Alasan: ${user.rejectionReason}` : "";
        return NextResponse.json(
          { error: `Permohonan pendaftaran akun Anda ditolak oleh Administrator.${alasan}` },
          { status: 403 },
        );
      }
    }

    // 4. Kredensial Valid -> Cek apakah butuh verifikasi OTP (Aturan: hanya sebulan sekali / 30 hari)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const isOtpRequired = !user.lastOtpVerifiedAt || user.lastOtpVerifiedAt < thirtyDaysAgo;

    if (!isOtpRequired) {
      // Masih dalam masa 30 hari verifikasi valid -> langsung login tanpa kirim OTP baru
      return NextResponse.json({
        success: true,
        requiresOtp: false,
      });
    }

    // Perlu OTP (verifikasi pertama kali atau sudah lebih dari 30 hari)
    const { challengeToken, otp } = await createOtpChallenge(user.id, user.email);

    // Kirim email OTP
    await sendOtpEmail(user.email, otp, user.nama);

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      challengeToken,
      maskedEmail: maskEmail(user.email),
    });
  } catch (error) {
    console.error("[Login Challenge] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server saat memproses login." }, { status: 500 });
  }
}
