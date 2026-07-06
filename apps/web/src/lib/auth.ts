import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { logSecurityEvent } from "./security-logger";

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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { puskesmas: true },
        });
        if (!user) return null;
        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;
        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role,
          puskesmasId: user.puskesmasId,
          puskesmasNama: user.puskesmas?.nama,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.puskesmasId = user.puskesmasId;
        token.puskesmasNama = user.puskesmasNama;

        try {
          const reqHeaders = await headers();
          const ip = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.puskesmasId = token.puskesmasId;
        session.user.puskesmasNama = token.puskesmasNama;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
};
