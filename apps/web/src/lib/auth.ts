import { ensureDbSchema, prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyOtpChallenge } from "./email-otp";
import { checkLoginRateLimit, clearLoginRateLimit, recordFailedLogin } from "./rate-limit";
import { clientIp } from "./request-ip";
import { logSecurityEvent } from "./security-logger";
import { validateTelegramInitData } from "./telegram/bot";
import { sendTelegramMessage } from "./telegram/notify";
import { verifyTurnstileToken } from "./turnstile";

// Selang revalidasi role/keberadaan user di dalam JWT (5 menit).
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "otp",
      credentials: {
        challengeToken: { label: "Challenge Token", type: "text" },
        otp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.challengeToken || !credentials?.otp) return null;

        const result = await verifyOtpChallenge(credentials.challengeToken, credentials.otp);
        if (!result.success || !result.userId) {
          throw new Error(result.error || "Kode verifikasi tidak valid.");
        }

        const user = await prisma.user.findUnique({
          where: { id: result.userId },
          include: { puskesmas: true },
        });
        if (!user) return null;

        // Catat tanggal verifikasi OTP agar berlaku selama 30 hari ke depan
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastOtpVerifiedAt: new Date() },
          });
        } catch (dbErr) {
          console.warn("[Auth OTP] Gagal perbarui lastOtpVerifiedAt:", dbErr);
        }

        let ip = "unknown";
        try {
          const reqHeaders = await headers();
          ip = clientIp(reqHeaders);
        } catch {}

        await clearLoginRateLimit(ip, "ip");
        await clearLoginRateLimit(user.email, "email");

        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role,
          puskesmasId: user.puskesmasId,
          puskesmasNama: user.puskesmas?.nama,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let ip = "unknown";
        let userAgent: string | undefined;
        try {
          const reqHeaders = await headers();
          ip = clientIp(reqHeaders);
          userAgent = reqHeaders.get("user-agent") || undefined;
        } catch {
          // headers() tidak tersedia — tetap lanjut, log pakai "unknown"
        }

        // Verifikasi Cloudflare Turnstile Token jika diaktifkan di backend
        const turnstileCheck = await verifyTurnstileToken(credentials.turnstileToken || "", ip);
        if (!turnstileCheck.success) {
          throw new Error(turnstileCheck.error || "Verifikasi keamanan Cloudflare gagal.");
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // 1. Cek proteksi brute force di Redis (per-IP dan per-Email)
        const ipCheck = await checkLoginRateLimit(ip, "ip");
        const emailCheck = await checkLoginRateLimit(normalizedEmail, "email");

        if (ipCheck.isBlocked || emailCheck.isBlocked) {
          await logSecurityEvent({
            eventType: "BRUTE_FORCE",
            ip,
            path: "/api/auth/callback/credentials",
            userAgent,
            detail: `Login diblokir sementara (IP: ${ipCheck.currentAttempts}/${ipCheck.maxAttempts}, Email: ${emailCheck.currentAttempts}/${emailCheck.maxAttempts})`,
          });
          throw new Error("Terlalu banyak percobaan login gagal. Akun dikunci sementara selama 15 menit.");
        }

        await ensureDbSchema();

        let user: Awaited<ReturnType<typeof prisma.user.findFirst<{ include: { puskesmas: true } }>>> = null;
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: normalizedEmail },
                { username: normalizedEmail },
                { telegramUsername: normalizedEmail },
                { email: { startsWith: `${normalizedEmail}@` } },
                { nama: { equals: normalizedEmail, mode: "insensitive" } },
              ],
            },
            include: { puskesmas: true },
          });
        } catch (queryErr: any) {
          // Graceful fallback jika kolom username belum tersinkron di DB fisik
          if (queryErr?.message?.includes("user.username")) {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: normalizedEmail },
                  { telegramUsername: normalizedEmail },
                  { email: { startsWith: `${normalizedEmail}@` } },
                  { nama: { equals: normalizedEmail, mode: "insensitive" } },
                ],
              },
              include: { puskesmas: true },
            });
          } else {
            throw queryErr;
          }
        }

        // Pesan gagal disamakan agar tidak membocorkan email mana yang terdaftar.
        if (!user) {
          await recordFailedLogin(ip, "ip");
          await recordFailedLogin(normalizedEmail, "email");
          await logSecurityEvent({
            eventType: "LOGIN_FAILED",
            ip,
            path: "/api/auth/callback/credentials",
            userAgent,
            detail: "Email tidak terdaftar",
          });
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          await recordFailedLogin(ip, "ip");
          const emailAttempts = await recordFailedLogin(normalizedEmail, "email");

          await logSecurityEvent({
            eventType: "LOGIN_FAILED",
            ip,
            path: "/api/auth/callback/credentials",
            userAgent,
            detail: `Password salah untuk ${user.email} (Percobaan gagal ke-${emailAttempts})`,
          });

          // Jika percobaan salah mencapai batas (5x), kirim alert ke admin Telegram
          if (emailAttempts >= 5) {
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
                    `*Nama User:* ${user.nama}\n` +
                    `*IP Penyerang:* \`${ip}\`\n` +
                    `*Waktu:* ${nowStr} WIB\n` +
                    `*Status:* Akun dikunci sementara selama 15 menit setelah 5x gagal berturut-turut.`,
                );
              }
            } catch (tgErr) {
              console.error("[Auth] Gagal kirim alert Telegram:", tgErr);
            }
            throw new Error("Akun Anda dikunci sementara selama 15 menit karena 5 kali percobaan gagal.");
          }

          const sisa = Math.max(0, 5 - emailAttempts);
          if (sisa <= 2) {
            throw new Error(`Kata sandi salah. Tersisa ${sisa} kali kesempatan sebelum akun dikunci.`);
          }

          return null;
        }

        // Login sukses — hapus counter gagal
        await clearLoginRateLimit(ip, "ip");
        await clearLoginRateLimit(normalizedEmail, "email");

        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role,
          puskesmasId: user.puskesmasId,
          puskesmasNama: user.puskesmas?.nama,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    CredentialsProvider({
      id: "telegram",
      name: "telegram",
      credentials: {
        initData: { label: "Init Data", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.initData) return null;
        const tgUser = await validateTelegramInitData(credentials.initData);
        if (!tgUser?.id) return null;

        const user = await prisma.user.findUnique({
          where: { telegramUserId: String(tgUser.id) },
          include: { puskesmas: true },
        });
        if (!user) return null;

        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role,
          puskesmasId: user.puskesmasId,
          puskesmasNama: user.puskesmas?.nama,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.name = user.name;
        token.role = user.role;
        token.puskesmasId = user.puskesmasId;
        token.puskesmasNama = user.puskesmasNama;
        token.mustChangePassword = Boolean(user.mustChangePassword);

        try {
          const reqHeaders = await headers();
          const ip = clientIp(reqHeaders);
          const userAgent = reqHeaders.get("user-agent") || undefined;

          await logSecurityEvent({
            eventType: "LOGIN_SUCCESS",
            ip,
            path: "/api/auth/callback/credentials",
            userAgent,
            detail: `User ${user.email || "unknown"} (Role: ${String(user.role || "-")}) sukses login`,
          });
        } catch (err) {
          console.error("Gagal mencatat log login sukses:", err);
        }
      }

      if (trigger === "update") {
        if (session?.name) {
          token.name = session.name;
        } else if (token.sub) {
          const freshUser = await prisma.user.findUnique({
            where: { id: Number(token.sub) },
            select: {
              nama: true,
              role: true,
              puskesmasId: true,
              mustChangePassword: true,
              puskesmas: { select: { nama: true } },
            },
          });
          if (freshUser) {
            token.name = freshUser.nama;
            token.role = freshUser.role;
            token.puskesmasId = freshUser.puskesmasId;
            token.puskesmasNama = freshUser.puskesmas?.nama;
            token.mustChangePassword = freshUser.mustChangePassword;
          }
        }
      } else if (token.sub && (!token.checkedAt || Date.now() - Number(token.checkedAt) > ROLE_REFRESH_MS)) {
        // JWT menyimpan role, jadi perubahan role / penghapusan user tidak langsung
        // berlaku. Revalidasi berkala: bila user sudah tidak ada, tandai token mati
        // agar sesi dicabut pada request berikutnya.
        //
        // Query ini dibungkus try/catch dengan sengaja: kalau kolom tambahan
        // (mis. mustChangePassword) belum ada di database, seluruh callback jwt
        // melempar error dan SEMUA permintaan sesi gagal — pengguna tidak bisa
        // login sama sekali. Lebih baik sesi jalan dengan data token yang sudah
        // ada, dan dicoba lagi pada revalidasi berikutnya.
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: Number(token.sub) },
            select: {
              nama: true,
              role: true,
              puskesmasId: true,
              mustChangePassword: true,
              puskesmas: { select: { nama: true } },
            },
          });
          if (!freshUser) {
            token.disabled = true;
          } else {
            token.disabled = false;
            token.name = freshUser.nama;
            token.role = freshUser.role;
            token.puskesmasId = freshUser.puskesmasId;
            token.puskesmasNama = freshUser.puskesmas?.nama;
            token.mustChangePassword = freshUser.mustChangePassword;
            token.checkedAt = Date.now();
          }
        } catch (err) {
          console.error("[auth] revalidasi user gagal — memakai data token yang ada:", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Token yang ditandai mati menghasilkan sesi tanpa user, sehingga
      // getCurrentUser() → null dan semua route ber-guard menjawab 401.
      if (token.disabled) {
        (session as { user?: unknown }).user = undefined;
        session.expires = new Date(0).toISOString();
        return session;
      }
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.name) session.user.name = token.name;
        session.user.role = token.role;
        session.user.puskesmasId = token.puskesmasId;
        session.user.puskesmasNama = token.puskesmasNama;
        // Tanpa baris ini getCurrentUser() selalu melaporkan false, sehingga
        // redirect wajib-ganti-password di layout tidak pernah jalan:
        // pengguna tertahan di dashboard sementara setiap permintaan API-nya
        // dijawab 403 oleh middleware.
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl || parsed.hostname === "kesling.biz.id") return url;
      } catch {}
      return baseUrl;
    },
  },
  useSecureCookies: process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https"),
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  // SameSite=Lax eksplisit: permintaan lintas-situs tidak ikut membawa cookie
  // sesi pada POST, sehingga route API tidak bisa dipanggil dari situs lain.
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || !!process.env.NEXTAUTH_URL?.startsWith("https"),
      },
    },
  },
};
