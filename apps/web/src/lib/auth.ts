import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { clientIp } from "./request-ip";
import { logSecurityEvent } from "./security-logger";
import { validateTelegramInitData } from "./telegram/bot";

// Selang revalidasi role/keberadaan user di dalam JWT (5 menit).
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { puskesmas: true },
        });
        // Pesan gagal disamakan agar tidak membocorkan email mana yang terdaftar.
        if (!user) {
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
          await logSecurityEvent({
            eventType: "LOGIN_FAILED",
            ip,
            path: "/api/auth/callback/credentials",
            userAgent,
            detail: `Password salah untuk ${user.email}`,
          });
          return null;
        }
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
