import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { clearLoginRateLimit } from "@/lib/rate-limit";

export const POST = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;
  const body = await req.json();
  const action = body.action; // "RESET_OTP" | "RESET_PASSWORD" | "TOGGLE_PASSWORD_REQUIREMENT" | "UNLOCK_ACCOUNT"

  const targetUser = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true, nama: true, email: true, username: true, mustChangePassword: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  if (action === "RESET_OTP") {
    // Paksa user verifikasi OTP ulang saat login berikutnya
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { lastOtpVerifiedAt: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        tableName: "user",
        recordId: targetUser.id,
        oldData: { action: "RESET_OTP" },
        newData: { lastOtpVerifiedAt: null },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sesi OTP untuk ${targetUser.nama} berhasil di-reset. Pengguna wajib verifikasi OTP saat login berikutnya.`,
    });
  }

  if (action === "UNLOCK_ACCOUNT") {
    // Buka kunci brute-force IP / email
    await clearLoginRateLimit(targetUser.email, "email");
    if (targetUser.username) {
      await clearLoginRateLimit(targetUser.username, "email");
    }

    return NextResponse.json({
      success: true,
      message: `Status penguncian login untuk ${targetUser.nama} berhasil dibuka.`,
    });
  }

  if (action === "RESET_PASSWORD") {
    const newPassword = body.newPassword ? String(body.newPassword).trim() : null;
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        password: hashedPassword,
        mustChangePassword: Boolean(body.mustChangePassword ?? true),
        lastOtpVerifiedAt: null, // Reset OTP juga agar terverifikasi
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        tableName: "user",
        recordId: targetUser.id,
        oldData: { passwordReset: false },
        newData: { passwordReset: true, mustChangePassword: true },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kata sandi untuk ${targetUser.nama} berhasil diperbarui.`,
    });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
});
