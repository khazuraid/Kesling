import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { sendRegistrationApprovedEmail, sendRegistrationRejectedEmail } from "@/lib/email-otp";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";
import { sendTelegramMessage } from "@/lib/telegram/notify";

export const PATCH = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const status = (body.status || "").toUpperCase();
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason).trim() : null;

    if (!["ACTIVE", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status harus ACTIVE atau REJECTED" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { puskesmas: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const oldStatus = targetUser.status;

    if (status === "ACTIVE") {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedById: adminUser.id,
          rejectionReason: null,
        },
      });

      // Kirim email notifikasi bahwa akun disetujui
      await sendRegistrationApprovedEmail(
        targetUser.email,
        targetUser.nama,
        targetUser.role,
        targetUser.puskesmas?.nama,
      );

      // Notifikasi Telegram jika user punya telegramChatId atau ke grup admin
      try {
        if (targetUser.telegramChatId) {
          await sendTelegramMessage(
            targetUser.telegramChatId,
            `🎉 *Selamat! Pendaftaran Akun Disetujui*\n\n` +
              `Halo ${targetUser.nama}, akun Anda telah disetujui oleh Administrator Dinas Kesehatan. Anda sekarang dapat masuk ke aplikasi Kesling Core.`,
          );
        }
      } catch {}
    } else {
      // REJECTED
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "Tidak memenuhi persyaratan operasional.",
        },
      });

      // Kirim email penolakan
      await sendRegistrationRejectedEmail(
        targetUser.email,
        targetUser.nama,
        rejectionReason || "Tidak memenuhi persyaratan operasional.",
      );
    }

    // Catat ke AuditLog
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        tableName: "user",
        recordId: targetUser.id,
        oldData: { status: oldStatus },
        newData: { status, rejectionReason, approvedById: status === "ACTIVE" ? adminUser.id : null },
      },
    });

    await logSecurityEvent({
      eventType: "USER_APPROVAL_DECISION",
      ip,
      path: `/api/users/${id}/status`,
      userAgent,
      detail: `Admin ${adminUser.email} mengubah status ${targetUser.email} dari ${oldStatus} menjadi ${status}`,
    });

    return NextResponse.json({
      success: true,
      message: status === "ACTIVE" ? "Akun berhasil disetujui dan diaktifkan." : "Pendaftaran akun telah ditolak.",
      status,
    });
  } catch (err: any) {
    console.error("[User Status PATCH Error]:", err);
    return NextResponse.json({ error: "Gagal memperbarui status akun pengguna." }, { status: 500 });
  }
});
