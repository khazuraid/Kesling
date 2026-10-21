import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const DELETE = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const { params } = ctx;
    const resolvedParams = typeof params.then === "function" ? await params : params;
    const id = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const userId = (req as any).user?.id;
    const pkmId = (req as any).user?.puskesmasId;
    const role = (req as any).user?.role;
    const old = await prisma.inspectionTemplate.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    // Otorisasi: hanya admin atau puskesmas pembuat yang boleh menghapus
    if (role !== "ADMIN" && old.puskesmasId && old.puskesmasId !== pkmId) {
      return NextResponse.json(
        { error: "Anda tidak memiliki izin menghapus template milik puskesmas lain" },
        { status: 403 },
      );
    }

    // Cek apakah ada riwayat hasil pemeriksaan untuk template ini
    const resultCount = await prisma.inspectionResult.count({ where: { templateId: id } });
    if (resultCount > 0) {
      // Soft-delete agar riwayat pemeriksaan di database tidak corrupt / hilang
      await prisma.inspectionTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          tableName: "inspection_template",
          recordId: id,
          oldData: { nama: old.nama, isActive: true },
          newData: { isActive: false, reason: "Dinonaktifkan karena memiliki riwayat data pemeriksaan" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Template dinonaktifkan karena memiliki riwayat pemeriksaan",
      });
    }

    await prisma.inspectionField.deleteMany({ where: { templateId: id } });
    await prisma.inspectionTemplate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        tableName: "inspection_template",
        recordId: id,
        oldData: { nama: old?.nama },
        newData: undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
