import { prisma } from "@apps-kes/database";
import { compare, hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      puskesmasId: true,
      puskesmas: {
        select: {
          id: true,
          nama: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  return NextResponse.json(dbUser);
}

// Ganti password = titik tebak-password, jadi dibatasi 10 percobaan / menit / IP.
export const PUT = withRateLimit(
  async (req: NextRequest) => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { nama, currentPassword, newPassword } = await req.json();

    const data: any = {};
    if (nama !== undefined && nama !== null) {
      const trimmed = String(nama).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
      }
      data.nama = trimmed;
    }

    if (currentPassword && newPassword) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

      const isValid = await compare(currentPassword, dbUser.password);
      if (!isValid) {
        await logSecurityEvent({
          eventType: "LOGIN_FAILED",
          ip: clientIp(req),
          path: "/api/profile",
          userAgent: req.headers.get("user-agent") || undefined,
          detail: `Password lama salah saat ganti password (user ${user.id})`,
        });
        return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
      }
      if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return NextResponse.json({ error: "Password baru harus memuat huruf dan angka" }, { status: 400 });
      }
      data.password = await hash(newPassword, 12);
      // Password sementara sudah diganti — kewajiban ganti dicabut di sini juga
      // agar tidak bergantung pada klien yang menyegarkan tokennya.
      data.mustChangePassword = false;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        puskesmasId: true,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  },
  { windowMs: 60_000, max: 10 },
);
