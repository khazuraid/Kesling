import { ensureDbSchema, prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { createRegisterOtpChallenge, maskEmail, sendVerificationOtpEmail } from "@/lib/email-otp";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const nama = (body.nama || "").trim();
    const username = (body.username || "").trim().toLowerCase();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const role = (body.role || "").toUpperCase();
    const puskesmasIdRaw = body.puskesmasId;
    const turnstileToken = body.turnstileToken || "";

    // 1. Validasi Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "Verifikasi keamanan Cloudflare Turnstile gagal." },
        { status: 400 },
      );
    }

    // 2. Proteksi rate limit registrasi per IP
    const ipCheck = await checkLoginRateLimit(ip, "ip");
    if (ipCheck.isBlocked) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pendaftaran dari IP Anda. Coba lagi beberapa saat." },
        { status: 429 },
      );
    }

    // 3. Validasi Field Wajib
    if (!nama || !username || !email || !password || !role) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }

    // Role check: hanya OPERATOR dan DINKES yang boleh mendaftar sendiri
    if (role !== "OPERATOR" && role !== "DINKES") {
      return NextResponse.json({ error: "Peran (role) yang dipilih tidak valid." }, { status: 400 });
    }

    // Format username
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username hanya boleh berupa 3-30 karakter (huruf kecil, angka, atau underscore)." },
        { status: 400 },
      );
    }

    // Format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    // Password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
    }

    let puskesmasId: number | null = null;
    if (role === "OPERATOR") {
      puskesmasId = Number(puskesmasIdRaw);
      if (!puskesmasId || isNaN(puskesmasId)) {
        return NextResponse.json({ error: "Puskesmas wajib dipilih untuk Petugas Puskesmas." }, { status: 400 });
      }
    }

    await ensureDbSchema();

    // 4. Periksa apakah Email atau Username sudah dipakai
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json({ error: "Alamat email ini sudah terdaftar." }, { status: 409 });
      }
      return NextResponse.json({ error: "Username ini sudah digunakan." }, { status: 409 });
    }

    // 5. Hash Password & Simpan Akun Baru dengan status PENDING_EMAIL
    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        nama,
        username,
        email,
        password: hashedPassword,
        role: role as any,
        puskesmasId,
        status: "PENDING_EMAIL",
      },
      include: {
        puskesmas: true,
      },
    });

    // 6. Buat Challenge OTP Registrasi di Redis (10 menit)
    const { challengeToken, otp } = await createRegisterOtpChallenge(user.id, user.email);

    // 7. Kirim Email OTP
    await sendVerificationOtpEmail(user.email, otp, user.nama);

    // 8. Kirim notifikasi Telegram ke Admin Dinkes
    try {
      const adminSetting = await prisma.appSetting.findUnique({
        where: { key: "telegram_admin_chat_id" },
      });
      const adminChatId = adminSetting?.value || process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (adminChatId) {
        const puskesmasNama = user.puskesmas?.nama ? `\n*Puskesmas:* ${user.puskesmas.nama}` : "";
        await sendTelegramMessage(
          adminChatId,
          `📝 *Pendaftaran Pengguna Baru Masuk*\n\n` +
            `*Nama:* ${user.nama}\n` +
            `*Username:* \`${user.username}\`\n` +
            `*Email:* \`${user.email}\`\n` +
            `*Role:* ${user.role}${puskesmasNama}\n` +
            `*Status:* Menunggu Verifikasi Email`,
        );
      }
    } catch (tgErr) {
      console.warn("[Register API] Telegram notify error:", tgErr);
    }

    await logSecurityEvent({
      eventType: "REGISTER_REQUESTED",
      ip,
      path: "/api/auth/register",
      userAgent,
      detail: `Pendaftaran baru: ${user.email} (Role: ${user.role})`,
    });

    return NextResponse.json({
      success: true,
      challengeToken,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    console.error("[Register API Error]:", err);
    return NextResponse.json({ error: "Gagal memproses pendaftaran. Silakan coba lagi." }, { status: 500 });
  }
}
