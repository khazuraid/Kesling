import { type AnnouncementTargetRole, type AnnouncementType, prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { ensureAnnouncementTables } from "@/lib/announcement";
import { withAdmin } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { deletePhotoFiles, saveBase64Photo } from "@/lib/photo-files";

export const PUT = withAdmin(async (req: NextRequest, ctx: any) => {
  try {
    await ensureAnnouncementTables();
    const params = await ctx?.params;
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "ID pengumuman tidak valid." }, { status: 400 });
    }

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const { title, content, imageUrl, type, isActive, startDate, endDate, targetRole, isPopup } = body;

    const data: any = {};
    if (title !== undefined) data.title = String(title).trim();
    if (content !== undefined) data.content = String(content).trim();
    if (imageUrl !== undefined) {
      if (imageUrl === null || imageUrl === "") {
        if (existing.imageUrl) await deletePhotoFiles([existing.imageUrl]);
        data.imageUrl = null;
      } else {
        data.imageUrl = await saveBase64Photo(imageUrl, "announcements");
      }
    }
    if (type !== undefined) data.type = type as AnnouncementType;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : new Date();
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (targetRole !== undefined) data.targetRole = targetRole as AnnouncementTargetRole;
    if (isPopup !== undefined) data.isPopup = Boolean(isPopup);

    const updated = await prisma.announcement.update({
      where: { id },
      data,
    });

    const user = (req as any).user;
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      tableName: "announcement",
      recordId: id,
      oldData: existing,
      newData: updated,
    });

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    console.error("[Admin Announcement PUT] Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengumuman." }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (req: NextRequest, ctx: any) => {
  try {
    await ensureAnnouncementTables();
    const params = await ctx?.params;
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "ID pengumuman tidak valid." }, { status: 400 });
    }

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
    }

    if (existing.imageUrl) {
      await deletePhotoFiles([existing.imageUrl]);
    }

    await prisma.announcement.delete({ where: { id } });

    const user = (req as any).user;
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      tableName: "announcement",
      recordId: id,
      oldData: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Announcement DELETE] Error:", error);
    return NextResponse.json({ error: "Gagal menghapus pengumuman." }, { status: 500 });
  }
});
