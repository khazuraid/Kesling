import { prisma } from "@apps-kes/database";
import { compare } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { createMobileToken, sanitizeMobileUser } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
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

    if (!user) {
      return NextResponse.json({ error: "Email tidak ditemukan." }, { status: 401 });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Password salah." }, { status: 401 });
    }

    const token = createMobileToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      puskesmasId: user.puskesmasId,
    });

    const sanitizedUser = sanitizeMobileUser(user);
    return NextResponse.json({ success: true, token, user: sanitizedUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal login mobile." }, { status: 500 });
  }
}
