import { type AnnouncementTargetRole, type AnnouncementType, prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { ensureAnnouncementTables } from "@/lib/announcement";
import { withAdmin } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { saveBase64Photo } from "@/lib/photo-files";

export const GET = withAdmin(async () => {
  try {
    await ensureAnnouncementTables();
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("[Admin Announcements GET] Error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar pengumuman." }, { status: 500 });
  }
});

export const POST = withAdmin(async (req: NextRequest, { user }) => {
  try {
    await ensureAnnouncementTables();
    const body = await req.json();
    const {
      title,
      content,
      imageUrl,
      type = "INFO",
      isActive = true,
      startDate,
      endDate,
      targetRole = "ALL",
      isPopup = true,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Judul dan isi pengumuman wajib diisi." }, { status: 400 });
    }

    let savedImageUrl: string | null = null;
    if (imageUrl) {
      savedImageUrl = await saveBase64Photo(imageUrl, "announcements");
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imageUrl: savedImageUrl,
        type: type as AnnouncementType,
        isActive: Boolean(isActive),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        targetRole: targetRole as AnnouncementTargetRole,
        isPopup: Boolean(isPopup),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "announcement",
      recordId: announcement.id,
      newData: announcement,
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("[Admin Announcements POST] Error:", error);
    return NextResponse.json({ error: "Gagal membuat pengumuman." }, { status: 500 });
  }
});
