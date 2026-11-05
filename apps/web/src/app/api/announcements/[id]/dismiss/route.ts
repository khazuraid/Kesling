import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { ensureAnnouncementTables } from "@/lib/announcement";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    await ensureAnnouncementTables();
    const user = (req as any).user;
    const params = await ctx?.params;
    const id = Number(params?.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "ID pengumuman tidak valid." }, { status: 400 });
    }

    // Catat bahwa user telah menutup/mengonfirmasi pengumuman ini
    await prisma.announcementDismissal.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: user.id,
        },
      },
      update: {
        dismissedAt: new Date(),
      },
      create: {
        announcementId: id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Announcement Dismiss POST] Error:", error);
    return NextResponse.json({ error: "Gagal memproses konfirmasi pengumuman." }, { status: 500 });
  }
});
