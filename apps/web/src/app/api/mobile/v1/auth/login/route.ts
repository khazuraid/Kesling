import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { createMobileToken, sanitizeMobileUser } from "@/lib/mobile-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";

// 10 percobaan / menit / IP — menahan brute force pada kredensial mobile.
export const POST = withRateLimit(
  async (req: NextRequest) => {
    const ip = clientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    try {
      const body = await req.json();
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");

      if (!email || !password) {
        return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { puskesmas: { select: { nama: true } } },
      });

      // Pesan sengaja disamakan agar tidak membocorkan email mana yang terdaftar.
      const reject = async (detail: string) => {
        await logSecurityEvent({
          eventType: "LOGIN_FAILED",
          ip,
          path: "/api/mobile/v1/auth/login",
          userAgent,
          detail,
        });
        return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
      };

      if (!user) return reject("Email tidak terdaftar");

      const valid = await compare(password, user.password);
      if (!valid) return reject(`Password salah untuk ${email}`);

      const token = createMobileToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        puskesmasId: user.puskesmasId,
      });

      const sanitizedUser = sanitizeMobileUser(user);
      return NextResponse.json({ success: true, token, user: sanitizedUser });
    } catch (err: any) {
      console.error("[mobile/login]", err);
      return NextResponse.json({ error: "Gagal login mobile." }, { status: 500 });
    }
  },
  { windowMs: 60_000, max: 10 },
);
