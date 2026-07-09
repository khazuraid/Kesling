import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { createMobileToken, sanitizeMobileUser } from "@/lib/mobile-auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  const userId = Number(sessionUser?.id);

  if (!userId) {
    return NextResponse.json({ error: "Sesi web tidak valid." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      puskesmasId: true,
      puskesmas: { select: { nama: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const token = createMobileToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    puskesmasId: user.puskesmasId,
  });

  const payload = {
    type: "apps-kes-mobile-link",
    version: 1,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://kesling.biz.id",
    token,
    user: sanitizeMobileUser(user),
  };

  const encodedPayload = JSON.stringify(payload);
  const qrDataUrl = await QRCode.toDataURL(encodedPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
    color: {
      dark: "#10271f",
      light: "#ffffff",
    },
  });

  return NextResponse.json({
    payload,
    qrDataUrl,
    expiresInDays: 30,
  });
}
