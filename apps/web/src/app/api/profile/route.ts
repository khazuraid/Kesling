import { prisma } from "@apps-kes/database";
import { compare, hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nama, currentPassword, newPassword } = await req.json();

  const data: any = {};
  if (nama) data.nama = nama;

  if (currentPassword && newPassword) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const isValid = await compare(currentPassword, dbUser.password);
    if (!isValid) return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });

    if (newPassword.length < 6) return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
    data.password = await hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
