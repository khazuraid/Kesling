import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

type MobileTokenPayload = {
  sub: number;
  email: string;
  role: string;
  puskesmasId: number | null;
  exp: number;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-mobile-secret";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createMobileToken(input: Omit<MobileTokenPayload, "exp">) {
  const payload: MobileTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as MobileTokenPayload;
    if (!payload?.sub || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getMobileUser(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const payload = verifyMobileToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      puskesmasId: true,
      puskesmas: { select: { nama: true } },
    },
  });
}

export function sanitizeMobileUser(user: {
  id: number;
  email: string;
  nama: string;
  role: string;
  puskesmasId: number | null;
  puskesmas?: { nama: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.nama,
    role: user.role,
    puskesmasId: user.puskesmasId,
    puskesmasNama: user.puskesmas?.nama ?? null,
  };
}

/**
 * Puskesmas scope utk query mobile: ADMIN/DINKES boleh override via ?puskesmasId=,
 * OPERATOR selalu pakai puskesmas miliknya (enforce server-side).
 */
export function resolvePuskesmasId(
  req: NextRequest,
  user: { role: string; puskesmasId: number | null },
): number | null {
  if (user.role === "ADMIN" || user.role === "DINKES") {
    const q = Number(req.nextUrl.searchParams.get("puskesmasId"));
    return Number.isFinite(q) && q > 0 ? q : user.puskesmasId;
  }
  return user.puskesmasId;
}
